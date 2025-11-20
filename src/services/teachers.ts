import { api } from '../lib/api'

export interface Teacher {
  id: string
  full_name: string
  email?: string | null
  phone?: string | null
  created_at: string
  updated_at: string
}

export type TeacherInsert = Omit<Teacher, 'id' | 'created_at' | 'updated_at'>
export type TeacherUpdate = Partial<TeacherInsert>

export async function getTeachers(): Promise<Teacher[]> {
  return api.get<Teacher[]>('/api/teachers')
}

export async function getTeacher(id: string): Promise<Teacher> {
  return api.get<Teacher>(`/api/teachers/${id}`)
}

export async function createTeacher(teacher: TeacherInsert): Promise<Teacher> {
  return api.post<Teacher>('/api/teachers', teacher)
}

export async function updateTeacher(id: string, teacher: TeacherUpdate): Promise<Teacher> {
  return api.put<Teacher>(`/api/teachers/${id}`, teacher)
}

export async function deleteTeacher(id: string): Promise<void> {
  return api.delete(`/api/teachers/${id}`)
}
