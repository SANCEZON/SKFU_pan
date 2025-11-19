import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'
import { logActivity } from './activityLogs'

type Student = Database['public']['Tables']['students']['Row']
type StudentInsert = Database['public']['Tables']['students']['Insert']
type StudentUpdate = Database['public']['Tables']['students']['Update']

export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('full_name')
  
  if (error) throw error
  return data as Student[]
}

export async function getStudent(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Student
}

export async function createStudent(student: StudentInsert) {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select()
    .single()
  
  if (error) throw error
  await logActivity({
    action: 'student_created',
    entityType: 'student',
    entityId: data.id,
    details: { студент: data.full_name },
  })
  return data as Student
}

export async function updateStudent(id: string, student: StudentUpdate) {
  const { data, error } = await supabase
    .from('students')
    .update(student)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  await logActivity({
    action: 'student_updated',
    entityType: 'student',
    entityId: data.id,
    details: { студент: data.full_name },
  })
  return data as Student
}

export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id)
  
  if (error) throw error
  await logActivity({
    action: 'student_deleted',
    entityType: 'student',
    entityId: id,
  })
}

