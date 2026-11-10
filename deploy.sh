#!/bin/bash
set -e

echo "=========================================================="
echo "   🌸 سامانه‌ جامع کلینیک لیزر آلما یزد - راه‌اندازی سریع 🌸"
echo "=========================================================="

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ خطای سیستمی: داکر (Docker) روی این سیستم نصب نیست."
    echo "لطفاً ابتدا داکر را نصب کنید یا اسکریپت vps-install.sh را اجرا نمایید."
    exit 1
fi

# 2. Check port conflict
PORT="${ALMA_PORT:-8090}"
if ss -tulpn 2>/dev/null | grep -q ":$PORT "; then
    echo "⚠️ هشدار: پورت $PORT اشغال است. یک پورت دیگر انتخاب می‌شود..."
    PORT=8095
fi
export ALMA_PORT=$PORT

echo "💎 پورت دسترسی به وب‌اپلیکیشن و پنل‌ها: $ALMA_PORT"

# 3. Environment check
if [ ! -f .env ]; then
    echo "📝 در حال ساخت فایل تنظیمات اولیه .env..."
    cat <<EOF > .env
ALMA_PORT=$ALMA_PORT
JWT_SECRET=$(openssl rand -hex 24 2>/dev/null || echo "alma_secure_token_yazd_2026")
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBAPP_URL=http://localhost:$ALMA_PORT/book
CLINIC_NAME=کلینیک لیزر آلما
CLINIC_CITY=یزد
CLINIC_PHONE=03538260000
CLINIC_ADDRESS=یزد، بلوار جمهوری، نبش کوچه یاسمن، ساختمان سپهر، طبقه ۳
EOF
fi

# 4. Build and start containers
echo "🚀 در حال بیلد و بالا آوردن کانتینرهای ایزوله آلما..."
docker compose down 2>/dev/null || true
docker compose up -d --build

# 5. Database setup & seeding inside backend container
echo "🌱 در حال همگام‌سازی و اعمال سید اولیه دیتابیس..."
sleep 4
docker compose exec -T backend npx prisma db push --skip-generate || true
docker compose exec -T backend npx tsx prisma/seed.ts || true

echo ""
echo "=========================================================="
echo "  🎉 کلینیک آلما با موفقیت روی سرور مستقر شد! 🎉"
echo "=========================================================="
echo "🌐 آدرس پنل وب و سامانه:   http://localhost:$ALMA_PORT"
echo "📱 وب‌اپلیکیشن تلگرام (TWA): http://localhost:$ALMA_PORT/book"
echo "👤 اکانت سوپر ادمین:        نام کاربری: admin     | رمز: alma@admin2026"
echo "👩‍💼 اکانت منشی کلینیک:      نام کاربری: secretary | رمز: alma@sec2026"
echo "=========================================================="
