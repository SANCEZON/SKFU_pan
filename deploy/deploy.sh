#!/bin/bash
# Скрипт для деплоя обновлений

set -e

PROJECT_DIR="/opt/attendance-panel"
cd "$PROJECT_DIR"

echo "🚀 Начало деплоя..."

# Обновление кода из Git
echo "📥 Обновление кода..."
git pull origin main || git pull origin master

# Обновление зависимостей фронтенда
echo "📦 Обновление зависимостей фронтенда..."
pnpm install

# Сборка фронтенда
echo "🔨 Сборка фронтенда..."
pnpm build --mode production

# Пересборка API контейнера
echo "🔨 Пересборка API..."
docker compose -f docker-compose.prod.yml build api

# Перезапуск сервисов
echo "🔄 Перезапуск сервисов..."
docker compose -f docker-compose.prod.yml up -d

# Перезагрузка nginx
echo "🔄 Перезагрузка nginx..."
sudo systemctl reload nginx

echo "✅ Деплой завершён!"

# Показать статус
echo ""
echo "📊 Статус сервисов:"
docker compose -f docker-compose.prod.yml ps

