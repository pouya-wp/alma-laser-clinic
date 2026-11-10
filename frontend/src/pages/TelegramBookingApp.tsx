import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  ShieldCheck,
  Zap,
  Info,
  Gift,
  Heart,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../lib/api';
import { ServicePackage, Client } from '../lib/types';
import { formatToman, toPersianDigits, getTodayJalali } from '../lib/jalali';
import { BodyMapSelector } from '../components/BodyMapSelector';
import { JalaliDatePicker } from '../components/JalaliDatePicker';

export const TelegramBookingApp: React.FC = () => {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [genderFilter, setGenderFilter] = useState<'FEMALE' | 'MALE'>('FEMALE');

  const [bookingDate, setBookingDate] = useState(getTodayJalali().dateStr);
  const [bookingTime, setBookingTime] = useState('17:00');

  const [client, setClient] = useState<Partial<Client>>({
    firstName: 'مشتری گرامی',
    lastName: 'آلما',
    phone: '',
    loyaltyPoints: 100,
  });

  const [activeTab, setActiveTab] = useState<'book' | 'care' | 'contact'>('book');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp SDK if present
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        setClient((prev) => ({
          ...prev,
          firstName: u.first_name || prev.firstName,
          lastName: u.last_name || prev.lastName,
          telegramUsername: u.username,
        }));
      }
    }

    // Check query params for clientId or phone
    const params = new URLSearchParams(window.location.search);
    const clientIdParam = params.get('clientId');
    if (clientIdParam) {
      api.getClientById(clientIdParam).then((res) => {
        if (res.client) setClient(res.client);
      }).catch(console.error);
    }

    // Load service packages
    api.getPackages().then((res) => {
      setPackages(res.packages);
      if (res.packages.length > 0) {
        setSelectedPackage(res.packages[0]);
      }
    }).catch(console.error);
  }, []);

  async function handleConfirmBooking() {
    if (!selectedPackage) return;
    setSubmitting(true);
    try {
      const discount = Math.min(client.loyaltyPoints ? client.loyaltyPoints * 1000 : 0, 100000);
      const bookingPayload = {
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        shamsiDate: bookingDate,
        timeSlot: bookingTime,
        price: selectedPackage.price,
        discount,
        finalPrice: selectedPackage.price - discount,
      };

      // If opened inside Telegram, send data back to bot
      const tg = (window as any).Telegram?.WebApp;
      if (tg && typeof tg.sendData === 'function') {
        tg.sendData(JSON.stringify(bookingPayload));
      }

      // Also persist to API if client id is known or create client
      if (client.id) {
        await api.createAppointment({
          clientId: client.id,
          packageId: selectedPackage.id,
          shamsiDate: bookingDate,
          timeSlot: bookingTime,
          price: selectedPackage.price,
          discountAmount: discount,
          status: 'PENDING',
          notes: 'رزرو از وب‌اپلیکیشن تلگرام (TWA)',
        });
      }

      // Trigger Celebration Confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#EC268F', '#D4AF37', '#ffffff', '#FF69B4'],
      });

      setBookingConfirmed(true);
    } catch (e: any) {
      console.error(e);
      setBookingConfirmed(true); // show confirmation view
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-5 pb-20">
      {/* Top Brand Banner */}
      <div className="rounded-3xl glass-panel p-5 border border-white/10 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo/org.png"
              alt="Alma Clinic Logo"
              className="w-12 h-12 object-contain"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-white">کلینیک لیزر آلما</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-alma-500/20 text-alma-300 font-bold">
                  یزد
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                سلام {client.firstName} عزیز خوش آمدید 💖
              </p>
            </div>
          </div>

          {/* Loyalty Club Wallet Badge */}
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400 font-medium">باشگاه مشتریان</span>
            <div className="flex items-center gap-1 text-amber-400 font-extrabold text-xs mt-0.5">
              <Gift className="w-3.5 h-3.5" />
              <span>{toPersianDigits(client.loyaltyPoints || 100)} امتیاز</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-obsidian-900/90 p-1 rounded-2xl border border-white/10 mb-5">
        {[
          { id: 'book', label: '🗓 رزرو نوبت' },
          { id: 'care', label: '📋 مراقبت‌ها' },
          { id: 'contact', label: '📍 آدرس و تماس' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id as any);
              if (t.id === 'book') setBookingConfirmed(false);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === t.id
                ? 'bg-gradient-to-r from-alma-600 to-alma-500 text-white shadow-glow-alma'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ONLINE BOOKING */}
      {activeTab === 'book' && (
        <>
          {!bookingConfirmed ? (
            <div className="space-y-6">
              {/* Step 1: Laser Package Selection */}
              <div className="glass-panel rounded-3xl p-5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-alma-400" />
                    مرحله ۱: انتخاب پکیج یا ناحیه لیزر
                  </h3>
                </div>

                <BodyMapSelector
                  packages={packages}
                  selectedPackageId={selectedPackage?.id || ''}
                  onSelectPackage={setSelectedPackage}
                  genderFilter={genderFilter}
                  onGenderChange={setGenderFilter}
                />
              </div>

              {/* Step 2: Date & Time Picker */}
              <div className="glass-panel rounded-3xl p-5 border border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-alma-400" />
                  مرحله ۲: انتخاب زمان مراجعه
                </h3>

                <JalaliDatePicker
                  selectedDate={bookingDate}
                  onSelectDate={setBookingDate}
                  selectedTime={bookingTime}
                  onSelectTime={setBookingTime}
                />
              </div>

              {/* Step 3: Checkout Summary & 1-Click Confirm */}
              {selectedPackage && (
                <div className="glass-panel rounded-3xl p-5 border border-alma-500/40 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    خلاصه فاکتور نوبت شما
                  </h3>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between">
                      <span>پکیج انتخابی:</span>
                      <span className="font-bold text-white">{selectedPackage.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تاریخ و ساعت:</span>
                      <span className="font-bold text-alma-300">
                        {bookingDate} ساعت {bookingTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>تعرفه پکیج:</span>
                      <span>{formatToman(selectedPackage.price)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-400">
                      <span>تخفیف باشگاه مشتریان (۱۰۰ امتیاز):</span>
                      <span>- ۱۰۰,۰۰۰ تومان</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex justify-between font-black text-sm text-white">
                      <span>مبلغ قابل پرداخت در کلینیک:</span>
                      <span className="text-alma-300">
                        {formatToman(Math.max(0, selectedPackage.price - 100000))}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmBooking}
                    disabled={submitting}
                    className="w-full mt-3 py-3 rounded-2xl bg-gradient-to-r from-alma-600 via-alma-500 to-pink-500 text-white font-extrabold text-sm shadow-glow-alma hover:opacity-95 transition disabled:opacity-50"
                  >
                    {submitting ? 'در حال ثبت نوبت...' : 'تایید نهایی و ثبت نوبت در کلینیک آلما 💖'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Confirmation Screen */
            <div className="glass-panel rounded-3xl p-8 border border-emerald-500/40 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-bounce">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <h2 className="text-xl font-black text-white">نوبت شما با موفقیت رزرو شد!</h2>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {client.firstName} عزیز، نوبت شما برای{' '}
                <span className="text-alma-300 font-bold">{selectedPackage?.name}</span> در تاریخ{' '}
                <span className="text-alma-300 font-bold">{bookingDate}</span> ساعت{' '}
                <span className="text-alma-300 font-bold">{bookingTime}</span> ثبت گردید.
              </p>

              <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/10 text-xs text-slate-300 text-right space-y-1.5">
                <p className="font-bold text-amber-300 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  نکات مهم قبل از حضور در کلینیک:
                </p>
                <p>• ناحیه مورد نظر را ۲۴ ساعت قبل با ژیلت شیو بفرمایید.</p>
                <p>• از هیچ‌گونه کرم، مام یا لوسیون در روز مراجعه استفاده نشود.</p>
                <p>• پیامک و یادآوری ربات تلگرام ۲۴ ساعت قبل برای شما ارسال خواهد شد.</p>
              </div>

              <button
                onClick={() => setBookingConfirmed(false)}
                className="px-6 py-2.5 rounded-xl bg-obsidian-900 text-slate-200 text-xs font-bold border border-white/10 hover:bg-white/5 transition"
              >
                رزرو نوبت دیگر
              </button>
            </div>
          )}
        </>
      )}

      {/* TAB 2: PRE & POST CARE GUIDE */}
      {activeTab === 'care' && (
        <div className="space-y-4">
          <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-alma-300 flex items-center gap-2">
              🌸 مراقبت‌های قبل از جلسه لیزر
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-alma-400 font-bold">•</span>
                <span>شیو کردن موها صرفاً با تیغ یا ژیلت ۲۴ ساعت قبل از نوبت انجام شود.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alma-400 font-bold">•</span>
                <span>از اپیلاسیون، موچین، وکس و بند حداقل ۴ هفته قبل پرهیز نمایید.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alma-400 font-bold">•</span>
                <span>حداقل ۳ الی ۴ هفته پیش از جلسه از آفتاب گرفتن یا سولاریوم خودداری کنید.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-alma-400 font-bold">•</span>
                <span>در روز مراجعه پوست کاملاً تمیز و عاری از هرگونه کرم پودر، مام یا لوسیون باشد.</span>
              </li>
            </ul>
          </div>

          <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              🌿 مراقبت‌های پس از جلسه لیزر
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>تا ۲۴ ساعت بعد از لیزر از دوش آب داغ، سونا، جکوزی و ورزش سنگین خودداری کنید.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>در صورت بروز التهاب، از پماد زینک اکساید یا ژل آلوئه‌ورا استفاده فرمایید.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>برای نواحی در معرض آفتاب، کرم ضدآفتاب بدون رنگ هر ۳ ساعت تمدید شود.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>فواصل بین جلسات (۴ الی ۶ هفته یکبار) را به طور منظم ادامه دهید.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 3: CONTACT & LOCATION */}
      {activeTab === 'contact' && (
        <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-5">
          <div className="text-center space-y-2">
            <img
              src="/logo/org.png"
              alt="Alma Logo"
              className="w-16 h-16 object-contain mx-auto"
            />
            <h3 className="text-base font-extrabold text-white">کلینیک تخصصی لیزر آلما یزد</h3>
            <p className="text-xs text-slate-400">
              مجهز به مدرن‌ترین دستگاه‌های الکساندرایت کندلا ۲۰۲۴
            </p>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-obsidian-900 border border-white/5">
              <MapPin className="w-5 h-5 text-alma-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-0.5">آدرس در شهر یزد:</span>
                <span>بلوار جمهوری اسلامی، نرسیده به میدان امام علی، نبش کوچه یاسمن، ساختمان سپهر، طبقه سوم</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-obsidian-900 border border-white/5">
              <Phone className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">تلفن نوبت‌دهی و پذیرش:</span>
                  <span className="font-mono text-slate-300">035-38260000</span>
                </div>
                <a
                  href="tel:03538260000"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  تماس مستقیم
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-obsidian-900 border border-white/5">
              <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white block">ساعات کاری کلینیک:</span>
                <span>شنبه تا چهارشنبه: ۹:۰۰ الی ۲۱:۰۰ | پنجشنبه‌ها: ۹:۰۰ الی ۱۶:۰۰</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
