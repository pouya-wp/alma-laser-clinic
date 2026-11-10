import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function toEnglishDigits(str: string): string {
  const persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const arabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(persian[i], String(i)).replaceAll(arabic[i], String(i));
  }
  return res;
}

const MALE_NAMES = new Set([
  'علی', 'محمد', 'مهدی', 'حسین', 'رضا', 'امیر', 'علیرضا', 'محمدرضا', 'امیرحسین',
  'پوریا', 'حمید', 'سعید', 'جواد', 'احسان', 'میلاد', 'آرش', 'پیمان', 'مجید',
  'محسن', 'ابوالفضل', 'سجاد', 'مهرداد', 'نوید', 'بابک', 'کامران', 'شهاب', 'متین'
]);

interface ExtractedClient {
  firstName: string;
  lastName: string;
  phone: string;
  gender: string;
  totalSessions: number;
  fileNumber: string;
  attendance: string;
  notes: string;
  rawText: string;
}

async function runImport() {
  console.log('💎 شروع فرآیند پردازش و استخراج مراجعین کلینیک آلما از فایل چت...');

  const possiblePaths = [
    path.join(__dirname, 'chat.md'),
    '/home/one/chat.md',
    '/app/prisma/chat.md',
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('❌ فایل chat.md یافت نشد!');
    process.exit(1);
  }

  console.log(`📄 خواندن فایل از: ${filePath}`);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').map((l) => l.trim()).filter((l) => l.includes('[Forwarded]'));

  console.log(`📊 تعداد پیام‌های فوروارد شده یافت‌شده: ${lines.length}`);

  const phoneRegex = /(?:(?:\+98|0098|98)?0?)(9\d{9})/;
  const uniqueMap = new Map<string, ExtractedClient>();
  const invalidOrSkipped: string[] = [];

  for (const rawLine of lines) {
    const afterForward = rawLine.split('[Forwarded]').pop()?.trim() || '';
    const converted = toEnglishDigits(afterForward);

    const match = converted.match(phoneRegex);
    if (!match) {
      invalidOrSkipped.push(afterForward);
      continue;
    }

    const cleanPhone = '0' + match[1];

    // Split name and rest
    const idx = converted.indexOf(match[0]);
    let namePart = converted.substring(0, idx).trim();
    const restPart = converted.substring(idx + match[0].length).trim();

    if (!namePart && restPart) {
      namePart = restPart;
    }

    // Clean name from symbols and numbers
    let nameClean = namePart
      .replace(/[\*\-\.\:\_\#\/\,\(\)\d]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!nameClean) {
      nameClean = 'مراجع بدون نام';
    }

    const nameParts = nameClean.split(' ');
    let firstName = nameParts[0];
    let lastName = nameParts.slice(1).join(' ');

    if (!lastName) {
      lastName = 'آلما';
    }

    // Determine gender
    const gender = MALE_NAMES.has(firstName) ? 'MALE' : 'FEMALE';

    // Parse session and file number
    const nums = (restPart.match(/\d+/g) || []).map((n) => parseInt(n, 10));
    let session = 1;
    let fileNo = '';

    if (nums.length === 1) {
      if (nums[0] <= 20) session = nums[0];
      else fileNo = String(nums[0]);
    } else if (nums.length >= 2) {
      session = nums[0];
      fileNo = String(nums[1]);
    }

    // Determine attendance
    let attendance = 'ثبت شده';
    if (restPart.includes('نیومده') || restPart.includes('نمیاد') || restPart.includes('نیومدن')) {
      attendance = 'عدم حضور';
    } else if (restPart.includes('اومده') || restPart.includes('اومدن')) {
      attendance = 'حاضر شده';
    } else if (restPart.includes('کنسل')) {
      attendance = 'کنسل شده';
    }

    const notes = [
      fileNo ? `پرونده: ${fileNo}` : '',
      `وضعیت واتساپ: ${attendance}`,
      `منبع: ایمپورت خودکار چت واتساپ`,
    ].filter(Boolean).join(' | ');

    const clientData: ExtractedClient = {
      firstName,
      lastName,
      phone: cleanPhone,
      gender,
      totalSessions: Math.max(session, 1),
      fileNumber: fileNo,
      attendance,
      notes,
      rawText: afterForward,
    };

    if (!uniqueMap.has(cleanPhone)) {
      uniqueMap.set(cleanPhone, clientData);
    } else {
      // Merge: take higher session or fileNumber if missing
      const existing = uniqueMap.get(cleanPhone)!;
      if (clientData.totalSessions > existing.totalSessions) {
        existing.totalSessions = clientData.totalSessions;
      }
      if (clientData.fileNumber && !existing.fileNumber) {
        existing.fileNumber = clientData.fileNumber;
        existing.notes = `پرونده: ${clientData.fileNumber} | ${existing.notes}`;
      }
      if (existing.lastName === 'آلما' && clientData.lastName !== 'آلما') {
        existing.lastName = clientData.lastName;
      }
    }
  }

  console.log(`✅ تعداد کل شماره‌های معتبر یکتا: ${uniqueMap.size}`);
  console.log(`⚠️ تعداد رکوردهای بدون شماره یا غیراستاندارد رد شده: ${invalidOrSkipped.length}`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const client of uniqueMap.values()) {
    const loyaltyPoints = 100 + client.totalSessions * 50;

    const existingInDb = await prisma.client.findUnique({
      where: { phone: client.phone },
    });

    if (existingInDb) {
      await prisma.client.update({
        where: { id: existingInDb.id },
        data: {
          totalSessions: Math.max(existingInDb.totalSessions, client.totalSessions),
          notes: existingInDb.notes
            ? `${existingInDb.notes} -- ${client.notes}`
            : client.notes,
        },
      });
      updatedCount++;
    } else {
      await prisma.client.create({
        data: {
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          gender: client.gender,
          totalSessions: client.totalSessions,
          loyaltyPoints,
          notes: client.notes,
        },
      });
      createdCount++;
    }
  }

  const totalClientsInDb = await prisma.client.count();

  console.log('\n=============================================');
  console.log('🎉 عملیات ثبت دیتابیس با موفقیت به پایان رسید:');
  console.log(`➕ مراجعین جدید ایجاد شده: ${createdCount}`);
  console.log(`🔄 مراجعین قبلی به‌روزرسانی شده: ${updatedCount}`);
  console.log(`👥 مجموع کل مراجعین فعال در دیتابیس آلما: ${totalClientsInDb}`);
  console.log('=============================================\n');

  // Preview 5 random clients from DB
  const samples = await prisma.client.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
  });
  console.log('🔍 نمونه مراجعین ثبت‌شده اخیر:');
  samples.forEach((c) => {
    console.log(`- ${c.firstName} ${c.lastName} (${c.phone}) | جلسات: ${c.totalSessions} | امتیاز: ${c.loyaltyPoints} | ${c.notes}`);
  });
}

runImport()
  .catch((e) => {
    console.error('❌ خطا در عملیات ایمپورت:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
