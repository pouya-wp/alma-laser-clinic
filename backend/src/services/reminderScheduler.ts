import cron from 'node-cron';
import { prisma } from '../prisma.js';
import { bot } from '../bot/telegramBot.js';

export function startReminderScheduler() {
  console.log('⏰ Starting Alma Automated Reminder Cron Engine...');

  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await process24hReminders();
      await process2hReminders();
      await processPostCareReminders();
      await processNextSessionDueReminders();
    } catch (err) {
      console.error('Error running reminder cron:', err);
    }
  });
}

// 1. Remind 24 hours before appointment
async function process24hReminders() {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSent24h: false,
      appointmentDate: {
        gte: now,
        lte: next24h,
      },
    },
    include: {
      client: true,
      package: true,
    },
  });

  for (const appt of appointments) {
    const text = `🌸 یادآوری نوبت لیزر در کلینیک آلما یزد 🌸\n\n` +
      `سلام ${appt.client.firstName} عزیز،\n` +
      `فردا نوبت لیزر شما برای پکیج «${appt.package.name}» رزرو شده است.\n\n` +
      `📅 تاریخ: ${appt.shamsiDate}\n` +
      `⏰ ساعت: ${appt.timeSlot}\n\n` +
      `⚠️ نکات مهم قبل از مراجعه:\n` +
      `۱. لطفاً موهای ناحیه مورد نظر را ۲۴ ساعت قبل با ژیلت شیو نمایید.\n` +
      `۲. از هیچ‌گونه لوسیون، کرم، مام یا بادی‌اسپلش روی موضع استفاده نکنید.\n` +
      `۳. در صورت مصرف داروی خاص یا سابقه آفتاب گرفتن، حتماً پیش از شروع به اپراتور اطلاع دهید.\n\n` +
      `📍 آدرس: یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳`;

    let sent = false;
    if (appt.client.telegramId && bot) {
      try {
        await bot.api.sendMessage(Number(appt.client.telegramId), text);
        sent = true;
      } catch (e) {
        console.warn(`Could not send telegram message to ${appt.client.phone}:`, e);
      }
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSent24h: true },
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: appt.id,
        clientId: appt.clientId,
        reminderType: 'PRE_24H',
        status: sent ? 'SENT' : 'LOGGED',
        channel: 'TELEGRAM',
        messageText: text,
      },
    });
  }
}

// 2. Remind 2 hours before appointment
async function process2hReminders() {
  const now = new Date();
  const next2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSent2h: false,
      appointmentDate: {
        gte: now,
        lte: next2h,
      },
    },
    include: {
      client: true,
      package: true,
    },
  });

  for (const appt of appointments) {
    const text = `⏰ یادآوری: ۲ ساعت تا نوبت شما در کلینیک آلما\n\n` +
      `${appt.client.firstName} عزیز، نوبت شما ساعت ${appt.timeSlot} امروز می‌باشد.\n` +
      `لطفاً ۱۰ دقیقه پیش از موعد در کلینیک حضور داشته باشید تا پذیرش شما به سرعت انجام شود.\n\n` +
      `منتظر دیدار شما هستیم 💖`;

    let sent = false;
    if (appt.client.telegramId && bot) {
      try {
        await bot.api.sendMessage(Number(appt.client.telegramId), text);
        sent = true;
      } catch (e) {
        console.warn(`Could not send 2h reminder to ${appt.client.phone}`);
      }
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { reminderSent2h: true },
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: appt.id,
        clientId: appt.clientId,
        reminderType: 'PRE_2H',
        status: sent ? 'SENT' : 'LOGGED',
        channel: 'TELEGRAM',
        messageText: text,
      },
    });
  }
}

// 3. Post-care guidance 2 hours after completion
async function processPostCareReminders() {
  const appointments = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      postCareSent: false,
    },
    include: {
      client: true,
    },
    take: 10,
  });

  for (const appt of appointments) {
    const text = `🌿 مراقبت‌های پس از لیزر - کلینیک آلما 🌿\n\n` +
      `${appt.client.firstName} عزیز، با آرزوی تجربه‌ای خوش از جلسه امروز:\n\n` +
      `۱. تا ۲۴ ساعت از دوش با آب داغ، سونا، جکوزی و ورزش سنگین خودداری نمایید.\n` +
      `۲. در صورت احساس سوزش یا قرمزی خفیف، کرم زینک اکساید یا ژل خنک‌کننده آلوئه‌ورا استفاده فرمایید.\n` +
      `۳. برای نواحی در معرض نور (صورت و دست)، ضدآفتاب بدون رنگ را هر ۳ ساعت تمدید کنید.\n` +
      `۴. موهای لیزر شده طی ۱۰ الی ۱۴ روز آینده به تدریج ریزش خواهند داشت.\n\n` +
      `✨ رضایت شما اولویت ماست. هرگونه سوالی داشتید با ما در میان بگذارید!`;

    let sent = false;
    if (appt.client.telegramId && bot) {
      try {
        await bot.api.sendMessage(Number(appt.client.telegramId), text);
        sent = true;
      } catch (e) {
        console.warn(`Post-care reminder failed for ${appt.client.phone}`);
      }
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { postCareSent: true },
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: appt.id,
        clientId: appt.clientId,
        reminderType: 'POST_CARE',
        status: sent ? 'SENT' : 'LOGGED',
        channel: 'TELEGRAM',
        messageText: text,
      },
    });
  }
}

// 4. Alert when next session is due (4-5 weeks after last session)
async function processNextSessionDueReminders() {
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const completedAppts = await prisma.appointment.findMany({
    where: {
      status: 'COMPLETED',
      nextSessionDueSent: false,
      appointmentDate: {
        lte: fourWeeksAgo,
      },
    },
    include: {
      client: true,
    },
  });

  for (const appt of completedAppts) {
    const text = `✨ زمان طلایی تمدید جلسه لیزر در کلینیک آلما ✨\n\n` +
      `${appt.client.firstName} عزیز سلام،\n` +
      `حدود ۴ هفته از آخرین جلسه لیزر شما گذشته است. برای دستیابی به حداکثر نتیجه و نابودی کامل فولیکول‌های فعال مو، اکنون بهترین زمان برای رزرو جلسه بعدی شماست.\n\n` +
      `📲 همین حالا می‌توانید از دکمه «رزرو نوبت جدید» در ربات، یا تماس با منشی کلینیک نوبت خود را تثبیت کنید.`;

    let sent = false;
    if (appt.client.telegramId && bot) {
      try {
        await bot.api.sendMessage(Number(appt.client.telegramId), text);
        sent = true;
      } catch (e) {
        console.warn(`Next session reminder failed for ${appt.client.phone}`);
      }
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: { nextSessionDueSent: true },
    });

    await prisma.reminderLog.create({
      data: {
        appointmentId: appt.id,
        clientId: appt.clientId,
        reminderType: 'NEXT_SESSION_INTERVAL',
        status: sent ? 'SENT' : 'LOGGED',
        channel: 'TELEGRAM',
        messageText: text,
      },
    });
  }
}
