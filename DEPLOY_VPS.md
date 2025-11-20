# Деплой на VPS TimeWeb - Полная инструкция

## Подготовка

Все необходимые файлы уже подготовлены:
- ✅ `docker-compose.prod.yml` - конфигурация Docker для production
- ✅ `nginx/attendance-panel.conf` - конфигурация nginx
- ✅ `deploy/vps-setup.sh` - скрипт первоначальной настройки
- ✅ `deploy/deploy.sh` - скрипт для обновлений
- ✅ `systemd/attendance-panel.service` - автозапуск через systemd
- ✅ `.env.production.example` - пример переменных окружения

## Шаг 1: Подключение к VPS

1. В панели TimeWeb перейдите в "VDS/VPS Серверы"
2. Создайте новый VPS (минимальная конфигурация подойдет)
3. Дождитесь создания и получите:
   - IP адрес
   - Логин (обычно `root`)
   - Пароль (или SSH ключ)

4. Подключитесь по SSH:
```bash
ssh root@YOUR_VPS_IP
# или
ssh devuser@YOUR_VPS_IP
```

## Шаг 2: Первоначальная настройка сервера

### Вариант A: Автоматическая настройка (рекомендуется)

1. Загрузите скрипт на сервер:
```bash
# На вашем компьютере
scp deploy/vps-setup.sh root@YOUR_VPS_IP:/tmp/
```

2. На сервере выполните:
```bash
chmod +x /tmp/vps-setup.sh
/tmp/vps-setup.sh
```

3. **ВАЖНО:** Выйдите и войдите снова (для применения группы docker):
```bash
exit
ssh root@YOUR_VPS_IP
```

### Вариант B: Ручная настройка

Выполните команды из `deploy/vps-setup.sh` вручную.

## Шаг 3: Клонирование проекта

```bash
cd /opt/attendance-panel
git clone https://github.com/SANCEZON/SKFU_pan.git .
```

Если репозиторий приватный, используйте SSH:
```bash
git clone git@github.com:SANCEZON/SKFU_pan.git .
```

## Шаг 4: Настройка переменных окружения

1. Создайте файл `.env`:
```bash
cd /opt/attendance-panel
cp .env.production.example .env
nano .env
```

2. Заполните переменные:
```env
DB_ROOT_PASSWORD=надежный_пароль_для_root_mysql
DB_USER=app_user
DB_PASSWORD=надежный_пароль_для_пользователя_БД
DB_NAME=attendance_db
JWT_SECRET=случайная_строка_минимум_32_символа_для_jwt
CORS_ORIGIN=http://YOUR_VPS_IP
```

3. Создайте `.env.production` для фронтенда:
```bash
echo "VITE_API_URL=http://YOUR_VPS_IP/api" > .env.production
```

**Важно:** Замените `YOUR_VPS_IP` на реальный IP вашего VPS.

## Шаг 5: Сборка фронтенда

```bash
cd /opt/attendance-panel

# Установка зависимостей
pnpm install

# Сборка production версии
pnpm build --mode production
```

Проверьте, что папка `dist/` создана:
```bash
ls -la dist/
```

## Шаг 6: Настройка nginx

1. Скопируйте конфигурацию:
```bash
sudo cp nginx/attendance-panel.conf /etc/nginx/sites-available/attendance-panel
```

2. Отредактируйте (если нужно):
```bash
sudo nano /etc/nginx/sites-available/attendance-panel
```

3. Активируйте конфигурацию:
```bash
sudo ln -s /etc/nginx/sites-available/attendance-panel /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Удалить дефолтную
```

4. Проверьте конфигурацию:
```bash
sudo nginx -t
```

5. Перезагрузите nginx:
```bash
sudo systemctl reload nginx
```

## Шаг 7: Запуск Docker Compose

```bash
cd /opt/attendance-panel
docker compose -f docker-compose.prod.yml up -d
```

Проверьте статус:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## Шаг 8: Настройка автозапуска

1. Скопируйте systemd service:
```bash
sudo cp systemd/attendance-panel.service /etc/systemd/system/
```

2. Перезагрузите systemd:
```bash
sudo systemctl daemon-reload
```

3. Включите автозапуск:
```bash
sudo systemctl enable attendance-panel.service
```

4. Проверьте статус:
```bash
sudo systemctl status attendance-panel.service
```

## Шаг 9: Проверка работы

1. Откройте в браузере: `http://YOUR_VPS_IP`
2. Проверьте API: `http://YOUR_VPS_IP/api/health`
3. Проверьте phpMyAdmin: `http://YOUR_VPS_IP/phpmyadmin` (если настроено)

## Обновление приложения

Для обновления используйте скрипт:

```bash
cd /opt/attendance-panel
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Или вручную:
```bash
cd /opt/attendance-panel
git pull
pnpm install
pnpm build --mode production
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d
sudo systemctl reload nginx
```

## Управление сервисами

### Просмотр логов
```bash
# Все сервисы
docker compose -f docker-compose.prod.yml logs -f

# Только API
docker compose -f docker-compose.prod.yml logs -f api

# Только MySQL
docker compose -f docker-compose.prod.yml logs -f mysql
```

### Перезапуск
```bash
docker compose -f docker-compose.prod.yml restart
```

### Остановка
```bash
docker compose -f docker-compose.prod.yml down
```

### Запуск
```bash
docker compose -f docker-compose.prod.yml up -d
```

## Бэкапы базы данных

Создайте скрипт для бэкапа:

```bash
sudo nano /opt/attendance-panel/backup-db.sh
```

Содержимое:
```bash
#!/bin/bash
BACKUP_DIR="/opt/attendance-panel/backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f docker-compose.prod.yml exec -T mysql mysqldump -u root -p"$DB_ROOT_PASSWORD" attendance_db > "$BACKUP_DIR/backup_$DATE.sql"
# Удалить бэкапы старше 7 дней
find "$BACKUP_DIR" -name "backup_*.sql" -mtime +7 -delete
```

Сделайте исполняемым:
```bash
chmod +x /opt/attendance-panel/backup-db.sh
```

Добавьте в cron (ежедневно в 2:00):
```bash
crontab -e
# Добавьте строку:
0 2 * * * /opt/attendance-panel/backup-db.sh
```

## Безопасность

1. **Измените все дефолтные пароли** в `.env`
2. **Сгенерируйте надежный JWT_SECRET** (минимум 32 символа)
3. **Закройте phpMyAdmin** от внешнего доступа (уберите из nginx конфига)
4. **Настройте SSL** (Let's Encrypt) для HTTPS
5. **Регулярно обновляйте систему**: `sudo apt update && sudo apt upgrade`

## Настройка SSL (опционально)

1. Установите certbot:
```bash
sudo apt install -y certbot python3-certbot-nginx
```

2. Получите сертификат:
```bash
sudo certbot --nginx -d your-domain.com
```

3. Certbot автоматически обновит конфигурацию nginx

## Решение проблем

### Фронтенд не загружается
- Проверьте, что файлы в `dist/` загружены
- Проверьте права доступа: `sudo chown -R www-data:www-data /opt/attendance-panel/dist`
- Проверьте логи nginx: `sudo tail -f /var/log/nginx/attendance-panel-error.log`

### API не отвечает
- Проверьте логи: `docker compose -f docker-compose.prod.yml logs api`
- Проверьте, что контейнер запущен: `docker compose -f docker-compose.prod.yml ps`
- Проверьте подключение к БД: `docker compose -f docker-compose.prod.yml exec api node -e "require('./dist/config/database.js').testConnection().then(console.log)"`

### База данных не работает
- Проверьте логи: `docker compose -f docker-compose.prod.yml logs mysql`
- Проверьте переменные окружения в `.env`
- Проверьте подключение: `docker compose -f docker-compose.prod.yml exec mysql mysql -u root -p`

## Готово!

Ваше приложение должно быть доступно по адресу `http://YOUR_VPS_IP`

