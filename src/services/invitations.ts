import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type Invitation = Database['public']['Tables']['user_invitations']['Row']
type InvitationInsert = Database['public']['Tables']['user_invitations']['Insert']
type ApprovalLog = Database['public']['Tables']['approval_logs']['Row']
type UserProfile = Database['public']['Tables']['user_profiles']['Row']

export async function getInvitations() {
  const { data, error } = await supabase
    .from('user_invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Invitation[]
}

export async function getPendingProfiles() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data as UserProfile[]
}

export async function getApprovalLogs(limit = 50) {
  const { data, error } = await supabase
    .from('approval_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as ApprovalLog[]
}

export async function createInvitation(payload: Pick<InvitationInsert, 'email' | 'expires_at' | 'note'>) {
  const token = crypto.randomUUID()
  const { data, error } = await supabase
    .from('user_invitations')
    .insert({
      email: payload.email.toLowerCase(),
      token,
      expires_at: payload.expires_at,
      note: payload.note,
    })
    .select()
    .single()

  if (error) throw error
  return data as Invitation
}

export async function updateInvitationStatus(id: string, status: Invitation['status'], userId?: string | null) {
  const { data, error } = await supabase
    .from('user_invitations')
    .update({
      status,
      approved_by: userId || null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Invitation
}

export async function logApprovalAction(entry: {
  invitation_id?: string | null
  target_email: string
  action: ApprovalLog['action']
  acted_by?: string | null
  details?: string | null
}) {
  const { error } = await supabase.from('approval_logs').insert(entry)
  if (error) throw error
}

export async function approveProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ status: 'approved' })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

export async function rejectProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ status: 'rejected' })
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as UserProfile
}

