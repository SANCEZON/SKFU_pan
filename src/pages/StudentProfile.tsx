import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useStudent } from '../hooks/useStudents'
import { supabase } from '../lib/supabase'
import Card from '../components/ui/Card'
import { format } from 'date-fns'
import { translateStatus } from '../utils/statusTranslations'

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const { data: student, isLoading } = useStudent(id || '')

  const { data: attendanceStats } = useQuery({
    queryKey: ['student-attendance-stats', id],
    queryFn: async () => {
      if (!id) return null

      const now = new Date()
      const weekStart = format(new Date(now.setDate(now.getDate() - now.getDay() + 1)), 'yyyy-MM-dd')
      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')

      const [allRecords, weekRecords, monthRecords] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('*')
          .eq('student_id', id)
          .neq('status', 'present'),
        supabase
          .from('attendance_records')
          .select('*')
          .eq('student_id', id)
          .neq('status', 'present')
          .gte('created_at', weekStart),
        supabase
          .from('attendance_records')
          .select('*')
          .eq('student_id', id)
          .neq('status', 'present')
          .gte('created_at', monthStart),
      ])

      return {
        total: allRecords.data?.length || 0,
        week: weekRecords.data?.length || 0,
        month: monthRecords.data?.length || 0,
        details: allRecords.data || [],
      }
    },
    enabled: !!id,
  })

  const { data: attendanceDetails } = useQuery({
    queryKey: ['student-attendance-details', id],
    queryFn: async () => {
      if (!id) return []

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          schedule_sessions (
            date,
            start_time,
            schedules (
              subjects (name)
            )
          ),
          absence_reasons (name)
        `)
        .eq('student_id', id)
        .neq('status', 'present')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data
    },
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
              {attendanceStats?.total || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за неделю</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {attendanceStats?.week || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-600">Пропусков за месяц</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {attendanceStats?.month || 0}
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
                      {record.schedule_sessions?.schedules?.subjects?.name || 'Предмет'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {record.schedule_sessions?.date &&
                        format(new Date(record.schedule_sessions.date), 'd MMMM yyyy')}{' '}
                      • {record.schedule_sessions?.start_time}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Статус: {translateStatus(record.status)} • Причина:{' '}
                      {record.absence_reasons?.name || 'не указана'}
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
