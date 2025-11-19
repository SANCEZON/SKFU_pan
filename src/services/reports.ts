import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type Report = Database['public']['Tables']['reports']['Row']
type AttendanceRecordRow = Database['public']['Tables']['attendance_records']['Row']

export interface WeeklyAttendanceRecord extends AttendanceRecordRow {
  students: {
    full_name: string | null
  } | null
  schedule_sessions: {
    id: string
    date: string
    start_time: string
    end_time: string
    room: string | null
    schedules: {
      subjects: { name: string | null } | null
      teachers: { full_name: string | null } | null
    } | null
  } | null
  absence_reasons: {
    name: string | null
  } | null
}

export async function getReports(filters?: {
  startDate?: string
  endDate?: string
  subjectId?: string
  teacherId?: string
}) {
  let query = supabase
    .from('reports')
    .select(`
      *,
      schedule_sessions (
        id,
        date,
        start_time,
        end_time,
        schedules (
          subjects (name),
          teachers (full_name)
        )
      )
    `)
    .order('created_at', { ascending: false })

  // Фильтруем только если даты указаны и не пустые
  if (filters?.startDate && filters.startDate.trim() !== '') {
    // Добавляем время начала дня для корректной фильтрации
    const startDateTime = `${filters.startDate}T00:00:00.000Z`
    query = query.gte('created_at', startDateTime)
  }
  if (filters?.endDate && filters.endDate.trim() !== '') {
    // Добавляем время конца дня для корректной фильтрации
    const endDateTime = `${filters.endDate}T23:59:59.999Z`
    query = query.lte('created_at', endDateTime)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching reports:', error)
    throw error
  }
  
  console.log('Fetched reports:', data?.length || 0, 'reports')
  return data || []
}

export async function getReport(id: string) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      schedule_sessions (
        *,
        schedules (
          subjects (name),
          teachers (full_name)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function deleteReport(id: string) {
  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

export async function getWeeklyAttendanceReport(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      id,
      status,
      note,
      session_id,
      students (full_name),
      schedule_sessions (
        id,
        date,
        start_time,
        end_time,
        room,
        schedules (
          subjects (name),
          teachers (full_name)
        )
      ),
      absence_reasons (name)
    `)
    .gte('schedule_sessions.date', startDate)
    .lte('schedule_sessions.date', endDate)
    .neq('status', 'present')
    .order('date', { referencedTable: 'schedule_sessions' })
    .order('start_time', { referencedTable: 'schedule_sessions' })

  if (error) {
    console.error('Error fetching weekly report:', error)
    throw error
  }

  return (data || []) as WeeklyAttendanceRecord[]
}

