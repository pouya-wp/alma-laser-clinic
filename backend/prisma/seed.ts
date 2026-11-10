import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jalaali from 'jalaali-js';

const prisma = new PrismaClient();

function getTodayJalali(): string {
  const now = new Date();
  const j = jalaali.toJalaali(now);
  const m = String(j.jm).padStart(2, '0');
  const d = String(j.jd).padStart(2, '0');
  return `${j.jy}/${m}/${d}`;
}

function getOffsetJalali(daysOffset: number): { date: Date; shamsi: string } {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const j = jalaali.toJalaali(d);
  const m = String(j.jm).padStart(2, '0');
  const day = String(j.jd).padStart(2, '0');
  return {
    date: d,
    shamsi: `${j.jy}/${m}/${day}`,
  };
}

async function main() {
  console.log('🌸 Starting Alma Laser Clinic Yazd Seeder...');

  // 1. Clean existing records
  await prisma.reminderLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.servicePackage.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.laserDevice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinicSetting.deleteMany();

  // 2. Users (Admin & Secretary)
  const superAdminPassword = await bcrypt.hash('alma@admin2026', 10);
  const secretaryPassword = await bcrypt.hash('alma@sec2026', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash: superAdminPassword,
      role: 'SUPER_ADMIN',
      name: 'مدیریت ارشد کلینیک آلما',
      phone: '09131510000',
    },
  });

  const secretary = await prisma.user.create({
    data: {
      username: 'secretary',
      passwordHash: secretaryPassword,
      role: 'SECRETARY',
      name: 'مریم فلاح‌زاده (مسئول پذیرش)',
      phone: '09132520000',
    },
  });

  console.log('✅ Admin & Secretary accounts created');

  // 3. Laser Devices
  const candela = await prisma.laserDevice.create({
    data: {
      name: 'کندلا جنتل‌پرو مکس ۲۰۲۴ (GentlePro Max)',
      model: 'Alexandrite & Nd:YAG 755/1064nm Dual Wave',
      shotCount: 142500,
      status: 'ACTIVE',
      notes: 'دارای کولینگ داینامیک گاز کرایو DCD و لنز ۲۰ میلی‌متری ویژه پوست‌های ایرانی',
    },
  });

  const soprano = await prisma.laserDevice.create({
    data: {
      name: 'آلما سوپرانو تیتانیوم ۲۰۲۴ (Soprano Titanium)',
      model: 'Triple Wavelength 3D Technology (Alma Lasers)',
      shotCount: 98000,
      status: 'ACTIVE',
      notes: 'مناسب انواع تیپ‌های پوستی حتی برنزه و سولار با سیستم خنک‌کننده ICE Plus',
    },
  });

  // 4. Operators
  const op1 = await prisma.operator.create({
    data: {
      name: 'خانم مهندس رضایی',
      phone: '09133511111',
      colorTag: '#EC268F',
      isActive: true,
    },
  });

  const op2 = await prisma.operator.create({
    data: {
      name: 'خانم دهقان اشکذری',
      phone: '09134522222',
      colorTag: '#8B5CF6',
      isActive: true,
    },
  });

  const op3 = await prisma.operator.create({
    data: {
      name: 'خانم میرحسینی',
      phone: '09135533333',
      colorTag: '#10B981',
      isActive: true,
    },
  });

  // 5. Service Packages
  const pkgFullBody = await prisma.servicePackage.create({
    data: {
      name: 'فول بادی بانوان (توتال)',
      category: 'FULL_BODY',
      gender: 'FEMALE',
      durationMinutes: 50,
      price: 890000,
      description: 'شامل کل دست‌ها، کل پاها، زیربغل، بیکینی کامل، خط باسن و خط شکم با دستگاه کندلا اصل',
    },
  });

  const pkgFunctional = await prisma.servicePackage.create({
    data: {
      name: 'پکیج اقتصادی کاربردی بانوان',
      category: 'FUNCTIONAL',
      gender: 'FEMALE',
      durationMinutes: 35,
      price: 640000,
      description: 'شامل ساعد دست، ساق پا، بیکینی و زیربغل',
    },
  });

  const pkgBikiniUnderarm = await prisma.servicePackage.create({
    data: {
      name: 'پکیج ویژه زیربغل و بیکینی',
      category: 'SPECIAL',
      gender: 'FEMALE',
      durationMinutes: 20,
      price: 290000,
      description: 'شامل زیربغل و بیکینی کامل با لیزر بدون درد و روشن‌کننده',
    },
  });

  const pkgFace = await prisma.servicePackage.create({
    data: {
      name: 'صورت کامل بانوان',
      category: 'FACE',
      gender: 'FEMALE',
      durationMinutes: 15,
      price: 190000,
      description: 'شامل پیشانی، گونه‌ها، چانه، پشت لب، غبغب و گردن',
    },
  });

  const pkgMenUpper = await prisma.servicePackage.create({
    data: {
      name: 'بالاتنه آقایان (ورزشکاری)',
      category: 'UPPER_BODY',
      gender: 'MALE',
      durationMinutes: 35,
      price: 750000,
      description: 'شامل سینه، شکم، زیربغل و سرشانه‌ها',
    },
  });

  const pkgMenBeard = await prisma.servicePackage.create({
    data: {
      name: 'آنکادر خط ریش و گردن آقایان',
      category: 'FACE',
      gender: 'MALE',
      durationMinutes: 15,
      price: 220000,
      description: 'طراحی و تمیزکاری دقیق خط ریش روی گونه و زیر گردن',
    },
  });

  console.log('✅ Service packages & Operators created');

  // 6. Realistic Clients (Yazd Clinic Client Base)
  const clientData = [
    {
      firstName: 'سارا',
      lastName: 'میرجلیلی',
      phone: '09131518290',
      gender: 'FEMALE',
      nationalCode: '4430123456',
      birthDate: '1372/06/15',
      skinType: 'تیپ ۳ (گندمی روشن)',
      contraindications: 'ندارد - پوست فاقد حساسیت',
      notes: 'جلسه چهارم فول بادی - کاهش ۸۰٪ تراکم موها',
      totalSessions: 4,
      loyaltyPoints: 350,
      telegramUsername: 'sara_mirjalili',
    },
    {
      firstName: 'فاطمه',
      lastName: 'زارع شاهی',
      phone: '09132547102',
      gender: 'FEMALE',
      nationalCode: '4431987654',
      birthDate: '1369/11/20',
      skinType: 'تیپ ۴ (سبزه ملایم)',
      contraindications: 'سابقه مصرف زینک پلاس',
      notes: 'بسیار حساس به درد - از کرم زایلاپی قبل از شات استفاده کند',
      totalSessions: 6,
      loyaltyPoints: 500,
      telegramUsername: 'fatemeh_zs',
    },
    {
      firstName: 'نگار',
      lastName: 'دهقان اشکذری',
      phone: '09133596214',
      gender: 'FEMALE',
      nationalCode: '4438765432',
      birthDate: '1378/03/10',
      skinType: 'تیپ ۲ (سفید مهتابی)',
      contraindications: 'ندارد',
      notes: 'پکیج صورت کامل - پاسخ‌دهی عالی به طول موج ۷۵۵ کندلا',
      totalSessions: 2,
      loyaltyPoints: 180,
      telegramUsername: 'negar_dehghan',
    },
    {
      firstName: 'علیرضا',
      lastName: 'ابویی مهریزی',
      phone: '09134568910',
      gender: 'MALE',
      nationalCode: '4435551234',
      birthDate: '1370/09/25',
      skinType: 'تیپ ۳ (گندمی)',
      contraindications: 'ندارد',
      notes: 'آنکادر خط ریش - بسیار راضی از تقارن خطوط',
      totalSessions: 3,
      loyaltyPoints: 220,
      telegramUsername: 'alireza_abouei',
    },
    {
      firstName: 'مهسا',
      lastName: 'فلاح تفت',
      phone: '09138521470',
      gender: 'FEMALE',
      nationalCode: '4432223344',
      birthDate: '1376/01/18',
      skinType: 'تیپ ۳ (گندمی)',
      contraindications: 'جلسه اول - مشاوره اولیه انجام شد',
      notes: 'مشتری جدید معرفی شده توسط خانم میرجلیلی (۱۰٪ تخفیف معرف)',
      totalSessions: 1,
      loyaltyPoints: 120,
      telegramUsername: 'mahsa_fallah',
    },
    {
      firstName: 'مونا',
      lastName: 'صدری اردکانی',
      phone: '09139517530',
      gender: 'FEMALE',
      nationalCode: '4437778899',
      birthDate: '1374/08/04',
      skinType: 'تیپ ۲ (سفید)',
      contraindications: 'ندارد',
      notes: 'جلسه پنجم فول بادی - وارد دوره تثبیت شده است',
      totalSessions: 5,
      loyaltyPoints: 420,
      telegramUsername: 'mona_sadri',
    },
    {
      firstName: 'زهرا',
      lastName: 'حسینی یزدی',
      phone: '09121234567',
      gender: 'FEMALE',
      nationalCode: '0019876543',
      birthDate: '1371/05/12',
      skinType: 'تیپ ۳ (گندمی)',
      contraindications: 'ندارد',
      notes: 'ساکن تهران، هر ۶ هفته سفر به یزد برای انجام لیزر در آلما',
      totalSessions: 3,
      loyaltyPoints: 300,
      telegramUsername: 'zahra_hosseini_y',
    },
  ];

  const createdClients = [];
  for (const c of clientData) {
    const created = await prisma.client.create({ data: c });
    createdClients.push(created);
  }
  console.log(`✅ ${createdClients.length} Yazd Clients seeded successfully`);

  // 7. Appointments for Today & Tomorrow & Past
  const today = getOffsetJalali(0);
  const tomorrow = getOffsetJalali(1);
  const dayAfter = getOffsetJalali(2);
  const yesterday = getOffsetJalali(-1);

  // Appointment 1: In Progress right now in the clinic
  await prisma.appointment.create({
    data: {
      clientId: createdClients[0].id,
      packageId: pkgFullBody.id,
      operatorId: op1.id,
      deviceId: candela.id,
      appointmentDate: today.date,
      shamsiDate: today.shamsi,
      timeSlot: '16:00',
      status: 'IN_PROGRESS',
      price: pkgFullBody.price,
      discountAmount: 40000,
      finalPrice: 850000,
      paidAmount: 850000,
      paymentMethod: 'POS',
      notes: 'مشتری در کابین ۱ مشغول دریافت خدمات است',
      reminderSent24h: true,
      reminderSent2h: true,
    },
  });

  // Appointment 2: Waiting in lobby
  await prisma.appointment.create({
    data: {
      clientId: createdClients[1].id,
      packageId: pkgFunctional.id,
      operatorId: op2.id,
      deviceId: soprano.id,
      appointmentDate: today.date,
      shamsiDate: today.shamsi,
      timeSlot: '17:00',
      status: 'WAITING',
      price: pkgFunctional.price,
      discountAmount: 0,
      finalPrice: pkgFunctional.price,
      paidAmount: 0,
      notes: 'پذیرش انجام شده و در سالن انتظار نشسته است',
      reminderSent24h: true,
      reminderSent2h: true,
    },
  });

  // Appointment 3: Confirmed later today
  await prisma.appointment.create({
    data: {
      clientId: createdClients[2].id,
      packageId: pkgFace.id,
      operatorId: op1.id,
      deviceId: candela.id,
      appointmentDate: today.date,
      shamsiDate: today.shamsi,
      timeSlot: '18:15',
      status: 'CONFIRMED',
      price: pkgFace.price,
      discountAmount: 0,
      finalPrice: pkgFace.price,
      paidAmount: 0,
      notes: 'تلفنی تایید شد',
      reminderSent24h: true,
    },
  });

  // Appointment 4: Tomorrow morning
  await prisma.appointment.create({
    data: {
      clientId: createdClients[3].id,
      packageId: pkgMenBeard.id,
      operatorId: op3.id,
      deviceId: candela.id,
      appointmentDate: tomorrow.date,
      shamsiDate: tomorrow.shamsi,
      timeSlot: '10:30',
      status: 'CONFIRMED',
      price: pkgMenBeard.price,
      discountAmount: 20000,
      finalPrice: 200000,
      paidAmount: 0,
      notes: 'رزرو از طریق ربات تلگرام انجام شد',
      reminderSent24h: true,
    },
  });

  // Appointment 5: Tomorrow afternoon
  await prisma.appointment.create({
    data: {
      clientId: createdClients[4].id,
      packageId: pkgBikiniUnderarm.id,
      operatorId: op2.id,
      deviceId: soprano.id,
      appointmentDate: tomorrow.date,
      shamsiDate: tomorrow.shamsi,
      timeSlot: '15:45',
      status: 'CONFIRMED',
      price: pkgBikiniUnderarm.price,
      discountAmount: 0,
      finalPrice: pkgBikiniUnderarm.price,
      paidAmount: 0,
      reminderSent24h: true,
    },
  });

  // Appointment 6: Completed yesterday with post-care reminder sent
  const pastAppt = await prisma.appointment.create({
    data: {
      clientId: createdClients[5].id,
      packageId: pkgFullBody.id,
      operatorId: op1.id,
      deviceId: candela.id,
      appointmentDate: yesterday.date,
      shamsiDate: yesterday.shamsi,
      timeSlot: '17:30',
      status: 'COMPLETED',
      price: pkgFullBody.price,
      discountAmount: 0,
      finalPrice: pkgFullBody.price,
      paidAmount: pkgFullBody.price,
      paymentMethod: 'POS',
      notes: 'جلسه بدون عارضه انجام شد. کرم زینک اکساید تجویز شد.',
      reminderSent24h: true,
      reminderSent2h: true,
      postCareSent: true,
    },
  });

  // Log post-care reminder
  await prisma.reminderLog.create({
    data: {
      appointmentId: pastAppt.id,
      clientId: createdClients[5].id,
      reminderType: 'POST_CARE',
      status: 'SENT',
      channel: 'TELEGRAM',
      messageText: 'مونا عزیز، مراقبت‌های پس از جلسه لیزر آلما: ۱. تا ۲۴ ساعت از دوش آب داغ و سونا خودداری کنید ۲. کرم زینک یا آلوئه‌ورا هر ۶ ساعت تمدید شود ۳. در فضای باز حتما از ضدآفتاب استفاده کنید.',
    },
  });

  // 8. Clinic Settings
  const settings = [
    { key: 'CLINIC_NAME', value: 'کلینیک لیزر و زیبایی آلما' },
    { key: 'CLINIC_CITY', value: 'یزد' },
    { key: 'CLINIC_ADDRESS', value: 'یزد، بلوار جمهوری اسلامی، نرسیده به میدان امام علی، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳' },
    { key: 'CLINIC_PHONE', value: '03538260000' },
    { key: 'CLINIC_MOBILE', value: '09131510000' },
    { key: 'CLINIC_INSTAGRAM', value: 'alma.clinic.yazd' },
    { key: 'CLINIC_TELEGRAM', value: 'AlmaLaserClinicBot' },
    { key: 'WORK_HOURS', value: 'شنبه تا چهارشنبه: ۹:۰۰ الی ۲۱:۰۰ | پنجشنبه‌ها: ۹:۰۰ الی ۱۶:۰۰' },
    { key: 'WELCOME_MESSAGE', value: 'به کلینیک لیزر تخصصی آلما یزد خوش آمدید. مجهز به جدیدترین دستگاه‌های الکساندرایت کندلا و تیتانیوم ۲۰۲۴.' },
  ];

  for (const s of settings) {
    await prisma.clinicSetting.create({ data: s });
  }

  console.log('✅ Clinic settings created');
  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
