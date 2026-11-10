import { Bot, Keyboard, InlineKeyboard } from 'grammy';
import { prisma } from '../prisma.js';
import { config, normalizePhone } from '../config/index.js';
import jalaali from 'jalaali-js';

// In-memory state tracking for multi-step bot registration if needed
const userStates = new Map<number, { step: string; phone?: string; firstName?: string; lastName?: string }>();

export const bot = config.botToken ? new Bot(config.botToken) : null;

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
    const tgLastName = ctx.from?.last_name || '';

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
      // User is already recognized!
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
      `برای دسترسی به سوابق جلسات، مشاهده پرونده و رزرو فوق‌سریع نوبت، لطفاً با کلیک روی دکمه زیر شماره همراه خود را تایید نمایید:`,
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

    // Check if this phone number already exists in DB
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
      // Client exists in DB! Link their Telegram ID
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          telegramId,
          telegramUsername: username,
        },
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
      // New Client! Automatically register them
      const newClient = await prisma.client.create({
        data: {
          telegramId,
          telegramUsername: username,
          firstName: tgFirstName,
          lastName: tgLastName,
          phone,
          gender: 'FEMALE', // default, can change
          totalSessions: 0,
          loyaltyPoints: 100, // 100 Welcome Points
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
        .webApp('✨ رزرو آنلاین نوبت (وب‌اپلیکیشن آلما)', `${config.webAppUrl}?clientId=${newClient.id}`)
        .row()
        .text('🗓 انتخاب پکیج و رزرو در ربات', 'book_direct')
        .text('💎 لیست قیمت و تخفیف‌ها', 'view_prices')
        .row()
        .text('📍 لوکیشن کلینیک یزد', 'clinic_location')
        .text('📞 تماس با منشی', 'contact_secretary');

      await ctx.reply(
        `🎉 خوش آمدید به خانواده کلینیک آلما! 🎉\n\n` +
        `👤 حساب کاربری شما با موفقیت فعال شد.\n` +
        `🎁 هدیه عضویت شما: ۱۰۰ امتیاز باشگاه مشتریان آلما (معادل ۱۰۰ هزار تومان تخفیف در اولین مراجعه)\n\n` +
        `اکنون می‌توانید با استفاده از وب‌اپلیکیشن یا دکمه‌های زیر، اولین نوبت خود را رزرو فرمایید:`,
        {
          reply_markup: welcomeKeyboard,
        }
      );
    }
  });

  // Handle Telegram WebApp Data (when booking from inside TWA Mini App)
  bot.on('message:web_app_data', async (ctx) => {
    try {
      const dataStr = ctx.message.web_app_data.data;
      const data = JSON.parse(dataStr);
      const telegramId = BigInt(ctx.from.id);

      const client = await prisma.client.findUnique({
        where: { telegramId },
      });

      if (!client) {
        return ctx.reply('خطا: ابتدا شماره همراه خود را تایید نمایید.');
      }

      // Create appointment from webapp data
      const packageItem = await prisma.servicePackage.findUnique({
        where: { id: data.packageId },
      });

      if (!packageItem) {
        return ctx.reply('پکیج مورد نظر یافت نشد.');
      }

      const apptDate = new Date(data.dateIso || new Date());
      const newAppt = await prisma.appointment.create({
        data: {
          clientId: client.id,
          packageId: packageItem.id,
          appointmentDate: apptDate,
          shamsiDate: data.shamsiDate || 'نامشخص',
          timeSlot: data.timeSlot || '17:00',
          status: 'PENDING',
          price: packageItem.price,
          discountAmount: data.discount || 0,
          finalPrice: packageItem.price - (data.discount || 0),
          notes: 'رزرو شده از طریق وب‌اپلیکیشن تلگرام (TWA)',
        },
        include: {
          package: true,
        },
      });

      await ctx.reply(
        `✅ نوبت شما با موفقیت ثبت اولیه شد!\n\n` +
        `🌸 پکیج: ${packageItem.name}\n` +
        `📅 تاریخ: ${newAppt.shamsiDate}\n` +
        `⏰ ساعت: ${newAppt.timeSlot}\n` +
        `💰 مبلغ: ${newAppt.finalPrice.toLocaleString('fa-IR')} تومان\n\n` +
        `مسئول پذیرش کلینیک نوبت شما را بررسی و پیامک/پیام تاییدیه برایتان ارسال خواهد شد.`
      );
    } catch (err) {
      console.error('Error handling web_app_data:', err);
      await ctx.reply('متاسفانه در پردازش اطلاعات نوبت خطایی رخ داد.');
    }
  });

  // Inline button callbacks
  bot.callbackQuery('my_profile', async (ctx) => {
    await ctx.answerCallbackQuery();
    const telegramId = BigInt(ctx.from.id);
    const client = await prisma.client.findUnique({
      where: { telegramId },
      include: {
        appointments: {
          orderBy: { createdAt: 'desc' },
          include: { package: true },
          take: 5,
        },
      },
    });
    if (!client) return ctx.reply('ابتدا شماره خود را تایید کنید.');
    return showRegisteredUserDashboard(ctx, client);
  });

  bot.callbackQuery('view_prices', async (ctx) => {
    await ctx.answerCallbackQuery();
    const packages = await prisma.servicePackage.findMany({
      where: { isActive: true },
      orderBy: { price: 'desc' },
    });

    let msg = `💎 لیست پکیج‌های تخصصی کلینیک آلما (دستگاه کندلا ۲۰۲۴) 💎\n\n`;
    for (const p of packages) {
      msg += `✨ ${p.name}\n`;
      msg += `⏱ مدت: ${p.durationMinutes} دقیقه | 💰 تعرفه: ${p.price.toLocaleString('fa-IR')} تومان\n`;
      if (p.description) msg += `▫️ ${p.description}\n`;
      msg += `----------------------------\n`;
    }

    const kb = new InlineKeyboard().webApp('📱 رزرو آنلاین نوبت در وب‌اپلیکیشن', config.webAppUrl);
    await ctx.reply(msg, { reply_markup: kb });
  });

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

    await ctx.reply(guideText);
  });

  bot.callbackQuery('clinic_location', async (ctx) => {
    await ctx.answerCallbackQuery();
    // Yazd Alma Clinic coordinates (Boulevard Jomhouri)
    const lat = 31.9056;
    const lon = 54.3412;

    await ctx.replyLocation(lat, lon);
    await ctx.reply(
      `📍 کلینیک لیزر آلما یزد\n` +
      `یزد، بلوار جمهوری اسلامی، نبش کوچه یاسمن، ساختمان سپهر، طبقه سوم\n` +
      `📞 تلفن نوبت‌دهی: ۰۳۵-۳۸۲۶۰۰۰۰\n` +
      `📱 همراه منشی: ۰۹۱۳۱۵۱۰۰۰۰\n` +
      `⏰ ساعت کاری: شنبه تا چهارشنبه ۹ تا ۲۱ | پنجشنبه‌ها ۹ تا ۱۶`
    );
  });

  bot.callbackQuery('contact_secretary', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `📞 ارتباط مستقیم با پذیرش کلینیک آلما:\n\n` +
      `☎️ تلفن ثابت: ۰۳۵-۳۸۲۶۰۰۰۰\n` +
      `📱 شماره همراه و واتساپ منشی: ۰۹۱۳۱۵۱۰۰۰۰\n` +
      `💬 آیدی پاسخگویی تلگرام: @AlmaClinicAdmin\n\n` +
      `همکاران ما در ساعات کاری کلینیک مشتاقانه پاسخگوی شما عزیزان هستند.`
    );
  });

  bot.callbackQuery('book_direct', async (ctx) => {
    await ctx.answerCallbackQuery();
    const packages = await prisma.servicePackage.findMany({
      where: { isActive: true },
      take: 6,
    });

    const kb = new InlineKeyboard();
    for (const p of packages) {
      kb.text(`🌸 ${p.name} (${p.price.toLocaleString('fa-IR')} ت)`, `select_pkg_${p.id}`).row();
    }
    kb.webApp('🌟 باز کردن وب‌اپلیکیشن اختصاصی آلما', config.webAppUrl);

    await ctx.reply('لطفاً پکیج لیزر مورد نظر خود را انتخاب فرمایید:', {
      reply_markup: kb,
    });
  });

  // Start bot with polling in dev
  bot.start({
    onStart(botInfo) {
      console.log(`🤖 Telegram Bot started successfully as @${botInfo.username}`);
    },
  }).catch((err) => {
    console.error('Bot launch failed:', err.message);
  });
}

// Helper to render user dashboard
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
    `👤 مشخصات پرونده:\n` +
    `📱 شماره همراه: ${client.phone}\n` +
    `💎 تعداد جلسات انجام شده: ${client.totalSessions} جلسه\n` +
    `🎁 امتیاز باشگاه مشتریان: ${client.loyaltyPoints} امتیاز\n\n` +
    `${upcomingText}\n\n` +
    `جهت رزرو نوبت، مشاهده تقویم یا جزئیات پرونده یکی از گزینه‌های زیر را انتخاب نمایید:`;

  const webAppLaunchUrl = `${config.webAppUrl}?clientId=${client.id}&phone=${client.phone}`;

  const keyboard = new InlineKeyboard()
    .webApp('🚀 ورود به وب‌اپلیکیشن هوشمند آلما (TWA)', webAppLaunchUrl)
    .row()
    .text('🗓 رزرو نوبت جدید', 'book_direct')
    .text('📋 مراقبت‌های لیزر', 'care_guide')
    .row()
    .text('💎 تعرفه پکیج‌ها', 'view_prices')
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
