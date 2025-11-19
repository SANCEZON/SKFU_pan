import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  profile: UserProfile | null
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, inviteToken?: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const fetchProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single()

    if (error) {
      if ((error as any).code === 'PGRST116') {
        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({ user_id: currentUser.id, status: 'pending' })
          .select()
          .single()

        if (createError) {
          console.error(createError)
          setProfile(null)
        } else {
          setProfile(createdProfile)
        }
      } else {
        console.error(error)
        setProfile(null)
      }
    } else {
      setProfile(data)
    }
    setProfileLoading(false)
  }

  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      fetchProfile(session?.user ?? null)
    })

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      fetchProfile(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, inviteToken?: string) => {
    if (!inviteToken) {
      throw new Error('Необходимо ввести код приглашения')
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', inviteToken)
      .eq('status', 'pending')
      .single()

    if (inviteError) {
      throw new Error('Неверный или уже использованный код приглашения')
    }

    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error('Этот код приглашения предназначен для другого email')
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new Error('Срок действия приглашения истёк')
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error

    // Обновляем приглашение
    await supabase
      .from('user_invitations')
      .update({ status: 'accepted', used_at: new Date().toISOString() })
      .eq('id', invitation.id)

    const { data: currentSession } = await supabase.auth.getSession()
    const newUser = currentSession.session?.user
    if (newUser) {
      await supabase.from('user_profiles').upsert({
        user_id: newUser.id,
        status: 'pending',
        invitation_id: invitation.id,
      })
      fetchProfile(newUser)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        profileLoading,
        refreshProfile: () => fetchProfile(user),
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

