'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ApiCityReport {
  city: string
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
  city: string
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
  const [allCities, setAllCities] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
  const loadData = async (filterStartDate?: string, filterEndDate?: string, filterCity?: string) => {
    setIsLoading(true)
    try {
      const dateRange = getDateRange(filterStartDate, filterEndDate)
      const response = await apiClient.getCitiesReport({
        startDate: dateRange.start,
        endDate: dateRange.end
      })
      if (response.success && response.data) {
        let mappedData: CityReport[] = response.data.map((item: ApiCityReport) => ({
          city: item.city,
          completedOrders: item.orders.closedOrders,
          revenue: item.orders.totalClean,
          companyIncome: item.orders.totalMasterChange,
          balance: item.cash.totalAmount,
          avgCheck: item.orders.avgCheck
        }))
        
        // Получаем уникальные города для фильтра
        const cities = [...new Set(mappedData.map(d => d.city))]
        setAllCities(cities)
        
        // Применяем фильтр по городу
        if (filterCity) {
          mappedData = mappedData.filter(d => d.city === filterCity)
        }
        
        setCitiesData(mappedData)
      } else {
        toast.error('Не удалось загрузить отчет по городам')
      }
    } catch (error) {
      console.error('Error loading cities report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
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
    loadData(draftStartDate, draftEndDate, draftCityFilter)
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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
      {/* Состояние загрузки */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-xl mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка отчета...</div>
        </div>
      )}

      {/* Основной контент */}
      {!isLoading && (
        <>
          {/* Панель управления */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Иконка фильтров */}
                <button
                  onClick={openFilterDrawer}
                  className={`relative p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300 hover:text-teal-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'}`}
                  title="Фильтры"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeFiltersCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`}></span>
                  )}
                </button>

                {/* Активные фильтры как теги */}
                {activeFiltersCount > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {startDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        От: {new Date(startDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setStartDate(''); loadData('', endDate, cityFilter) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadData(startDate, '', cityFilter) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {cityFilter}
                        <button onClick={() => { setCityFilter(''); loadData(startDate, endDate, '') }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
          {showFilterDrawer && (
            <>
              {/* Overlay */}
              <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${isDark ? 'bg-black/50' : 'bg-black/30'}`}
                onClick={() => setShowFilterDrawer(false)}
              />
              
              {/* Drawer */}
              <div className={`fixed top-0 right-0 h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                {/* Header */}
                <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                  <button
                    onClick={() => setShowFilterDrawer(false)}
                    className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* Секция: Период */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {quickPeriods.map((period) => (
                        <button
                          key={period.label}
                          onClick={() => {
                            const { start, end } = period.getValue()
                            setDraftStartDate(start)
                            setDraftEndDate(end)
                          }}
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'}`}
                        >
                          {period.label}
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                        <input
                          type="date"
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                  {/* Секция: Город */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                    
                    <Select value={draftCityFilter || "all"} onValueChange={(value) => setDraftCityFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                        <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>Все города</SelectItem>
                        {allCities.map(city => (
                          <SelectItem key={city} value={city} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Footer */}
                <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <button
                    onClick={resetFilters}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                  >
                    Сбросить
                  </button>
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Применить
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Сводные блоки */}
          <div className="space-y-4 mb-8">
            {/* Блок: ДЕНЬГИ */}
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
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
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
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
                <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                  <thead>
                    <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
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
                        key={city.city} 
                        className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}
                      >
                        <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{city.city}</td>
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
