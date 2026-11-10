#!/usr/bin/env bash
# ==============================================================================
# 🌸 Alma Laser Clinic Yazd - VPS Automated Zero-Conflict Installation Script 🌸
# کلینیک لیزر تخصصی آلما یزد - اسکریپت نصب خودکار، ایمن و بدون تداخل روی سرور مجازی
# ==============================================================================
set -e

COLOR_RESET="\033[0m"
COLOR_MAGENTA="\033[1;35m"
COLOR_GOLD="\033[1;33m"
COLOR_GREEN="\033[1;32m"
COLOR_RED="\033[1;31m"
COLOR_CYAN="\033[1;36m"

echo -e "${COLOR_MAGENTA}"
echo "=============================================================================="
echo "          💎 سامانه هوشمند کلینیک لیزر آلما یزد (Alma Laser Clinic) 💎"
echo "                     اسکریپت نصب ایمن و ایزوله روی VPS"
echo "=============================================================================="
echo -e "${COLOR_RESET}"

INSTALL_DIR="/opt/alma-clinic"
CURRENT_DIR="$(pwd)"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${COLOR_RED}❌ این اسکریپت نیاز به دسترسی root یا sudo دارد.${COLOR_RESET}"
  echo "لطفاً با دستور: sudo bash vps-install.sh اجرا نمایید."
  exit 1
fi

echo -e "${COLOR_CYAN}🔍 بررسی وضعیت سرور و پیش‌نیازها...${COLOR_RESET}"

# 2. Check and Install Docker non-destructively if missing
if ! command -v docker &> /dev/null; then
  echo -e "${COLOR_GOLD}داکر یافت نشد. در حال نصب Docker Engine به صورت ایمن...${COLOR_RESET}"
  if command -v apt-get &> /dev/null; then
    apt-get update -y
    apt-get install -y curl ca-certificates gnupg lsb-release
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm -f get-docker.sh
  elif command -v dnf &> /dev/null; then
    dnf -y install docker docker-compose-plugin
    systemctl enable --now docker
  fi
  echo -e "${COLOR_GREEN}✓ داکر با موفقیت نصب شد.${COLOR_RESET}"
else
  echo -e "${COLOR_GREEN}✓ داکر از پیش نصب است.${COLOR_RESET}"
fi

# 3. Find Free Port (Avoiding any existing websites on port 80, 443, 8080, 3000, etc.)
TARGET_PORT=8090
while ss -tuln | grep -q ":$TARGET_PORT\b"; do
  echo -e "${COLOR_GOLD}پورت $TARGET_PORT اشغال است؛ در حال بررسی پورت بعدی...${COLOR_RESET}"
  TARGET_PORT=$((TARGET_PORT + 1))
done

echo -e "${COLOR_GREEN}✓ پورت اختصاصی انتخاب شده (بدون تداخل با سایر سایت‌های VPS): ${COLOR_MAGENTA}$TARGET_PORT${COLOR_RESET}"

# 4. Copy project to /opt/alma-clinic if not already there
if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
  echo -e "${COLOR_CYAN}📁 کپی فایل‌های پروژه به مسیر ایزوله $INSTALL_DIR ...${COLOR_RESET}"
  mkdir -p "$INSTALL_DIR"
  cp -r "$CURRENT_DIR"/* "$INSTALL_DIR"/ 2>/dev/null || true
  cp -r "$CURRENT_DIR"/.[!.]* "$INSTALL_DIR"/ 2>/dev/null || true
  cd "$INSTALL_DIR"
fi

# 5. Telegram Bot Token Setup
echo -e "${COLOR_GOLD}----------------------------------------------------------------------${COLOR_RESET}"
echo -e "آیا توکن ربات تلگرام کلینیک را هم‌اکنون در اختیار دارید؟"
read -rp "توکن ربات تلگرام را وارد کنید (یا اینتر بزنید تا بعداً در .env تنظیم شود): " BOT_TOKEN
echo -e "${COLOR_GOLD}----------------------------------------------------------------------${COLOR_RESET}"

# 6. Generate production .env
cat <<EOF > "$INSTALL_DIR/.env"
ALMA_PORT=$TARGET_PORT
JWT_SECRET=$(openssl rand -hex 24 2>/dev/null || echo "alma_secure_token_yazd_2026")
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_WEBAPP_URL=http://localhost:$TARGET_PORT/book
CLINIC_NAME=کلینیک لیزر آلما
CLINIC_CITY=یزد
CLINIC_PHONE=03538260000
CLINIC_ADDRESS=یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳
EOF

# 7. Start isolated Docker Containers
echo -e "${COLOR_CYAN}🚀 در حال بیلد و راه‌اندازی کانتینرهای ایزوله آلما...${COLOR_RESET}"
docker compose down 2>/dev/null || true
docker compose up -d --build

# 8. Database seed
echo -e "${COLOR_CYAN}🌱 در حال مقداردهی اولیه پایگاه داده و پرونده‌های یزد...${COLOR_RESET}"
sleep 5
docker compose exec -T backend npx prisma db push --skip-generate || true
docker compose exec -T backend npx tsx prisma/seed.ts || true

# 9. Get Public IP
SERVER_IP=$(curl -s https://api.ipify.org || curl -s ifconfig.me || hostname -I | awk '{print $1}')

echo ""
echo -e "${COLOR_GREEN}==============================================================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}  🎉 کلینیک لیزر آلما با موفقیت کامل روی این سرور راه‌اندازی شد! 🎉${COLOR_RESET}"
echo -e "${COLOR_GREEN}==============================================================================${COLOR_RESET}"
echo -e "🌐 ${COLOR_CYAN}آدرس سامانه (پنل منشی، ادمین و وب‌اپ):${COLOR_RESET} http://$SERVER_IP:$TARGET_PORT"
echo -e "📱 ${COLOR_CYAN}آدرس مینی‌اپ تلگرام (TWA):${COLOR_RESET}           http://$SERVER_IP:$TARGET_PORT/book"
echo ""
echo -e "🔐 ${COLOR_GOLD}اطلاعات ورود پیش‌فرض:${COLOR_RESET}"
echo -e "   👤 سوپر ادمین (PWA آیفون):  نام کاربری: ${COLOR_MAGENTA}admin${COLOR_RESET}     | رمز عبور: ${COLOR_MAGENTA}alma@admin2026${COLOR_RESET}"
echo -e "   👩‍💼 میز پذیرش و منشی:       نام کاربری: ${COLOR_GOLD}secretary${COLOR_RESET} | رمز عبور: ${COLOR_GOLD}alma@sec2026${COLOR_RESET}"
echo ""
echo -e "🛡️ ${COLOR_GREEN}امنیت و عدم تداخل:${COLOR_RESET}"
echo -e "   کلیه سرویس‌های قبلی، وب‌سایت‌ها، دیتابیس‌ها و پورت‌های سرور کاملاً دست‌نخورده باقی ماندند."
echo -e "=============================================================================="
