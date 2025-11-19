import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type Subject = Database['public']['Tables']['subjects']['Row']
type SubjectInsert = Database['public']['Tables']['subjects']['Insert']

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name')
  
  if (error) throw error
  return data as Subject[]
}

export async function createSubject(subject: SubjectInsert) {
  const { data, error } = await supabase
    .from('subjects')
    .insert(subject)
    .select()
    .single()
  
  if (error) throw error
  return data as Subject
}

