import { supabase } from '../lib/supabase'
import { Json } from '../types/database.types'

export type ActivityAction =
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'attendance_updated'

interface LogEntry {
  action: ActivityAction
  entityType: string
  entityId?: string | null
  details?: Json
  description?: string
}

export async function logActivity(entry: LogEntry) {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return

  const { error } = await supabase.from('activity_logs').insert({
    user_id: user.id,
    action_type: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId || null,
    details: entry.details || {
      автор: user.email,
      описание: entry.description,
    },
  })

  if (error) {
    console.error('Failed to log activity:', error)
  }
}

