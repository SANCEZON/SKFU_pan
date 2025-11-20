import { api } from '../lib/api'

export interface WeeklyAttendanceRecord {
  id: string
  status: string
  note?: string | null
  session_id: string
  student_id: string
  student_name?: string | null
  session_date?: string | null
  start_time?: string | null
  end_time?: string | null
  room?: string | null
  subject_name?: string | null
  teacher_name?: string | null
  reason_name?: string | null
}

export interface Report {
  id: string
  session_id: string
  created_by: string
  created_at: string
  updated_at: string
  date?: string
  start_time?: string
  end_time?: string
  subject_name?: string
  teacher_name?: string
}

export async function getReports(filters?: {
  startDate?: string
  endDate?: string
  subjectId?: string
  teacherId?: string
}): Promise<Report[]> {
  const params = new URLSearchParams()
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  const query = params.toString()
  return api.get<Report[]>(`/api/reports${query ? `?${query}` : ''}`)
}

export async function getReport(id: string): Promise<Report> {
  return api.get<Report>(`/api/reports/${id}`)
}

export async function createReport(data: { session_id: string; created_by: string }): Promise<Report> {
  return api.post<Report>('/api/reports', data)
}

export async function deleteReport(id: string): Promise<void> {
  return api.delete(`/api/reports/${id}`)
}

type WeeklyAttendanceRecordResponse = WeeklyAttendanceRecord & {
  date?: string | null
}

export async function getWeeklyAttendanceReport(startDate: string, endDate: string): Promise<WeeklyAttendanceRecord[]> {
  const records = await api.get<WeeklyAttendanceRecordResponse[]>(
    `/api/reports/weekly?startDate=${startDate}&endDate=${endDate}`
  )
  return records.map((record) => ({
    ...record,
    session_date: record.session_date ?? record.date ?? null,
  }))
}
