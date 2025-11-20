# Миграция на MySQL + phpMyAdmin

## Что изменилось

Панель учёта посещаемости была мигрирована с Supabase на локальную MySQL базу данных с REST API и phpMyAdmin.

## Новая архитектура

```
Frontend (React) → REST API (Express.js) → MySQL/MariaDB
                                    ↓
                              phpMyAdmin (веб-интерфейс)
```

## Установка

### 1. Установите зависимости API

```bash
cd api
npm install
```

### 2. Настройте переменные окружения

Создайте файл `api/.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=app_password
DB_NAME=attendance_db
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
NODE_ENV=development
```

Создайте файл `.env.local` в корне проекта:
```env
VITE_API_URL=http://localhost:3000
```

### 3. Запустите систему

```bash
docker-compose up -d
```

Это запустит:
- MySQL/MariaDB на порту 3306
- phpMyAdmin на порту 8080
- REST API на порту 3000

### 4. Проверьте работу

- phpMyAdmin: http://localhost:8080
  - Логин: root
  - Пароль: rootpassword (или из .env)
- API: http://localhost:3000/api/health
- Frontend: http://localhost:5173 (dev) или http://localhost (production)

## Создание первого пользователя

### Через API (рекомендуется)

1. Создайте приглашение через API или phpMyAdmin
2. Зарегистрируйтесь через фронтенд с кодом приглашения

### Через phpMyAdmin

1. Откройте http://localhost:8080
2. Войдите (root/rootpassword)
3. Выберите базу `attendance_db`
4. В таблице `users` создайте пользователя:
   - `id`: сгенерируйте UUID (можно использовать UUID() в SQL)
   - `email`: ваш email
   - `password_hash`: используйте bcrypt для хеширования пароля
   - `email_verified`: TRUE

## Все функции сохранены

✅ Управление студентами
✅ Управление преподавателями
✅ Управление предметами
✅ Расписание (2-недельный цикл)
✅ Посещаемость
✅ Отчёты
✅ Графики
✅ Заметки
✅ Логи активности
✅ Настройки
✅ Система приглашений
✅ Аутентификация

## Преимущества

- ✅ Простая установка - один `docker-compose up`
- ✅ Локальная БД - нет зависимости от внешних сервисов
- ✅ phpMyAdmin - удобный веб-интерфейс для управления
- ✅ Полный контроль - все данные на вашем сервере
- ✅ Бесплатно - MySQL/MariaDB бесплатны
- ✅ Стабильность - нет лимитов Docker Hub

## Разработка

### Запуск API в режиме разработки

```bash
cd api
npm run dev
```

### Сборка API

```bash
cd api
npm run build
npm start
```

### Запуск фронтенда

```bash
npm run dev
```

## Структура проекта

```
.
├── api/                 # REST API сервер
│   ├── src/
│   │   ├── routes/      # API маршруты
│   │   ├── config/       # Конфигурация БД
│   │   ├── middleware/  # Middleware (auth)
│   │   └── utils/       # Утилиты
│   └── package.json
├── database/            # SQL схемы
│   └── schema.sql       # Схема MySQL
├── src/                 # Frontend
│   ├── lib/
│   │   └── api.ts       # API клиент
│   ├── services/        # Сервисы (обновлены для REST API)
│   └── contexts/        # React контексты
└── docker-compose.yml   # Docker конфигурация
```

## Миграция данных

Если у вас были данные в Supabase, их нужно мигрировать вручную:

1. Экспортируйте данные из Supabase
2. Импортируйте в MySQL через phpMyAdmin или SQL скрипты
3. Убедитесь, что UUID совместимы (PostgreSQL UUID → MySQL CHAR(36))

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Проверьте подключение к БД: http://localhost:3000/api/health
3. Проверьте phpMyAdmin: http://localhost:8080

