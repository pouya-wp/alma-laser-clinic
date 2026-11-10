import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Calendar,
  Zap,
  DollarSign,
  Send,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Search,
  Sparkles,
  Settings,
  Phone,
  Tag,
  Activity,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';
import { DashboardStats, Client, ServicePackage } from '../lib/types';
import { formatToman, toPersianDigits, getTodayJalali } from '../lib/jalali';
import { MobileTabBar } from '../components/MobileTabBar';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // CRM State
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Broadcast State
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'ALL' | 'FEMALE' | 'MALE'>('ALL');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Bulk Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [dashStats, clientRes, settingsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getClients({ limit: 50 }),
        api.getSettings(),
      ]);
      setStats(dashStats);
      setClients(clientRes.clients);
      setSettings(settingsRes.settings);
    } catch (e) {
      console.error('Error loading admin dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearchClients(val: string) {
    setClientSearch(val);
    try {
      const res = await api.getClients({ q: val, limit: 50 });
      setClients(res.clients);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    setBroadcastStatus(null);
    try {
      const res = await api.sendBroadcast(broadcastMessage, broadcastTarget);
      setBroadcastStatus(`پیام با موفقیت به ${res.sentCount} نفر ارسال شد!`);
      setBroadcastMessage('');
    } catch (err: any) {
      setBroadcastStatus('خطا در ارسال پیام: ' + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  }

  async function handleBulkImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.bulkImport(fd);
      setImportResult(res);
      // Reload clients
      const refreshed = await api.getClients({ limit: 50 });
      setClients(refreshed.clients);
    } catch (err: any) {
      setImportResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      await api.updateSettings(settings);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-alma-500/20 border-t-alma-500 animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400">در حال بارگذاری پنل مدیریت آلما...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
      {/* Super Admin Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-alma-500/10 text-alma-400 text-xs font-bold border border-alma-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              پنل سوپر ادمین (نسخه PWA آیفون)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            داشبورد اختصاصی مدیریت کلینیک آلما یزد
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            نظارت بلادرنگ بر تراکنش‌ها، پذیرش، دستگاه‌های لیزر و سامانه هوشمند تلگرام
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-obsidian-900 hover:bg-obsidian-850 text-slate-200 text-xs font-bold border border-white/10 transition shadow-sm"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            ایمپورت اکسل مشتریان
          </button>
          <button
            onClick={() => setActiveTab('broadcast')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-alma-600 to-alma-500 text-white text-xs font-bold shadow-glow-alma hover:opacity-95 transition"
          >
            <Send className="w-4 h-4" />
            ارسال پیام همگانی تلگرام
          </button>
        </div>
      </div>

      {/* Desktop Navigation Tabs */}
      <div className="hidden md:flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
        {[
          { id: 'overview', label: 'نمای کلی و آمار مالی', icon: TrendingUp },
          { id: 'appointments', label: 'نوبت‌های امروز و تقویم', icon: Calendar },
          { id: 'clients', label: 'مدیریت مشتریان و CRM', icon: Users },
          { id: 'devices', label: 'دستگاه‌های لیزر و اپراتورها', icon: Zap },
          { id: 'broadcast', label: 'سامانه پیام تلگرام', icon: Send },
          { id: 'settings', label: 'تنظیمات کلینیک', icon: Settings },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-alma-500 text-white shadow-glow-alma'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & FINANCIAL STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">درآمد کل جلسات</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {formatToman(stats.summary.totalRevenue)}
                </h3>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  +۲۴٪ رشد نسبت به ماه گذشته
                </span>
              </div>
            </div>

            {/* Total Clients */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">مشتریان پرونده‌دار</span>
                <div className="w-9 h-9 rounded-xl bg-alma-500/10 text-alma-400 flex items-center justify-center border border-alma-500/20">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {toPersianDigits(stats.summary.totalClients)} نفر
                </h3>
                <span className="text-[11px] text-alma-400 font-semibold mt-1 block">
                  ۱۰۰٪ اطلاعات احراز شده با تلگرام
                </span>
              </div>
            </div>

            {/* Today Appointments */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">نوبت‌های امروز</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {toPersianDigits(stats.summary.todayCount)} نوبت
                </h3>
                <span className="text-[11px] text-amber-400 font-semibold mt-1 block">
                  {toPersianDigits(stats.summary.todayInProgress)} در حال لیزر | {toPersianDigits(stats.summary.todayWaiting)} در لابی
                </span>
              </div>
            </div>

            {/* Active Devices */}
            <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">دستگاه‌های فعال</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {toPersianDigits(stats.summary.activeDevicesCount)} کابین لیزر
                </h3>
                <span className="text-[11px] text-cyan-400 font-semibold mt-1 block">
                  کندلا اصل + تیتانیوم ۳ بعدی
                </span>
              </div>
            </div>
          </div>

          {/* Monthly Trends & Package Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 6-Month Revenue Trend Chart Bar */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-alma-400" />
                  روند درآمد و نوبت‌های ۶ ماهه کلینیک آلما
                </h3>
                <span className="text-[11px] text-slate-400">واحد: میلیون تومان</span>
              </div>

              <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/10">
                {stats.monthlyTrends.map((m, idx) => {
                  const maxRev = 70000000;
                  const heightPct = Math.min(100, Math.round((m.revenue / maxRev) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] font-bold text-alma-300 opacity-0 group-hover:opacity-100 transition">
                        {(m.revenue / 1000000).toFixed(1)}م
                      </div>
                      <div className="w-full bg-obsidian-800 rounded-t-lg relative flex items-end h-40 overflow-hidden">
                        <div
                          style={{ height: `${heightPct}%` }}
                          className="w-full bg-gradient-to-t from-alma-600 via-alma-500 to-pink-400 rounded-t-lg transition-all duration-500 shadow-glow-alma"
                        ></div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400">{m.month}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-4 px-2">
                <span>⚡ میانگین رشد ماهانه: ۱۸.۵٪</span>
                <span>💎 میانگین هر فاکتور: ۶۵۰,۰۰۰ تومان</span>
              </div>
            </div>

            {/* Popular Laser Packages */}
            <div className="glass-panel rounded-2xl p-5 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-amber-400" />
                محبوب‌ترین پکیج‌های لیزر آلما
              </h3>

              <div className="space-y-3">
                {stats.packageStats.slice(0, 5).map((pkg) => (
                  <div key={pkg.id} className="p-3 rounded-xl bg-obsidian-900/80 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{pkg.name}</span>
                      <span className="text-xs font-black text-alma-300">
                        {toPersianDigits(pkg.count)} رزرو
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>تعرفه: {formatToman(pkg.price)}</span>
                      <span>سهم: {formatToman(pkg.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Live Today Appointments Status in Clinic */}
          <div className="glass-panel rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                وضعیت زنده مراجعین امروز در کلینیک
              </h3>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                به‌روزرسانی آنلاین
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10 pb-2">
                    <th className="py-2 font-semibold">مشتری</th>
                    <th className="py-2 font-semibold">پکیج</th>
                    <th className="py-2 font-semibold">ساعت</th>
                    <th className="py-2 font-semibold">اپراتور</th>
                    <th className="py-2 font-semibold">دستگاه</th>
                    <th className="py-2 font-semibold">وضعیت</th>
                    <th className="py-2 font-semibold">مبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stats.todayAppointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-white/5 transition">
                      <td className="py-3 font-bold text-white">
                        {appt.client.firstName} {appt.client.lastName}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {appt.client.phone}
                        </span>
                      </td>
                      <td className="py-3 text-slate-300">{appt.package.name}</td>
                      <td className="py-3 font-extrabold text-alma-300">{appt.timeSlot}</td>
                      <td className="py-3 text-slate-300">{appt.operator?.name || 'تعیین نشده'}</td>
                      <td className="py-3 text-slate-300">{appt.device?.name?.split(' ')[0] || 'کندلا'}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            appt.status === 'IN_PROGRESS'
                              ? 'bg-alma-500/20 text-alma-300 border border-alma-500/40 animate-pulse'
                              : appt.status === 'WAITING'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : appt.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {appt.status === 'IN_PROGRESS'
                            ? 'در حال لیزر ⚡'
                            : appt.status === 'WAITING'
                            ? 'در لابی ⏳'
                            : appt.status === 'COMPLETED'
                            ? 'انجام شد ✔️'
                            : 'تایید شده'}
                        </span>
                      </td>
                      <td className="py-3 font-black text-slate-200">
                        {formatToman(appt.finalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPOINTMENTS FULL VIEW */}
      {activeTab === 'appointments' && (
        <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-alma-400" />
            فهرست کلی نوبت‌های رزرو شده
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stats.todayAppointments.map((appt) => (
              <div key={appt.id} className="p-4 rounded-xl bg-obsidian-900 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">
                    {appt.client.firstName} {appt.client.lastName}
                  </span>
                  <span className="text-xs font-black text-alma-400">{appt.timeSlot}</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>پکیج: {appt.package.name}</p>
                  <p>شماره تماس: {appt.client.phone}</p>
                  <p>تاریخ: {appt.shamsiDate}</p>
                  <p className="font-bold text-slate-200 mt-2">
                    مبلغ نهایی: {formatToman(appt.finalPrice)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT CRM & PROFILES */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="جستجو با نام یا شماره تماس مشتری..."
                value={clientSearch}
                onChange={(e) => handleSearchClients(e.target.value)}
                className="w-full pr-9 pl-4 py-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-alma-500"
              />
            </div>
            <button
              onClick={() => setShowImportModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-alma-600 hover:bg-alma-500 text-white text-xs font-bold shadow-glow-alma transition"
            >
              <Upload className="w-4 h-4" />
              بارگذاری لیست مشتریان (اکسل / CSV)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedClient(c)}
                className="p-4 rounded-2xl glass-card cursor-pointer hover:border-alma-500/50 transition duration-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {c.firstName} {c.lastName}
                    </h4>
                    <span className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-alma-400" />
                      {c.phone}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-alma-500/20 text-alma-300 text-[10px] font-bold border border-alma-500/30">
                    {c.totalSessions} جلسه
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>تیپ پوستی: {c.skinType || 'ثبت نشده'}</span>
                  <span className="text-amber-400 font-semibold">{c.loyaltyPoints} امتیاز</span>
                </div>
              </div>
            ))}
          </div>

          {/* Selected Client Modal / Detail Drawer */}
          {selectedClient && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel w-full max-w-lg rounded-3xl p-6 border border-alma-500/30 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      پرونده تخصصی: {selectedClient.firstName} {selectedClient.lastName}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedClient.phone}</p>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>تعداد جلسات انجام شده:</span>
                    <span className="font-bold text-white">{selectedClient.totalSessions} جلسه</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>امتیاز باشگاه مشتریان:</span>
                    <span className="font-bold text-amber-400">{selectedClient.loyaltyPoints} امتیاز</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>تیپ پوست (فیتزپاتریک):</span>
                    <span className="font-bold text-white">{selectedClient.skinType || 'تعیین نشده'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span>سوابق و حساسیت‌ها:</span>
                    <span className="font-bold text-rose-300">{selectedClient.contraindications || 'ندارد'}</span>
                  </div>
                  <div className="py-1">
                    <span className="block mb-1 text-slate-400">یادداشت پزشک و اپراتور:</span>
                    <p className="p-2.5 rounded-xl bg-obsidian-900 border border-white/10 leading-relaxed text-[11px]">
                      {selectedClient.notes || 'یادداشتی ثبت نشده است.'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="px-5 py-2 rounded-xl bg-alma-600 text-white text-xs font-bold"
                  >
                    بستن پرونده
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DEVICES & OPERATORS */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Laser Devices */}
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              تجهیزات و دستگاه‌های لیزر کلینیک آلما
            </h3>
            {stats.devices.map((d) => (
              <div key={d.id} className="p-4 rounded-xl bg-obsidian-900 border border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">{d.name}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    فعال
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{d.model}</p>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">تعداد شات‌های شلیک شده:</span>
                  <span className="font-black text-cyan-300">
                    {d.shotCount.toLocaleString('fa-IR')} شات
                  </span>
                </div>
                {d.notes && (
                  <p className="text-[11px] text-slate-400 mt-2 p-2 bg-obsidian-850 rounded-lg">
                    {d.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Operators */}
          <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-alma-400" />
              اپراتورهای ارشد کلینیک آلما
            </h3>
            {stats.operators.map((op) => (
              <div key={op.id} className="p-4 rounded-xl bg-obsidian-900 border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">{op.name}</h4>
                  <span className="text-xs text-slate-400">{op.phone}</span>
                </div>
                <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-glow-alma"></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: BROADCAST MESSAGE */}
      {activeTab === 'broadcast' && (
        <div className="glass-panel max-w-2xl mx-auto rounded-3xl p-6 border border-alma-500/30 space-y-5">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-alma-400" />
              ارسال پیام و تخفیف همگانی از طریق ربات تلگرام آلما
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              این پیام مستقیماً در صفحه چت تلگرام تمام مشتریان ثبت‌نامی ارسال خواهد شد.
            </p>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                جامعه هدف پیام:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ALL', label: 'تمام مشتریان' },
                  { id: 'FEMALE', label: 'فقط بانوان' },
                  { id: 'MALE', label: 'فقط آقایان' },
                ].map((tg) => (
                  <button
                    key={tg.id}
                    type="button"
                    onClick={() => setBroadcastTarget(tg.id as any)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      broadcastTarget === tg.id
                        ? 'bg-alma-500 text-white border-alma-400 shadow-glow-alma'
                        : 'bg-obsidian-900 border-white/10 text-slate-400'
                    }`}
                  >
                    {tg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                متن پیام تلگرام:
              </label>
              <textarea
                rows={5}
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="متن پیام خود را بنویسید (مثال: جشنواره ویژه یلدا کلینیک آلما یزد: ۲۰٪ تخفیف برای رزرو فول بادی با کد YALDA)..."
                className="w-full p-3 rounded-2xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-alma-500 leading-relaxed"
              ></textarea>
            </div>

            {broadcastStatus && (
              <div className="p-3 rounded-xl bg-alma-500/10 border border-alma-500/30 text-xs text-alma-300">
                {broadcastStatus}
              </div>
            )}

            <button
              type="submit"
              disabled={sendingBroadcast}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-alma-600 to-alma-500 text-white font-bold text-xs shadow-glow-alma transition disabled:opacity-50"
            >
              {sendingBroadcast ? 'در حال ارسال پیام‌ها...' : 'ارسال قطعی به ربات تلگرام'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: CLINIC SETTINGS */}
      {activeTab === 'settings' && (
        <div className="glass-panel max-w-2xl mx-auto rounded-3xl p-6 border border-white/10 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            تنظیمات عمومی کلینیک آلما یزد
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">نام کلینیک:</label>
              <input
                type="text"
                value={settings.CLINIC_NAME || ''}
                onChange={(e) => setSettings({ ...settings, CLINIC_NAME: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-alma-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">آدرس در یزد:</label>
              <input
                type="text"
                value={settings.CLINIC_ADDRESS || ''}
                onChange={(e) => setSettings({ ...settings, CLINIC_ADDRESS: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-alma-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">تلفن نوبت‌دهی:</label>
                <input
                  type="text"
                  value={settings.CLINIC_PHONE || ''}
                  onChange={(e) => setSettings({ ...settings, CLINIC_PHONE: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-alma-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">آیدی تلگرام ربات:</label>
                <input
                  type="text"
                  value={settings.CLINIC_TELEGRAM || ''}
                  onChange={(e) => setSettings({ ...settings, CLINIC_TELEGRAM: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:border-alma-500"
                />
              </div>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs border border-emerald-500/30">
                تنظیمات با موفقیت ذخیره گردید.
              </div>
            )}

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-2.5 rounded-xl bg-alma-600 hover:bg-alma-500 text-white font-bold text-xs transition"
            >
              {savingSettings ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </button>
          </form>
        </div>
      )}

      {/* Bulk Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-alma-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                ایمپورت فایل اکسل یا CSV مشتریان
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              فایل حاوی ستون‌های نام، نام خانوادگی، شماره تماس (موبایل) و تعداد جلسات را انتخاب کنید. سامانه به صورت خودکار شماره‌های تکراری را تطبیق می‌دهد.
            </p>

            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                required
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full p-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-alma-500 file:text-white"
              />

              {importResult && (
                <div className={`p-3 rounded-xl text-xs ${importResult.error ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>
                  {importResult.error ? (
                    importResult.error
                  ) : (
                    <div>
                      <p className="font-bold">ایمپورت با موفقیت انجام شد!</p>
                      <p className="mt-1">
                        افزوده شده: {importResult.addedCount} | به‌روزرسانی شده: {importResult.updatedCount}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl bg-obsidian-900 text-slate-300 text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 rounded-xl bg-alma-600 hover:bg-alma-500 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {importing ? 'در حال پردازش اکسل...' : 'شروع ایمپورت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* iOS PWA Mobile Tab Bar */}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} role="admin" />
    </div>
  );
};
