import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type Teacher = Database['public']['Tables']['teachers']['Row']
type TeacherInsert = Database['public']['Tables']['teachers']['Insert']
type TeacherUpdate = Database['public']['Tables']['teachers']['Update']

export async function getTeachers() {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .order('full_name')
  
  if (error) throw error
  return data as Teacher[]
}

export async function getTeacher(id: string) {
  const { data, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data as Teacher
}

export async function createTeacher(teacher: TeacherInsert) {
  const { data, error } = await supabase
    .from('teachers')
    .insert(teacher)
    .select()
    .single()
  
  if (error) throw error
  return data as Teacher
}

export async function updateTeacher(id: string, teacher: TeacherUpdate) {
  const { data, error } = await supabase
    .from('teachers')
    .update(teacher)
    .eq('id', id)
    .select()
    .single()
  
  if (error) throw error
  return data as Teacher
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', id)
  
  if (error) throw error
}

