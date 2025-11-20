import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
}

interface UserProfile {
  user_id: string
  full_name?: string | null
  status: 'pending' | 'approved' | 'rejected'
  invitation_id?: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: { token: string } | null
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
  const [session, setSession] = useState<{ token: string } | null>(null)
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
    try {
      const data = await api.getCurrentUser()
      setProfile(data.profile)
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      setProfile(null)
    }
    setProfileLoading(false)
  }

  useEffect(() => {
    // Проверяем наличие токена и загружаем пользователя
    const initAuth = async () => {
      // Если нет токена, сразу завершаем загрузку
      if (!api.isAuthenticated()) {
        setLoading(false)
        setProfileLoading(false)
        return
      }

      // Если есть токен, пытаемся получить пользователя с таймаутом
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
        )
        
        const userPromise = api.getCurrentUser()
        const data = await Promise.race([userPromise, timeoutPromise]) as any
        
        setUser(data.user)
        setSession({ token: localStorage.getItem('auth_token')! })
        setProfile(data.profile)
      } catch (error: any) {
        console.error('Failed to get current user:', error)
        // Очищаем невалидный токен
        api.logout()
        setUser(null)
        setSession(null)
        setProfile(null)
      } finally {
        setLoading(false)
        setProfileLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    const response = await api.login(email, password)
    setUser(response.user)
    setSession({ token: response.token })
    setProfile(response.profile)
  }

  const signUp = async (email: string, password: string, inviteToken?: string) => {
    if (!inviteToken) {
      throw new Error('Необходимо ввести код приглашения')
    }

    const response = await api.register(email, password, inviteToken)
    setUser(response.user)
    setSession({ token: response.token })
    
    // Профиль будет создан автоматически на сервере
    // Загружаем его
    try {
      const data = await api.getCurrentUser()
      setProfile(data.profile)
    } catch (error) {
      console.error('Failed to fetch profile after signup:', error)
    }
  }

  const signOut = async () => {
    api.logout()
    setUser(null)
    setSession(null)
    setProfile(null)
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
