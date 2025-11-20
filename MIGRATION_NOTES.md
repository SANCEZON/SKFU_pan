# Заметки по миграции

## Файлы, которые нужно обновить вручную

Некоторые страницы все еще используют старый Supabase клиент. Их нужно обновить:

### 1. src/pages/Dashboard.tsx
- Заменить `supabase.from('schedule_sessions')` на `getScheduleSessions()` из `src/services/schedules.ts`
- Заменить `supabase.from('students').select('id', { count: 'exact' })` на `getStudents()` и посчитать длину массива
- Заменить `supabase.from('reports').select('id', { count: 'exact' })` на `getReports()` и посчитать длину массива

### 2. src/pages/Logs.tsx
- Заменить `supabase.from('activity_logs')` на `getActivityLogs()` из `src/services/activityLogs.ts`
- Удалить функцию `clearLogsMutation` или реализовать её через API (если нужно)

### 3. src/pages/Attendance.tsx
- Проверить использование `supabase` и заменить на соответствующие функции из `src/services/attendance.ts`

### 4. src/pages/Reports.tsx
- Проверить использование `supabase` и заменить на соответствующие функции из `src/services/reports.ts`

### 5. src/pages/Schedule.tsx, Charts.tsx, StudentProfile.tsx, Settings.tsx
- Проверить использование `supabase` и заменить на соответствующие функции из сервисов

## Удалить старый файл

- `src/lib/supabase.ts` - больше не используется, можно удалить

## Проверка типов

После обновления всех файлов нужно:
1. Запустить `npm run build` для проверки TypeScript ошибок
2. Исправить все ошибки типов
3. Убедиться, что все импорты правильные

