'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ApiMasterReport {
  masterId: number
  masterName: string
  cityId?: number
  cityName?: string
  city?: string
  totalOrders: number
  turnover: number
  avgCheck: number
  salary: number
}

interface MasterReport {
  id: number
  name: string
  cityId: number
  cityName: string
  ordersCompleted: number
  revenue: number
  avgCheck: number
  salary: number
}

export default function MastersReportPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Основные фильтры (применённые)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  
  // Черновые фильтры (в drawer)
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [mastersData, setMastersData] = useState<MasterReport[]>([])
  const [allCities, setAllCities] = useState<Array<{ id: number; name: string }>>([])
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
  const activeFiltersCount = [startDate, endDate, cityFilter, searchQuery].filter(Boolean).length

  // Функция для получения дат периода
  const getDateRange = (start?: string, end?: string) => {
    if (start || end) {
      return {
        start: start ? `${start} 00:00:00` : '',
        end: end ? `${end} 23:59:59` : ''
      }
    }
    
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
  const loadData = async (filterStartDate?: string, filterEndDate?: string) => {
    setIsLoading(true)
    try {
      const dateRange = getDateRange(filterStartDate, filterEndDate)
      const response = await apiClient.getMastersReport({
        startDate: dateRange.start,
        endDate: dateRange.end
      })
      if (response.success && response.data) {
        const mappedData: MasterReport[] = response.data.map((item: ApiMasterReport) => ({
          id: item.masterId,
          name: item.masterName,
          cityId: item.cityId ?? 0,
          cityName: item.cityName ?? item.city ?? '',
          ordersCompleted: item.totalOrders,
          revenue: item.turnover,
          avgCheck: item.avgCheck,
          salary: item.salary
        }))
        
        setMastersData(mappedData)
      } else {
        toast.error('Не удалось загрузить отчет по мастерам')
      }
    } catch (error) {
      console.error('Error loading masters report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
      toast.error(errorMessage)
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
    setDraftSearchQuery(searchQuery)
    setShowFilterDrawer(true)
  }

  // Сброс черновых фильтров
  const resetFilters = () => {
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftCityFilter('')
    setDraftSearchQuery('')
  }

  // Применить фильтры
  const applyFilters = () => {
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setCityFilter(draftCityFilter)
    setSearchQuery(draftSearchQuery)
    setShowFilterDrawer(false)
    loadData(draftStartDate, draftEndDate)
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setStartDate('')
    setEndDate('')
    setCityFilter('')
    setSearchQuery('')
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

  // Фильтруем данные
  const filteredMasters = mastersData
    .filter(master => master.ordersCompleted > 0)
    .filter(master => !cityFilter || master.cityId === Number(cityFilter))
    .filter(master => 
      !searchQuery || 
      master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      master.cityName.toLowerCase().includes(searchQuery.toLowerCase())
    )

  // Группируем по городам
  const getDataByCity = () => {
    return filteredMasters.reduce((acc, report) => {
      const key = report.cityName || String(report.cityId)
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(report)
      return acc
    }, {} as Record<string, MasterReport[]>)
  }

  const dataByCity = getDataByCity()
  const selectedCityName = cityFilter ? allCities.find(c => c.id === Number(cityFilter))?.name : undefined
  const displayCities = selectedCityName
    ? [selectedCityName].filter(c => dataByCity[c])
    : Object.keys(dataByCity)

  // Вычисляем общие итоги
  const totals = {
    ordersCompleted: filteredMasters.reduce((sum, m) => sum + m.ordersCompleted, 0),
    revenue: filteredMasters.reduce((sum, m) => sum + m.revenue, 0),
    salary: filteredMasters.reduce((sum, m) => sum + m.salary, 0),
  }
  const avgCheck = totals.ordersCompleted > 0 ? Math.round(totals.revenue / totals.ordersCompleted) : 0

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
                        <button onClick={() => { setStartDate(''); loadData('', endDate) }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {endDate && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        До: {new Date(endDate).toLocaleDateString('ru-RU')}
                        <button onClick={() => { setEndDate(''); loadData(startDate, '') }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {cityFilter && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        {allCities.find(c => c.id === Number(cityFilter))?.name || cityFilter}
                        <button onClick={() => setCityFilter('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                      </span>
                    )}
                    {searchQuery && (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                        Поиск: {searchQuery}
                        <button onClick={() => setSearchQuery('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
                  {/* Секция: Поиск */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                    <input
                      type="text"
                      value={draftSearchQuery}
                      onChange={(e) => setDraftSearchQuery(e.target.value)}
                      placeholder="Имя мастера или город..."
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                    />
                  </div>

                  <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

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
                          <SelectItem key={city.id} value={city.id.toString()} className={isDark ? 'text-gray-100 focus:bg-[#3a4451] focus:text-teal-400' : 'text-gray-800 focus:bg-teal-50 focus:text-teal-700'}>{city.name}</SelectItem>
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
            <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`px-4 py-2 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <h3 className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Итого по мастерам</h3>
              </div>
              <div className={`grid grid-cols-2 sm:grid-cols-4 divide-x ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Мастеров</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{filteredMasters.length}</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Заказов</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{totals.ordersCompleted}</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatNumber(totals.revenue)} ₽</div>
                </div>
                <div className="p-4 text-center">
                  <div className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Зарплата</div>
                  <div className={`text-lg font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{formatNumber(totals.salary)} ₽</div>
                </div>
              </div>
            </div>
          </div>

          {/* Таблицы по городам */}
          {displayCities.length === 0 ? (
            <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {searchQuery || cityFilter ? 'Мастера не найдены. Попробуйте изменить параметры поиска.' : 'Нет данных для отображения'}
            </div>
          ) : (
            displayCities.map((city) => {
              const cityData = dataByCity[city] || []
              const sortedCityData = [...cityData].sort((a, b) => b.revenue - a.revenue)
              
              return (
                <div key={city} className="mb-8">
                  <h3 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {city}
                    <span className={`text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({sortedCityData.length} {sortedCityData.length === 1 ? 'мастер' : sortedCityData.length < 5 ? 'мастера' : 'мастеров'})
                    </span>
                  </h3>
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <div className="min-w-[600px]">
                      <table className={`w-full border-collapse text-sm rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                        <thead>
                          <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#14b8a6'}}>
                            <th className={`text-center py-3 px-3 font-semibold w-16 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Место</th>
                            <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Мастер</th>
                            <th className={`text-center py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Всего заказов</th>
                            <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот</th>
                            <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Средний чек</th>
                            <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCityData.map((report, index) => {
                            const rank = index + 1
                            
                            return (
                              <tr 
                                key={`${report.id}-${report.cityId}`} 
                                className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'hover:bg-teal-50'}`}
                              >
                                <td className={`py-3 px-3 text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {rank}
                                </td>
                                <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                  {report.name}
                                </td>
                                <td className={`py-3 px-4 text-center ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{report.ordersCompleted}</td>
                                <td className={`py-3 px-4 text-right font-semibold ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                                  {formatCurrency(report.revenue)}
                                </td>
                                <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {formatCurrency(Math.round(report.avgCheck))}
                                </td>
                                <td className={`py-3 px-4 text-right font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                  {formatCurrency(report.salary)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </>
      )}
      </div>
    </div>
  )
}
