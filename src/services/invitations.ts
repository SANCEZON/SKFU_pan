import { api } from '../lib/api'

export interface Invitation {
  id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired'
  created_by?: string | null
  approved_by?: string | null
  note?: string | null
  expires_at?: string | null
  used_at?: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
  user_id: string
  full_name?: string | null
  user_email?: string | null
  status: 'pending' | 'approved' | 'rejected'
  invitation_id?: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalLog {
  id: string
  invitation_id?: string | null
  target_email: string
  action: 'invited' | 'approved' | 'rejected' | 'revoked'
  acted_by?: string | null
  details?: string | null
  created_at: string
}

export type InvitationInsert = Omit<Invitation, 'id' | 'created_at' | 'updated_at' | 'token' | 'status'>

export async function getInvitations(): Promise<Invitation[]> {
  return api.get<Invitation[]>('/api/invitations')
}

export async function getPendingProfiles(): Promise<UserProfile[]> {
  return api.get<UserProfile[]>('/api/invitations/pending-profiles')
}

export async function getApprovalLogs(limit = 50): Promise<ApprovalLog[]> {
  return api.get<ApprovalLog[]>(`/api/invitations/approval-logs?limit=${limit}`)
}

export async function createInvitation(payload: Pick<InvitationInsert, 'email' | 'expires_at' | 'note'>): Promise<Invitation> {
  return api.post<Invitation>('/api/invitations', payload)
}

export async function updateInvitationStatus(id: string, status: Invitation['status'], _userId?: string | null): Promise<Invitation> {
  if (status === 'accepted') {
    return api.put<Invitation>(`/api/invitations/${id}/approve`)
  }
  return api.put<Invitation>(`/api/invitations/${id}/status`, { status })
}

export async function logApprovalAction(_entry: {
  invitation_id?: string | null
  target_email: string
  action: ApprovalLog['action']
  acted_by?: string | null
  details?: string | null
}): Promise<void> {
  // Логирование происходит на сервере
}

export async function approveProfile(userId: string): Promise<UserProfile> {
  return api.put<UserProfile>(`/api/invitations/profile/${userId}/approve`)
}

export async function rejectProfile(userId: string): Promise<UserProfile> {
  return api.put<UserProfile>(`/api/invitations/profile/${userId}/reject`)
}
