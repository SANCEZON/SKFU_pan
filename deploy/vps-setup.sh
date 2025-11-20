#!/bin/bash
# Скрипт для первоначальной настройки VPS на TimeWeb

set -e

echo "🚀 Начало настройки VPS для панели учёта посещаемости"

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка необходимых пакетов
echo "📦 Установка базовых пакетов..."
sudo apt install -y curl wget git ufw

# Установка Docker
echo "🐳 Установка Docker..."
if ! command -v docker &> /dev/null; then
    # Удаляем старые версии
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Устанавливаем зависимости
    sudo apt install -y apt-transport-https ca-certificates gnupg lsb-release
    
    # Добавляем репозиторий Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Устанавливаем Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Добавляем текущего пользователя в группу docker
    sudo usermod -aG docker $USER
    echo "⚠️  ВАЖНО: Выйдите и войдите снова, чтобы применить изменения группы docker"
fi

# Установка Node.js 20.x
echo "📦 Установка Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Установка pnpm
echo "📦 Установка pnpm..."
if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
fi

# Установка nginx
echo "🌐 Установка nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
fi

# Настройка firewall
echo "🔥 Настройка firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS (для будущего SSL)

# Создание директории для проекта
echo "📁 Создание директории проекта..."
sudo mkdir -p /opt/attendance-panel
sudo chown $USER:$USER /opt/attendance-panel

echo "✅ Настройка завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Выйдите и войдите снова (для применения группы docker)"
echo "2. Клонируйте репозиторий: cd /opt/attendance-panel && git clone https://github.com/SANCEZON/SKFU_pan.git ."
echo "3. Создайте файл .env с переменными окружения"
echo "4. Соберите фронтенд: pnpm install && pnpm build --mode production"
echo "5. Запустите Docker Compose: docker compose -f docker-compose.prod.yml up -d"
echo "6. Настройте nginx: скопируйте nginx/attendance-panel.conf в /etc/nginx/sites-available/"

