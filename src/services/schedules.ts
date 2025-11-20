import { api } from '../lib/api'
import { format } from 'date-fns'
import { calculateCurrentWeek } from '../utils/scheduleCycle'

export interface Schedule {
  id: string
  subject_id: string
  teacher_id?: string | null
  day_of_week: number
  start_time: string
  end_time: string
  room?: string | null
  type: 'lecture' | 'lab' | 'practice'
  is_recurring: boolean
  start_date?: string | null
  end_date?: string | null
  week_number?: 1 | 2
  schedule_start_date?: string | null
  created_at: string
  updated_at: string
  subject_name?: string
  subject_code?: string
  teacher_name?: string
  teacher_email?: string
}

export interface ScheduleSession {
  id: string
  schedule_id?: string | null
  date: string
  start_time: string
  end_time: string
  room?: string | null
  is_cancelled: boolean
  created_at: string
  subject_id?: string
  teacher_id?: string
  subject_name?: string
  teacher_name?: string
}

export type ScheduleInsert = Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'subject_name' | 'subject_code' | 'teacher_name' | 'teacher_email'>
export type ScheduleUpdate = Partial<ScheduleInsert>
export type ScheduleSessionInsert = Omit<ScheduleSession, 'id' | 'created_at' | 'subject_id' | 'teacher_id' | 'subject_name' | 'teacher_name'>

export async function getSchedules(weekNumber?: 1 | 2): Promise<Schedule[]> {
  const query = weekNumber ? `?weekNumber=${weekNumber}` : ''
  return api.get<Schedule[]>(`/api/schedules${query}`)
}

export async function getSchedulesByWeek(weekNumber: 1 | 2): Promise<Schedule[]> {
  return getSchedules(weekNumber)
}

export async function createSchedule(schedule: ScheduleInsert): Promise<Schedule> {
  return api.post<Schedule>('/api/schedules', schedule)
}

export async function getScheduleSessions(startDate: string, endDate: string): Promise<ScheduleSession[]> {
  return api.get<ScheduleSession[]>(`/api/schedules/sessions?startDate=${startDate}&endDate=${endDate}`)
}

export async function createScheduleSession(session: ScheduleSessionInsert): Promise<ScheduleSession> {
  return api.post<ScheduleSession>('/api/schedules/sessions', session)
}

export async function generateSessionsForSchedule(
  scheduleId: string,
  startDate: Date,
  endDate: Date
): Promise<ScheduleSessionInsert[]> {
  return api.post<ScheduleSessionInsert[]>(`/api/schedules/${scheduleId}/generate-sessions`, {
    startDate: format(startDate, 'yyyy-MM-dd'),
    endDate: format(endDate, 'yyyy-MM-dd'),
  })
}

export async function updateSchedule(id: string, updates: ScheduleUpdate): Promise<Schedule> {
  return api.put<Schedule>(`/api/schedules/${id}`, updates)
}

export async function deleteSchedule(id: string): Promise<void> {
  return api.delete(`/api/schedules/${id}`)
}

export function getCurrentWeekNumber(scheduleStartDate: Date | string | null): 1 | 2 {
  if (!scheduleStartDate) return 1
  const startDate = typeof scheduleStartDate === 'string' ? new Date(scheduleStartDate) : scheduleStartDate
  return calculateCurrentWeek(startDate)
}
