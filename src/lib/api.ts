const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.test-shem.ru/api/v1'

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

  /**
   * Обновление токена доступа через refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      if (data.success && data.data?.accessToken && data.data?.refreshToken) {
        // Определяем какое хранилище использовать (localStorage или sessionStorage)
        const remember = typeof window !== 'undefined' && 
          (localStorage.getItem('auth_token') !== null)
        
        this.setToken(data.data.accessToken, remember)
        this.setRefreshToken(data.data.refreshToken, remember)
        return true
      }

      return false
    } catch (error) {
      return false
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOn401: boolean = true
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

      // Обработка 401 - попытка обновить токен
      if (response.status === 401 && retryOn401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken()
        
        if (refreshed) {
          // Повторяем запрос с новым токеном
          headers.Authorization = `Bearer ${this.token}`
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          })

          if (!retryResponse.ok) {
            // Если после обновления токена все еще ошибка - выход
            if (retryResponse.status === 401) {
              this.clearToken()
              if (typeof window !== 'undefined') {
                window.location.href = '/login'
              }
              throw new Error('Сессия истекла. Пожалуйста, войдите снова.')
            }
          }

          const contentType = retryResponse.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Сервер вернул неожиданный формат ответа')
          }

          const data = await retryResponse.json()
          return data
        } else {
          // Не удалось обновить токен - выход
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
          throw new Error('Сессия истекла. Пожалуйста, войдите снова.')
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Сервер вернул неожиданный формат ответа')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `Ошибка сервера: ${response.status}`)
      }

      return data
    } catch (error: any) {
      throw error
    }
  }

  // Аутентификация
  /**
   * Вход администратора
   * API использует таблицу callcentre_admin для поиска пользователя с ролью 'admin'
   * Таблица содержит: id, login, password, note, createdAt, updatedAt
   * Поле name отсутствует в таблице callcentre_admin, поэтому может быть undefined
   */
  async login(login: string, password: string, rememberMe: boolean = false) {
    // POST /api/v1/auth/login с role: 'admin' ищет пользователя в таблице callcentre_admin
    const response = await this.request<{
      user: {
        id: number
        login: string
        name?: string  // Может отсутствовать для callcentre_admin
        role: 'admin'  // Роль из таблицы callcentre_admin
      }
      accessToken: string
      refreshToken: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'admin'  // Роль определяет использование таблицы callcentre_admin
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

  /**
   * Обновление токена доступа
   */
  async refreshToken() {
    if (!this.refreshToken) {
      throw new Error('Refresh token не найден')
    }

    const response = await this.request<{
      accessToken: string
      refreshToken: string
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    }, false) // Не повторяем запрос при 401

    if (response.success && response.data) {
      const remember = typeof window !== 'undefined' && 
        (localStorage.getItem('auth_token') !== null)
      
      this.setToken(response.data.accessToken, remember)
      this.setRefreshToken(response.data.refreshToken, remember)
    }

    return response
  }

  /**
   * Получение профиля текущего пользователя
   */
  async getProfile() {
    return this.request<any>('/users/profile')
  }

  // Сотрудники (мастера и директора)
  async getEmployees(params?: {
    page?: number
    limit?: number
    role?: 'master' | 'director'
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.role) searchParams.append('role', params.role)
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/employees${query ? `?${query}` : ''}`)
  }

  async getEmployee(id: string) {
    return this.request<any>(`/employees/${id}`)
  }

  async createEmployee(data: any) {
    return this.request<any>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEmployee(id: string, data: any) {
    return this.request<any>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Операторы call-центра
  async getOperators(params?: {
    type?: 'admin' | 'operator'
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.type) searchParams.append('type', params.type)
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/operators${query ? `?${query}` : ''}`)
  }

  async getOperator(id: string) {
    return this.request<any>(`/operators/${id}`)
  }

  async createOperator(data: any) {
    return this.request<any>('/operators', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOperator(id: string, data: any) {
    return this.request<any>(`/operators/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteOperator(id: string) {
    return this.request<any>(`/operators/${id}`, {
      method: 'DELETE',
    })
  }

  // Мастера
  async getMasters(params?: {
    city?: string
    statusWork?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.city) searchParams.append('city', params.city)
    if (params?.statusWork) searchParams.append('statusWork', params.statusWork)
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/masters${query ? `?${query}` : ''}`)
  }

  // Директора
  async getDirectors(params?: {
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/directors${query ? `?${query}` : ''}`)
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

