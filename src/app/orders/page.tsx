'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { NetworkError } from '@/components/ui/network-error'
import { LoadingState } from '@/components/ui/loading-state'
import { useDesignStore } from '@/store/design.store'
import { ordersApi } from '@/lib/api/modules/orders'
import { logger } from '@/lib/logger'
import {
  getFormFieldClass,
  getFormSelectContentClass,
  getFormSelectItemClass,
  getFormSelectTriggerClass,
} from '@/components/ui/form-styles'
import { useOrdersScrollRestoration } from '@/hooks/orders/use-orders-scroll-restoration'

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
  const { saveScrollPosition, restoreScrollPosition } = useOrdersScrollRestoration(SCROLL_POSITION_KEY)

  // Загрузка опций фильтров
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await ordersApi.getFilterOptions()
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
      
      const response = await ordersApi.getOrders({
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
  const inputFieldClass = `${getFormFieldClass(isDark, 'lg')} min-h-[44px] px-4`
  const selectTriggerClass = `${getFormSelectTriggerClass(isDark, 'lg')} min-h-[44px] px-4`
  const selectContentClass = getFormSelectContentClass(isDark)
  const selectItemClass = getFormSelectItemClass(isDark)

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
    }`}>
      <div className="px-4 py-6">
        <div className="w-full">
          <div className={`transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>

            {/* Табы статусов + иконка фильтров */}
            <div className="mb-4 animate-slide-in-left">
              <div className="flex items-center gap-2">
                {/* Табы с прокруткой */}
                <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className="flex gap-2 w-max">
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
                        className={`min-h-[40px] px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                          statusTab === tab.id
                            ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                            : (isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent' : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
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
                  className={`relative flex items-center justify-center min-h-[40px] w-[40px] flex-shrink-0 rounded-2xl transition-all duration-200 bg-transparent ${
                    isDark 
                      ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' 
                      : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                  }`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {/* Индикатор активных фильтров */}
                  {hasActiveFilters && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Выезжающая панель фильтров справа */}
            <>
                {/* Затемнение фона */}
                <div
                  className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                    showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  } ${
                    isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'
                  }`}
                  onClick={() => setShowFilters(false)}
                />
                
                {/* Панель фильтров */}
                <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                  showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
                } ${
                  isDark
                    ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                    : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
                }`}>
                  {/* Заголовок панели */}
                  <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                      title="Скрыть фильтры"
                    >
                      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>

                  {/* Содержимое фильтров */}
                  <div className="p-6 space-y-8">
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
                          className={inputFieldClass}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Телефон</label>
                        <input
                          type="text"
                          value={draftSearchPhone}
                          onChange={(e) => setDraftSearchPhone(e.target.value)}
                          placeholder="Номер телефона..."
                          className={inputFieldClass}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Адрес</label>
                        <input
                          type="text"
                          value={draftSearchAddress}
                          onChange={(e) => setDraftSearchAddress(e.target.value)}
                          placeholder="Адрес..."
                          className={inputFieldClass}
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
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Все статусы" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="all" className={selectItemClass}>Все статусы</SelectItem>
                            {allStatuses.map(status => (
                              <SelectItem key={status} value={status} className={selectItemClass}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                        <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Все города" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="all" className={selectItemClass}>Все города</SelectItem>
                            {allCities.map(city => (
                              <SelectItem key={city.id} value={String(city.id)} className={selectItemClass}>{city.name}</SelectItem>

                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <input
                          type="text"
                          value={draftMasterFilter}
                          onChange={(e) => setDraftMasterFilter(e.target.value)}
                          placeholder="Мастер..."
                          className={inputFieldClass}
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
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Все РК" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="all" className={selectItemClass}>Все РК</SelectItem>
                            {allRks.map(rk => (
                              <SelectItem key={rk.id} value={String(rk.id)} className={selectItemClass}>{rk.name}</SelectItem>

                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Направление</label>
                        <Select value={draftTypeEquipmentFilter || "all"} onValueChange={(value) => setDraftTypeEquipmentFilter(value === "all" ? "" : value)}>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Все направления" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="all" className={selectItemClass}>Все направления</SelectItem>
                            {allEquipmentTypes.map(type => (
                              <SelectItem key={type.id} value={String(type.id)} className={selectItemClass}>{type.name}</SelectItem>

                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                    {/* Секция: Даты */}
                    <div className="space-y-4">
                      <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Тип даты</label>
                        <Select value={draftDateType} onValueChange={(value: 'create' | 'close' | 'meeting') => setDraftDateType(value)}>
                          <SelectTrigger className={selectTriggerClass}>
                            <SelectValue placeholder="Тип даты" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClass}>
                            <SelectItem value="create" className={selectItemClass}>Дата создания</SelectItem>
                            <SelectItem value="close" className={selectItemClass}>Дата закрытия</SelectItem>
                            <SelectItem value="meeting" className={selectItemClass}>Дата встречи</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <DateRangePicker
                        startDate={draftDateFrom}
                        endDate={draftDateTo}
                        onChange={(start, end) => {
                          setDraftDateFrom(start)
                          setDraftDateTo(end)
                        }}
                        isDark={isDark}
                      />
                    </div>
                  </div>

                  {/* Нижняя панель с кнопками */}
                  <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                    isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
                  }`}>
                    <button
                      onClick={resetFilters}
                      className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                        isDark 
                          ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                          : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                      }`}
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyFilters}
                      className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                        isDark
                          ? 'bg-white hover:bg-gray-200 text-[#111113]'
                          : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'
                      }`}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </>

            {/* Состояние загрузки */}
            {loading && <LoadingState isDark={isDark} message="Загрузка заказов..." />}

            {/* Ошибка */}
            {error && (
              <NetworkError 
                isDark={isDark} 
                onRetry={loadOrders} 
                message={error !== 'Ошибка загрузки заказов' ? error : undefined} 
              />
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
            <div className="hidden md:block animate-fade-in">
              <table className={`w-full border-collapse text-xs rounded-lg shadow-lg ${
                isDark ? 'bg-white/[0.03]' : 'bg-white'
              }`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-black/[0.02] border-black/10'}`}>
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
                          ? 'border-white/10 hover:bg-white/[0.04]'
                          : 'border-black/10 hover:bg-black/[0.02]'
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
                      <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${isDark ? 'text-white' : 'text-[#111113]'}`}>
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
            <div className="md:hidden space-y-3 animate-fade-in">
              {safeOrders.map((order) => (
                <div 
                  key={order.id}
                  className={`rounded-[20px] overflow-hidden border cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md ${
                    isDark 
                      ? 'bg-white/[0.02] border-white/10 hover:border-white/30'
                      : 'bg-white border-black/10 hover:border-black/30'
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
                        <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-[#111113]'}`}>
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
              <div className="mt-6 animate-fade-in">
                <OptimizedPagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
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
