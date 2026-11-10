import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import jalaali from 'jalaali-js';
import { bot } from '../bot/telegramBot.js';

export async function getAppointments(req: Request, res: Response) {
  try {
    const { date, shamsiDate, status, clientId, limit } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
    }
    if (clientId) {
      where.clientId = String(clientId);
    }
    if (shamsiDate) {
      where.shamsiDate = String(shamsiDate);
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: true,
        package: true,
        operator: true,
        device: true,
      },
      orderBy: [
        { shamsiDate: 'desc' },
        { timeSlot: 'asc' },
      ],
      take: limit ? parseInt(String(limit), 10) : 100,
    });

    return res.json({ appointments });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({ error: 'خطا در دریافت لیست نوبت‌ها.' });
  }
}

export async function createAppointment(req: Request, res: Response) {
  try {
    const {
      clientId,
      packageId,
      operatorId,
      deviceId,
      shamsiDate,
      timeSlot,
      price,
      discountAmount = 0,
      notes,
      paymentMethod,
      paidAmount = 0,
      status = 'CONFIRMED',
    } = req.body;

    if (!clientId || !packageId || !shamsiDate || !timeSlot) {
      return res.status(400).json({ error: 'اطلاعات مشتری، پکیج، تاریخ و ساعت الزامی است.' });
    }

    const pkg = await prisma.servicePackage.findUnique({ where: { id: packageId } });
    if (!pkg) {
      return res.status(404).json({ error: 'پکیج لیزر انتخاب شده یافت نشد.' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      return res.status(404).json({ error: 'مشتری مورد نظر یافت نشد.' });
    }

    // Convert shamsiDate (e.g. 1405/08/21) to Gregorian Date
    let isoDate = new Date();
    try {
      const parts = shamsiDate.split('/').map((p: string) => parseInt(p, 10));
      if (parts.length === 3) {
        const g = jalaali.toGregorian(parts[0], parts[1], parts[2]);
        isoDate = new Date(g.gy, g.gm - 1, g.gd);
      }
    } catch (e) {
      isoDate = new Date();
    }

    const actualPrice = price !== undefined ? Number(price) : pkg.price;
    const finalPrice = Math.max(0, actualPrice - Number(discountAmount));

    const appointment = await prisma.appointment.create({
      data: {
        clientId,
        packageId,
        operatorId: operatorId || null,
        deviceId: deviceId || null,
        appointmentDate: isoDate,
        shamsiDate,
        timeSlot,
        status,
        price: actualPrice,
        discountAmount: Number(discountAmount),
        finalPrice,
        paidAmount: Number(paidAmount),
        paymentMethod: paymentMethod || null,
        notes: notes || null,
      },
      include: {
        client: true,
        package: true,
        operator: true,
        device: true,
      },
    });

    // Notify client via Telegram if linked
    if (client.telegramId && bot) {
      try {
        const notifyMsg =
          `🌸 رزرو نوبت شما در کلینیک آلما تایید شد 🌸\n\n` +
          `سلام ${client.firstName} عزیز، نوبت شما با مشخصات زیر ثبت گردید:\n` +
          `💎 پکیج: ${pkg.name}\n` +
          `📅 تاریخ: ${shamsiDate}\n` +
          `⏰ ساعت: ${timeSlot}\n` +
          `💰 مبلغ: ${finalPrice.toLocaleString('fa-IR')} تومان\n\n` +
          `📍 آدرس: یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳`;
        await bot.api.sendMessage(Number(client.telegramId), notifyMsg);
      } catch (tgErr) {
        console.warn('Telegram notification failed:', tgErr);
      }
    }

    return res.status(201).json({ appointment });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return res.status(500).json({ error: 'خطا در ثبت نوبت جدید.' });
  }
}

export async function updateAppointmentStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, paymentMethod, paidAmount } = req.body;

    const existing = await prisma.appointment.findUnique({
      where: { id },
      include: { client: true, package: true, device: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'نوبت یافت نشد.' });
    }

    const updateData: any = { status };
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (paidAmount !== undefined) updateData.paidAmount = Number(paidAmount);

    const updated = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { client: true, package: true, operator: true, device: true },
    });

    // If marked as COMPLETED, increment client totalSessions and award loyalty points
    if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      await prisma.client.update({
        where: { id: existing.clientId },
        data: {
          totalSessions: { increment: 1 },
          loyaltyPoints: { increment: 50 }, // 50 loyalty points per completed session
        },
      });

      // Increment laser device shot count (average 800 shots for full body, 300 for normal)
      if (existing.deviceId) {
        const estimatedShots = existing.package.durationMinutes * 25;
        await prisma.laserDevice.update({
          where: { id: existing.deviceId },
          data: {
            shotCount: { increment: estimatedShots },
          },
        });
      }
    }

    return res.json({ appointment: updated });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'خطا در تغییر وضعیت نوبت.' });
  }
}

export async function updateAppointment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      operatorId,
      deviceId,
      shamsiDate,
      timeSlot,
      price,
      discountAmount,
      paidAmount,
      paymentMethod,
      notes,
    } = req.body;

    const data: any = {};
    if (operatorId !== undefined) data.operatorId = operatorId;
    if (deviceId !== undefined) data.deviceId = deviceId;
    if (shamsiDate) data.shamsiDate = shamsiDate;
    if (timeSlot) data.timeSlot = timeSlot;
    if (price !== undefined) data.price = Number(price);
    if (discountAmount !== undefined) {
      data.discountAmount = Number(discountAmount);
      data.finalPrice = Math.max(0, (data.price || 0) - Number(discountAmount));
    }
    if (paidAmount !== undefined) data.paidAmount = Number(paidAmount);
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (notes !== undefined) data.notes = notes;

    const updated = await prisma.appointment.update({
      where: { id },
      data,
      include: { client: true, package: true, operator: true, device: true },
    });

    return res.json({ appointment: updated });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return res.status(500).json({ error: 'خطا در ویرایش اطلاعات نوبت.' });
  }
}

export async function deleteAppointment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await prisma.appointment.delete({ where: { id } });
    return res.json({ success: true, message: 'نوبت با موفقیت حذف گردید.' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return res.status(500).json({ error: 'خطا در حذف نوبت.' });
  }
}
