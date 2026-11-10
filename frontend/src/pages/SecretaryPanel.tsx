import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Phone,
  Zap,
  CreditCard,
  Plus,
  Play,
  Check,
  X,
  FileSpreadsheet,
  Upload,
  UserCheck,
  ChevronLeft,
} from 'lucide-react';
import { api } from '../lib/api';
import { Appointment, Client, ServicePackage, Operator, LaserDevice } from '../lib/types';
import { formatToman, toPersianDigits, getTodayJalali, TIME_SLOTS } from '../lib/jalali';
import { JalaliDatePicker } from '../components/JalaliDatePicker';

export const SecretaryPanel: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [devices, setDevices] = useState<LaserDevice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [queueTab, setQueueTab] = useState<'ALL' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState<Appointment | null>(null);

  // New Booking Form State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [bookingDate, setBookingDate] = useState(getTodayJalali().dateStr);
  const [bookingTime, setBookingTime] = useState('16:00');
  const [bookingNotes, setBookingNotes] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // New Client Form State
  const [newClientData, setNewClientData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    gender: 'FEMALE',
    skinType: 'تیپ ۳ (گندمی)',
    notes: '',
    totalSessions: 0,
  });
  const [submittingClient, setSubmittingClient] = useState(false);

  // Checkout Form State
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState('POS');
  const [checkoutPaidAmount, setCheckoutPaidAmount] = useState<number>(0);

  useEffect(() => {
    loadSecretaryData();
  }, []);

  async function loadSecretaryData() {
    setLoading(true);
    try {
      const todayStr = getTodayJalali().dateStr;
      const [apptRes, pkgRes, opRes, devRes, clientRes] = await Promise.all([
        api.getAppointments({ shamsiDate: todayStr }),
        api.getPackages(),
        api.getOperators(),
        api.getDevices(),
        api.getClients({ limit: 100 }),
      ]);
      setAppointments(apptRes.appointments);
      setPackages(pkgRes.packages);
      setOperators(opRes.operators);
      setDevices(devRes.devices);
      setClients(clientRes.clients);

      if (pkgRes.packages.length > 0) setSelectedPackageId(pkgRes.packages[0].id);
      if (opRes.operators.length > 0) setSelectedOperatorId(opRes.operators[0].id);
      if (devRes.devices.length > 0) setSelectedDeviceId(devRes.devices[0].id);
    } catch (e) {
      console.error('Error loading secretary data:', e);
    } finally {
      setLoading(false);
    }
  }

  // Status transitions
  async function handleSetStatus(apptId: string, status: string) {
    try {
      const res = await api.updateAppointmentStatus(apptId, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? res.appointment : a))
      );
    } catch (e) {
      console.error(e);
    }
  }

  // Submit new booking
  async function handleCreateBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId || !selectedPackageId) return;
    setSubmittingBooking(true);
    try {
      const pkg = packages.find((p) => p.id === selectedPackageId);
      const res = await api.createAppointment({
        clientId: selectedClientId,
        packageId: selectedPackageId,
        operatorId: selectedOperatorId || undefined,
        deviceId: selectedDeviceId || undefined,
        shamsiDate: bookingDate,
        timeSlot: bookingTime,
        price: pkg?.price || 0,
        notes: bookingNotes,
        status: 'WAITING',
      });
      setAppointments((prev) => [res.appointment, ...prev]);
      setShowNewBookingModal(false);
      setBookingNotes('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingBooking(false);
    }
  }

  // Submit new client
  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingClient(true);
    try {
      const res = await api.createClient(newClientData as any);
      setClients((prev) => [res.client, ...prev]);
      setSelectedClientId(res.client.id);
      setShowNewClientModal(false);
      setNewClientData({
        firstName: '',
        lastName: '',
        phone: '',
        gender: 'FEMALE',
        skinType: 'تیپ ۳ (گندمی)',
        notes: '',
        totalSessions: 0,
      });
      alert(`پرونده خانم/آقای ${res.client.firstName} با موفقیت ثبت شد!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingClient(false);
    }
  }

  // Complete & Checkout
  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!showCheckoutModal) return;
    try {
      const res = await api.updateAppointmentStatus(showCheckoutModal.id, {
        status: 'COMPLETED',
        paymentMethod: checkoutPaymentMethod,
        paidAmount: checkoutPaidAmount || showCheckoutModal.finalPrice,
      });
      setAppointments((prev) =>
        prev.map((a) => (a.id === showCheckoutModal.id ? res.appointment : a))
      );
      setShowCheckoutModal(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  const filteredAppointments = appointments.filter((a) => {
    if (queueTab !== 'ALL' && a.status !== queueTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = `${a.client.firstName} ${a.client.lastName}`.toLowerCase();
      const phone = a.client.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Secretary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5" />
              میز پذیرش و منشی کلینیک آلما
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            مدیریت نوبت‌ها، صف لابی و پرونده مراجعین
          </h1>
          <p className="text-xs text-slate-400">
            ثبت سریع مراجعین حضوری/تلفنی، هدایت به کابین لیزر و تسویه نهایی
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewClientModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 text-slate-200 text-xs font-bold border border-white/10 transition"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            ثبت پرونده جدید
          </button>
          <button
            onClick={() => setShowNewBookingModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-xs font-bold shadow-glow-gold hover:opacity-95 transition"
          >
            <Plus className="w-4 h-4" />
            ثبت نوبت امروز
          </button>
        </div>
      </div>

      {/* Quick Queue Counter Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            id: 'ALL',
            label: 'کل مراجعین امروز',
            count: appointments.length,
            color: 'from-slate-700 to-slate-800',
            border: 'border-white/10',
          },
          {
            id: 'WAITING',
            label: 'در انتظار در لابی',
            count: appointments.filter((a) => a.status === 'WAITING').length,
            color: 'from-amber-600/30 to-amber-500/10',
            border: 'border-amber-500/30 text-amber-300',
          },
          {
            id: 'IN_PROGRESS',
            label: 'در کابین لیزر',
            count: appointments.filter((a) => a.status === 'IN_PROGRESS').length,
            color: 'from-alma-600/30 to-alma-500/10',
            border: 'border-alma-500/30 text-alma-300',
          },
          {
            id: 'COMPLETED',
            label: 'تکمیل و تسویه شده',
            count: appointments.filter((a) => a.status === 'COMPLETED').length,
            color: 'from-emerald-600/30 to-emerald-500/10',
            border: 'border-emerald-500/30 text-emerald-300',
          },
        ].map((item) => (
          <div
            key={item.id}
            onClick={() => setQueueTab(item.id as any)}
            className={`p-3.5 rounded-2xl bg-gradient-to-b ${item.color} border ${item.border} cursor-pointer transition-all ${
              queueTab === item.id ? 'ring-2 ring-white/30 transform -translate-y-0.5' : ''
            }`}
          >
            <span className="text-xs font-medium text-slate-300 block">{item.label}</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {toPersianDigits(item.count)}
            </span>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-white/10 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="جستجوی سریع مراجعین امروز با نام یا شماره تماس..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Live Reception Queue List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-2xl border border-white/10">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">هیچ نوبتی با این وضعیت ثبت نشده است.</p>
          </div>
        ) : (
          filteredAppointments.map((appt) => (
            <div
              key={appt.id}
              className={`p-4 rounded-2xl border transition-all ${
                appt.status === 'IN_PROGRESS'
                  ? 'glass-card border-alma-500/60 ring-1 ring-alma-500/30 bg-alma-950/20'
                  : appt.status === 'WAITING'
                  ? 'glass-card border-amber-500/50 bg-amber-950/20'
                  : appt.status === 'COMPLETED'
                  ? 'bg-obsidian-900/60 border-emerald-500/30 opacity-75'
                  : 'bg-obsidian-900/80 border-white/10'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Client & Service Info */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      appt.status === 'IN_PROGRESS'
                        ? 'bg-alma-500 text-white animate-pulse'
                        : appt.status === 'WAITING'
                        ? 'bg-amber-500 text-black'
                        : appt.status === 'COMPLETED'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {appt.timeSlot}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">
                        {appt.client.firstName} {appt.client.lastName}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-400">
                        ({appt.client.phone})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                      <span className="font-semibold text-alma-300">{appt.package.name}</span>
                      <span>•</span>
                      <span>اپراتور: {appt.operator?.name || 'تعیین نشده'}</span>
                      <span>•</span>
                      <span>دستگاه: {appt.device?.name?.split(' ')[0] || 'کندلا'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Badges & Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {appt.status === 'CONFIRMED' && (
                    <button
                      onClick={() => handleSetStatus(appt.id, 'WAITING')}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition"
                    >
                      اعلام ورود به لابی ⏳
                    </button>
                  )}

                  {appt.status === 'WAITING' && (
                    <button
                      onClick={() => handleSetStatus(appt.id, 'IN_PROGRESS')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-alma-600 text-white text-xs font-bold shadow-glow-alma hover:bg-alma-500 transition"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      ورود به کابین لیزر
                    </button>
                  )}

                  {appt.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => {
                        setShowCheckoutModal(appt);
                        setCheckoutPaidAmount(appt.finalPrice);
                      }}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition shadow-lg"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      پایان لیزر و تسویه حساب
                    </button>
                  )}

                  {appt.status === 'COMPLETED' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold px-2 py-1 bg-emerald-500/10 rounded-lg">
                      <CheckCircle2 className="w-4 h-4" />
                      تسویه شد ({formatToman(appt.paidAmount || appt.finalPrice)})
                    </div>
                  )}

                  <span className="text-xs font-black text-slate-200">
                    {formatToman(appt.finalPrice)}
                  </span>
                </div>
              </div>

              {/* Patient notes if any */}
              {appt.client.contraindications && (
                <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  ⚠️ هشدار پزشکی/پوستی: {appt.client.contraindications}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAL 1: NEW BOOKING */}
      {showNewBookingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-amber-500/30 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                ثبت نوبت حضوری یا تلفنی (کلینیک آلما)
              </h3>
              <button
                onClick={() => setShowNewBookingModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  انتخاب مراجع (مشتری):
                </label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-amber-500"
                >
                  <option value="">-- انتخاب از لیست مشتریان ثبت شده --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phone}) - {c.totalSessions} جلسه
                    </option>
                  ))}
                </select>
              </div>

              {/* Package Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  پکیج یا ناحیه لیزر:
                </label>
                <select
                  required
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-amber-500"
                >
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatToman(p.price)} ({p.durationMinutes} دقیقه)
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator & Device */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اپراتور:</label>
                  <select
                    value={selectedOperatorId}
                    onChange={(e) => setSelectedOperatorId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  >
                    {operators.map((op) => (
                      <option key={op.id} value={op.id}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">دستگاه:</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name.split(' ')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Jalali Date & Time Picker */}
              <JalaliDatePicker
                selectedDate={bookingDate}
                onSelectDate={setBookingDate}
                selectedTime={bookingTime}
                onSelectTime={setBookingTime}
              />

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  توضیحات یا یادداشت نوبت:
                </label>
                <input
                  type="text"
                  placeholder="مثال: اصرار به زایلاپی دارد، دفعه قبل خوب شیو نشده بود..."
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookingModal(false)}
                  className="px-4 py-2 rounded-xl bg-obsidian-900 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingBooking}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-glow-gold transition"
                >
                  {submittingBooking ? 'در حال ثبت...' : 'ثبت قطعی نوبت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: NEW CLIENT REGISTRATION */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-emerald-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                ثبت پرونده مشتری جدید در کلینیک
              </h3>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نام:</label>
                  <input
                    type="text"
                    required
                    value={newClientData.firstName}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, firstName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">نام خانوادگی:</label>
                  <input
                    type="text"
                    required
                    value={newClientData.lastName}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, lastName: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">شماره همراه:</label>
                <input
                  type="text"
                  required
                  placeholder="0913..."
                  value={newClientData.phone}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, phone: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white text-left font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">جنسیت:</label>
                  <select
                    value={newClientData.gender}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, gender: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  >
                    <option value="FEMALE">بانو</option>
                    <option value="MALE">آقا</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">تیپ پوستی:</label>
                  <select
                    value={newClientData.skinType}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, skinType: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                  >
                    <option value="تیپ ۲ (سفید مهتابی)">تیپ ۲ (سفید مهتابی)</option>
                    <option value="تیپ ۳ (گندمی روشن)">تیپ ۳ (گندمی روشن)</option>
                    <option value="تیپ ۴ (سبزه ملایم)">تیپ ۴ (سبزه ملایم)</option>
                    <option value="تیپ ۵ (سبزه تیره)">تیپ ۵ (سبزه تیره)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  توضیحات و سوابق پزشکی:
                </label>
                <textarea
                  rows={2}
                  value={newClientData.notes}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, notes: e.target.value })
                  }
                  placeholder="سابقه مصرف دارو، بارداری، سولار یا حساسیت..."
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 rounded-xl bg-obsidian-900 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submittingClient}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  {submittingClient ? 'در حال ثبت پرونده...' : 'ایجاد پرونده'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CHECKOUT & PAYMENT */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-emerald-500/30 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              تسویه حساب و خاتمه جلسه لیزر
            </h3>

            <div className="p-3 rounded-xl bg-obsidian-900 text-xs text-slate-300 space-y-1">
              <p className="font-bold text-white">
                {showCheckoutModal.client.firstName} {showCheckoutModal.client.lastName}
              </p>
              <p>پکیج: {showCheckoutModal.package.name}</p>
              <p className="text-alma-300 font-extrabold text-sm pt-1">
                مبلغ قابل پرداخت: {formatToman(showCheckoutModal.finalPrice)}
              </p>
            </div>

            <form onSubmit={handleCheckout} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  روش دریافت وجه:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'POS', label: 'دستگاه کارتخوان' },
                    { id: 'CASH', label: 'نقد' },
                    { id: 'CARD_TO_CARD', label: 'کارت به کارت' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCheckoutPaymentMethod(m.id)}
                      className={`py-2 text-[11px] font-bold rounded-xl border transition ${
                        checkoutPaymentMethod === m.id
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-obsidian-900 border-white/10 text-slate-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  مبلغ دریافتی (تومان):
                </label>
                <input
                  type="number"
                  value={checkoutPaidAmount || showCheckoutModal.finalPrice}
                  onChange={(e) => setCheckoutPaidAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(null)}
                  className="px-4 py-2 rounded-xl bg-obsidian-900 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg"
                >
                  تایید تسویه و ارسال پیامک مراقبت
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
