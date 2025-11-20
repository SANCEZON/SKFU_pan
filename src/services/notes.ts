import { api } from '../lib/api'

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  is_pinned: boolean
  created_at: string
  updated_at: string
}

export type NoteInsert = Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>
export type NoteUpdate = Partial<NoteInsert>

export async function getNotes(userId: string): Promise<Note[]> {
  return api.get<Note[]>('/api/notes')
}

export async function createNote(note: NoteInsert): Promise<Note> {
  return api.post<Note>('/api/notes', note)
}

export async function updateNote(id: string, note: NoteUpdate): Promise<Note> {
  return api.put<Note>(`/api/notes/${id}`, note)
}

export async function deleteNote(id: string): Promise<void> {
  return api.delete(`/api/notes/${id}`)
}
