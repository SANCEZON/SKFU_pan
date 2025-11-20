import { api } from '../lib/api'

export interface Subject {
  id: string
  name: string
  code?: string | null
  created_at: string
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at'>

export async function getSubjects(): Promise<Subject[]> {
  return api.get<Subject[]>('/api/subjects')
}

export async function createSubject(subject: SubjectInsert): Promise<Subject> {
  return api.post<Subject>('/api/subjects', subject)
}
