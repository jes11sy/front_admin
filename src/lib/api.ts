const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

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
  private useCookies: boolean = true // ✅ НОВОЕ: Режим httpOnly cookies

  constructor(baseURL: string) {
    this.baseURL = baseURL
    
    // Проверяем флаг в localStorage для включения cookie mode
    if (typeof window !== 'undefined') {
      const cookieMode = localStorage.getItem('use_cookie_auth')
      this.useCookies = cookieMode !== 'false' // По умолчанию true
      
      // Если используем legacy mode (старые токены), загружаем их
      if (!this.useCookies) {
        this.token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
        this.refreshToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
      }
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

  async getAccessToken(): Promise<string | null> {
    return this.token
  }

  /**
   * Обновление токена доступа через refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const headers: Record<string, string> = {}

      // ✅ Cookie mode: refresh token в cookie
      if (this.useCookies) {
        headers['X-Use-Cookies'] = 'true'
        headers['Content-Type'] = 'application/json'
      } else {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers,
        credentials: this.useCookies ? 'include' : 'omit',
        // Cookie mode: отправляем пустой объект чтобы удовлетворить Fastify
        // Legacy mode: отправляем refresh token в body
        body: this.useCookies ? JSON.stringify({}) : JSON.stringify({ refreshToken: this.refreshToken }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()

      // ✅ Cookie mode: токены в cookies, не сохраняем в localStorage
      if (this.useCookies) {
        return data.success
      }

      // Legacy mode: сохраняем токены из JSON response
      if (data.success && data.data?.accessToken && data.data?.refreshToken) {
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
      ...(options.headers as Record<string, string>),
    }

    // ✅ Добавляем Content-Type только если есть body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    // ✅ НОВОЕ: Добавляем header для cookie mode
    if (this.useCookies) {
      headers['X-Use-Cookies'] = 'true'
    }

    // Legacy mode: отправляем токен в header
    if (!this.useCookies && this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: this.useCookies ? 'include' : 'omit', // ✅ ВАЖНО: Отправляем cookies
      })

      // Обработка 401 - попытка обновить токен
      if (response.status === 401 && retryOn401) {
        // ✅ Cookie mode: refresh token в cookie, всегда пытаемся обновить
        // Legacy mode: только если есть refresh token
        if (this.useCookies || this.refreshToken) {
          const refreshed = await this.refreshAccessToken()
          
          if (refreshed) {
            // Повторяем запрос с обновленным токеном/cookie
            if (!this.useCookies && this.token) {
              headers.Authorization = `Bearer ${this.token}`
            }
            
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: this.useCookies ? 'include' : 'omit',
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
          }
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
      accessToken?: string  // Только в legacy mode
      refreshToken?: string // Только в legacy mode
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'admin'  // Роль определяет использование таблицы callcentre_admin
      }),
    })

    if (response.success) {
      // ✅ Cookie mode: токены в httpOnly cookies, НЕ сохраняем в localStorage
      if (this.useCookies) {
        // Только сохраняем пользователя
        if (response.data?.user && typeof window !== 'undefined') {
          const storage = rememberMe ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(response.data.user))
        }
      } 
      // Legacy mode: сохраняем токены из JSON response
      else if (response.data?.accessToken) {
        this.setToken(response.data.accessToken, rememberMe)
        
        if (response.data.refreshToken) {
          this.setRefreshToken(response.data.refreshToken, rememberMe)
        }

        if (response.data.user && typeof window !== 'undefined') {
          const storage = rememberMe ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(response.data.user))
        }
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
    
    // Отправляем запрос logout на сервер
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // ✅ Cookie mode: добавляем header и credentials
    if (this.useCookies) {
      headers['X-Use-Cookies'] = 'true'
    }
    
    // Legacy mode: отправляем токен в header
    if (!this.useCookies && token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    fetch(`${this.baseURL}/auth/logout`, {
      method: 'POST',
      headers,
      credentials: this.useCookies ? 'include' : 'omit', // ✅ Отправляем cookies для очистки
    }).catch(() => {
      // Игнорируем ошибки
    })
  }

  /**
   * Обновление токена доступа (публичный метод)
   */
  async refreshAuthToken() {
    // ✅ Cookie mode: не требуется refresh token в памяти, он в cookie
    if (!this.useCookies && !this.refreshToken) {
      throw new Error('Refresh token не найден')
    }

    const bodyData = this.useCookies 
      ? JSON.stringify({}) 
      : JSON.stringify({ refreshToken: this.refreshToken })
    
    console.log('🔄 Refresh request:', { 
      useCookies: this.useCookies, 
      bodyData,
      bodyLength: bodyData.length 
    })

    const response = await this.request<{
      accessToken?: string // Только в legacy mode
      refreshToken?: string // Только в legacy mode
    }>('/auth/refresh', {
      method: 'POST',
      // Cookie mode: отправляем пустой объект {} чтобы удовлетворить Fastify
      // (refresh token в cookie, но Fastify требует body когда Content-Type: application/json)
      // Legacy mode: отправляем refresh token в body
      body: bodyData,
    }, false) // Не повторяем запрос при 401

    // ✅ Cookie mode: токены автоматически обновлены в cookies
    if (this.useCookies) {
      return response
    }

    // Legacy mode: сохраняем токены из JSON response
    if (response.success && response.data) {
      const remember = typeof window !== 'undefined' && 
        (localStorage.getItem('auth_token') !== null)
      
      this.setToken(response.data.accessToken!, remember)
      this.setRefreshToken(response.data.refreshToken!, remember)
    }

    return response
  }

  /**
   * Получение профиля текущего пользователя
   */
  async getProfile() {
    return this.request<any>('/auth/profile')
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

  async getOperator(id: string, type?: 'operator' | 'admin') {
    const query = type ? `?type=${type}` : ''
    return this.request<any>(`/operators/${id}${query}`)
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

  async updateMaster(id: string, data: any) {
    return this.request<any>(`/masters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }


  // Телефонные номера
  async getPhones(params?: {
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/phones${query ? `?${query}` : ''}`)
  }

  async getPhone(id: string) {
    return this.request<any>(`/phones/${id}`)
  }

  async createPhone(data: any) {
    return this.request<any>('/phones', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePhone(id: string, data: any) {
    return this.request<any>(`/phones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePhone(id: string) {
    return this.request<any>(`/phones/${id}`, {
      method: 'DELETE',
    })
  }

  // Avito аккаунты (CRUD через AccountsController)
  async getAvitoAccounts(params?: {
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/accounts${query ? `?${query}` : ''}`)
  }

  async getAvitoAccount(id: string) {
    return this.request<any>(`/accounts/${id}`)
  }

  async createAvitoAccount(data: any) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAvitoAccount(id: string, data: any) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAvitoAccount(id: string) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'DELETE',
    })
  }

  async checkAvitoConnection(id: string) {
    return this.request<any>(`/accounts/${id}/check-connection`, {
      method: 'POST',
    })
  }

  async checkAvitoProxy(id: string) {
    return this.request<any>(`/accounts/${id}/check-proxy`, {
      method: 'POST',
    })
  }

  async syncAvitoStats(id: string) {
    return this.request<any>(`/accounts/${id}/sync-stats`, {
      method: 'POST',
    })
  }

  async checkAllAvitoConnections() {
    return this.request<any>('/accounts/check-all-connections', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async checkAllAvitoProxies() {
    return this.request<any>('/accounts/check-all-proxies', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async syncAllAvitoStats() {
    return this.request<any>('/accounts/sync-all-stats', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  // Avito чаты и мессенджер (через MessengerController)
  async getAvitoChats(params?: {
    avitoAccountName?: string
    unreadOnly?: boolean
    limit?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.avitoAccountName) searchParams.append('avitoAccountName', params.avitoAccountName)
    if (params?.unreadOnly) searchParams.append('unreadOnly', 'true')
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    return this.request<any>(`/avito-messenger/chats${query ? `?${query}` : ''}`)
  }

  async getAvitoMessages(chatId: string, avitoAccountName?: string, limit: number = 100) {
    const searchParams = new URLSearchParams()
    if (avitoAccountName) searchParams.append('avitoAccountName', avitoAccountName)
    searchParams.append('limit', limit.toString())

    const query = searchParams.toString()
    return this.request<any>(`/avito-messenger/chats/${chatId}/messages${query ? `?${query}` : ''}`)
  }

  async sendAvitoMessage(chatId: string, text: string, avitoAccountName: string) {
    return this.request<any>(`/avito-messenger/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, avitoAccountName }),
    })
  }

  // Заказы (Orders Service)
  async getOrders(params?: {
    page?: number
    limit?: number
    status?: string
    city?: string
    search?: string
    masterId?: number
    master?: string
    closingDate?: string
    rk?: string
    typeEquipment?: string
    dateType?: 'create' | 'close' | 'meeting'
    dateFrom?: string
    dateTo?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.city) searchParams.append('city', params.city)
    if (params?.search) searchParams.append('search', params.search)
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())
    if (params?.master) searchParams.append('master', params.master)
    if (params?.closingDate) searchParams.append('closingDate', params.closingDate)
    if (params?.rk) searchParams.append('rk', params.rk)
    if (params?.typeEquipment) searchParams.append('typeEquipment', params.typeEquipment)
    if (params?.dateType) searchParams.append('dateType', params.dateType)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)

    const query = searchParams.toString()
    return this.request<any>(`/orders${query ? `?${query}` : ''}`)
  }

  // Получение опций для фильтров заказов
  async getFilterOptions() {
    return this.request<{ rks: string[], typeEquipments: string[] }>('/orders/filter-options')
  }

  async getOrder(id: string) {
    return this.request<any>(`/orders/${id}`)
  }

  async createOrder(data: any) {
    return this.request<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: any) {
    return this.request<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateOrderStatus(id: string, status: string) {
    return this.request<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async getOrderStats(params?: {
    startDate?: string
    endDate?: string
    city?: string
    masterId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.city) searchParams.append('city', params.city)
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())

    const query = searchParams.toString()
    return this.request<any>(`/orders/stats${query ? `?${query}` : ''}`)
  }

  // Касса (Cash Service)
  async getCashTransactions(params?: {
    page?: number
    limit?: number
    type?: string
    city?: string
    name?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.city) searchParams.append('city', params.city)
    if (params?.name) searchParams.append('name', params.name)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any>(`/cash${query ? `?${query}` : ''}`)
  }

  async getCashTransaction(id: string) {
    return this.request<any>(`/cash/${id}`)
  }

  async createCashTransaction(data: any) {
    return this.request<any>('/cash', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCashTransaction(id: string, data: any) {
    return this.request<any>(`/cash/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async approveCashTransaction(id: string, approve: boolean) {
    return this.request<any>(`/cash/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approve }),
    })
  }

  async getCashBalance() {
    return this.request<any>('/cash/balance')
  }

  async getCashByCity(city: string, params?: {
    page?: number
    limit?: number
    type?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    searchParams.append('city', city)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any>(`/cash${query ? `?${query}` : ''}`)
  }

  // Сдачи мастеров (Handover)
  async getMasterHandovers(params?: {
    page?: number
    limit?: number
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)

    const query = searchParams.toString()
    return this.request<any>(`/handover${query ? `?${query}` : ''}`)
  }

  // Директора (Users Service)
  async getDirectors() {
    return this.request<any>('/directors')
  }

  async getDirector(id: string) {
    return this.request<any>(`/directors/${id}`)
  }

  async createDirector(data: {
    name: string
    login: string
    password: string
    cities: string[]
    tgId?: string
    passportDoc?: string
    contractDoc?: string
    note?: string
  }) {
    return this.request<any>('/directors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDirector(id: string, data: {
    name?: string
    login?: string
    password?: string
    cities?: string[]
    tgId?: string
    passportDoc?: string
    contractDoc?: string
    note?: string
  }) {
    return this.request<any>(`/directors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Отчеты (Reports Service)
  async getCitiesReport(params?: {
    startDate?: string
    endDate?: string
    city?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.city) searchParams.append('city', params.city)

    const query = searchParams.toString()
    return this.request<any>(`/reports/city${query ? `?${query}` : ''}`)
  }

  async getMastersReport(params?: {
    startDate?: string
    endDate?: string
    masterId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())

    const query = searchParams.toString()
    return this.request<any>(`/reports/masters${query ? `?${query}` : ''}`)
  }

  async getCampaignsReport(params?: {
    startDate?: string
    endDate?: string
    city?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.city) searchParams.append('city', params.city)

    const query = searchParams.toString()
    return this.request<any>(`/reports/campaigns${query ? `?${query}` : ''}`)
  }

  async getCitiesAnalytics(params?: {
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any>(`/analytics/cities${query ? `?${query}` : ''}`)
  }

  async getGlobalStatistics() {
    return this.request<any>('/reports/global')
  }

  async getRegionStatistics(regionId?: string) {
    return this.request<any>(`/reports/regions${regionId ? `/${regionId}` : ''}`)
  }

  async getCityStatistics(cityId?: string) {
    return this.request<any>(`/reports/cities${cityId ? `/${cityId}` : ''}`)
  }

  async getDashboardStats() {
    return this.request<{
      employees: {
        callCenter: number
        directors: number
        masters: number
      }
      orders: number
      finance: {
        revenue: number
        profit: number
        expenses: number
      }
      avito: {
        orderPrice: number
      }
    }>('/stats/dashboard')
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient

