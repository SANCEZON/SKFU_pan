import pool from '../config/database.js'

interface LogEntry {
  action: string
  entityType: string
  entityId?: string | null
  details?: any
  description?: string
}

export async function logActivity(userId: string, entry: LogEntry) {
  try {
    const details = entry.details || {
      описание: entry.description,
    }

    await pool.execute(
      'INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)',
      [userId, entry.action, entry.entityType, entry.entityId || null, JSON.stringify(details)]
    )
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

