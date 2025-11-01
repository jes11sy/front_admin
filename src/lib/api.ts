const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || true // Включен по умолчанию для разработки

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private refreshToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      this.refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
    }
  }

  setToken(token: string, remember: boolean = false) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (remember) {
        localStorage.setItem('auth_token', token)
      } else {
        sessionStorage.setItem('auth_token', token)
      }
    }
  }

  setRefreshToken(refreshToken: string, remember: boolean = false) {
    this.refreshToken = refreshToken
    if (typeof window !== 'undefined') {
      if (remember) {
        localStorage.setItem('refresh_token', refreshToken)
      } else {
        sessionStorage.setItem('refresh_token', refreshToken)
      }
    }
  }

  clearToken() {
    this.token = null
    this.refreshToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Сервер вернул неожиданный формат ответа')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера: ${response.status}`)
      }

      return data
    } catch (error: any) {
      throw error
    }
  }

  // Аутентификация
  async login(login: string, password: string, rememberMe: boolean = false) {
    // МОК-РЕЖИМ для тестирования визуала
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Имитация задержки
      
      if (login === 'admin' && password === 'admin') {
        const mockUser = {
          id: 1,
          login: 'admin',
          name: 'Администратор',
          role: 'admin',
        }
        
        const mockToken = 'mock-token-' + Date.now()
        
        this.setToken(mockToken, rememberMe)
        this.setRefreshToken(mockToken, rememberMe)
        
        if (typeof window !== 'undefined') {
          const storage = rememberMe ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(mockUser))
        }
        
        return {
          success: true,
          data: {
            user: mockUser,
            accessToken: mockToken,
            refreshToken: mockToken,
          }
        }
      }
      
      throw new Error('Неверный логин или пароль')
    }
    
    // РЕАЛЬНЫЙ API (когда отключим мок-режим)
    const response = await this.request<{
      user: any
      accessToken: string
      refreshToken: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'admin'
      }),
    })

    if (response.success && response.data?.accessToken) {
      this.setToken(response.data.accessToken, rememberMe)
      
      if (response.data.refreshToken) {
        this.setRefreshToken(response.data.refreshToken, rememberMe)
      }

      // Сохраняем пользователя
      if (response.data.user && typeof window !== 'undefined') {
        const storage = rememberMe ? localStorage : sessionStorage
        storage.setItem('user', JSON.stringify(response.data.user))
      }
    }

    return response
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    }
    
    const token = this.token
    this.token = null
    this.refreshToken = null
    
    if (token) {
      fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => {
        // Игнорируем ошибки
      })
    }
  }

  // Сотрудники
  async getEmployees(params?: {
    page?: number
    limit?: number
    role?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.role) searchParams.append('role', params.role)
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/users${query ? `?${query}` : ''}`)
  }

  async createEmployee(data: any) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEmployee(id: string, data: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteEmployee(id: string) {
    return this.request<any>(`/users/${id}`, {
      method: 'DELETE',
    })
  }

  // Отчеты (заглушки для будущей реализации)
  async getGlobalStatistics() {
    return this.request<any>('/reports/global')
  }

  async getRegionStatistics(regionId?: string) {
    return this.request<any>(`/reports/regions${regionId ? `/${regionId}` : ''}`)
  }

  async getCityStatistics(cityId?: string) {
    return this.request<any>(`/reports/cities${cityId ? `/${cityId}` : ''}`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient

