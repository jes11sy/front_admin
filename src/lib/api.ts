// ✅ FIX #151: Добавлен fetch retry logic
import { logger } from './logger'
import { fetchWithRetry, classifyNetworkError, getUserFriendlyErrorMessage } from './fetch-with-retry'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Кастомная ошибка API с дополнительной информацией
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public endpoint?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseURL: string
  
  // ✅ FIX: Mutex для предотвращения race condition при параллельных refresh запросах
  // Если несколько запросов одновременно получают 401, только один делает refresh,
  // остальные ждут его результат
  private refreshPromise: Promise<boolean> | null = null
  
  // Callback для обработки ошибок авторизации
  private authErrorCallback: (() => void) | null = null
  
  // ✅ FIX #152: Silent Refresh - фоновое обновление токена (как у директора)
  private silentRefreshInterval: ReturnType<typeof setInterval> | null = null
  private lastActivityTime: number = Date.now()
  
  // ✅ FIX: Proactive refresh — отслеживаем время последнего refresh
  // Access token живёт 15 минут, делаем proactive refresh через 10 минут
  private lastRefreshTime: number = Date.now()
  private readonly PROACTIVE_REFRESH_INTERVAL = 10 * 60 * 1000 // 10 минут

  constructor(baseURL: string) {
    this.baseURL = baseURL
    
    // Запускаем Silent Refresh при создании клиента
    if (typeof window !== 'undefined') {
      this.startSilentRefresh()
      this.trackActivity()
    }
  }

  /**
   * 🔄 Silent Refresh - фоновое обновление токена
   * Проверяет каждые 3 минуты и обновляет токен
   * Это предотвращает вылет из профиля каждые 15 минут
   * ✅ FIX: Убрана проверка активности — refresh нужен всегда пока вкладка открыта
   */
  private startSilentRefresh() {
    // Очищаем предыдущий интервал если был
    if (this.silentRefreshInterval) {
      clearInterval(this.silentRefreshInterval)
    }

    // ✅ FIX: Проверяем каждые 3 минуты (токен живёт 15 минут)
    // Убрана проверка активности — если вкладка открыта, нужно поддерживать сессию
    this.silentRefreshInterval = setInterval(async () => {
      // Проверяем нужен ли refresh (прошло ли достаточно времени)
      const timeSinceLastRefresh = Date.now() - this.lastRefreshTime
      
      // Если с последнего refresh прошло меньше 2 минут — пропускаем
      // (мог быть proactive refresh от request())
      if (timeSinceLastRefresh < 2 * 60 * 1000) {
        logger.debug('[SilentRefresh] Skipping — recent refresh detected')
        return
      }
      
      try {
        await this.refreshAccessToken()
        logger.debug('[SilentRefresh] Token refreshed successfully')
      } catch (error) {
        logger.warn('[SilentRefresh] Failed', { error: String(error) })
      }
    }, 3 * 60 * 1000) // Каждые 3 минуты
  }

  /**
   * Остановить Silent Refresh (при logout)
   */
  private stopSilentRefresh() {
    if (this.silentRefreshInterval) {
      clearInterval(this.silentRefreshInterval)
      this.silentRefreshInterval = null
    }
  }

  /**
   * Отслеживание активности пользователя
   */
  private trackActivity() {
    const updateActivity = () => {
      this.lastActivityTime = Date.now()
    }

    // Отслеживаем клики, нажатия клавиш и скролл
    document.addEventListener('click', updateActivity, { passive: true })
    document.addEventListener('keypress', updateActivity, { passive: true })
    document.addEventListener('scroll', updateActivity, { passive: true })
    document.addEventListener('touchstart', updateActivity, { passive: true })
  }

  /**
   * Устанавливает callback для обработки ошибок авторизации
   */
  setAuthErrorCallback(callback: () => void) {
    this.authErrorCallback = callback
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
   * ✅ FIX: Используем mutex для синхронизации параллельных запросов
   * Это предотвращает token reuse detection на backend при одновременных 401
   */
  private async refreshAccessToken(): Promise<boolean> {
    // Если refresh уже выполняется - ждём его результат
    if (this.refreshPromise) {
      logger.debug('[Auth] Refresh already in progress, waiting...')
      return this.refreshPromise
    }
    
    // Запускаем refresh и сохраняем Promise для других запросов
    this.refreshPromise = this.doRefreshToken()
    
    try {
      return await this.refreshPromise
    } finally {
      // Сбрасываем Promise после завершения (успех или ошибка)
      this.refreshPromise = null
    }
  }

  /**
   * Реальная логика обновления токена (вызывается только один раз при параллельных запросах)
   * ✅ FIX: Добавлен fallback через IndexedDB и сохранение нового refresh token
   */
  private async doRefreshToken(): Promise<boolean> {
    // 1️⃣ Попытка refresh через httpOnly cookies (основной способ)
    try {
      logger.debug('[Auth] Starting token refresh via cookies')
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'X-Use-Cookies': 'true',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      })

      if (response.ok) {
        const data = await response.json()
        
        // ✅ FIX: Сохраняем новый refresh token в IndexedDB (backup)
        // Бэкенд делает token rotation — старый токен инвалидируется
        if (data.data?.refreshToken) {
          try {
            const { saveRefreshToken } = await import('./remember-me')
            await saveRefreshToken(data.data.refreshToken)
            logger.debug('[Auth] New refresh token saved to IndexedDB')
          } catch (e) {
            logger.warn('[Auth] Failed to save refresh token to IndexedDB', { error: String(e) })
          }
        }
        
        // ✅ FIX: Обновляем время последнего успешного refresh
        this.lastRefreshTime = Date.now()
        logger.debug('[Auth] Token refresh via cookies successful')
        return true
      }

      logger.warn('[Auth] Cookie refresh failed', { status: response.status })
    } catch (error) {
      logger.warn('[Auth] Cookie refresh error', { error: String(error) })
    }

    // 2️⃣ Fallback: попытка восстановить сессию через refresh token из IndexedDB
    // Используется когда cookies удалены (iOS ITP, PWA, очистка браузером)
    try {
      logger.debug('[Auth] Trying IndexedDB fallback for token refresh')
      const restored = await this.restoreSessionFromIndexedDB()
      if (restored) {
        logger.debug('[Auth] Session restored via IndexedDB fallback')
        return true
      }
    } catch (error) {
      logger.warn('[Auth] IndexedDB fallback failed', { error: String(error) })
    }

    logger.error('[Auth] All refresh methods failed — session expired')
    return false
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

    // ✅ FIX: Proactive refresh — если прошло >10 минут с последнего refresh,
    // обновляем токен ДО запроса, чтобы избежать 401
    // Не делаем для /auth/ endpoints чтобы избежать бесконечного цикла
    if (retryOn401 && !endpoint.startsWith('/auth/')) {
      const timeSinceLastRefresh = Date.now() - this.lastRefreshTime
      if (timeSinceLastRefresh > this.PROACTIVE_REFRESH_INTERVAL) {
        logger.debug('[Auth] Proactive refresh triggered (last refresh was ' + 
          Math.round(timeSinceLastRefresh / 1000 / 60) + ' minutes ago)')
        try {
          await this.refreshAccessToken()
        } catch (e) {
          // Игнорируем ошибку — если refresh не удался, запрос получит 401 и обработает его
          logger.debug('[Auth] Proactive refresh failed, will retry on 401')
        }
      }
    }

    try {
      // ✅ FIX #151: Используем fetchWithRetry для автоматических повторных попыток
      const response = await fetchWithRetry(url, {
        ...options,
        headers,
        credentials: 'include',  // Всегда отправляем cookies
        retryOptions: {
          maxRetries: 3,
          retryDelay: 1000,
          backoff: true,
          timeout: 15000,
          retryOn: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
        },
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
            // Если после обновления токена все еще ошибка
            if (retryResponse.status === 401) {
              this.clearToken()
              // Вызываем callback вместо редиректа
              if (this.authErrorCallback) {
                this.authErrorCallback()
              }
              throw new Error('SESSION_EXPIRED')
            }
          }

          const contentType = retryResponse.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Сервер вернул неожиданный формат ответа')
          }

          const data = await retryResponse.json()
          return data
        } else {
          // Не удалось обновить токен
          this.clearToken()
          // Вызываем callback вместо редиректа
          if (this.authErrorCallback) {
            this.authErrorCallback()
          }
          throw new Error('SESSION_EXPIRED')
        }
      }

      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Сервер вернул неожиданный формат ответа')
      }

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        logger.error('Failed to parse JSON response', { 
          endpoint, 
          status: response.status,
          error: String(parseError)
        })
        throw new ApiError('Ошибка обработки ответа сервера', response.status, endpoint)
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `Ошибка сервера: ${response.status}`
        logger.error('API request failed', { 
          endpoint, 
          status: response.status, 
          error: errorMessage 
        })
        throw new ApiError(errorMessage, response.status, endpoint)
      }

      return data
    } catch (error: any) {
      // Если уже ApiError - пробрасываем как есть
      if (error instanceof ApiError) {
        throw error
      }
      
      // ✅ FIX #151: Улучшенная обработка сетевых ошибок
      const networkError = classifyNetworkError(error)
      
      if (networkError.type === 'NETWORK_ERROR' || networkError.type === 'TIMEOUT') {
        logger.error('Network error', { 
          endpoint, 
          type: networkError.type,
          error: networkError.message 
        })
        throw new ApiError(getUserFriendlyErrorMessage(error), undefined, endpoint)
      }
      
      // Логируем неизвестные ошибки
      logger.error('Unexpected API error', { 
        endpoint, 
        error: error instanceof Error ? error.message : String(error) 
      })
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
   * 
   * @param login - Логин администратора
   * @param password - Пароль
   *   ⚠️ SECURITY: НЕ логировать, НЕ сохранять в storage
   *   Хэшируется на сервере через bcrypt (12 rounds)
   * @param rememberMe - Запомнить на устройстве
   */
  async login(login: string, password: string, rememberMe: boolean = false) {
    const response = await this.request<{
      user: {
        id: number
        login: string
        name?: string
        role: 'admin'
      }
      refreshToken?: string
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
      
      // ✅ FIX: Обновляем время последнего refresh при успешном логине
      this.lastRefreshTime = Date.now()
      
      // Сохраняем refresh token в IndexedDB (backup для iOS PWA)
      if (response.data.refreshToken) {
        try {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(response.data.refreshToken)
          logger.debug('[Login] Refresh token saved to IndexedDB')
        } catch (error) {
          logger.error('[Login] Failed to save refresh token', { error: String(error) })
          // Не прерываем процесс логина
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
    // ✅ FIX #152: Останавливаем Silent Refresh при logout
    this.stopSilentRefresh()
    
    // Очищаем refresh token из IndexedDB
    try {
      const { clearRefreshToken } = await import('./remember-me')
      await clearRefreshToken()
      logger.debug('[Logout] Refresh token cleared from IndexedDB')
    } catch (error) {
      logger.error('[Logout] Failed to clear refresh token', { error: String(error) })
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
    cityId?: number
    status?: string
    search?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.search) searchParams.append('search', params.search)

    const query = searchParams.toString()
    return this.request<any>(`/masters${query ? `?${query}` : ''}`)
  }

  async createMaster(data: any) {
    return this.request<any>('/masters', {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
    cityId?: number
    search?: string
    masterId?: number
    master?: string
    closingDate?: string
    rkId?: number
    equipmentTypeId?: number
    dateType?: 'create' | 'close' | 'meeting'
    dateFrom?: string
    dateTo?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())
    if (params?.master) searchParams.append('master', params.master)
    if (params?.closingDate) searchParams.append('closingDate', params.closingDate)
    if (params?.rkId) searchParams.append('rkId', params.rkId.toString())
    if (params?.equipmentTypeId) searchParams.append('equipmentTypeId', params.equipmentTypeId.toString())
    if (params?.dateType) searchParams.append('dateType', params.dateType)
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)

    const query = searchParams.toString()
    return this.request<any>(`/orders${query ? `?${query}` : ''}`)
  }

  // Получение опций для фильтров заказов
  async getFilterOptions() {
    return this.request<{
      rks: Array<{ id: number; name: string }>
      equipmentTypes: Array<{ id: number; name: string }>
      cities: Array<{ id: number; name: string }>
    }>('/orders/filter-options')
  }

  // Получение списка городов (для выбора городов у сотрудников)
  async getCities() {
    const response = await this.getCitiesList({ isActive: true })
    return response.data ?? []
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
    cityId?: number
    masterId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())

    const query = searchParams.toString()
    return this.request<any>(`/orders/stats${query ? `?${query}` : ''}`)
  }

  // Касса (Cash Service)
  async getCashTransactions(params?: {
    page?: number
    limit?: number
    type?: string
    cityId?: number
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
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

  async deleteCashTransaction(id: number) {
    return this.request<{ message: string }>(`/cash/${id}`, {
      method: 'DELETE',
    })
  }

  async getCashBalance() {
    return this.request<any>('/cash/balance')
  }

  async getCashByCityId(cityId: number, params?: {
    page?: number
    limit?: number
    type?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    searchParams.append('cityId', cityId.toString())
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any>(`/cash${query ? `?${query}` : ''}`)
  }

  /**
   * 🔧 FIX: Получение статистики кассы через серверную агрегацию
   * Используйте этот метод вместо загрузки всех транзакций с limit=10000
   * Сервер считает суммы через SQL - это быстрее и надежнее
   */
  async getCashStats(params?: {
    cityId?: number
    type?: 'income' | 'expense'
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.type) searchParams.append('type', params.type)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<{
      totalIncome: number
      totalExpense: number
      balance: number
      incomeCount: number
      expenseCount: number
    }>(`/cash/stats${query ? `?${query}` : ''}`)
  }

  /**
   * 🔧 FIX: Получение статистики кассы сгруппированной по городам
   * Используйте этот метод вместо загрузки всех транзакций с limit=10000
   */
  async getCashStatsByCity(params?: {
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<{
      cities: Array<{
        cityId: number
        cityName: string
        income: number
        expenses: number
        balance: number
      }>
      totals: {
        totalIncome: number
        totalExpense: number
        balance: number
        incomeCount: number
        expenseCount: number
      }
    }>(`/cash/stats/by-city${query ? `?${query}` : ''}`)
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
    cityIds: number[]
    tgId?: string
    passport?: string
    contract?: string
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
    cityIds?: number[]
    tgId?: string
    passport?: string
    contract?: string
    note?: string
  }) {
    return this.request<any>(`/directors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Отчеты (Reports Service)
  
  /**
   * Финансовый отчёт (касса)
   */
  async getFinanceReport(params?: {
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)

    const query = searchParams.toString()
    return this.request<any>(`/reports/finance${query ? `?${query}` : ''}`)
  }

  /**
   * Отчёт по кассе с группировкой по городам и назначениям платежа
   */
  async getCashByPurpose(params?: {
    startDate?: string
    endDate?: string
    cityId?: number
    purposes?: string[]
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.purposes && params.purposes.length > 0) {
      searchParams.append('purposes', params.purposes.join(','))
    }

    const query = searchParams.toString()
    return this.request<any>(`/reports/cash/by-purpose${query ? `?${query}` : ''}`)
  }

  /**
   * Отчёт по заказам
   */
  async getOrdersReport(params?: {
    startDate?: string
    endDate?: string
    cityId?: number
    status?: string
    masterId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())

    const query = searchParams.toString()
    return this.request<any>(`/reports/orders${query ? `?${query}` : ''}`)
  }

  async getCitiesReport(params?: {
    startDate?: string
    endDate?: string
    cityId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())

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
    cityId?: number
  }) {
    const searchParams = new URLSearchParams()
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())

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
      notOrders: number         // Незаказы
      cancellations: number     // Отмены (Отказ)
      completedInMoney: number  // Выполненных в деньги
      finance: {
        revenue: number
        profit: number
        expenses: number
      }
    }>('/stats/dashboard')
  }

  // ==================== SESSIONS ====================

  /**
   * Получить список всех активных сессий (только для admin)
   */
  async getSessions() {
    return this.request<{
      sessions: Array<{
        userId: number
        fullName: string
        role: string
        device: string
        deviceType: 'mobile' | 'tablet' | 'desktop'
        ip: string
        loginDate: string
        lastActivity: string
      }>
      total: number
    }>('/auth/admin/sessions', { method: 'GET' })
  }

  /**
   * Получить детальную информацию о сессиях пользователя (только для admin)
   */
  async getUserSession(userId: number) {
    return this.request<{
      userId: number
      fullName: string
      role: string
      currentSession: {
        device: string
        deviceType: 'mobile' | 'tablet' | 'desktop'
        ip: string
        loginDate: string
        lastActivity: string
      } | null
      loginHistory: Array<{
        id: number
        timestamp: string
        ip: string
        device: string
        deviceType: 'mobile' | 'tablet' | 'desktop'
        status: 'success' | 'failed'
        reason?: string
      }>
    }>(`/auth/admin/sessions/${userId}`, { method: 'GET' })
  }

  /**
   * Деавторизовать пользователя (только для admin)
   */
  async deauthorizeUser(userId: number, role: string) {
    return this.request<{ message: string }>('/auth/admin/force-logout', {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    })
  }

  // ==================== USER LOGS ====================

  /**
   * Получить логи активности пользователей (только для admin)
   */
  async getUserLogs(params?: {
    userId?: string
    role?: string
    eventType?: string
    startDate?: string
    endDate?: string
    page?: string
    limit?: string
  }) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<{
      logs: Array<{
        id: number
        timestamp: string
        eventType: string
        userId: number | null
        role: string | null
        login: string | null
        fullName: string
        ip: string
        userAgent: string
        success: boolean
        metadata: any
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/auth/audit/user-logs${queryString}`, { method: 'GET' })
  }
  /**
   * Получить логи ошибок (только для admin)
   */
  async getErrorLogs(params?: {
    service?: string
    errorType?: string
    startDate?: string
    endDate?: string
    page?: string
    limit?: string
  }) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    return this.request<{
      logs: Array<{
        id: number
        timestamp: string
        service: string
        errorType: string
        errorMessage: string
        stackTrace: string | null
        userId: number | null
        userRole: string | null
        requestUrl: string | null
        requestMethod: string | null
        ip: string | null
        userAgent: string | null
        metadata: any
      }>
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }>(`/auth/admin/errors${queryString}`, { method: 'GET' })
  }

  /**
   * 🍪 Проверка аутентификации через API
   * Нельзя проверить httpOnly cookies на клиенте - нужен запрос к серверу
   * 
   * 🔧 FIX: Используем простой fetch БЕЗ safeFetch чтобы избежать бесконечного цикла
   * при 401 ошибке (safeFetch пытается refresh → logout → снова проверка → цикл)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      // Простой запрос БЕЗ retry и refresh логики
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 сек таймаут
      
      const response = await fetch(`${this.baseURL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      // 🔒 429 Too Many Requests - пробрасываем ошибку чтобы НЕ вызвать бесконечный цикл
      if (response.status === 429) {
        throw new Error('RATE_LIMIT_EXCEEDED')
      }
      
      return response.ok
    } catch (error) {
      // Rate limit - пробрасываем наверх
      if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
        throw error
      }
      // Любая другая ошибка (сеть, таймаут, 401) - просто не авторизован
      return false
    }
  }

  /**
   * 🔄 Восстановление сессии через refresh token из IndexedDB
   * Используется когда cookies удалены (iOS ITP, PWA)
   * @returns true если сессия восстановлена
   */
  async restoreSessionFromIndexedDB(): Promise<boolean> {
    try {
      // Таймаут на всю операцию - 5 секунд
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const { getRefreshToken } = await import('./remember-me')
      const refreshToken = await getRefreshToken()
      
      if (!refreshToken) {
        clearTimeout(timeoutId)
        logger.debug('No refresh token in IndexedDB')
        return false
      }
      
      logger.debug('Found refresh token in IndexedDB, attempting to restore session')
      
      // Отправляем refresh token на сервер для получения новых cookies
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const result = await response.json()
        
        // ✅ FIX: Обновляем время последнего refresh
        this.lastRefreshTime = Date.now()
        
        // Обновляем токен в IndexedDB если пришёл новый
        if (result.data?.refreshToken) {
          const { saveRefreshToken } = await import('./remember-me')
          await saveRefreshToken(result.data.refreshToken)
        }
        
        logger.debug('Session restored from IndexedDB token')
        return true
      }
      
      // Токен невалиден — очищаем IndexedDB
      if (response.status === 401 || response.status === 403) {
        logger.debug('Refresh token from IndexedDB is invalid, clearing')
        const { clearRefreshToken } = await import('./remember-me')
        await clearRefreshToken()
      }
      
      return false
    } catch (error) {
      logger.error('Failed to restore session from IndexedDB', { error: String(error) })
      return false
    }
  }

  // ==================== FILE UPLOADS ====================

  /**
   * ✅ FIX: Универсальный метод загрузки файлов через cookies (вместо getAccessToken)
   * Использует httpOnly cookies для авторизации, поддерживает 401 retry
   */
  async uploadFile(file: File, folder: string): Promise<{ key: string }> {
    const formData = new FormData()
    formData.append('file', file)

    const url = `${this.baseURL}/files/upload?folder=${encodeURIComponent(folder)}`
    
    const doUpload = async (): Promise<Response> => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'X-Use-Cookies': 'true',
        },
        credentials: 'include',
        body: formData,
      })
    }

    let response = await doUpload()

    // Если 401 — пробуем refresh и повторяем
    if (response.status === 401) {
      const refreshed = await this.refreshAccessToken()
      if (refreshed) {
        // Пересоздаём FormData для повторной отправки
        const retryFormData = new FormData()
        retryFormData.append('file', file)
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'X-Use-Cookies': 'true',
          },
          credentials: 'include',
          body: retryFormData,
        })
      }
    }

    if (!response.ok) {
      if (response.status === 401) {
        this.clearToken()
        if (this.authErrorCallback) {
          this.authErrorCallback()
        }
        throw new ApiError('SESSION_EXPIRED', 401, url)
      }
      throw new ApiError(`Failed to upload file to ${folder}`, response.status, url)
    }

    const data = await response.json()
    return { key: data.data?.key || data.key || data.data?.filePath || data.filePath }
  }

  /**
   * Загрузка документа БСО для заказа
   */
  async uploadOrderBso(file: File | null): Promise<{ filePath: string }> {
    if (!file) {
      throw new Error('No file provided')
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/orders/upload/bso`, {
      method: 'POST',
      headers: {
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload BSO document')
    }

    const data = await response.json()
    return { filePath: data.data?.filePath || data.filePath }
  }

  /**
   * Загрузка чека расхода для заказа
   */
  async uploadOrderExpenditure(file: File | null): Promise<{ filePath: string }> {
    if (!file) {
      throw new Error('No file provided')
    }

    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${this.baseURL}/orders/upload/expenditure`, {
      method: 'POST',
      headers: {
        'X-Use-Cookies': 'true',
      },
      credentials: 'include',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload expenditure document')
    }

    const data = await response.json()
    return { filePath: data.data?.filePath || data.filePath }
  }

  // Orders History API - получить заказы по номеру телефона
  async getOrdersByPhone(phone: string): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      clientName: string;
      cityId: number;
      city?: { id: number; name: string };
      statusId: number;
      status?: { id: number; name: string; code: string };
      dateMeeting: string;
      equipmentTypeId: number;
      equipmentType?: { id: number; name: string };
      typeOrder: string;
      createdAt: string;
      rkId: number;
      rk?: { id: number; name: string };
      address: string;
      result: number | null;
      master: { id: number; name: string } | null;
    }>;
  }> {
    // Нормализуем номер телефона
    const normalizedPhone = phone.replace(/[\s\+\(\)\-]/g, '')
    
    try {
      const response = await this.request<Array<{
        id: number;
        clientName: string;
        cityId: number;
        city?: { id: number; name: string };
        statusId: number;
        status?: { id: number; name: string; code: string };
        dateMeeting: string;
        equipmentTypeId: number;
        equipmentType?: { id: number; name: string };
        typeOrder: string;
        createdAt: string;
        rkId: number;
        rk?: { id: number; name: string };
        address: string;
        result: number | null;
        master: { id: number; name: string } | null;
      }>>(`/orders/by-phone/${encodeURIComponent(normalizedPhone)}`, { method: 'GET' })
      
      return { success: true, data: response.data || [] }
    } catch (error) {
      logger.error('Error fetching orders by phone', { error: String(error) })
      return { success: true, data: [] }
    }
  }

  // ==================== APPEALS ====================

  async getAppeals(params?: {
    page?: number
    limit?: number
    status?: string
    category?: string
    cityId?: number
    operatorId?: number
    search?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.category) searchParams.append('category', params.category)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.operatorId) searchParams.append('operatorId', params.operatorId.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/appeals${query ? `?${query}` : ''}`)
  }

  async getAppeal(id: number) {
    return this.request<any>(`/appeals/${id}`)
  }

  async updateAppeal(id: number, data: {
    status?: string
    result?: string
    callbackAt?: string | null
  }) {
    return this.request<any>(`/appeals/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async closeAppeal(id: number, result?: string) {
    return this.request<any>(`/appeals/${id}/close`, { method: 'PATCH', body: JSON.stringify({ result }) })
  }

  // ==================== OPERATOR WORK SESSIONS ====================

  async getOperatorWorkSessions(params?: {
    page?: number
    limit?: number
    operatorId?: number
    status?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.operatorId) searchParams.append('operatorId', params.operatorId.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/operator-work-sessions${query ? `?${query}` : ''}`)
  }

  // ==================== NOTIFICATION LOGS ====================

  async getNotificationLogs(params?: {
    page?: number
    limit?: number
    userId?: number
    userType?: string
    channel?: string
    status?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.userId) searchParams.append('userId', params.userId.toString())
    if (params?.userType) searchParams.append('userType', params.userType)
    if (params?.channel) searchParams.append('channel', params.channel)
    if (params?.status) searchParams.append('status', params.status)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/notification-logs${query ? `?${query}` : ''}`)
  }

  // ==================== REFERENCES ====================

  async getCitiesList(params?: { isActive?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive))
    const query = searchParams.toString()
    return this.request<any[]>(`/references/cities${query ? `?${query}` : ''}`)
  }

  async createCity(data: { name: string; code: string; isActive?: boolean }) {
    return this.request<any>('/references/cities', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateCity(id: number, data: { name?: string; code?: string; isActive?: boolean }) {
    return this.request<any>(`/references/cities/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteCity(id: number) {
    return this.request<any>(`/references/cities/${id}`, { method: 'DELETE' })
  }

  async getRkList(params?: { isActive?: boolean }) {
    const searchParams = new URLSearchParams()
    if (params?.isActive !== undefined) searchParams.append('isActive', String(params.isActive))
    const query = searchParams.toString()
    return this.request<any[]>(`/references/rk${query ? `?${query}` : ''}`)
  }

  async createRk(data: { name: string; code: string; isActive?: boolean }) {
    return this.request<any>('/references/rk', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateRk(id: number, data: { name?: string; code?: string; isActive?: boolean }) {
    return this.request<any>(`/references/rk/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteRk(id: number) {
    return this.request<any>(`/references/rk/${id}`, { method: 'DELETE' })
  }

  async getOrderTypesList() {
    return this.request<any[]>('/references/order-types')
  }

  async createOrderType(data: { name: string; isActive?: boolean }) {
    return this.request<any>('/references/order-types', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateOrderType(id: number, data: { name?: string; isActive?: boolean }) {
    return this.request<any>(`/references/order-types/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteOrderType(id: number) {
    return this.request<any>(`/references/order-types/${id}`, { method: 'DELETE' })
  }

  async getEquipmentTypesList() {
    return this.request<any[]>('/references/equipment-types')
  }

  async createEquipmentType(data: { name: string; isActive?: boolean }) {
    return this.request<any>('/references/equipment-types', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateEquipmentType(id: number, data: { name?: string; isActive?: boolean }) {
    return this.request<any>(`/references/equipment-types/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteEquipmentType(id: number) {
    return this.request<any>(`/references/equipment-types/${id}`, { method: 'DELETE' })
  }

  async getOrderStatusesList() {
    return this.request<any[]>('/references/order-statuses')
  }

  async createOrderStatus(data: { name: string; code: string; color?: string; sortOrder?: number; isActive?: boolean }) {
    return this.request<any>('/references/order-statuses', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateOrderStatus(id: number, data: { name?: string; code?: string; color?: string; sortOrder?: number; isActive?: boolean }) {
    return this.request<any>(`/references/order-statuses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteOrderStatus(id: number) {
    return this.request<any>(`/references/order-statuses/${id}`, { method: 'DELETE' })
  }

  // ==================== SITE ORDERS ====================

  async getSiteOrders(params?: {
    page?: number
    limit?: number
    status?: string
    cityId?: number
    search?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.cityId) searchParams.append('cityId', params.cityId.toString())
    if (params?.search) searchParams.append('search', params.search)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/site-orders${query ? `?${query}` : ''}`)
  }

  async getSiteOrder(id: number) {
    return this.request<any>(`/site-orders/${id}`)
  }

  async updateSiteOrder(id: number, data: {
    status?: string
    commentOperator?: string
    callbackAt?: string
    orderId?: number
  }) {
    return this.request<any>(`/site-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteSiteOrder(id: number) {
    return this.request<any>(`/site-orders/${id}`, { method: 'DELETE' })
  }

  // ==================== CASH SUBMISSIONS ====================

  async getCashSubmissions(params?: {
    page?: number
    limit?: number
    status?: string
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/cash-submissions${query ? `?${query}` : ''}`)
  }

  async approveCashSubmission(id: number, approve: boolean) {
    return this.request<any>(`/cash-submissions/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approve }),
    })
  }

  // ==================== OPERATOR SALARY ====================

  async getOperatorSalaries(params?: {
    page?: number
    limit?: number
    status?: string
    operatorId?: number
    startDate?: string
    endDate?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.operatorId) searchParams.append('operatorId', params.operatorId.toString())
    if (params?.startDate) searchParams.append('startDate', params.startDate)
    if (params?.endDate) searchParams.append('endDate', params.endDate)
    const query = searchParams.toString()
    return this.request<any>(`/operator-salary${query ? `?${query}` : ''}`)
  }

  async createOperatorSalary(data: {
    operatorId: number
    periodStart: string
    periodEnd: string
    ordersCount?: number
    callsCount?: number
    baseAmount: number
    bonusAmount?: number
    penaltyAmount?: number
    note?: string
  }) {
    return this.request<any>('/operator-salary', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateOperatorSalary(id: number, data: {
    baseAmount?: number
    bonusAmount?: number
    penaltyAmount?: number
    status?: string
    note?: string
  }) {
    return this.request<any>(`/operator-salary/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async approveOperatorSalary(id: number) {
    return this.request<any>(`/operator-salary/${id}/approve`, { method: 'PATCH', body: JSON.stringify({}) })
  }

  async markOperatorSalaryPaid(id: number) {
    return this.request<any>(`/operator-salary/${id}/paid`, { method: 'PATCH', body: JSON.stringify({}) })
  }

  // ==================== MASTER SCHEDULES ====================

  async getMasterSchedules(params?: {
    masterId?: number
    dateFrom?: string
    dateTo?: string
    status?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.masterId) searchParams.append('masterId', params.masterId.toString())
    if (params?.dateFrom) searchParams.append('dateFrom', params.dateFrom)
    if (params?.dateTo) searchParams.append('dateTo', params.dateTo)
    if (params?.status) searchParams.append('status', params.status)
    const query = searchParams.toString()
    return this.request<any>(`/master-schedules${query ? `?${query}` : ''}`)
  }

  async upsertMasterSchedule(data: {
    masterId: number
    date: string
    status: 'working' | 'day_off' | 'vacation'
    note?: string
  }) {
    return this.request<any>('/master-schedules', { method: 'POST', body: JSON.stringify(data) })
  }

  async deleteMasterSchedule(id: number) {
    return this.request<any>(`/master-schedules/${id}`, { method: 'DELETE' })
  }

  // ==================== ADMINS ====================

  async getAdmins() {
    return this.request<any[]>('/admins')
  }

  async getAdmin(id: number) {
    return this.request<any>(`/admins/${id}`)
  }

  async createAdmin(data: {
    name: string
    login: string
    password: string
    role?: string
    note?: string
  }) {
    return this.request<any>('/admins', { method: 'POST', body: JSON.stringify(data) })
  }

  async updateAdmin(id: number, data: {
    name?: string
    login?: string
    password?: string
    status?: string
    note?: string
  }) {
    return this.request<any>(`/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  }

  async deleteAdmin(id: number) {
    return this.request<any>(`/admins/${id}`, { method: 'DELETE' })
  }

  // Orders History API - получить историю изменений заказа
  async getOrderHistory(orderId: number): Promise<OrderHistoryItem[]> {
    try {
      const response = await this.request<OrderHistoryItem[]>(`/orders/${orderId}/history`, { method: 'GET' })
      const result = response.data
      return Array.isArray(result) ? result : []
    } catch (error) {
      logger.error('Error fetching order history', { error: String(error) })
      return []
    }
  }
}

// Типы для истории заказа
export interface OrderHistoryItem {
  id: number;
  timestamp: string;
  eventType: 'order.create' | 'order.update' | 'order.close' | 'order.status.change';
  userId?: number;
  role?: string;
  login?: string;
  userName?: string;
  metadata?: {
    orderId?: number;
    changes?: Record<string, { old: string | number | null; new: string | number | null }>;
    oldStatus?: string;
    newStatus?: string;
    result?: string;
    expenditure?: string;
    clean?: string;
    city?: string;
    clientName?: string;
    phone?: string;
  };
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient

