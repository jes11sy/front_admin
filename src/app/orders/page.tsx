'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { logger } from '@/lib/logger'

interface Order {
  id: number
  rk: string
  city: string
  avitoName: string
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  closingData: string | null
  typeEquipment: string
  statusOrder: string
  masterId: number
  result: number
  operatorNameId: number
  master?: { name: string }
  operator?: { login: string }
}

export default function OrdersPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [masterFilter, setMasterFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [rkFilter, setRkFilter] = useState('all')
  const [typeEquipmentFilter, setTypeEquipmentFilter] = useState('all')
  const [dateType, setDateType] = useState<'create' | 'close' | 'meeting'>('create')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Данные для фильтров
  const [allRks, setAllRks] = useState<string[]>([])
  const [allTypeEquipments, setAllTypeEquipments] = useState<string[]>([])
  const [allCities, setAllCities] = useState<string[]>([])
  
  const [ordersData, setOrdersData] = useState<{
    orders: Order[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)

  const PAGE_SIZES = [
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  const ORDER_STATUSES = [
    { value: 'all', label: 'Все статусы' },
    { value: 'Ожидает', label: 'Ожидает' },
    { value: 'Принял', label: 'Принял' },
    { value: 'В пути', label: 'В пути' },
    { value: 'В работе', label: 'В работе' },
    { value: 'Готово', label: 'Готово' },
    { value: 'Отказ', label: 'Отказ' },
    { value: 'Модерн', label: 'Модерн' },
    { value: 'Незаказ', label: 'Незаказ' },
  ]

  // Загрузка опций фильтров
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await apiClient.getFilterOptions()
        if (response.success && response.data) {
          setAllRks(response.data.rks || [])
          setAllTypeEquipments(response.data.typeEquipments || [])
          setAllCities(response.data.cities || [])
        }
      } catch (error) {
        console.error('Error loading filter options:', error)
      }
    }
    loadFilterOptions()
  }, [])

  // Загрузка заказов и статистики из API
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getOrders({ 
          page, 
          limit,
          search: searchQuery || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          master: masterFilter || undefined,
          city: cityFilter !== 'all' ? cityFilter : undefined,
          rk: rkFilter !== 'all' ? rkFilter : undefined,
          typeEquipment: typeEquipmentFilter !== 'all' ? typeEquipmentFilter : undefined,
          dateType: (dateFrom || dateTo) ? dateType : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        })
        
        if (response.success && response.data) {
          const orders = response.data.orders || response.data
          const pagination = response.data.pagination || {
            page: page,
            limit: limit,
            total: orders.length,
            totalPages: Math.ceil(orders.length / limit)
          }
          
          setOrdersData({
            orders,
            pagination
          })
        }
      } catch (error) {
        logger.error('Error loading orders', { error: String(error) })
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке заказов'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [page, limit, searchQuery, statusFilter, masterFilter, cityFilter, rkFilter, typeEquipmentFilter, dateType, dateFrom, dateTo])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleMasterChange = (value: string) => {
    setMasterFilter(value)
    setPage(1)
  }

  const handleCityChange = (value: string) => {
    setCityFilter(value)
    setPage(1)
  }

  const handleRkChange = (value: string) => {
    setRkFilter(value)
    setPage(1)
  }

  const handleTypeEquipmentChange = (value: string) => {
    setTypeEquipmentFilter(value)
    setPage(1)
  }

  const handleDateTypeChange = (value: 'create' | 'close' | 'meeting') => {
    setDateType(value)
    setPage(1)
  }

  const handleDateFromChange = (value: string) => {
    setDateFrom(value)
    setPage(1)
  }

  const handleDateToChange = (value: string) => {
    setDateTo(value)
    setPage(1)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setMasterFilter('')
    setCityFilter('all')
    setRkFilter('all')
    setTypeEquipmentFilter('all')
    setDateType('create')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || masterFilter || 
    cityFilter !== 'all' || rkFilter !== 'all' || typeEquipmentFilter !== 'all' || 
    dateFrom || dateTo

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Готово': return '#059669'
      case 'В работе': return '#3b82f6'
      case 'Ожидает': return '#f59e0b'
      case 'Отказ': return '#ef4444'
      case 'Принял': return '#10b981'
      case 'В пути': return '#8b5cf6'
      case 'Модерн': return '#f97316'
      case 'Незаказ': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Впервые': return '#10b981'
      case 'Повтор': return '#f59e0b'
      case 'Гарантия': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl" style={{borderColor: '#114643'}}>
            
            {/* Фильтры */}
            <div className="mb-6">
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h2>
                  {showFilters ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  )}
                  {hasActiveFilters && (
                    <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                      Активны
                    </span>
                  )}
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  {/* Первая строка: Поиск и Статус */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Поиск */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Поиск (№, телефон, адрес)
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => handleSearch(e.target.value)}
                          placeholder="Введите номер, телефон или адрес..."
                          className="w-full pl-10 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                        />
                      </div>
                    </div>
                    
                    {/* Статус */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Статус
                      </label>
                      <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Все статусы" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          {ORDER_STATUSES.map(status => (
                            <SelectItem key={status.value} value={status.value} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Вторая строка: Город и Мастер */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Город */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Город
                      </label>
                      <Select value={cityFilter} onValueChange={handleCityChange}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Все города" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все города
                          </SelectItem>
                          {allCities.map(city => (
                            <SelectItem key={city} value={city} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Мастер */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Мастер
                      </label>
                      <input
                        type="text"
                        value={masterFilter}
                        onChange={(e) => handleMasterChange(e.target.value)}
                        placeholder="Имя мастера..."
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>

                  {/* Третья строка: РК и Направление */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* РК */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        РК
                      </label>
                      <Select value={rkFilter} onValueChange={handleRkChange}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Все РК" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все РК
                          </SelectItem>
                          {allRks.map(rk => (
                            <SelectItem key={rk} value={rk} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {rk}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Направление */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Направление
                      </label>
                      <Select value={typeEquipmentFilter} onValueChange={handleTypeEquipmentChange}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Все направления" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все направления
                          </SelectItem>
                          {allTypeEquipments.map(type => (
                            <SelectItem key={type} value={type} className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Четвёртая строка: Фильтр по дате */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Тип даты */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Фильтр по дате
                      </label>
                      <Select value={dateType} onValueChange={(value: 'create' | 'close' | 'meeting') => handleDateTypeChange(value)}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Тип даты" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="create" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата создания
                          </SelectItem>
                          <SelectItem value="close" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата закрытия
                          </SelectItem>
                          <SelectItem value="meeting" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Дата встречи
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Дата от */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        С даты
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => handleDateFromChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                    
                    {/* Дата до */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        По дату
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => handleDateToChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                      />
                    </div>
                  </div>
                  
                  {/* Кнопки управления фильтрами */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                    >
                      <X className="w-4 h-4" />
                      Сбросить
                    </button>
                    <div className="text-sm text-gray-600">
                      Всего заказов: <span className="font-semibold text-teal-600">{ordersData?.pagination.total || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Состояние загрузки */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка заказов...</p>
              </div>
            )}

            {/* Десктопная таблица */}
            {!isLoading && ordersData?.orders && ordersData.orders.length > 0 && (
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-xs bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Тип</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">РК</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Город</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Аккаунт</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Телефон</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Клиент</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Адрес</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Встреча</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Закрытие</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Направление</th>
                      <th className="text-center py-2 px-2 font-semibold text-gray-700">Статус</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Мастер</th>
                      <th className="text-right py-2 px-2 font-semibold text-gray-700">Итог</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">Опер.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.orders.map((order) => (
                      <tr 
                        key={order.id}
                        className="border-b hover:bg-teal-50 transition-colors cursor-pointer" 
                        style={{borderColor: '#e5e7eb'}}
                        onClick={() => router.push(`/orders/${order.id}`)}
                      >
                        <td className="py-2 px-2 text-gray-800 font-medium">{order.id}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                            {order.typeOrder}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-800">{order.rk}</td>
                        <td className="py-2 px-2 text-gray-800">{order.city}</td>
                        <td className="py-2 px-2 text-gray-800 max-w-[90px] truncate">{order.avitoName || '-'}</td>
                        <td className="py-2 px-2 text-gray-800 font-mono text-[10px]">{order.phone}</td>
                        <td className="py-2 px-2 text-gray-800 font-medium">{order.clientName}</td>
                        <td className="py-2 px-2 text-gray-800 max-w-[100px] truncate" title={order.address}>{order.address}</td>
                        <td className="py-2 px-2 text-gray-800 whitespace-nowrap">{formatDate(order.dateMeeting)}</td>
                        <td className="py-2 px-2 text-gray-800 whitespace-nowrap">
                          {order.closingData ? formatDate(order.closingData) : '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-800">{order.typeEquipment}</td>
                        <td className="py-2 px-2 text-center">
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                            {order.statusOrder}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-gray-800">{order.master?.name || '-'}</td>
                        <td className="py-2 px-2 text-right text-green-600 font-semibold whitespace-nowrap">
                          {order.result ? formatCurrency(Number(order.result)) : '-'}
                        </td>
                        <td className="py-2 px-2 text-gray-800">{order.operator?.login || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Мобильные карточки */}
            {!isLoading && ordersData?.orders && ordersData.orders.length > 0 && (
              <div className="md:hidden space-y-4">
                {ordersData.orders.map((order) => (
                  <div 
                    key={order.id}
                    className="bg-white rounded-lg p-4 border border-gray-200 cursor-pointer hover:bg-teal-50 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-semibold">#{order.id}</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                          {order.typeOrder}
                        </span>
                      </div>
                      <span className="text-gray-800 font-semibold">{order.result ? formatCurrency(Number(order.result)) : '-'}</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Клиент:</span>
                        <span className="text-gray-800">{order.clientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Город:</span>
                        <span className="text-gray-800">{order.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Дата встречи:</span>
                        <span className="text-gray-800">{formatDate(order.dateMeeting)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Мастер:</span>
                        <span className="text-gray-800">{order.master?.name || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Направление:</span>
                        <span className="text-gray-800">{order.typeEquipment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Статус:</span>
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                          {order.statusOrder}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Пустой список */}
            {!isLoading && ordersData?.orders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {hasActiveFilters ? 'Заказы не найдены. Попробуйте изменить параметры фильтрации.' : 'Нет заказов.'}
              </div>
            )}

            {/* Пагинация */}
            {!isLoading && ordersData?.pagination && ordersData.orders.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Показано {((ordersData.pagination.page - 1) * ordersData.pagination.limit) + 1} - {Math.min(ordersData.pagination.page * ordersData.pagination.limit, ordersData.pagination.total)} из {ordersData.pagination.total} заказов
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="page-size" className="text-sm text-gray-600">
                      На странице:
                    </Label>
                    <Select
                      value={limit.toString()}
                      onValueChange={(value) => {
                        setLimit(parseInt(value))
                        setPage(1)
                      }}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-20" id="page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {ordersData.pagination.totalPages > 1 && (
                  <OptimizedPagination
                    currentPage={ordersData.pagination.page}
                    totalPages={ordersData.pagination.totalPages}
                    onPageChange={handlePageChange}
                    showFirstLast={true}
                    showPrevNext={true}
                    maxVisiblePages={5}
                    disabled={isLoading}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
