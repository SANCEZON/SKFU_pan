import { api } from '../lib/api'

export type ActivityAction =
  | 'student_created'
  | 'student_updated'
  | 'student_deleted'
  | 'schedule_created'
  | 'schedule_updated'
  | 'schedule_deleted'
  | 'attendance_updated'

export interface ActivityLog {
  id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id?: string | null
  details?: any
  created_at: string
  user_email?: string
}

export async function getActivityLogs(limit = 100): Promise<ActivityLog[]> {
  return api.get<ActivityLog[]>(`/api/logs?limit=${limit}`)
}

export async function logActivity(_entry: {
  action: ActivityAction
  entityType: string
  entityId?: string | null
  details?: any
  description?: string
}): Promise<void> {
  // Логирование теперь происходит на сервере автоматически
  // Эта функция оставлена для совместимости, но не делает ничего
  // В будущем можно добавить клиентское логирование если нужно
}
