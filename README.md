# Панель учёта посещаемости

Веб-панель для управления журналом посещаемости учебной группы с локальной базой Supabase.

## Технологии

- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Query
- Supabase (PostgreSQL)

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте переменные окружения:
```bash
cp .env.example .env.local
```

Отредактируйте `.env.local` и укажите URL и ключ вашего Supabase.

3. Запустите локальный Supabase (через Docker):
```bash
docker-compose up -d
```

4. Примените миграции базы данных:
```bash
# Подключитесь к базе и выполните SQL из supabase/migrations/001_initial_schema.sql
# Или используйте Supabase CLI если установлен
```

5. Запустите dev сервер:
```bash
npm run dev
```

## Структура проекта

```
src/
  components/     # Переиспользуемые компоненты
  pages/          # Страницы приложения
  hooks/          # Custom hooks
  lib/            # Supabase клиент, утилиты
  types/          # TypeScript типы
  services/       # API сервисы
  contexts/       # React контексты
  utils/          # Вспомогательные функции
```

## Основные функции

- Управление студентами и преподавателями
- Расписание занятий
- Отметка посещаемости
- Отчёты и аналитика
- Экспорт данных (CSV, PDF)
- Логирование действий

