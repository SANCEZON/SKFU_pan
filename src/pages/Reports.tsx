import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReports, getReport, deleteReport } from '../services/reports'
import { getAttendanceForSession } from '../services/attendance'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { exportToCSV } from '../utils/csv'
import { translateStatus } from '../utils/statusTranslations'

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const queryClient = useQueryClient()

  const { data: reports, isLoading, error } = useQuery({
    queryKey: ['reports', startDate, endDate],
    queryFn: () => getReports({ startDate, endDate }),
    refetchInterval: 30000, // Обновлять каждые 30 секунд
    refetchOnWindowFocus: true, // Обновлять при возврате фокуса
  })

  // Логирование для отладки
  console.log('Reports page - startDate:', startDate, 'endDate:', endDate)
  console.log('Reports page - reports count:', reports?.length || 0)

  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    },
  })

  const { data: reportDetails } = useQuery({
    queryKey: ['report-details', selectedReport],
    queryFn: () => getReport(selectedReport!),
    enabled: !!selectedReport,
  })

  const { data: attendanceDetails } = useQuery({
    queryKey: ['report-attendance', reportDetails?.session_id],
    queryFn: () => getAttendanceForSession(reportDetails?.session_id || ''),
    enabled: !!reportDetails?.session_id,
  })

  const handleExport = async (report: any) => {
    if (!report.session_id) return
    
    const attendance = await getAttendanceForSession(report.session_id)
    if (!attendance) return

    const absentStudents = attendance
      .filter((a: any) => a.status !== 'present')
      .map((a: any) => ({
        'ФИО': a.student_name || '',
        'Статус': translateStatus(a.status),
        'Причина': a.reason_name || '',
        'Заметка': a.note || '',
      }))

    exportToCSV(absentStudents, `report_${report.id}_${format(new Date(report.created_at), 'yyyy-MM-dd')}.csv`)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Отчёты</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handlePrint}>
            Печать
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Дата начала"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Input
              label="Дата окончания"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {(startDate || endDate) && (
          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setStartDate('')
                setEndDate('')
              }}
              className="text-sm"
            >
              Очистить фильтры
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Ошибка загрузки отчётов: {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </div>
        ) : reports && reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report: any) => {
              const session = report.schedule_sessions || {
                date: report.date,
                start_time: report.start_time,
                end_time: report.end_time,
                schedules: {
                  subjects: { name: report.subject_name },
                  teachers: { full_name: report.teacher_name },
                },
              }
              return (
                <ReportItem
                  key={report.id}
                  report={report}
                  session={session}
                  onView={() => setSelectedReport(report.id)}
                  onExport={() => handleExport(report)}
                  onDelete={() => {
                    if (window.confirm('Вы уверены, что хотите удалить этот отчёт?')) {
                      deleteMutation.mutate(report.id)
                    }
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Нет отчётов</p>
            {startDate || endDate ? (
              <p className="text-sm mt-2 text-gray-400">
                Попробуйте изменить фильтры по датам или очистить их
              </p>
            ) : null}
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Детали отчёта"
      >
        {reportDetails && attendanceDetails && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                {reportDetails.subject_name || 'Предмет'}
              </h3>
              <p className="text-sm text-gray-600">
                {reportDetails.teacher_name || 'Преподаватель'}
              </p>
              <p className="text-sm text-gray-600">
                {reportDetails.date && format(new Date(reportDetails.date), 'd MMMM yyyy')}{' '}
                • {reportDetails.start_time || ''} - {reportDetails.end_time || ''}
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Отсутствующие студенты</h4>
              {attendanceDetails
                .filter((a: any) => a.status !== 'present')
                .length > 0 ? (
                <div className="space-y-2">
                  {attendanceDetails
                    .filter((a: any) => a.status !== 'present')
                    .map((record: any) => (
                      <div
                        key={record.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="font-medium text-gray-900">
                          {record.student_name || record.students?.full_name || 'Студент'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Статус: {translateStatus(record.status)} • Причина:{' '}
                          {record.reason_name || record.absence_reasons?.name || 'не указана'}
                        </div>
                        {record.note && (
                          <div className="text-sm text-gray-500 mt-1">Заметка: {record.note}</div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">Все студенты присутствовали</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Компонент для отображения одного отчёта в списке
function ReportItem({ report, session, onView, onExport, onDelete }: {
  report: any
  session: any
  onView: () => void
  onExport: () => void
  onDelete: () => void
}) {
  const { data: absentCount } = useQuery({
    queryKey: ['absent-count', report.session_id],
    queryFn: async () => {
      if (!report.session_id) return 0
      const attendance = await getAttendanceForSession(report.session_id)
      return attendance.filter((a: any) => a.status !== 'present').length
    },
  })

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">
            {session?.schedules?.subjects?.name || report.subject_name || 'Предмет'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {session?.schedules?.teachers?.full_name || report.teacher_name || 'Преподаватель'} •{' '}
            {session?.date && format(new Date(session.date), 'd MMMM yyyy')}
            {report.date && format(new Date(report.date), 'd MMMM yyyy')} •{' '}
            {session?.start_time || report.start_time} - {session?.end_time || report.end_time}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Отправлен: {format(new Date(report.created_at), 'd MMM yyyy, HH:mm')} •{' '}
            Отсутствующих: {absentCount ?? '...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onView}
            className="text-sm"
          >
            Просмотр
          </Button>
          <Button
            variant="secondary"
            onClick={onExport}
            className="text-sm"
          >
            Экспорт CSV
          </Button>
          <Button
            variant="secondary"
            onClick={onDelete}
            className="text-sm bg-red-50 text-red-600 hover:bg-red-100"
          >
            Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}