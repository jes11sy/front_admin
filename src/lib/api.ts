const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * Очистка пользовательских данных из localStorage
   * Токены хранятся в httpOnly cookies и очищаются на сервере
   */
  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
    }
  }

  /**
   * Обновление токена доступа через refresh token из httpOnly cookie
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-Use-Cookies': 'true',
          'Content-Type': 'application/json',
        },
        credentials: 'include',  // Отправляем cookies с refresh token
        body: JSON.stringify({}),  // Пустой body (refresh token в cookie)
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      // Новые токены установлены в httpOnly cookies автоматически сервером
      return data.success
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
      'X-Use-Cookies': 'true',  // Всегда используем httpOnly cookies
    }

    // Добавляем Content-Type только если есть body
    if (options.body) {
      headers['Content-Type'] = 'application/json'
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',  // Всегда отправляем cookies
      })

      // Обработка 401 - попытка обновить токен из cookie
      if (response.status === 401 && retryOn401) {
        const refreshed = await this.refreshAccessToken()
        
        if (refreshed) {
          // Повторяем запрос с обновленным токеном в cookie
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            credentials: 'include',
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
  /**
   * Вход в систему
   * Токены автоматически устанавливаются в httpOnly cookies сервером
   */
  async login(login: string, password: string, rememberMe: boolean = false) {
    const response = await this.request<{
      user: {
        id: number
        login: string
        name?: string
        role: 'admin'
      }
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ 
        login, 
        password, 
        role: 'admin'
      }),
    })

    // Сохраняем информацию о пользователе (НЕ токены!)
    if (response.success && response.data?.user && typeof window !== 'undefined') {
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('user', JSON.stringify(response.data.user))

      // Если включен "Запомнить меня" - сохраняем учетные данные в IndexedDB
      if (rememberMe) {
        try {
          const { saveCredentials } = await import('./remember-me')
          await saveCredentials(login, password)
        } catch (error) {
          console.error('[Login] Failed to save credentials:', error)
          // Не прерываем процесс логина, если не удалось сохранить
        }
      }
    }

    return response
  }

  /**
   * Выход из системы
   * Очищает cookies на сервере и пользовательские данные локально
   */
  async logout(): Promise<void> {
    // Очищаем сохраненные учетные данные из IndexedDB
    try {
      const { clearSavedCredentials } = await import('./remember-me')
      await clearSavedCredentials()
    } catch (error) {
      console.error('[Logout] Failed to clear saved credentials:', error)
    }

    // Отправляем запрос logout на сервер для очистки cookies
    try {
      await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',  // Отправляем cookies для очистки на сервере
        body: JSON.stringify({}), // Пустой объект для POST запроса
      })
    } catch {
      // Игнорируем ошибки сети
    }
    
    // Очищаем локальные данные пользователя ПОСЛЕ запроса на сервер
    this.clearToken()
  }

  /**
   * Обновление токена доступа (публичный метод)
   * Refresh token берется из httpOnly cookie автоматически
   */
  async refreshAuthToken() {
    return this.request<{}>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({}),  // Пустой body (refresh token в cookie)
    }, false) // Не повторяем запрос при 401
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

