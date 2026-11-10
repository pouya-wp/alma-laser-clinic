import { Bot, Keyboard, InlineKeyboard } from 'grammy';
import { prisma } from '../prisma.js';
import { config, normalizePhone } from '../config/index.js';
import jalaali from 'jalaali-js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

function createBotInstance(): Bot | null {
  if (!config.botToken) return null;

  const clientConfig: any = {};
  if (config.telegramApiRoot) {
    console.log(`🌐 Using Custom Telegram API Root: ${config.telegramApiRoot}`);
    clientConfig.apiRoot = config.telegramApiRoot;
  }

  if (config.telegramProxy) {
    console.log(`🛡️ Using Telegram Outbound Proxy: ${config.telegramProxy}`);
    const isSocks = config.telegramProxy.startsWith('socks');
    const agent = isSocks
      ? new SocksProxyAgent(config.telegramProxy)
      : new HttpsProxyAgent(config.telegramProxy);
    clientConfig.baseFetchConfig = { agent };
  }

  return new Bot(config.botToken, { client: clientConfig });
}

export const bot = createBotInstance();

// Helper to get Shamsi upcoming days
function getBotUpcomingDays(count = 7) {
  const days = [];
  const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
  const PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 5) continue; // Skip Fridays (Clinic closed)
    const j = jalaali.toJalaali(d);
    const m = String(j.jm).padStart(2, '0');
    const day = String(j.jd).padStart(2, '0');
    days.push({
      dateStr: `${j.jy}/${m}/${day}`,
      display: `${PERSIAN_WEEKDAYS[dayOfWeek]} ${j.jd} ${PERSIAN_MONTHS[j.jm - 1]}`,
      dateObj: d,
    });
  }
  return days;
}

const AVAILABLE_HOURS = ['10:00', '11:15', '16:00', '17:15', '18:30', '19:45'];

export function setupTelegramBot() {
  if (!bot) {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN is not set or empty. Bot is running in offline/API simulation mode.');
    return;
  }

  // /start command
  bot.command('start', async (ctx) => {
    const telegramId = BigInt(ctx.from?.id || 0);
    const username = ctx.from?.username || '';
    const tgFirstName = ctx.from?.first_name || '';

    // Check if user is already registered in DB by telegramId
    const existingByTg = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        appointments: {
          where: {
            status: { in: ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'PENDING'] },
          },
          include: { package: true, operator: true },
          orderBy: { appointmentDate: 'asc' },
          take: 1,
        },
      },
    });

    if (existingByTg) {
      return showRegisteredUserDashboard(ctx, existingByTg);
    }

    // New visitor: Request contact
    const contactKeyboard = new Keyboard()
      .requestContact('📱 ارسال شماره همراه و ورود به کلینیک آلما')
      .resized()
      .oneTime();

    await ctx.reply(
      `💎 به ربات هوشمند کلینیک لیزر آلما (یزد) خوش آمدید 💎\n\n` +
      `سلام ${tgFirstName} عزیز،\n` +
      `برای دسترسی به سوابق جلسات، مشاهده پرونده و رزرو دکمه‌ای نوبت، لطفاً با کلیک روی دکمه زیر شماره همراه خود را تایید نمایید:`,
      {
        reply_markup: contactKeyboard,
      }
    );
  });

  // Handle contact sharing
  bot.on(':contact', async (ctx) => {
    const contact = ctx.message?.contact;
    if (!contact) return;

    const rawPhone = contact.phone_number;
    const phone = normalizePhone(rawPhone);
    const telegramId = BigInt(ctx.from?.id || 0);
    const username = ctx.from?.username || '';
    const tgFirstName = contact.first_name || ctx.from?.first_name || 'کاربر گرامی';
    const tgLastName = contact.last_name || ctx.from?.last_name || '';

    let client = await prisma.client.findUnique({
      where: { phone },
      include: {
        appointments: {
          where: {
            status: { in: ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'PENDING'] },
          },
          include: { package: true, operator: true },
          orderBy: { appointmentDate: 'asc' },
          take: 1,
        },
      },
    });

    if (client) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { telegramId, telegramUsername: username },
        include: {
          appointments: {
            where: {
              status: { in: ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'PENDING'] },
            },
            include: { package: true, operator: true },
            orderBy: { appointmentDate: 'asc' },
            take: 1,
          },
        },
      });

      await ctx.reply(`✨ هویت شما با موفقیت تایید شد! پرونده شما در کلینیک آلما بازیابی گردید.`);
      return showRegisteredUserDashboard(ctx, client);
    } else {
      const newClient = await prisma.client.create({
        data: {
          telegramId,
          telegramUsername: username,
          firstName: tgFirstName,
          lastName: tgLastName,
          phone,
          gender: 'FEMALE',
          totalSessions: 0,
          loyaltyPoints: 100,
          notes: 'ثبت‌نام مستقیم از طریق ربات تلگرام',
        },
        include: {
          appointments: {
            include: { package: true, operator: true },
            take: 1,
          },
        },
      });

      const welcomeKeyboard = new InlineKeyboard()
        .text('🗓 رزرو نوبت مستقیم با دکمه‌ها', 'book_direct')
        .row()
        .webApp('✨ یا باز کردن وب‌اپلیکیشن آلما (TWA)', `${config.webAppUrl}?clientId=${newClient.id}`)
        .row()
        .text('💎 تعرفه پکیج‌ها', 'view_prices')
        .text('📍 لوکیشن کلینیک یزد', 'clinic_location')
        .row()
        .text('📞 تماس با منشی', 'contact_secretary');

      await ctx.reply(
        `🎉 خوش آمدید به خانواده کلینیک آلما! 🎉\n\n` +
        `👤 حساب کاربری شما با موفقیت فعال شد.\n` +
        `🎁 هدیه عضویت شما: ۱۰۰ امتیاز باشگاه مشتریان آلما (معادل ۱۰۰ هزار تومان تخفیف در اولین مراجعه)\n\n` +
        `اکنون می‌توانید با دکمه‌های زیر اولین نوبت خود را به سادگی رزرو فرمایید:`,
        { reply_markup: welcomeKeyboard }
      );
    }
  });

  // Handle Telegram WebApp Data (when booking from inside TWA Mini App)
  bot.on('message:web_app_data', async (ctx) => {
    try {
      const data = JSON.parse(ctx.message.web_app_data.data);
      const telegramId = BigInt(ctx.from.id);
      const client = await prisma.client.findUnique({ where: { telegramId } });
      if (!client) return ctx.reply('ابتدا شماره همراه خود را تایید نمایید.');

      const packageItem = await prisma.servicePackage.findUnique({ where: { id: data.packageId } });
      if (!packageItem) return ctx.reply('پکیج یافت نشد.');

      const newAppt = await prisma.appointment.create({
        data: {
          clientId: client.id,
          packageId: packageItem.id,
          appointmentDate: new Date(),
          shamsiDate: data.shamsiDate || 'نامشخص',
          timeSlot: data.timeSlot || '17:00',
          status: 'CONFIRMED',
          price: packageItem.price,
          discountAmount: data.discount || 0,
          finalPrice: packageItem.price - (data.discount || 0),
          notes: 'رزرو از طریق وب‌اپلیکیشن تلگرام (TWA)',
        },
        include: { package: true },
      });

      await ctx.reply(
        `✅ نوبت شما با موفقیت ثبت قطعی شد!\n\n` +
        `🌸 پکیج: ${packageItem.name}\n` +
        `📅 تاریخ: ${newAppt.shamsiDate}\n` +
        `⏰ ساعت: ${newAppt.timeSlot}\n` +
        `💰 مبلغ پرداختی: ${newAppt.finalPrice.toLocaleString('fa-IR')} تومان\n\n` +
        `📍 آدرس: یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳\n` +
        `منتظر حضور گرم شما هستیم 💖`
      );
    } catch (err) {
      console.error('Error handling web_app_data:', err);
    }
  });

  // ==========================================
  // FULL STEP-BY-STEP BUTTON BOOKING ENGINE
  // ==========================================

  // Step 1: Start booking -> Select Gender
  bot.callbackQuery('book_direct', async (ctx) => {
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text('🌸 خدمات بانوان', 'book_gender_female')
      .text('⚡ خدمات آقایان', 'book_gender_male')
      .row()
      .text('🔙 بازگشت به منوی اصلی', 'back_to_menu');

    await ctx.reply('لطفاً جنسیت متقاضی نوبت را انتخاب نمایید:', { reply_markup: kb });
  });

  // Step 2: Gender selected -> Select Package
  bot.callbackQuery(/book_gender_(female|male)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const gender = ctx.match[1] === 'female' ? 'FEMALE' : 'MALE';
    const packages = await prisma.servicePackage.findMany({
      where: {
        gender: { in: [gender, 'UNISEX'] },
        isActive: true,
      },
    });

    const kb = new InlineKeyboard();
    for (const p of packages) {
      kb.text(`✨ ${p.name} (${p.price.toLocaleString('fa-IR')} ت)`, `book_pkg_${p.id}`).row();
    }
    kb.text('🔙 بازگشت', 'book_direct');

    const title = gender === 'FEMALE' ? '🌸 پکیج‌های لیزر بانوان (کندلا ۲۰۲۴):' : '⚡ پکیج‌های لیزر آقایان:';
    await ctx.reply(title, { reply_markup: kb });
  });

  // Step 3: Package selected -> Select Date
  bot.callbackQuery(/book_pkg_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const pkgId = ctx.match[1];
    const pkg = await prisma.servicePackage.findUnique({ where: { id: pkgId } });
    if (!pkg) return ctx.reply('پکیج یافت نشد.');

    const upcomingDays = getBotUpcomingDays(6);
    const kb = new InlineKeyboard();

    for (const day of upcomingDays) {
      kb.text(`📅 ${day.display}`, `book_date_${pkgId}_${day.dateStr}`).row();
    }
    kb.text('🔙 انتخاب مجدد پکیج', 'book_direct');

    await ctx.reply(
      `پکیج انتخابی: «${pkg.name}»\n` +
      `تعرفه: ${pkg.price.toLocaleString('fa-IR')} تومان\n\n` +
      `لطفاً تاریخ مراجعه مورد نظر خود را انتخاب نمایید:`,
      { reply_markup: kb }
    );
  });

  // Step 4: Date selected -> Select Time Slot
  bot.callbackQuery(/book_date_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const pkgId = ctx.match[1];
    const dateStr = ctx.match[2];

    const kb = new InlineKeyboard();
    for (let i = 0; i < AVAILABLE_HOURS.length; i += 2) {
      const h1 = AVAILABLE_HOURS[i];
      const h2 = AVAILABLE_HOURS[i + 1];
      kb.text(`⏰ ${h1}`, `book_time_${pkgId}_${dateStr}_${h1}`);
      if (h2) {
        kb.text(`⏰ ${h2}`, `book_time_${pkgId}_${dateStr}_${h2}`);
      }
      kb.row();
    }
    kb.text('🔙 تغییر تاریخ', `book_pkg_${pkgId}`);

    await ctx.reply(`تاریخ انتخابی: ${dateStr}\nلطفاً ساعت مراجعه را تعیین فرمایید:`, {
      reply_markup: kb,
    });
  });

  // Step 5: Time selected -> Review & Confirm
  bot.callbackQuery(/book_time_(.+)_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const pkgId = ctx.match[1];
    const dateStr = ctx.match[2];
    const timeSlot = ctx.match[3];

    const pkg = await prisma.servicePackage.findUnique({ where: { id: pkgId } });
    if (!pkg) return ctx.reply('پکیج یافت نشد.');

    const telegramId = BigInt(ctx.from.id);
    const client = await prisma.client.findUnique({ where: { telegramId } });
    const discount = client?.loyaltyPoints ? Math.min(client.loyaltyPoints * 1000, 100000) : 0;
    const finalPrice = Math.max(0, pkg.price - discount);

    const summaryText =
      `📋 خلاصه پیش‌فاکتور نوبت لیزر شما 📋\n\n` +
      `🌸 نام پکیج: ${pkg.name}\n` +
      `⚡ دستگاه: الکساندرایت کندلا ۲۰۲۴ مجهز به کولینگ DCD\n` +
      `📅 تاریخ نوبت: ${dateStr}\n` +
      `⏰ ساعت مراجعه: ${timeSlot}\n` +
      `💰 تعرفه پایه: ${pkg.price.toLocaleString('fa-IR')} تومان\n` +
      `🎁 تخفیف باشگاه مشتریان: ${discount.toLocaleString('fa-IR')} تومان\n` +
      `💎 مبلغ قابل پرداخت در کلینیک: ${finalPrice.toLocaleString('fa-IR')} تومان\n\n` +
      `آیا مایل به ثبت قطعی نوبت می‌باشید؟`;

    const kb = new InlineKeyboard()
      .text('✅ تایید و ثبت نهایی نوبت', `confirm_booking_${pkgId}_${dateStr}_${timeSlot}`)
      .row()
      .text('❌ انصراف و بازگشت', 'back_to_menu');

    await ctx.reply(summaryText, { reply_markup: kb });
  });

  // Step 6: Final Confirmation Callback
  bot.callbackQuery(/confirm_booking_(.+)_(.+)_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const pkgId = ctx.match[1];
    const dateStr = ctx.match[2];
    const timeSlot = ctx.match[3];

    const telegramId = BigInt(ctx.from.id);
    let client = await prisma.client.findUnique({ where: { telegramId } });
    if (!client) {
      return ctx.reply('ابتدا شماره خود را با دکمه ارسال شماره تایید کنید.');
    }

    const pkg = await prisma.servicePackage.findUnique({ where: { id: pkgId } });
    if (!pkg) return ctx.reply('پکیج یافت نشد.');

    const discount = client.loyaltyPoints ? Math.min(client.loyaltyPoints * 1000, 100000) : 0;
    const finalPrice = Math.max(0, pkg.price - discount);

    // Parse Jalali date to gregorian
    let isoDate = new Date();
    try {
      const parts = dateStr.split('/').map((x: string) => parseInt(x, 10));
      if (parts.length === 3) {
        const g = jalaali.toGregorian(parts[0], parts[1], parts[2]);
        isoDate = new Date(g.gy, g.gm - 1, g.gd);
      }
    } catch (e) {
      isoDate = new Date();
    }

    const newAppt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        packageId: pkg.id,
        appointmentDate: isoDate,
        shamsiDate: dateStr,
        timeSlot,
        status: 'CONFIRMED',
        price: pkg.price,
        discountAmount: discount,
        finalPrice,
        notes: 'رزرو مستقیم از طریق دکمه‌های ربات تلگرام',
      },
    });

    const receipt =
      `🎉 نوبت شما با موفقیت قطعی شد! 🎉\n\n` +
      `👤 مراجع: ${client.firstName} ${client.lastName}\n` +
      `🌸 پکیج: ${pkg.name}\n` +
      `📅 تاریخ: ${dateStr}\n` +
      `⏰ ساعت: ${timeSlot}\n` +
      `💰 مبلغ پرداختی: ${finalPrice.toLocaleString('fa-IR')} تومان\n\n` +
      `⚠️ یادآوری‌های مهم:\n` +
      `۱. ۲۴ ساعت قبل با ژیلت شیو بفرمایید.\n` +
      `۲. از هیچ‌گونه لوسیون، مام یا کرم در روز مراجعه استفاده نشود.\n` +
      `۳. پیامک و پیام تلگرام یادآوری ۲۴ ساعت قبل برای شما ارسال خواهد شد.\n\n` +
      `📍 آدرس: یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳\n` +
      `☎️ تلفن: ۰۳۵-۳۸۲۶۰۰۰۰`;

    const kb = new InlineKeyboard()
      .text('📋 سوابق نوبت‌های من', 'my_appointments')
      .row()
      .text('❌ لغو این نوبت', `cancel_appt_${newAppt.id}`)
      .row()
      .text('🏠 بازگشت به منوی اصلی', 'back_to_menu');

    await ctx.reply(receipt, { reply_markup: kb });
  });

  // View My Appointments via Buttons
  bot.callbackQuery('my_appointments', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: { package: true },
          take: 5,
        },
      },
    });

    if (!client || client.appointments.length === 0) {
      const kb = new InlineKeyboard()
        .text('🗓 رزرو نوبت جدید', 'book_direct')
        .row()
        .text('🏠 بازگشت به منو', 'back_to_menu');
      return ctx.reply('شما در حال حاضر نوبت ثبت‌شده‌ای ندارید.', { reply_markup: kb });
    }

    let text = `📋 فهرست نوبت‌های شما در کلینیک آلما:\n\n`;
    const kb = new InlineKeyboard();

    for (const a of client.appointments) {
      text += `✨ پکیج: ${a.package.name}\n`;
      text += `📅 تاریخ: ${a.shamsiDate} ساعت ${a.timeSlot}\n`;
      text += `وضعیت: ${getStatusTitle(a.status)}\n`;
      text += `مبلغ: ${a.finalPrice.toLocaleString('fa-IR')} تومان\n`;
      text += `----------------------------\n`;

      if (a.status === 'CONFIRMED' || a.status === 'PENDING') {
        kb.text(`❌ لغو نوبت ${a.shamsiDate}`, `cancel_appt_${a.id}`).row();
      }
    }

    kb.text('🗓 رزرو نوبت جدید', 'book_direct').row();
    kb.text('🏠 بازگشت به منوی اصلی', 'back_to_menu');

    await ctx.reply(text, { reply_markup: kb });
  });

  // Cancel Appointment Callback
  bot.callbackQuery(/cancel_appt_(.+)/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const apptId = ctx.match[1];
    try {
      await prisma.appointment.update({
        where: { id: apptId },
        data: { status: 'CANCELLED' },
      });
      const kb = new InlineKeyboard().text('🏠 بازگشت به منوی اصلی', 'back_to_menu');
      await ctx.reply('نوبت مورد نظر با موفقیت لغو شد. در صورت تمایل می‌توانید در زمان دیگری نوبت جدید رزرو فرمایید.', { reply_markup: kb });
    } catch (e) {
      await ctx.reply('خطا در لغو نوبت.');
    }
  });

  // View Profile Callback
  bot.callbackQuery('my_profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          include: { package: true },
          take: 1,
        },
      },
    });
    if (!client) return ctx.reply('ابتدا شماره خود را تایید کنید.');
    return showRegisteredUserDashboard(ctx, client);
  });

  // Price list with direct booking buttons
  bot.callbackQuery('view_prices', async (ctx) => {
    await ctx.answerCallbackQuery();
    const packages = await prisma.servicePackage.findMany({
      where: { isActive: true },
      orderBy: { price: 'desc' },
    });

    let msg = `💎 لیست تعرفه خدمات کلینیک آلما یزد (دستگاه کندلا ۲۰۲۴) 💎\n\n`;
    for (const p of packages) {
      msg += `✨ ${p.name}\n`;
      msg += `⏱ مدت: ${p.durationMinutes} دقیقه | 💰 تعرفه: ${p.price.toLocaleString('fa-IR')} تومان\n`;
      if (p.description) msg += `▫️ ${p.description}\n`;
      msg += `----------------------------\n`;
    }

    const kb = new InlineKeyboard()
      .text('🗓 رزرو مستقیم پکیج‌ها با دکمه', 'book_direct')
      .row()
      .webApp('📱 یا مشاهده ۳ بعدی در وب‌اپلیکیشن', config.webAppUrl)
      .row()
      .text('🏠 منوی اصلی', 'back_to_menu');

    await ctx.reply(msg, { reply_markup: kb });
  });

  // Care guide callback
  bot.callbackQuery('care_guide', async (ctx) => {
    await ctx.answerCallbackQuery();
    const guideText =
      `📋 راهنمای جامع مراقبت‌های قبل و بعد لیزر آلما 📋\n\n` +
      `🌸 قبل از لیزر:\n` +
      `• ۲۴ ساعت قبل، ناحیه مورد نظر را با تیغ یا ژیلت تمیز بتراشید.\n` +
      `• از اپیلاسیون، موم و بند حداقل ۴ هفته قبل از جلسه خودداری کنید.\n` +
      `• حداقل ۳ هفته قبل، از سولاریوم یا آفتاب گرفتن پرهیز کنید.\n` +
      `• در روز مراجعه از کرم، دئودورانت و بادی‌اسپلش استفاده نکنید.\n\n` +
      `🌿 بعد از لیزر:\n` +
      `• تا ۲۴ ساعت از دوش آب گرم، استخر، سونا و ورزش خودداری نمایید.\n` +
      `• در صورت سوزش از کرم زینک اکساید یا ژل خنک‌کننده استفاده فرمایید.\n` +
      `• از ضدآفتاب بدون رنگ استفاده کنید و هر ۳ ساعت تمدید نمایید.\n` +
      `• فواصل بین جلسات (معمولاً ۴ الی ۶ هفته) را منظم رعایت فرمایید.`;

    const kb = new InlineKeyboard()
      .text('🗓 رزرو نوبت', 'book_direct')
      .row()
      .text('🏠 منوی اصلی', 'back_to_menu');

    await ctx.reply(guideText, { reply_markup: kb });
  });

  // Clinic location callback
  bot.callbackQuery('clinic_location', async (ctx) => {
    await ctx.answerCallbackQuery();
    const lat = 31.9056;
    const lon = 54.3412;

    try {
      await ctx.replyWithLocation(lat, lon);
    } catch (e) {
      // location fallback if client doesn't support maps
    }
    const kb = new InlineKeyboard()
      .text('📞 تماس با منشی', 'contact_secretary')
      .row()
      .text('🏠 منوی اصلی', 'back_to_menu');

    await ctx.reply(
      `📍 کلینیک لیزر آلما یزد\n` +
      `یزد، بلوار جمهوری اسلامی، نبش کوچه یاسمن، ساختمان سپهر، طبقه سوم\n` +
      `📞 تلفن نوبت‌دهی: ۰۳۵-۳۸۲۶۰۰۰۰\n` +
      `📱 همراه منشی: ۰۹۱۳۱۵۱۰۰۰۰\n` +
      `⏰ ساعت کاری: شنبه تا چهارشنبه ۹ تا ۲۱ | پنجشنبه‌ها ۹ تا ۱۶`,
      { reply_markup: kb }
    );
  });

  // Contact secretary callback
  bot.callbackQuery('contact_secretary', async (ctx) => {
    await ctx.answerCallbackQuery();
    const kb = new InlineKeyboard()
      .text('🗓 رزرو مستقیم نوبت', 'book_direct')
      .row()
      .text('🏠 منوی اصلی', 'back_to_menu');

    await ctx.reply(
      `📞 ارتباط مستقیم با پذیرش کلینیک آلما:\n\n` +
      `☎️ تلفن ثابت: ۰۳۵-۳۸۲۶۰۰۰۰\n` +
      `📱 شماره همراه و واتساپ منشی: ۰۹۱۳۱۵۱۰۰۰۰\n` +
      `💬 آیدی پاسخگویی تلگرام: @AlmaClinicAdmin\n\n` +
      `همکاران ما در ساعات کاری کلینیک مشتاقانه پاسخگوی شما عزیزان هستند.`,
      { reply_markup: kb }
    );
  });

  // Back to Menu Callback
  bot.callbackQuery('back_to_menu', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        appointments: {
          where: {
            status: { in: ['CONFIRMED', 'WAITING', 'IN_PROGRESS', 'PENDING'] },
          },
          include: { package: true, operator: true },
          orderBy: { appointmentDate: 'asc' },
          take: 1,
        },
      },
    });
    if (client) {
      return showRegisteredUserDashboard(ctx, client);
    }
  });

  // Start bot polling
  bot.start({
    onStart(botInfo) {
      console.log(`🤖 Telegram Bot started successfully as @${botInfo.username}`);
    },
  }).catch((err) => {
    console.error('Bot launch failed:', err.message);
  });
}

// Helper to render user dashboard with both Button & WebApp options
async function showRegisteredUserDashboard(ctx: any, client: any) {
  const upcoming = client.appointments?.[0];
  let upcomingText = '🔸 در حال حاضر نوبت رزرو شده‌ای ندارید.';
  if (upcoming) {
    upcomingText = `🗓 نوبت آینده شما:\n` +
      `✨ پکیج: ${upcoming.package.name}\n` +
      `📅 تاریخ: ${upcoming.shamsiDate}\n` +
      `⏰ ساعت: ${upcoming.timeSlot}\n` +
      `وضعیت: ${getStatusTitle(upcoming.status)}`;
  }

  const message =
    `✨ کلینیک لیزر آلما یزد ✨\n\n` +
    `سلام ${client.firstName} ${client.lastName} عزیز، خوش آمدید 💖\n\n` +
    `👤 مشخصات پرونده شما:\n` +
    `📱 شماره همراه: ${client.phone}\n` +
    `💎 تعداد جلسات انجام شده: ${client.totalSessions} جلسه\n` +
    `🎁 امتیاز باشگاه مشتریان: ${client.loyaltyPoints} امتیاز\n\n` +
    `${upcomingText}\n\n` +
    `جهت ثبت نوبت یا دسترسی به خدمات، یکی از گزینه‌های زیر را انتخاب نمایید:`;

  const webAppLaunchUrl = `${config.webAppUrl}?clientId=${client.id}&phone=${client.phone}`;

  const keyboard = new InlineKeyboard()
    .text('🗓 رزرو نوبت مستقیم (با دکمه‌های بات)', 'book_direct')
    .row()
    .webApp('🚀 یا باز کردن وب‌اپلیکیشن ۳ بعدی (TWA)', webAppLaunchUrl)
    .row()
    .text('📋 سوابق نوبت‌های من', 'my_appointments')
    .text('💎 تعرفه پکیج‌ها', 'view_prices')
    .row()
    .text('📋 مراقبت‌های قبل و بعد', 'care_guide')
    .text('📍 لوکیشن کلینیک یزد', 'clinic_location')
    .row()
    .text('📞 تماس با منشی', 'contact_secretary');

  await ctx.reply(message, {
    reply_markup: keyboard,
  });
}

function getStatusTitle(status: string): string {
  switch (status) {
    case 'CONFIRMED': return 'تایید شده ✅';
    case 'WAITING': return 'در انتظار پذیرش ⏳';
    case 'IN_PROGRESS': return 'در حال انجام لیزر ⚡';
    case 'COMPLETED': return 'انجام شد ✔️';
    case 'CANCELLED': return 'لغو شده ❌';
    default: return 'در انتظار تایید منشی 🟡';
  }
}
