import { api } from '../lib/api'

export interface AttendanceRecord {
  id: string
  session_id: string
  student_id: string
  status: 'present' | 'absent' | 'late' | 'vacation' | 'sick'
  reason_id?: string | null
  note?: string | null
  created_at: string
  updated_at: string
  student_name?: string
  reason_name?: string
  reason_code?: string
}

export interface AbsenceReason {
  id: string
  name: string
  code: string
  is_active: boolean
  created_at: string
}

export type AttendanceRecordInsert = Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at' | 'student_name' | 'reason_name' | 'reason_code'>

export async function getAttendanceForSession(sessionId: string): Promise<AttendanceRecord[]> {
  return api.get<AttendanceRecord[]>(`/api/attendance/session/${sessionId}`)
}

export async function upsertAttendanceRecord(record: AttendanceRecordInsert): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/api/attendance', record)
}

export async function bulkUpsertAttendanceRecords(records: AttendanceRecordInsert[]): Promise<AttendanceRecord[]> {
  return api.post<AttendanceRecord[]>('/api/attendance/bulk', { records })
}

export async function getAbsenceReasons(): Promise<AbsenceReason[]> {
  return api.get<AbsenceReason[]>('/api/attendance/reasons')
}
