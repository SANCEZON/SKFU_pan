# Инструкция по использованию Cloud-init

## Что такое Cloud-init?

Cloud-init - это стандартный способ автоматической настройки облачных серверов при первом запуске. TimeWeb VPS поддерживает Cloud-init.

## Как использовать

### Шаг 1: Подготовка скрипта

1. Откройте файл `cloud-init.yml`
2. **ОБЯЗАТЕЛЬНО** замените следующие значения:

#### В секции клонирования репозитория:
```yaml
- sudo -u devuser git clone https://github.com/SANCEZON/SKFU_pan.git . || true
```
Замените на ваш репозиторий (если приватный, используйте SSH URL).

#### В секции создания .env:
```yaml
DB_ROOT_PASSWORD=CHANGE_THIS_PASSWORD
DB_PASSWORD=CHANGE_THIS_PASSWORD
JWT_SECRET=CHANGE_THIS_TO_RANDOM_SECRET_MIN_32_CHARS
CORS_ORIGIN=http://YOUR_VPS_IP
```
Замените на реальные значения:
- `CHANGE_THIS_PASSWORD` → надежный пароль для MySQL
- `CHANGE_THIS_TO_RANDOM_SECRET_MIN_32_CHARS` → случайная строка минимум 32 символа
- `YOUR_VPS_IP` → IP адрес вашего VPS

#### В секции .env.production:
```yaml
VITE_API_URL=http://YOUR_VPS_IP/api
```
Замените `YOUR_VPS_IP` на реальный IP.

### Шаг 2: Создание VPS в TimeWeb

1. Войдите в панель TimeWeb
2. Перейдите в "VDS/VPS Серверы"
3. Нажмите "Создать VPS"
4. Выберите конфигурацию (минимальная подойдет)
5. **В поле "Cloud-init" или "User Data"** вставьте содержимое файла `cloud-init.yml`
6. Создайте VPS

### Шаг 3: Ожидание завершения

Cloud-init выполнится автоматически при первом запуске VPS (обычно 2-5 минут).

### Шаг 4: Проверка

1. Подключитесь по SSH:
```bash
ssh devuser@YOUR_VPS_IP
```

2. Проверьте лог:
```bash
cat /opt/attendance-panel/cloud-init-complete.log
```

3. Проверьте статус сервисов:
```bash
cd /opt/attendance-panel
docker compose -f docker-compose.prod.yml ps
```

4. Проверьте логи:
```bash
docker compose -f docker-compose.prod.yml logs
```

### Шаг 5: Обновление конфигурации (если нужно)

Если вы не обновили значения в Cloud-init скрипте, сделайте это сейчас:

1. Обновите `.env`:
```bash
cd /opt/attendance-panel
nano .env
```

2. Обновите `.env.production`:
```bash
nano .env.production
```

3. Пересоберите фронтенд:
```bash
pnpm build --mode production
```

4. Перезапустите сервисы:
```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Что делает Cloud-init скрипт

1. ✅ Создает пользователя `devuser` с sudo правами
2. ✅ Обновляет систему
3. ✅ Устанавливает Docker и Docker Compose
4. ✅ Устанавливает Node.js 20.x и pnpm
5. ✅ Устанавливает и настраивает nginx
6. ✅ Настраивает firewall (открывает порты 22, 80, 443)
7. ✅ Клонирует репозиторий
8. ✅ Создает файлы конфигурации (.env, .env.production)
9. ✅ Устанавливает зависимости и собирает фронтенд
10. ✅ Настраивает nginx конфигурацию
11. ✅ Создает systemd service для автозапуска
12. ✅ Запускает Docker Compose

## Важные замечания

### Безопасность

⚠️ **ОБЯЗАТЕЛЬНО** измените все пароли в `.env` после первого запуска!

⚠️ Сгенерируйте надежный `JWT_SECRET` (минимум 32 символа):
```bash
openssl rand -base64 32
```

### Если что-то пошло не так

1. Проверьте логи Cloud-init:
```bash
cat /var/log/cloud-init-output.log
```

2. Проверьте статус сервисов:
```bash
systemctl status attendance-panel.service
docker compose -f docker-compose.prod.yml ps
```

3. Проверьте логи Docker:
```bash
docker compose -f docker-compose.prod.yml logs
```

4. Проверьте логи nginx:
```bash
tail -f /var/log/nginx/attendance-panel-error.log
```

### Ручная настройка (если Cloud-init не сработал)

Если Cloud-init не выполнился или выполнился с ошибками, следуйте инструкции в `DEPLOY_VPS.md` для ручной настройки.

## После успешного деплоя

1. Откройте в браузере: `http://YOUR_VPS_IP`
2. Проверьте API: `http://YOUR_VPS_IP/api/health`
3. Создайте первого пользователя через регистрацию
4. Одобрите пользователя в панели приглашений

## Обновление приложения

Для обновления используйте:
```bash
cd /opt/attendance-panel
git pull
pnpm install
pnpm build --mode production
docker compose -f docker-compose.prod.yml build api
docker compose -f docker-compose.prod.yml up -d
sudo systemctl reload nginx
```

Или используйте скрипт:
```bash
./deploy/deploy.sh
```

