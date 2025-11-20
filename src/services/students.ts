import { api } from '../lib/api'

export interface Student {
  id: string
  full_name: string
  telegram?: string | null
  phone?: string | null
  status: 'active' | 'expelled'
  group_id?: string | null
  created_at: string
  updated_at: string
}

export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>
export type StudentUpdate = Partial<StudentInsert>

export async function getStudents(): Promise<Student[]> {
  return api.get<Student[]>('/api/students')
}

export async function getStudent(id: string): Promise<Student> {
  return api.get<Student>(`/api/students/${id}`)
}

export async function createStudent(student: StudentInsert): Promise<Student> {
  return api.post<Student>('/api/students', student)
}

export async function updateStudent(id: string, student: StudentUpdate): Promise<Student> {
  return api.put<Student>(`/api/students/${id}`, student)
}

export async function deleteStudent(id: string): Promise<void> {
  return api.delete(`/api/students/${id}`)
}
