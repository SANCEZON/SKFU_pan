import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { calculateCurrentWeek, getWeekDatesInRange } from '../utils/scheduleCycle'
import { logActivity } from './activityLogs'

type Schedule = Database['public']['Tables']['schedules']['Row']
type ScheduleInsert = Database['public']['Tables']['schedules']['Insert']
type ScheduleSession = Database['public']['Tables']['schedule_sessions']['Row']
type ScheduleSessionInsert = Database['public']['Tables']['schedule_sessions']['Insert']

export async function getSchedules(weekNumber?: 1 | 2) {
  let query = supabase
    .from('schedules')
    .select(`
      *,
      subjects (name, code),
      teachers (full_name, email)
    `)

  if (weekNumber) {
    query = query.eq('week_number', weekNumber)
  }

  const { data, error } = await query
    .order('day_of_week')
    .order('start_time')
  
  if (error) throw error
  return data
}

export async function getSchedulesByWeek(weekNumber: 1 | 2) {
  return getSchedules(weekNumber)
}

export async function createSchedule(schedule: ScheduleInsert) {
  const { data, error } = await supabase
    .from('schedules')
    .insert(schedule)
    .select()
    .single()
  
  if (error) throw error
  await logActivity({
    action: 'schedule_created',
    entityType: 'schedule',
    entityId: data.id,
    details: { день: data.day_of_week, время: `${data.start_time} - ${data.end_time}` },
  })
  return data as Schedule
}

export async function getScheduleSessions(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('schedule_sessions')
    .select(`
      *,
      schedules (
        subjects (name),
        teachers (full_name)
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate)
    .eq('is_cancelled', false)
    .order('date')
    .order('start_time')
  
  if (error) throw error
  return data
}

export async function createScheduleSession(session: ScheduleSessionInsert) {
  const { data, error } = await supabase
    .from('schedule_sessions')
    .insert(session)
    .select()
    .single()
  
  if (error) throw error
  return data as ScheduleSession
}

export async function generateSessionsForSchedule(
  scheduleId: string,
  startDate: Date,
  endDate: Date
) {
  const schedule = await supabase
    .from('schedules')
    .select('*')
    .eq('id', scheduleId)
    .single()

  if (schedule.error) throw schedule.error

  const scheduleData = schedule.data
  const sessions: ScheduleSessionInsert[] = []

  // If schedule has week_number, only generate sessions for that week
  if (scheduleData.week_number && scheduleData.schedule_start_date) {
    const weekDates = getWeekDatesInRange(
      new Date(scheduleData.schedule_start_date),
      scheduleData.week_number as 1 | 2,
      startDate,
      endDate
    )

    weekDates.forEach((date) => {
      if (date.getDay() === scheduleData.day_of_week) {
        sessions.push({
          schedule_id: scheduleId,
          date: format(date, 'yyyy-MM-dd'),
          start_time: scheduleData.start_time,
          end_time: scheduleData.end_time,
          room: scheduleData.room,
          is_cancelled: false,
        })
      }
    })
  } else {
    // Legacy behavior: generate for all matching days
    let currentDate = startDate
    while (currentDate <= endDate) {
      if (currentDate.getDay() === scheduleData.day_of_week) {
        sessions.push({
          schedule_id: scheduleId,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: scheduleData.start_time,
          end_time: scheduleData.end_time,
          room: scheduleData.room,
          is_cancelled: false,
        })
      }
      currentDate = addDays(currentDate, 1)
    }
  }

  if (sessions.length > 0) {
    const { error } = await supabase
      .from('schedule_sessions')
      .insert(sessions)
      .select()

    if (error) throw error
  }

  return sessions
}

export async function updateSchedule(id: string, updates: Database['public']['Tables']['schedules']['Update']) {
  const { data, error } = await supabase
    .from('schedules')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  await logActivity({
    action: 'schedule_updated',
    entityType: 'schedule',
    entityId: data.id,
    details: { изменения: updates },
  })
  return data as Schedule
}

export async function deleteSchedule(id: string) {
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  await logActivity({
    action: 'schedule_deleted',
    entityType: 'schedule',
    entityId: id,
  })
}

export function getCurrentWeekNumber(scheduleStartDate: Date | string | null): 1 | 2 {
  if (!scheduleStartDate) return 1
  const startDate = typeof scheduleStartDate === 'string' ? new Date(scheduleStartDate) : scheduleStartDate
  return calculateCurrentWeek(startDate)
}

