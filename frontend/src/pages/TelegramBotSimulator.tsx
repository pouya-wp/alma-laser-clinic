import React, { useState, useEffect } from 'react';
import {
  Send,
  Smartphone,
  Phone,
  Check,
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Zap,
  Info,
  Gift,
  RotateCcw,
  UserCheck,
} from 'lucide-react';
import { api } from '../lib/api';
import { ServicePackage, Client, Appointment } from '../lib/types';
import { formatToman, getUpcomingDays, toPersianDigits } from '../lib/jalali';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  buttons?: { label: string; action: string; isWebApp?: boolean }[][];
  time: string;
  isLocation?: boolean;
}

export const TelegramBotSimulator: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [currentUser, setCurrentUser] = useState<Partial<Client> | null>(null);
  const [step, setStep] = useState<string>('INIT');
  const [bookingState, setBookingState] = useState<{
    gender?: 'FEMALE' | 'MALE';
    pkg?: ServicePackage;
    date?: string;
    time?: string;
  }>({});

  useEffect(() => {
    api.getPackages().then((r) => setPackages(r.packages));
    startBotConversation();
  }, []);

  function getCurrentTime() {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  function startBotConversation() {
    setMessages([
      {
        id: '1',
        sender: 'bot',
        text: `💎 به ربات هوشمند کلینیک لیزر آلما (یزد) خوش آمدید 💎\n\nسلام کاربر عزیز،\nجهت بازیابی سوابق جلسات و نوبت‌دهی آنلاین، لطفاً با فشردن دکمه زیر شماره همراه خود را تایید فرمایید:`,
        buttons: [
          [{ label: '📱 ارسال شماره تماس و ورود به حساب', action: 'share_contact' }],
        ],
        time: getCurrentTime(),
      },
    ]);
    setStep('NEED_CONTACT');
    setCurrentUser(null);
  }

  async function handleButtonClick(action: string, label: string) {
    // Add user message bubble
    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: label,
      time: getCurrentTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Simulate instant bot response
    setTimeout(async () => {
      await processBotAction(action);
    }, 400);
  }

  async function processBotAction(action: string) {
    const time = getCurrentTime();

    // 1. Share Contact
    if (action === 'share_contact') {
      const mockPhone = '09131518290'; // Sara Mirjalili from seed
      const clientRes = await api.getClients({ q: mockPhone });
      const foundClient = clientRes.clients[0] || {
        firstName: 'سارا',
        lastName: 'میرجلیلی',
        phone: mockPhone,
        totalSessions: 4,
        loyaltyPoints: 350,
      };
      setCurrentUser(foundClient);

      const botReply: ChatMessage = {
        id: String(Date.now()),
        sender: 'bot',
        text: `✨ هویت شما تایید شد!\n\nسلام ${foundClient.firstName} ${foundClient.lastName} عزیز، خوش آمدید 💖\n\n👤 مشخصات پرونده شما:\n📱 شماره همراه: ${foundClient.phone}\n💎 تعداد جلسات انجام شده: ${foundClient.totalSessions} جلسه\n🎁 امتیاز باشگاه مشتریان: ${foundClient.loyaltyPoints} امتیاز\n\nجهت ثبت نوبت یا دسترسی به خدمات، یکی از گزینه‌های زیر را انتخاب نمایید:`,
        buttons: [
          [{ label: '🗓 رزرو نوبت مستقیم (با دکمه‌های بات)', action: 'book_direct' }],
          [{ label: '🚀 یا باز کردن وب‌اپلیکیشن ۳ بعدی (TWA)', action: 'open_twa', isWebApp: true }],
          [
            { label: '📋 سوابق نوبت‌های من', action: 'my_appts' },
            { label: '💎 تعرفه پکیج‌ها', action: 'view_prices' },
          ],
          [
            { label: '📋 مراقبت‌های قبل و بعد', action: 'care_guide' },
            { label: '📍 لوکیشن کلینیک یزد', action: 'location' },
          ],
          [{ label: '📞 تماس با منشی', action: 'contact' }],
        ],
        time,
      };
      setMessages((prev) => [...prev, botReply]);
      return;
    }

    // 2. Book Direct -> Select Gender
    if (action === 'book_direct') {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: 'لطفاً جنسیت متقاضی نوبت را انتخاب نمایید:',
          buttons: [
            [
              { label: '🌸 خدمات بانوان', action: 'gender_female' },
              { label: '⚡ خدمات آقایان', action: 'gender_male' },
            ],
            [{ label: '🔙 بازگشت به منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 3. Gender Selected -> Select Package
    if (action === 'gender_female' || action === 'gender_male') {
      const g = action === 'gender_female' ? 'FEMALE' : 'MALE';
      setBookingState({ gender: g });
      const filtered = packages.filter((p) => p.gender === g || p.gender === 'UNISEX');

      const pkgButtons = filtered.map((p) => [
        { label: `✨ ${p.name} (${formatToman(p.price)})`, action: `pkg_${p.id}` },
      ]);
      pkgButtons.push([{ label: '🔙 بازگشت', action: 'book_direct' }]);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: g === 'FEMALE' ? '🌸 پکیج‌های لیزر بانوان (دستگاه الکساندرایت کندلا ۲۰۲۴):' : '⚡ پکیج‌های لیزر آقایان:',
          buttons: pkgButtons,
          time,
        },
      ]);
      return;
    }

    // 4. Package Selected -> Select Date
    if (action.startsWith('pkg_')) {
      const pkgId = action.replace('pkg_', '');
      const pkg = packages.find((p) => p.id === pkgId);
      if (!pkg) return;
      setBookingState((prev) => ({ ...prev, pkg }));

      const upcoming = getUpcomingDays(5);
      const dateButtons = upcoming.map((d) => [
        { label: `📅 ${d.dayName} ${d.dayNumber} ${d.monthName}`, action: `date_${d.dateStr}` },
      ]);
      dateButtons.push([{ label: '🔙 انتخاب پکیج دیگر', action: 'book_direct' }]);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `پکیج انتخابی: «${pkg.name}»\nتعرفه: ${formatToman(pkg.price)}\n\nلطفاً تاریخ مراجعه را از لیست زیر انتخاب فرمایید:`,
          buttons: dateButtons,
          time,
        },
      ]);
      return;
    }

    // 5. Date Selected -> Select Time
    if (action.startsWith('date_')) {
      const dateStr = action.replace('date_', '');
      setBookingState((prev) => ({ ...prev, date: dateStr }));

      const times = ['10:00', '11:15', '16:00', '17:30', '18:45', '20:00'];
      const timeButtons = [];
      for (let i = 0; i < times.length; i += 2) {
        timeButtons.push([
          { label: `⏰ ساعت ${times[i]}`, action: `time_${times[i]}` },
          { label: `⏰ ساعت ${times[i + 1]}`, action: `time_${times[i + 1]}` },
        ]);
      }
      timeButtons.push([{ label: '🔙 تغییر تاریخ', action: `pkg_${bookingState.pkg?.id}` }]);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `تاریخ انتخابی: ${dateStr}\nلطفاً ساعت مراجعه مورد نظر خود را انتخاب نمایید:`,
          buttons: timeButtons,
          time,
        },
      ]);
      return;
    }

    // 6. Time Selected -> Invoice Review
    if (action.startsWith('time_')) {
      const selectedTime = action.replace('time_', '');
      const finalBooking = { ...bookingState, time: selectedTime };
      setBookingState(finalBooking);

      const price = finalBooking.pkg?.price || 0;
      const discount = currentUser?.loyaltyPoints ? Math.min(currentUser.loyaltyPoints * 1000, 100000) : 0;
      const payable = Math.max(0, price - discount);

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `📋 خلاصه پیش‌فاکتور نوبت لیزر شما 📋\n\n🌸 نام پکیج: ${finalBooking.pkg?.name}\n⚡ دستگاه: کندلا جنتل پرو مکس ۲۰۲۴\n📅 تاریخ نوبت: ${finalBooking.date}\n⏰ ساعت مراجعه: ${selectedTime}\n💰 تعرفه پایه: ${formatToman(price)}\n🎁 تخفیف باشگاه مشتریان: ${formatToman(discount)}\n💎 مبلغ پرداختی در کلینیک: ${formatToman(payable)}\n\nآیا مایل به ثبت قطعی نوبت می‌باشید؟`,
          buttons: [
            [{ label: '✅ تایید و ثبت نهایی نوبت', action: 'confirm_final_booking' }],
            [{ label: '❌ انصراف و بازگشت', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 7. Confirm Final Booking -> Save to DB!
    if (action === 'confirm_final_booking') {
      try {
        if (currentUser?.id && bookingState.pkg && bookingState.date && bookingState.time) {
          await api.createAppointment({
            clientId: currentUser.id,
            packageId: bookingState.pkg.id,
            shamsiDate: bookingState.date,
            timeSlot: bookingState.time,
            price: bookingState.pkg.price,
            discountAmount: 100000,
            status: 'CONFIRMED',
            notes: 'رزرو تست شده از طریق دکمه‌های ربات تلگرام',
          });
        }
      } catch (e) {
        console.error(e);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `🎉 نوبت شما با موفقیت قطعی شد! 🎉\n\n👤 مراجع: ${currentUser?.firstName} ${currentUser?.lastName}\n🌸 پکیج: ${bookingState.pkg?.name}\n📅 تاریخ: ${bookingState.date}\n⏰ ساعت: ${bookingState.time}\n\n⚠️ یادآوری‌های مهم:\n۱. ۲۴ ساعت قبل با ژیلت شیو بفرمایید.\n۲. از هیچ‌گونه لوسیون، مام یا کرم در روز مراجعه استفاده نشود.\n۳. یادآوری ربات ۲۴ ساعت قبل برای شما ارسال خواهد شد.\n\n📍 آدرس: یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳\n☎️ تلفن نوبت‌دهی: ۰۳۵-۳۸۲۶۰۰۰۰`,
          buttons: [
            [{ label: '📋 سوابق نوبت‌های من', action: 'my_appts' }],
            [{ label: '🏠 بازگشت به منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 8. View Prices
    if (action === 'view_prices') {
      let txt = `💎 لیست تعرفه خدمات کلینیک آلما یزد (دستگاه کندلا ۲۰۲۴) 💎\n\n`;
      for (const p of packages) {
        txt += `✨ ${p.name}\n⏱ مدت: ${p.durationMinutes} دقیقه | 💰 ${formatToman(p.price)}\n${p.description || ''}\n----------------------------\n`;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: txt,
          buttons: [
            [{ label: '🗓 رزرو مستقیم با دکمه‌های ربات', action: 'book_direct' }],
            [{ label: '🏠 منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 9. Care Guide
    if (action === 'care_guide') {
      const guide = `📋 راهنمای جامع مراقبت‌های قبل و بعد لیزر آلما 📋\n\n🌸 قبل از لیزر:\n• ۲۴ ساعت قبل با ژیلت تمیز شیو کنید.\n• حداقل ۴ هفته از وکس و اپیلاسیون پرهیز کنید.\n• حداقل ۳ هفته قبل از آفتاب گرفتن خودداری نمایید.\n• روز مراجعه پوست تمیز و بدون عطر یا مام باشد.\n\n🌿 بعد از لیزر:\n• تا ۲۴ ساعت از دوش آب گرم و سونا پرهیز کنید.\n• در صورت سوزش کرم زینک یا آلوئه‌ورا مصرف فرمایید.\n• ضدآفتاب بدون رنگ را هر ۳ ساعت تمدید کنید.`;
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: guide,
          buttons: [
            [{ label: '🗓 رزرو نوبت جدید', action: 'book_direct' }],
            [{ label: '🏠 منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 10. Location
    if (action === 'location') {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `📍 کلینیک لیزر آلما یزد\nیزد، بلوار جمهوری اسلامی، نبش کوچه یاسمن، ساختمان سپهر، طبقه سوم\n\n📞 تلفن نوبت‌دهی: ۰۳۵-۳۸۲۶۰۰۰۰\n📱 همراه منشی: ۰۹۱۳۱۵۱۰۰۰۰\n⏰ ساعت کاری: شنبه تا چهارشنبه ۹ تا ۲۱ | پنجشنبه‌ها ۹ تا ۱۶`,
          buttons: [
            [{ label: '📞 تماس با منشی', action: 'contact' }],
            [{ label: '🏠 منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 11. Contact
    if (action === 'contact') {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `📞 ارتباط مستقیم با پذیرش کلینیک آلما:\n\n☎️ تلفن ثابت: ۰۳۵-۳۸۲۶۰۰۰۰\n📱 شماره همراه و واتساپ منشی: ۰۹۱۳۱۵۱۰۰۰۰\n💬 آیدی پشتیبانی: @AlmaClinicAdmin`,
          buttons: [
            [{ label: '🗓 رزرو مستقیم نوبت', action: 'book_direct' }],
            [{ label: '🏠 منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }

    // 12. Main Menu
    if (action === 'main_menu') {
      await processBotAction('share_contact');
      return;
    }

    // 13. My Appointments
    if (action === 'my_appts') {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'bot',
          text: `📋 نوبت‌های فعال شما در کلینیک آلما:\n\n✨ فول بادی بانوان (کندلا ۲۰۲۴)\n📅 فردا ساعت ۱۶:۰۰\nوضعیت: تایید شده ✅\nمبلغ: ۸۵۰,۰۰۰ تومان`,
          buttons: [
            [{ label: '🗓 رزرو یک نوبت دیگر', action: 'book_direct' }],
            [{ label: '🏠 بازگشت به منوی اصلی', action: 'main_menu' }],
          ],
          time,
        },
      ]);
      return;
    }
  }

  return (
    <div className="max-w-md mx-auto px-2 py-4 pb-20">
      {/* Device Mockup Shell */}
      <div className="glass-panel rounded-[2.5rem] border border-alma-500/30 overflow-hidden shadow-2xl flex flex-col h-[780px]">
        
        {/* Telegram Header */}
        <div className="bg-[#17212b] p-3.5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src="/logo/org.png"
                alt="Bot Logo"
                className="w-10 h-10 rounded-full object-contain bg-obsidian-900 border border-alma-500/40 p-1"
              />
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full absolute bottom-0 right-0 border-2 border-[#17212b]"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">کلینیک لیزر آلما</span>
                <span className="text-[10px] font-bold text-alma-400">bot</span>
              </div>
              <span className="text-[11px] text-slate-400">آنلاین | یزد، بلوار جمهوری</span>
            </div>
          </div>

          <button
            onClick={startBotConversation}
            title="ریست ربات"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            شروع مجدد
          </button>
        </div>

        {/* Telegram Chat Bubbles Container */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#0e1621]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-line relative ${
                  m.sender === 'user'
                    ? 'bg-gradient-to-r from-alma-600 to-alma-500 text-white rounded-br-none shadow-glow-alma'
                    : 'bg-[#182533] text-slate-100 rounded-bl-none border border-white/5 shadow-md'
                }`}
              >
                {m.text}
                <span className="block text-[9px] text-slate-400/80 text-left mt-1">
                  {m.time}
                </span>
              </div>

              {/* Telegram Inline Buttons Grid */}
              {m.buttons && m.buttons.length > 0 && (
                <div className="mt-2 w-full max-w-[85%] space-y-1.5">
                  {m.buttons.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => handleButtonClick(btn.action, btn.label)}
                          className={`flex-1 py-2 px-2 text-center rounded-xl text-xs font-bold transition-all border ${
                            btn.isWebApp
                              ? 'bg-gradient-to-r from-alma-700 via-alma-600 to-pink-600 text-white border-alma-400/50 shadow-glow-alma'
                              : 'bg-[#2b5278]/40 hover:bg-[#2b5278]/70 border-cyan-500/30 text-cyan-200'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Telegram Bottom Input Bar */}
        <div className="bg-[#17212b] p-3 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            disabled
            placeholder="جهت تست از دکمه‌های شیشه‌ای بالا استفاده کنید..."
            className="flex-1 p-2 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-slate-400 cursor-not-allowed"
          />
          <button
            onClick={() => handleButtonClick('main_menu', '/start')}
            className="px-3 py-2 rounded-xl bg-alma-600 text-white text-xs font-bold shadow-glow-alma"
          >
            /start
          </button>
        </div>

      </div>
    </div>
  );
};
