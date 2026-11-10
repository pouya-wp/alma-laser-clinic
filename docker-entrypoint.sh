#!/bin/sh
set -e

# Initialize DB schema
echo "⚡ Ensuring Alma SQLite schema is up to date..."
npx prisma db push --skip-generate || echo "⚠️ Prisma push skipped"

# Seed if empty or requested
if [ ! -f /app/prisma/.seeded ]; then
  echo "🌱 Seeding Alma Clinic initial dataset..."
  npx tsx prisma/seed.ts || echo "⚠️ Seeding skipped"
  touch /app/prisma/.seeded
fi

echo "🌸 Starting Alma Backend..."
exec "$@"
