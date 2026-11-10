import jalaali from 'jalaali-js';

const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

export function toPersianDigits(num: number | string): string {
  const str = String(num);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (x) => persianDigits[parseInt(x, 10)]);
}

export function formatToman(amount: number): string {
  return `${amount.toLocaleString('fa-IR')} تومان`;
}

export function getTodayJalali(): { dateStr: string; dayName: string; monthName: string; day: number; year: number } {
  const now = new Date();
  const j = jalaali.toJalaali(now);
  const m = String(j.jm).padStart(2, '0');
  const d = String(j.jd).padStart(2, '0');
  return {
    dateStr: `${j.jy}/${m}/${d}`,
    dayName: PERSIAN_WEEKDAYS[now.getDay()],
    monthName: PERSIAN_MONTHS[j.jm - 1],
    day: j.jd,
    year: j.jy,
  };
}

export interface DayOption {
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  dateObj: Date;
}

export function getUpcomingDays(count = 14): DayOption[] {
  const days: DayOption[] = [];
  const today = new Date();

  for (let i = 0; i < count; i++) {
    const current = new Date();
    current.setDate(today.getDate() + i);

    // Skip Fridays if clinic is closed (optional, can be shown)
    const dayOfWeek = current.getDay();
    const isFriday = dayOfWeek === 5; // 5 in JS is Friday

    const j = jalaali.toJalaali(current);
    const m = String(j.jm).padStart(2, '0');
    const d = String(j.jd).padStart(2, '0');

    days.push({
      dateStr: `${j.jy}/${m}/${d}`,
      dayName: PERSIAN_WEEKDAYS[dayOfWeek],
      dayNumber: j.jd,
      monthName: PERSIAN_MONTHS[j.jm - 1],
      isToday: i === 0,
      dateObj: current,
    });
  }

  return days;
}

export const TIME_SLOTS = [
  '09:30', '10:15', '11:00', '11:45',
  '16:00', '16:45', '17:30', '18:15',
  '19:00', '19:45', '20:30'
];
