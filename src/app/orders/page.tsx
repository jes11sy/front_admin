'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { useDesignStore } from '@/store/design.store'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// Ключ для сохранения позиции прокрутки
const SCROLL_POSITION_KEY = 'admin_orders_scroll_position'

interface Order {
  id: number
  rkId: number
  rk?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  closingAt: string | null
  equipmentTypeId: number
  equipmentType?: { id: number; name: string }
  statusId: number
  status?: { id: number; name: string; code: string }
  masterId: number
  result: number
  operatorId: number
  master?: { name: string }
  operator?: { login: string }
}

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Тема из store
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Инициализация из URL query params (для сохранения состояния при возврате назад)
  const [currentPage, setCurrentPage] = useState(() => {
    const page = searchParams.get('page')
    return page ? parseInt(page, 10) : 1
  })
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  // Отдельные поля поиска
  const [searchId, setSearchId] = useState(() => searchParams.get('searchId') || '')
  const [searchPhone, setSearchPhone] = useState(() => searchParams.get('searchPhone') || '')
  const [searchAddress, setSearchAddress] = useState(() => searchParams.get('searchAddress') || '')
  
  // Табы статусов: all, Ожидает, Принял, В работе, completed (Готово+Отказ+Незаказ)
  const [statusTab, setStatusTab] = useState<string>(() => searchParams.get('tab') || 'all')
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || '')
  const [cityFilter, setCityFilter] = useState(() => searchParams.get('city') || '')
  const [masterFilter, setMasterFilter] = useState(() => searchParams.get('master') || '')
  const [showFilters, setShowFilters] = useState(() => {
    return !!(searchParams.get('status') || searchParams.get('city') || searchParams.get('master') || 
              searchParams.get('rk') || searchParams.get('equipmentTypeId') || 
              searchParams.get('dateFrom') || searchParams.get('dateTo') ||
              searchParams.get('searchId') || searchParams.get('searchPhone') || searchParams.get('searchAddress'))
  })
  
  // Дополнительные фильтры
  const [rkFilter, setRkFilter] = useState(() => searchParams.get('rk') || '')
  const [typeEquipmentFilter, setTypeEquipmentFilter] = useState(() => searchParams.get('equipmentTypeId') || '')
  const [dateType, setDateType] = useState<'create' | 'close' | 'meeting'>(() => {
    const dt = searchParams.get('dateType')
    return (dt === 'create' || dt === 'close' || dt === 'meeting') ? dt : 'create'
  })
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(() => searchParams.get('dateTo') || '')

  // Черновые состояния для панели фильтров (применяются только по кнопке)
  const [draftSearchId, setDraftSearchId] = useState('')
  const [draftSearchPhone, setDraftSearchPhone] = useState('')
  const [draftSearchAddress, setDraftSearchAddress] = useState('')
  const [draftStatusFilter, setDraftStatusFilter] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftMasterFilter, setDraftMasterFilter] = useState('')
  const [draftRkFilter, setDraftRkFilter] = useState('')
  const [draftTypeEquipmentFilter, setDraftTypeEquipmentFilter] = useState('')
  const [draftDateType, setDraftDateType] = useState<'create' | 'close' | 'meeting'>('create')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')

  // Состояние для данных
  const [orders, setOrders] = useState<Order[]>([])
  const [allStatuses] = useState<string[]>(['Ожидает', 'Принял', 'В пути', 'В работе', 'Готово', 'Отказ', 'Модерн', 'Незаказ'])
  const [allCities, setAllCities] = useState<Array<{ id: number; name: string }>>([])
  const [allRks, setAllRks] = useState<Array<{ id: number; name: string }>>([])
  const [allEquipmentTypes, setAllEquipmentTypes] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  
  // Ref для отмены запросов (Race Condition fix)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)
  const isInitialMount = useRef(true)
  const hasRestoredScroll = useRef(false)
  
  // Определяем тип навигации: back/forward vs reload/direct
  const isBackNavigation = useRef(false)

  const PAGE_SIZES = [
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]
  
  // При монтировании проверяем тип навигации и загружаем опции фильтров
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
      const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'
      
      if (navigationType === 'reload' || navigationType === 'navigate') {
        sessionStorage.removeItem(SCROLL_POSITION_KEY)
        isBackNavigation.current = false
      } else if (navigationType === 'back_forward') {
        isBackNavigation.current = true
      }
    }
  }, [])

  // Загрузка опций фильтров
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await apiClient.getFilterOptions()
        if (response.success && response.data) {
          setAllRks(response.data.rks || [])
          setAllEquipmentTypes(response.data.equipmentTypes || [])
          setAllCities(response.data.cities || [])
        }
      } catch (error) {
        console.error('Error loading filter options:', error)
      }
    }
    loadFilterOptions()
  }, [])

  // Обновление URL с текущими фильтрами
  const updateUrlWithFilters = useCallback(() => {
    const params = new URLSearchParams()
    
    if (currentPage > 1) params.set('page', currentPage.toString())
    if (statusTab !== 'all') params.set('tab', statusTab)
    if (searchId) params.set('searchId', searchId)
    if (searchPhone) params.set('searchPhone', searchPhone)
    if (searchAddress) params.set('searchAddress', searchAddress)
    if (statusFilter) params.set('status', statusFilter)
    if (cityFilter) params.set('city', cityFilter)
    if (masterFilter) params.set('master', masterFilter)
    if (rkFilter) params.set('rk', rkFilter)
    if (typeEquipmentFilter) params.set('equipmentTypeId', typeEquipmentFilter)
    if (dateType !== 'create') params.set('dateType', dateType)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    
    const queryString = params.toString()
    const newUrl = queryString ? `/orders?${queryString}` : '/orders'
    
    window.history.replaceState(null, '', newUrl)
  }, [currentPage, statusTab, searchId, searchPhone, searchAddress, statusFilter, cityFilter, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Сохранение позиции прокрутки
  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCROLL_POSITION_KEY, window.scrollY.toString())
    }
  }, [])

  // Восстановление позиции прокрутки
  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined' && !hasRestoredScroll.current && isBackNavigation.current) {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY)
      if (savedPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedPosition, 10))
          hasRestoredScroll.current = true
          sessionStorage.removeItem(SCROLL_POSITION_KEY)
        }, 100)
      }
    }
  }, [])

  // Загрузка данных
  const loadOrders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    
    const currentRequestId = ++requestIdRef.current
    
    try {
      setLoading(true)
      setError(null)
      
      // Определяем статус на основе таба
      let effectiveStatus = statusFilter?.trim() || undefined
      if (!effectiveStatus && statusTab !== 'all') {
        if (statusTab === 'completed') {
          effectiveStatus = 'Готово,Отказ,Незаказ'
        } else {
          effectiveStatus = statusTab
        }
      }
      
      const response = await apiClient.getOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: effectiveStatus,
        cityId: cityFilter?.trim() ? Number(cityFilter.trim()) : undefined,
        search: searchId?.trim() || searchPhone?.trim() || searchAddress?.trim() || undefined,
        master: masterFilter?.trim() || undefined,
        rkId: rkFilter?.trim() ? Number(rkFilter.trim()) : undefined,
        equipmentTypeId: typeEquipmentFilter?.trim() ? Number(typeEquipmentFilter.trim()) : undefined,
        dateType: (dateFrom?.trim() || dateTo?.trim()) ? dateType : undefined,
        dateFrom: dateFrom?.trim() || undefined,
        dateTo: dateTo?.trim() || undefined,
      })
      
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      
      if (response.success && response.data) {
        const ordersData = response.data.orders || response.data
        const paginationData = response.data.pagination || {
          page: currentPage,
          limit: itemsPerPage,
          total: ordersData.length,
          totalPages: Math.ceil(ordersData.length / itemsPerPage)
        }
        
        setOrders(ordersData)
        setPagination(paginationData)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      if (currentRequestId !== requestIdRef.current) {
        return
      }
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки заказов'
      setError(errorMessage)
      logger.error('Error loading orders', { error: String(err) })
      toast.error(errorMessage)
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [currentPage, itemsPerPage, statusTab, statusFilter, cityFilter, searchId, searchPhone, searchAddress, masterFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  // Загружаем данные при изменении фильтров
  useEffect(() => {
    if (itemsPerPage > 0) {
      loadOrders()
    }
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentPage, statusTab, statusFilter, cityFilter, masterFilter, itemsPerPage, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo, searchId, searchPhone, searchAddress])

  // Обновляем URL при изменении фильтров
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    updateUrlWithFilters()
  }, [updateUrlWithFilters])

  // Восстанавливаем позицию прокрутки после загрузки
  useEffect(() => {
    if (!loading && orders.length > 0) {
      restoreScrollPosition()
    }
  }, [loading, orders.length, restoreScrollPosition])

  // Обработчик смены таба статусов
  const handleStatusTabChange = (tab: string) => {
    setStatusTab(tab)
    setStatusFilter('')
    setCurrentPage(1)
  }

  // Открытие панели фильтров
  const openFiltersPanel = () => {
    setDraftSearchId(searchId)
    setDraftSearchPhone(searchPhone)
    setDraftSearchAddress(searchAddress)
    setDraftStatusFilter(statusFilter)
    setDraftCityFilter(cityFilter)
    setDraftMasterFilter(masterFilter)
    setDraftRkFilter(rkFilter)
    setDraftTypeEquipmentFilter(typeEquipmentFilter)
    setDraftDateType(dateType)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setShowFilters(true)
  }

  // Применение фильтров
  const applyFilters = () => {
    setSearchId(draftSearchId)
    setSearchPhone(draftSearchPhone)
    setSearchAddress(draftSearchAddress)
    setStatusFilter(draftStatusFilter)
    setCityFilter(draftCityFilter)
    setMasterFilter(draftMasterFilter)
    setRkFilter(draftRkFilter)
    setTypeEquipmentFilter(draftTypeEquipmentFilter)
    setDateType(draftDateType)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setCurrentPage(1)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftSearchId('')
    setDraftSearchPhone('')
    setDraftSearchAddress('')
    setDraftStatusFilter('')
    setDraftCityFilter('')
    setDraftMasterFilter('')
    setDraftRkFilter('')
    setDraftTypeEquipmentFilter('')
    setDraftDateType('create')
    setDraftDateFrom('')
    setDraftDateTo('')
    setSearchId('')
    setSearchPhone('')
    setSearchAddress('')
    setStatusFilter('')
    setCityFilter('')
    setMasterFilter('')
    setRkFilter('')
    setTypeEquipmentFilter('')
    setDateType('create')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
    setShowFilters(false)
    window.history.replaceState(null, '', '/orders')
    sessionStorage.removeItem(SCROLL_POSITION_KEY)
  }

  const handleOrderClick = (orderId: number) => {
    saveScrollPosition()
    updateUrlWithFilters()
    router.push(`/orders/${orderId}`)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Форматирование даты
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      
      return `${day}.${month}.${year}`
    } catch {
      return '-'
    }
  }

  // Форматирование валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Стили статуса
  const getStatusStyle = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'Готово': return 'bg-green-700 text-white'
        case 'В работе': return 'bg-blue-700 text-white'
        case 'Ожидает': return 'bg-amber-600 text-white'
        case 'Отказ': return 'bg-red-700 text-white'
        case 'Принял': return 'bg-emerald-700 text-white'
        case 'В пути': return 'bg-violet-700 text-white'
        case 'Модерн': return 'bg-orange-600 text-white'
        case 'Незаказ': return 'bg-gray-600 text-white'
        default: return 'bg-gray-600 text-white'
      }
    }
    switch (status) {
      case 'Готово': return 'bg-green-600 text-white'
      case 'В работе': return 'bg-blue-600 text-white'
      case 'Ожидает': return 'bg-amber-500 text-white'
      case 'Отказ': return 'bg-red-600 text-white'
      case 'Принял': return 'bg-emerald-600 text-white'
      case 'В пути': return 'bg-violet-600 text-white'
      case 'Модерн': return 'bg-orange-500 text-white'
      case 'Незаказ': return 'bg-gray-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Стили типа заказа
  const getTypeStyle = (type: string) => {
    if (isDark) {
      switch (type) {
        case 'Впервые': return 'bg-emerald-700 text-white'
        case 'Повтор': return 'bg-amber-600 text-white'
        case 'Гарантия': return 'bg-red-700 text-white'
        default: return 'bg-gray-600 text-white'
      }
    }
    switch (type) {
      case 'Впервые': return 'bg-emerald-600 text-white'
      case 'Повтор': return 'bg-amber-500 text-white'
      case 'Гарантия': return 'bg-red-600 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const safeOrders = Array.isArray(orders) ? orders : []
  const hasActiveFilters = searchId || searchPhone || searchAddress || statusFilter || cityFilter || masterFilter || rkFilter || typeEquipmentFilter || dateFrom || dateTo

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#1e2530]' : 'bg-white'
    }`}>
      <div className="px-4 py-6">
        <div className="w-full">
          <div className={`transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
            
            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8 animate-fade-in">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка заказов...</p>
              </div>
            )}

            {/* Ошибка */}
            {error && (
              <div className={`rounded-lg p-4 mb-6 ${
                isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`font-medium ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
                <button 
                  onClick={loadOrders}
                  className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:shadow-md"
                >
                  Попробовать снова
                </button>
              </div>
            )}

            {/* Табы статусов + иконка фильтров */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                {/* Табы с прокруткой */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className={`flex gap-1 p-1 rounded-lg w-max ${
                    isDark ? 'bg-[#2a3441]' : 'bg-gray-100'
                  }`}>
                    {[
                      { id: 'all', label: 'Все' },
                      { id: 'Ожидает', label: 'Ожидает' },
                      { id: 'Принял', label: 'Принял' },
                      { id: 'В работе', label: 'В работе' },
                      { id: 'Модерн', label: 'Модерн' },
                      { id: 'completed', label: 'Завершённые' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleStatusTabChange(tab.id)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                          statusTab === tab.id
                            ? isDark 
                              ? 'bg-[#0d5c4b] text-white shadow-sm'
                              : 'bg-[#0d5c4b] text-white shadow-sm'
                            : isDark
                              ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]'
                              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Иконка фильтров */}
                <button
                  onClick={openFiltersPanel}
                  className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${
                    isDark 
                      ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'
                  }`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {hasActiveFilters && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                      isDark ? 'border-[#1e2530]' : 'border-white'
                    }`}></span>
                  )}
                </button>
              </div>
            </div>

            {/* Выезжающая панель фильтров справа */}
            {showFilters && (
              <>
                {/* Затемнение фона */}
                <div 
                  className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                    isDark ? 'bg-black/50' : 'bg-black/30'
                  }`}
                  onClick={() => setShowFilters(false)}
                />
                
                {/* Панель фильтров */}
                <div className={`fixed top-0 right-0 h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
                  isDark ? 'bg-[#2a3441]' : 'bg-white'
                }`}>
                  {/* Заголовок панели */}
                  <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                      title="Закрыть"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Содержимое фильтров */}
                  <div className="p-4 space-y-4">
                    {/* Секция: Поиск */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>№ заказа</label>
                        <input
                          type="text"
                          value={draftSearchId}
                          onChange={(e) => setDraftSearchId(e.target.value)}
                          placeholder="ID заказа..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Телефон</label>
                        <input
                          type="text"
                          value={draftSearchPhone}
                          onChange={(e) => setDraftSearchPhone(e.target.value)}
                          placeholder="Номер телефона..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</label>
                        <input
                          type="text"
                          value={draftSearchAddress}
                          onChange={(e) => setDraftSearchAddress(e.target.value)}
                          placeholder="Адрес..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Основные фильтры */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Основные</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
                        <Select value={draftStatusFilter || "all"} onValueChange={(value) => setDraftStatusFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все статусы" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все статусы</SelectItem>
                            {allStatuses.map(status => (
                              <SelectItem key={status} value={status} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                        <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все города" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все города</SelectItem>
                            {allCities.map(city => (
                              <SelectItem key={city.id} value={String(city.id)} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Мастер</label>
                        <input
                          type="text"
                          value={draftMasterFilter}
                          onChange={(e) => setDraftMasterFilter(e.target.value)}
                          placeholder="Имя мастера..."
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                              : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                          }`}
                        />
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Дополнительные */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дополнительно</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>РК</label>
                        <Select value={draftRkFilter || "all"} onValueChange={(value) => setDraftRkFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все РК" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все РК</SelectItem>
                            {allRks.map(rk => (
                              <SelectItem key={rk.id} value={String(rk.id)} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{rk.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Направление</label>
                        <Select value={draftTypeEquipmentFilter || "all"} onValueChange={(value) => setDraftTypeEquipmentFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Все направления" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все направления</SelectItem>
                            {allEquipmentTypes.map(type => (
                              <SelectItem key={type.id} value={String(type.id)} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Даты */}
                    <div className="space-y-3">
                      <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Тип даты</label>
                        <Select value={draftDateType} onValueChange={(value: 'create' | 'close' | 'meeting') => setDraftDateType(value)}>
                          <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                            <SelectValue placeholder="Тип даты" />
                          </SelectTrigger>
                          <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                            <SelectItem value="create" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата создания</SelectItem>
                            <SelectItem value="close" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата закрытия</SelectItem>
                            <SelectItem value="meeting" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Дата встречи</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                          <input
                            type="date"
                            value={draftDateFrom}
                            onChange={(e) => setDraftDateFrom(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                              isDark 
                                ? 'bg-[#3a4451] border-gray-600 text-gray-100'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                          <input
                            type="date"
                            value={draftDateTo}
                            onChange={(e) => setDraftDateTo(e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                              isDark 
                                ? 'bg-[#3a4451] border-gray-600 text-gray-100'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Нижняя панель с кнопками */}
                  <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${
                    isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                        isDark 
                          ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Десктопная таблица */}
            {!loading && !error && safeOrders.length === 0 && (
              <div className="text-center py-8">
                <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {hasActiveFilters ? 'Заказы не найдены. Попробуйте изменить параметры фильтрации.' : 'Нет заказов для отображения'}
                </p>
              </div>
            )}
            
            {!loading && !error && safeOrders.length > 0 && (
            <div className="hidden md:block">
              <table className={`w-full border-collapse text-xs rounded-lg shadow-lg ${
                isDark ? 'bg-[#2a3441]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>РК</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Телефон</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Клиент</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Адрес</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Встреча</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Закрытие</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Направление</th>
                    <th className={`text-center py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</th>
                    <th className={`text-right py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Итог</th>
                    <th className={`text-left py-2 px-2 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Опер.</th>
                  </tr>
                </thead>
                <tbody>
                  {safeOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className={`border-b transition-colors cursor-pointer ${
                        isDark 
                          ? 'border-gray-700 hover:bg-[#3a4451]'
                          : 'border-gray-200 hover:bg-teal-50'
                      }`}
                      onClick={() => handleOrderClick(order.id)}
                    >
                      <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.id}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                          {order.typeOrder}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.rk?.name || '-'}</td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.city?.name || '-'}</td>
                      <td className={`py-2 px-2 font-mono text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.phone}</td>
                      <td className={`py-2 px-2 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName}</td>
                      <td className={`py-2 px-2 max-w-[100px] truncate ${isDark ? 'text-gray-300' : 'text-gray-800'}`} title={order.address}>{order.address}</td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{formatDate(order.dateMeeting)}</td>
                      <td className={`py-2 px-2 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        {order.closingAt ? formatDate(order.closingAt) : '-'}
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.equipmentType?.name || '-'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.status?.name || '')}`}>
                          {order.status?.name || '-'}
                        </span>
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.master?.name || '-'}</td>
                      <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${isDark ? 'text-teal-400' : 'text-green-600'}`}>
                        {order.result ? formatCurrency(Number(order.result)) : '-'}
                      </td>
                      <td className={`py-2 px-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{order.operator?.login || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Мобильные карточки */}
            {!loading && !error && safeOrders.length > 0 && (
            <div className="md:hidden space-y-3">
              {safeOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    isDark 
                      ? 'bg-[#2a3441] border-gray-700 hover:border-teal-600'
                      : 'bg-white border-gray-200 hover:border-teal-300'
                  }`}
                  onClick={() => handleOrderClick(order.id)}
                >
                  {/* Верхняя строка: ID, тип, дата */}
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{order.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(order.typeOrder)}`}>
                        {order.typeOrder}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(order.dateMeeting)}</span>
                  </div>
                  
                  {/* Основной контент */}
                  <div className="px-3 py-2.5">
                    {/* Клиент и город */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-medium text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{order.clientName || 'Без имени'}</span>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{order.city?.name || '-'}</span>
                    </div>
                    
                    {/* Адрес */}
                    <p className={`text-xs mb-2 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.address || '—'}</p>
                    
                    {/* Направление */}
                    <div className="flex items-start gap-1.5 mb-2">
                      <span className={`text-xs shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{order.equipmentType?.name || '-'}</span>
                    </div>
                  </div>
                  
                  {/* Нижняя строка: мастер, статус, сумма */}
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${
                    isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'
                  }`}>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{order.master?.name || 'Не назначен'}</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(order.status?.name || '')}`}>
                        {order.status?.name || '-'}
                      </span>
                      {order.result && (
                        <span className={`font-bold text-sm ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                          {formatCurrency(Number(order.result))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Пагинация */}
            {!loading && !error && safeOrders.length > 0 && pagination.totalPages > 1 && (
              <div className={`flex items-center justify-center mt-6 pt-4 border-t ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <OptimizedPagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  isDark={isDark}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Загрузка заказов" />}>
      <OrdersContent />
    </Suspense>
  )
}
