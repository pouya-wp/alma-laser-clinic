import { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { normalizePhone } from '../config/index.js';
import xlsx from 'xlsx';

export async function getClients(req: Request, res: Response) {
  try {
    const { q, page = '1', limit = '50', gender } = req.query;
    const skip = (parseInt(String(page), 10) - 1) * parseInt(String(limit), 10);
    const take = parseInt(String(limit), 10);

    const where: any = {};
    if (gender) {
      where.gender = String(gender);
    }
    if (q) {
      const searchStr = String(q).trim();
      where.OR = [
        { firstName: { contains: searchStr } },
        { lastName: { contains: searchStr } },
        { phone: { contains: searchStr } },
        { telegramUsername: { contains: searchStr } },
      ];
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        include: {
          appointments: {
            orderBy: { appointmentDate: 'desc' },
            take: 1,
            include: { package: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
    ]);

    return res.json({
      total,
      page: parseInt(String(page), 10),
      totalPages: Math.ceil(total / take),
      clients,
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return res.status(500).json({ error: 'خطا در دریافت لیست مشتریان.' });
  }
}

export async function getClientById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        appointments: {
          include: { package: true, operator: true, device: true },
          orderBy: { appointmentDate: 'desc' },
        },
        reminders: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!client) {
      return res.status(404).json({ error: 'مشتری مورد نظر یافت نشد.' });
    }

    return res.json({ client });
  } catch (error) {
    return res.status(500).json({ error: 'خطا در دریافت پرونده مشتری.' });
  }
}

export async function createClient(req: Request, res: Response) {
  try {
    const {
      firstName,
      lastName,
      phone,
      gender = 'FEMALE',
      nationalCode,
      birthDate,
      skinType,
      contraindications,
      notes,
      totalSessions = 0,
      loyaltyPoints = 100,
    } = req.body;

    if (!firstName || !lastName || !phone) {
      return res.status(400).json({ error: 'نام، نام خانوادگی و شماره همراه الزامی است.' });
    }

    const cleanedPhone = normalizePhone(phone);

    const existing = await prisma.client.findUnique({
      where: { phone: cleanedPhone },
    });

    if (existing) {
      return res.status(409).json({ error: 'مشتری با این شماره همراه قبلاً در سیستم ثبت شده است.' });
    }

    const client = await prisma.client.create({
      data: {
        firstName,
        lastName,
        phone: cleanedPhone,
        gender,
        nationalCode,
        birthDate,
        skinType,
        contraindications,
        notes,
        totalSessions: Number(totalSessions),
        loyaltyPoints: Number(loyaltyPoints),
      },
    });

    return res.status(201).json({ client });
  } catch (error) {
    console.error('Error creating client:', error);
    return res.status(500).json({ error: 'خطا در ثبت مشتری جدید.' });
  }
}

export async function updateClient(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      gender,
      nationalCode,
      birthDate,
      skinType,
      contraindications,
      notes,
      totalSessions,
      loyaltyPoints,
    } = req.body;

    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (phone) data.phone = normalizePhone(phone);
    if (gender) data.gender = gender;
    if (nationalCode !== undefined) data.nationalCode = nationalCode;
    if (birthDate !== undefined) data.birthDate = birthDate;
    if (skinType !== undefined) data.skinType = skinType;
    if (contraindications !== undefined) data.contraindications = contraindications;
    if (notes !== undefined) data.notes = notes;
    if (totalSessions !== undefined) data.totalSessions = Number(totalSessions);
    if (loyaltyPoints !== undefined) data.loyaltyPoints = Number(loyaltyPoints);

    const updated = await prisma.client.update({
      where: { id },
      data,
    });

    return res.json({ client: updated });
  } catch (error) {
    console.error('Error updating client:', error);
    return res.status(500).json({ error: 'خطا در ویرایش پرونده مشتری.' });
  }
}

export async function bulkImportClients(req: Request, res: Response) {
  try {
    let rawItems: any[] = [];

    // If file uploaded (Excel or CSV)
    if (req.file) {
      const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      rawItems = xlsx.utils.sheet_to_json(sheet);
    } else if (req.body.clients && Array.isArray(req.body.clients)) {
      rawItems = req.body.clients;
    } else {
      return res.status(400).json({ error: 'فایل اکسل یا لیست معتبر مشتریان ارسال نشده است.' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const item of rawItems) {
      // Flexible field mapping for Persian or English columns
      const rawPhone = item.phone || item.mobile || item['شماره'] || item['تلفن'] || item['موبایل'] || item['شماره تماس'];
      if (!rawPhone) {
        skippedCount++;
        continue;
      }

      const phone = normalizePhone(String(rawPhone));
      if (!phone || phone.length < 10) {
        skippedCount++;
        continue;
      }

      // Name extraction
      let firstName = item.firstName || item['نام'] || '';
      let lastName = item.lastName || item['نام خانوادگی'] || item['فامیلی'] || '';
      if (!firstName && !lastName && (item.name || item['نام و نام خانوادگی'])) {
        const full = String(item.name || item['نام و نام خانوادگی']).trim().split(' ');
        firstName = full[0] || 'مشتری';
        lastName = full.slice(1).join(' ') || 'آلما';
      }

      if (!firstName) firstName = 'مشتری';
      if (!lastName) lastName = 'آلما';

      const gender = (item.gender === 'MALE' || item['جنسیت'] === 'آقا' || item['جنسیت'] === 'مرد') ? 'MALE' : 'FEMALE';
      const notes = item.notes || item['توضیحات'] || item['سوابق'] || 'وارد شده از فایل اکسل';
      const totalSessions = parseInt(String(item.totalSessions || item['جلسات'] || item['تعداد جلسات'] || '0'), 10) || 0;
      const skinType = item.skinType || item['تیپ پوستی'] || null;

      try {
        const existing = await prisma.client.findUnique({ where: { phone } });
        if (existing) {
          await prisma.client.update({
            where: { id: existing.id },
            data: {
              firstName: firstName || existing.firstName,
              lastName: lastName || existing.lastName,
              notes: notes ? `${existing.notes || ''} | ${notes}` : existing.notes,
              totalSessions: totalSessions > 0 ? totalSessions : existing.totalSessions,
            },
          });
          updatedCount++;
        } else {
          await prisma.client.create({
            data: {
              firstName,
              lastName,
              phone,
              gender,
              notes,
              totalSessions,
              skinType,
              loyaltyPoints: 100,
            },
          });
          addedCount++;
        }
      } catch (err: any) {
        errors.push(`خطا در پردازش رکورد ${phone}: ${err.message}`);
      }
    }

    return res.json({
      success: true,
      totalProcessed: rawItems.length,
      addedCount,
      updatedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Bulk import error:', error);
    return res.status(500).json({ error: 'خطا در ایمپورت گروهی مشتریان: ' + error.message });
  }
}
