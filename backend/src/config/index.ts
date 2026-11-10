import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'alma_laser_secret_2026',
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  telegramApiRoot: process.env.TELEGRAM_API_ROOT || '',
  telegramProxy: process.env.TELEGRAM_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY || '',
  webAppUrl: process.env.TELEGRAM_WEBAPP_URL || 'http://localhost:5173/book',
  clinicName: process.env.CLINIC_NAME || 'کلینیک لیزر آلما',
  clinicCity: process.env.CLINIC_CITY || 'یزد',
  clinicPhone: process.env.CLINIC_PHONE || '03538260000',
  clinicAddress: process.env.CLINIC_ADDRESS || 'یزد، بلوار جمهوری اسلامی، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function normalizePhone(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('98')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (!cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '0' + cleaned;
  }
  return cleaned;
}
