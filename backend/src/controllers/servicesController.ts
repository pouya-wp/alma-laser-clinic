import { Request, Response } from 'express';
import { prisma } from '../prisma.js';

export async function getPackages(req: Request, res: Response) {
  try {
    const packages = await prisma.servicePackage.findMany({
      orderBy: { price: 'asc' },
    });
    return res.json({ packages });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در دریافت لیست خدمات.' });
  }
}

export async function createPackage(req: Request, res: Response) {
  try {
    const { name, category, gender, durationMinutes, price, description } = req.body;
    const pkg = await prisma.servicePackage.create({
      data: {
        name,
        category: category || 'FULL_BODY',
        gender: gender || 'FEMALE',
        durationMinutes: Number(durationMinutes) || 45,
        price: Number(price),
        description,
      },
    });
    return res.status(201).json({ package: pkg });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در ثبت پکیج جدید.' });
  }
}

export async function updatePackage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, category, gender, durationMinutes, price, description, isActive } = req.body;
    const updated = await prisma.servicePackage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(gender && { gender }),
        ...(durationMinutes !== undefined && { durationMinutes: Number(durationMinutes) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return res.json({ package: updated });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در ویرایش پکیج.' });
  }
}

export async function getOperators(req: Request, res: Response) {
  try {
    const operators = await prisma.operator.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ operators });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در دریافت لیست اپراتورها.' });
  }
}

export async function getDevices(req: Request, res: Response) {
  try {
    const devices = await prisma.laserDevice.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ devices });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در دریافت لیست دستگاه‌ها.' });
  }
}
