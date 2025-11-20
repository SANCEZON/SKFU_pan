const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('auth_token')
  }

  private setToken(token: string): void {
    localStorage.setItem('auth_token', token)
  }

  private removeToken(): void {
    localStorage.removeItem('auth_token')
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options
    const url = `${API_URL}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (!skipAuth) {
      const token = this.getToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    // Создаём AbortController для таймаута
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 секунд таймаут

    let response: Response
    try {
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout: сервер не отвечает')
      }
      throw error
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Ошибка сервера' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    // Если ответ пустой (например, 204 No Content)
    if (response.status === 204) {
      return null as T
    }

    return response.json()
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  // Auth methods
  async login(email: string, password: string): Promise<{ user: any; profile: any; token: string }> {
    const response = await this.post<{ user: any; profile: any; token: string }>(
      '/api/auth/login',
      { email, password },
      { skipAuth: true }
    )
    this.setToken(response.token)
    return response
  }

  async register(email: string, password: string, inviteToken: string): Promise<{ user: any; token: string }> {
    const response = await this.post<{ user: any; token: string }>(
      '/api/auth/register',
      { email, password, inviteToken },
      { skipAuth: true }
    )
    this.setToken(response.token)
    return response
  }

  async logout(): void {
    this.removeToken()
  }

  async getCurrentUser(): Promise<{ user: any; profile: any }> {
    return this.get<{ user: any; profile: any }>('/api/auth/me')
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }
}

export const api = new ApiClient()

