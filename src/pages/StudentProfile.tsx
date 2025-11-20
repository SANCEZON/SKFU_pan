import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStudent } from '../hooks/useStudents'
import { api } from '../lib/api'
import Card from '../components/ui/Card'
import { format, subDays, startOfMonth } from 'date-fns'
import { translateStatus } from '../utils/statusTranslations'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()

  const { data: student, isLoading } = useStudent(id || '')

  const now = new Date()
  const weekStart = format(subDays(now, 7), 'yyyy-MM-dd')
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

  const { data: allRecords } = useQuery({
    queryKey: ['student-attendance-all', id],
    queryFn: () => api.get<any[]>(`/api/attendance/student/${id}/stats`),
    enabled: !!id,
  })

  const { data: weekRecords } = useQuery({
    queryKey: ['student-attendance-week', id, weekStart],
    queryFn: () => api.get<any[]>(`/api/attendance/student/${id}/stats?startDate=${weekStart}`),
    enabled: !!id,
  })

  const { data: monthRecords } = useQuery({
    queryKey: ['student-attendance-month', id, monthStart],
    queryFn: () => api.get<any[]>(`/api/attendance/student/${id}/stats?startDate=${monthStart}`),
    enabled: !!id,
  })

  const { data: attendanceDetails } = useQuery({
    queryKey: ['student-attendance-details', id],
    queryFn: () => api.get<any[]>(`/api/attendance/student/${id}/stats`),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div>
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <div className="text-center py-8 text-gray-500">Студент не найден</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{student.full_name}</h1>
        <p className="text-gray-600 mt-2">
          {student.phone && `📞 ${student.phone}`} {student.telegram && `• 📱 ${student.telegram}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Всего пропусков</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {allRecords?.length || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за неделю</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {weekRecords?.length || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за месяц</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {monthRecords?.length || 0}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">История пропусков</h2>
        {attendanceDetails && attendanceDetails.length > 0 ? (
          <div className="space-y-3">
            {attendanceDetails.map((record: any) => (
              <div
                key={record.id}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.subject_name || 'Предмет'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {record.session_date &&
                        format(new Date(record.session_date), 'd MMMM yyyy')}{' '}
                      • {record.start_time}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Статус: {translateStatus(record.status)} • Причина:{' '}
                      {record.reason_name || 'не указана'}
                    </p>
                    {record.note && (
                      <p className="text-sm text-gray-500 mt-1">Заметка: {record.note}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Нет пропусков</p>
        )}
      </Card>
    </div>
  )
}
