import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { bot } from '../bot/telegramBot.js';

export async function getSettings(req: Request, res: Response) {
  try {
    const settings = await prisma.clinicSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      map[s.key] = s.value;
    }
    return res.json({ settings: map });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در دریافت تنظیمات.' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    const { settings } = req.body; // { KEY: "value" }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'فرمت تنظیمات نامعتبر است.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      await prisma.clinicSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    return res.json({ success: true, message: 'تنظیمات با موفقیت ذخیره گردید.' });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در ذخیره تنظیمات.' });
  }
}

export async function sendBroadcast(req: Request, res: Response) {
  try {
    const { messageText, target = 'ALL' } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'متن پیام الزامی است.' });
    }

    const where: any = {
      telegramId: { not: null },
    };
    if (target === 'FEMALE') where.gender = 'FEMALE';
    if (target === 'MALE') where.gender = 'MALE';

    const clients = await prisma.client.findMany({
      where,
      select: { id: true, telegramId: true, firstName: true },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const client of clients) {
      if (client.telegramId && bot) {
        try {
          const personalized = `سلام ${client.firstName} عزیز،\n\n${messageText}`;
          await bot.api.sendMessage(Number(client.telegramId), personalized);
          sentCount++;
          await prisma.reminderLog.create({
            data: {
              clientId: client.id,
              reminderType: 'BROADCAST',
              status: 'SENT',
              channel: 'TELEGRAM',
              messageText,
            },
          });
        } catch (e) {
          failedCount++;
        }
      }
    }

    return res.json({
      success: true,
      totalMatched: clients.length,
      sentCount,
      failedCount,
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    return res.status(500).json({ error: 'خطا در ارسال پیام همگانی.' });
  }
}
