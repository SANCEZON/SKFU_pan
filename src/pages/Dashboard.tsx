import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getScheduleSessions } from '../services/schedules'
import { getStudents } from '../services/students'
import { getReports } from '../services/reports'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function Dashboard() {
  // Используем состояние для даты, чтобы она обновлялась
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  
  // Обновляем дату каждую минуту (на случай смены дня)
  useEffect(() => {
    const interval = setInterval(() => {
      const newToday = format(new Date(), 'yyyy-MM-dd')
      if (newToday !== today) {
        setToday(newToday)
      }
    }, 60000) // Проверяем каждую минуту
    
    return () => clearInterval(interval)
  }, [today])
  
  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', today],
    queryFn: async () => {
      const sessions = await getScheduleSessions(today, today)
      return sessions.filter((s: any) => s.date === today && !s.is_cancelled)
        .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time))
    },
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    refetchOnWindowFocus: true, // Обновлять при возврате фокуса
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [students, reports] = await Promise.all([
        getStudents(),
        getReports(),
      ])
      
      return {
        activeStudents: students.filter((s: any) => s.status === 'active').length,
        totalReports: reports.length,
      }
    },
    refetchInterval: 60000, // Обновлять статистику каждую минуту
    refetchOnWindowFocus: true,
  })

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Главная</h1>
        <p className="text-gray-600 mt-2">
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Активных студентов</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.activeStudents || 0}
              </p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего отчётов</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.totalReports || 0}
              </p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Пар сегодня</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {todaySessions?.length || 0}
              </p>
            </div>
            <div className="text-4xl">📅</div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Сегодняшние пары</h2>
          <Link to="/schedule">
            <Button variant="secondary">Все расписание</Button>
          </Link>
        </div>
        {todaySessions && todaySessions.length > 0 ? (
          <div className="space-y-3">
            {todaySessions.map((session: any) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {session.subject_name || 'Предмет'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {session.teacher_name || 'Преподаватель'} • {session.start_time} - {session.end_time}
                    {session.room && ` • ${session.room}`}
                  </p>
                </div>
                <Link to={`/attendance?session=${session.id}`}>
                  <Button>Отметить</Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет пар на сегодня</p>
        )}
      </Card>
    </div>
  )
}