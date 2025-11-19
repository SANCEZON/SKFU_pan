import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
type AttendanceRecordInsert = Database['public']['Tables']['attendance_records']['Insert']
type AttendanceRecordUpdate = Database['public']['Tables']['attendance_records']['Update']
type Report = Database['public']['Tables']['reports']['Row']
type ReportInsert = Database['public']['Tables']['reports']['Insert']

export async function getAttendanceForSession(sessionId: string) {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`
      *,
      students (id, full_name),
      absence_reasons (name, code)
    `)
    .eq('session_id', sessionId)
  
  if (error) throw error
  return data
}

export async function upsertAttendanceRecord(record: AttendanceRecordInsert) {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(record, { onConflict: 'session_id,student_id' })
    .select()
    .single()
  
  if (error) throw error
  return data as AttendanceRecord
}

export async function bulkUpsertAttendanceRecords(records: AttendanceRecordInsert[]) {
  const { data, error } = await supabase
    .from('attendance_records')
    .upsert(records, { onConflict: 'session_id,student_id' })
    .select()
  
  if (error) throw error
  return data as AttendanceRecord[]
}

export async function createReport(report: ReportInsert) {
  // Проверяем, есть ли уже отчёт для этой сессии
  const { data: existingReport, error: checkError } = await supabase
    .from('reports')
    .select('id')
    .eq('session_id', report.session_id)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    // PGRST116 - это "not found", это нормально
    throw checkError
  }

  if (existingReport) {
    // Если отчёт уже существует, обновляем его
    const { data, error } = await supabase
      .from('reports')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existingReport.id)
      .select()
      .single()
    
    if (error) throw error
    return data as Report
  } else {
    // Если отчёта нет, создаём новый
    const { data, error } = await supabase
      .from('reports')
      .insert(report)
      .select()
      .single()
    
    if (error) throw error
    return data as Report
  }
}

export async function getAbsenceReasons() {
  const { data, error } = await supabase
    .from('absence_reasons')
    .select('*')
    .eq('is_active', true)
    .order('name')
  
  if (error) throw error
  return data
}

