'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'
import { DateRangePicker } from '@/components/ui/date-range-picker'

interface ApiCityReport {
  cityId: number
  cityName: string
  orders: {
    closedOrders: number
    refusals: number
    notOrders: number
    totalClean: number
    totalMasterChange: number
    avgCheck: number
  }
  cash: {
    totalAmount: number
  }
}

interface CityReport {
  cityId: number
  cityName: string
  completedOrders: number
  revenue: number
  companyIncome: number
  balance: number
  avgCheck: number
}

export default function CitiesReportPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Основные фильтры (применённые)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  
  // Черновые фильтры (в drawer)
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [citiesData, setCitiesData] = useState<CityReport[]>([])
  const [allCities, setAllCities] = useState<Array<{ id: number; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Быстрые периоды для фильтра
  const quickPeriods = [
    { label: 'Сегодня', getValue: () => {
      const today = new Date().toISOString().split('T')[0]
      return { start: today, end: today }
    }},
    { label: 'Вчера', getValue: () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
      return { start: yesterday, end: yesterday }
    }},
    { label: 'Неделя', getValue: () => {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
      return { start, end }
    }},
    { label: 'Месяц', getValue: () => {
      const end = new Date().toISOString().split('T')[0]
      const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      return { start, end }
    }},
  ]

  // Подсчёт активных фильтров
  const activeFiltersCount = [startDate, endDate, cityFilter].filter(Boolean).length

  // Функция для получения дат периода
  const getDateRange = (start?: string, end?: string) => {
    if (start || end) {
      return {
        start: start ? `${start} 00:00:00` : '',
        end: end ? `${end} 23:59:59` : ''
      }
    }
    
    // По умолчанию - текущий месяц
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    return {
      start: `${formatDate(firstDay)} 00:00:00`,
      end: `${formatDate(lastDay)} 23:59:59`
    }
  }

  // Загрузка данных
  const loadData = async (filterStartDate?: string, filterEndDate?: string, filterCityId?: string) => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const dateRange = getDateRange(filterStartDate, filterEndDate)
      const response = await apiClient.getCitiesReport({
        startDate: dateRange.start,
        endDate: dateRange.end,
        cityId: filterCityId ? Number(filterCityId) : undefined
      })
      if (response.success && response.data) {
        const mappedData: CityReport[] = response.data.map((item: ApiCityReport) => ({
          cityId: item.cityId,
          cityName: item.cityName,
          completedOrders: item.orders.closedOrders,
          revenue: item.orders.totalClean,
          companyIncome: item.orders.totalMasterChange,
          balance: item.cash.totalAmount,
          avgCheck: item.orders.avgCheck
        }))
        
        setCitiesData(mappedData)
      } else {
        setLoadError('Ошибка загрузки данных')
      }
    } catch (error) {
      console.error('Error loading cities report:', error)
      setLoadError(error instanceof Error ? error.message : 'Ошибка при загрузке данных')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getCities().then((cities: Array<{ id: number; name: string }>) => {
      setAllCities(cities)
    }).catch(() => {})
    loadData()
  }, [])

  // Открытие drawer
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftCityFilter(cityFilter)
    setShowFilterDrawer(true)
  }

  // Сброс черновых фильтров
  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftCityFilter('')
  }

  // Применить фильтры
  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setCityFilter(draftCityFilter)
    setShowFilterDrawer(false)
    loadData(draftStartDate, draftEndDate, draftCityFilter || undefined)
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setCityFilter('')
    loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  // Вычисляем общие итоги
  const totals = {
    completedOrders: citiesData.reduce((sum, c) => sum + c.completedOrders, 0),
    revenue: citiesData.reduce((sum, c) => sum + c.revenue, 0),
    companyIncome: citiesData.reduce((sum, c) => sum + c.companyIncome, 0),
    balance: citiesData.reduce((sum, c) => sum + c.balance, 0),
  }
  const avgCheck = totals.completedOrders > 0 ? Math.round(totals.revenue / totals.completedOrders) : 0

  // Сортируем по обороту
  const sortedData = [...citiesData].sort((a, b) => b.revenue - a.revenue)

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
      {/* Состояние загрузки */}
      {isLoading && <LoadingState isDark={isDark} message="Загрузка отчета..." />}
      {!isLoading && loadError && <NetworkError isDark={isDark} onRetry={() => loadData(startDate, endDate, cityFilter)} message={loadError} />}

      {/* Основной контент */}
      {!isLoading && !loadError && (
        <>
          {/* Панель управления */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Иконка фильтров */}
                <button
                  onClick={openFilterDrawer}
                  className={`relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ${isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' : 'text-[#3a3a3c] hover:bg-black/[0.035] hover:text-[#111113]'}`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeFiltersCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
                  )}
                </button>

                {/* Активные фильтры как теги */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {startDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        От: {new Date(startDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setStartDate(''); loadData('', endDate, cityFilter) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadData(startDate, '', cityFilter) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {cityFilter && (
<<<<<<< Updated upstream
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {allCities.find(c => c.id === Number(cityFilter))?.name || cityFilter}
                        <button onClick={() => { setCityFilter(''); loadData(startDate, endDate) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
=======
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {cityFilter}
                        <button onClick={() => { setCityFilter(''); loadData(startDate, endDate, '') }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
>>>>>>> Stashed changes
                      </span>
                    )}
                    <button
                      onClick={clearAllFilters}
                      className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
                    >
                      Сбросить
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Drawer для фильтров */}
          <>
              {/* Overlay */}
              <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
                onClick={() => setShowFilterDrawer(false)}
              />
              
              {/* Drawer */}
              <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${showFilterDrawer ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'} ${isDark ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]' : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'}`}>
                {/* Header */}
                <div className={`sticky top-0 border-b px-4 py-4 flex items-center justify-start z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                  {/* Секция: Период */}
                  <div className="space-y-4">
                    <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {quickPeriods.map((period) => (
                        <button
                          key={period.label}
                          onClick={() => {
                            const { start, end } = period.getValue()
                            setDraftStartDate(start)
                            setDraftEndDate(end)
                          }}
                          className={`min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 border-0 shadow-sm ${isDark ? 'bg-white/[0.04] hover:bg-white/10 text-white' : 'bg-white hover:bg-black/[0.035] text-[#111113]'}`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>

                    <DateRangePicker
                      startDate={draftStartDate}
                      endDate={draftEndDate}
                      onChange={(start, end) => {
                        setDraftStartDate(start)
                        setDraftEndDate(end)
                      }}
                      isDark={isDark}
                    />
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                  {/* Секция: Город */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                    
                    <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className={`w-full min-h-[44px] px-4 rounded-2xl text-[15px] shadow-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${isDark ? 'bg-white/[0.04] border-white/15 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className={`rounded-2xl border-0 shadow-xl ${isDark ? 'bg-[#1e1e20]' : 'bg-white'}`}>
                        <SelectItem value="all" className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>Все города</SelectItem>
                        {allCities.map(city => (
<<<<<<< Updated upstream
                          <SelectItem key={city.id} value={city.id.toString()} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city.name}</SelectItem>
=======
                          <SelectItem key={city} value={city} className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>{city}</SelectItem>
>>>>>>> Stashed changes
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Footer */}
                <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'}`}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={applyFilters}
                    className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${isDark ? 'bg-white hover:bg-gray-200 text-[#111113]' : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'}`}
                  >
                    Применить
                  </button>
                </div>
              </div>
          </>

          {/* Сводные блоки */}
          <div className="space-y-4 mb-8">
            {/* Блок: ДЕНЬГИ */}
            <div className={`rounded-[20px] border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Деньги</h3>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-4 divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatNumber(totals.revenue)} ₽</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Доход компании</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatNumber(totals.companyIncome)} ₽</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Средний чек</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatNumber(avgCheck)} ₽</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Касса</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>{formatNumber(totals.balance)} ₽</div>
                </div>
              </div>
            </div>

            {/* Блок: ЗАКАЗЫ */}
            <div className={`rounded-[20px] border overflow-hidden ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Заказы</h3>
              </div>
              <div className={`grid grid-cols-2 divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Закрытых заказов</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{totals.completedOrders}</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Городов</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{sortedData.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Таблица по городам */}
          <h2 className={`text-lg font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Детализация по городам
            <span className={`text-sm font-normal ml-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({sortedData.length} {sortedData.length === 1 ? 'город' : sortedData.length < 5 ? 'города' : 'городов'})
            </span>
          </h2>

          {sortedData.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Нет данных для отображения
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <div className="min-w-[600px]">
                <table className={`w-full border-collapse text-sm rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-50 border-gray-200'}`}>
                      <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                      <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Закрытых заказов</th>
                      <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Средний чек</th>
                      <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                      <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Доход компании</th>
                      <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Касса</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((city) => (
                      <tr 
<<<<<<< Updated upstream
                        key={city.cityId} 
                        className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}
=======
                        key={city.city} 
                        className={`border-b transition-colors ${isDark ? 'border-white/10 hover:bg-white/[0.04]' : 'hover:bg-black/[0.02]'}`}
>>>>>>> Stashed changes
                      >
                        <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{city.cityName}</td>
                        <td className={`py-3 px-4 text-center ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{city.completedOrders}</td>
                        <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {formatCurrency(city.avgCheck)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>
                          {formatCurrency(city.revenue)}
                        </td>
                        <td className={`py-3 px-4 text-right font-semibold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>
                          {formatCurrency(city.companyIncome)}
                        </td>
                        <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                          {formatCurrency(city.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  )
}
