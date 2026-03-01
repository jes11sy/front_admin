'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'

interface CityBalance {
  cityId: number
  cityName: string
  income: number
  expenses: number
  balance: number
}

interface Stats {
  totalIncome: number
  totalExpenses: number
  balance: number
}

type DateFilter = 'day' | 'week' | 'month' | 'custom' | 'all'

export default function CashboxPage() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [searchQuery, setSearchQuery] = useState('')
  const [cityBalances, setCityBalances] = useState<CityBalance[]>([])
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  
  // Черновые фильтры для drawer
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>('all')

  // Быстрые периоды
  const quickPeriods = [
    { label: 'Сегодня', filter: 'day' as DateFilter },
    { label: 'Неделя', filter: 'week' as DateFilter },
    { label: 'Месяц', filter: 'month' as DateFilter },
    { label: 'Всё время', filter: 'all' as DateFilter },
  ]

  // Функция для получения диапазона дат в зависимости от фильтра
  const getDateRange = useCallback(() => {
    const now = new Date()
    let start: Date | null = null
    let end: Date = now

    switch (dateFilter) {
      case 'day':
        start = new Date(now)
        start.setHours(0, 0, 0, 0)
        end = new Date(now)
        end.setHours(23, 59, 59)
        break
      case 'week':
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        break
      case 'month':
        start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        break
      case 'custom':
        if (startDate) {
          start = new Date(startDate)
          start.setHours(0, 0, 0, 0)
        }
        if (endDate) {
          end = new Date(endDate)
          end.setHours(23, 59, 59)
        }
        break
      case 'all':
      default:
        return { startDate: undefined, endDate: undefined }
    }

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    return {
      startDate: start ? formatDateTime(start) : undefined,
      endDate: formatDateTime(end)
    }
  }, [dateFilter, startDate, endDate])

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const dateRange = getDateRange()
        
        const response = await apiClient.getCashStatsByCity({ 
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
        
        if (response.success && response.data) {
          setCityBalances(response.data.cities)
          setStats({
            totalIncome: response.data.totals.totalIncome,
            totalExpenses: response.data.totals.totalExpense,
            balance: response.data.totals.balance
          })
        }
      } catch (error) {
        logger.error('Error loading cash data', { error: String(error) })
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dateFilter, startDate, endDate, getDateRange])

  const filteredCities = cityBalances.filter(city =>
    city.cityName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Подсчёт активных фильтров
  const activeFiltersCount = dateFilter !== 'all' ? 1 : 0

  // Открытие drawer
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftDateFilter(dateFilter)
    setShowFilterDrawer(true)
  }

  // Применить фильтры
  const applyFilters = () => {
    setDateFilter(draftDateFilter)
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setShowFilterDrawer(false)
  }

  // Сброс фильтров в drawer
  const resetFilters = () => {
    setDraftDateFilter('all')
    setDraftStartDate('')
    setDraftEndDate('')
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setDateFilter('all')
    setStartDate('')
    setEndDate('')
  }

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'day': return 'За сегодня'
      case 'week': return 'За неделю'
      case 'month': return 'За месяц'
      case 'custom': return 'За период'
      case 'all': return 'За всё время'
      default: return 'За всё время'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
    }).format(amount) + ' ₽'
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
      {/* Статистика */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-left">
        <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Приходы</div>
          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatCurrency(stats.totalIncome)}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
        </div>
        <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Расходы</div>
          <div className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-red-600'}`}>{formatCurrency(stats.totalExpenses)}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
        </div>
        <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Баланс</div>
          <div className={`text-xl font-bold ${stats.balance >= 0 ? (isDark ? 'text-white' : 'text-[#0d5c4b]') : (isDark ? 'text-gray-200' : 'text-red-600')}`}>
            {formatCurrency(stats.balance)}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Чистая прибыль</p>
        </div>
      </div>

      {/* Состояние загрузки */}
      {isLoading && (
        <div className="text-center py-8 animate-fade-in">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
        </div>
      )}

      {/* Заголовок и фильтры */}
      <div className="mb-4 animate-slide-in-left">
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
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#2a3441]' : 'border-white'}`}></span>
            )}
          </button>

          {/* Поиск */}
          <div className="relative flex-1 max-w-xs">
            <svg className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по городу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
            />
          </div>

          {/* Активные фильтры как теги */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                {getFilterLabel()}
                <button onClick={clearAllFilters} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Drawer для фильтров */}
      {showFilterDrawer && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
            onClick={() => setShowFilterDrawer(false)}
          />
          
          {/* Drawer */}
          <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
            {/* Header */}
            <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
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

            {/* Мобильный хедер */}
            <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Скрыть фильтры
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
                      key={period.filter}
                      onClick={() => {
                        setDraftDateFilter(period.filter)
                        if (period.filter !== 'custom') {
                          setDraftStartDate('')
                          setDraftEndDate('')
                        }
                      }}
                      className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 ${
                        draftDateFilter === period.filter
                          ? isDark 
                            ? 'bg-teal-900/50 border-teal-600 text-teal-400' 
                            : 'bg-teal-50 border-teal-300 text-teal-700'
                          : isDark 
                            ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' 
                            : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'
                      }`}
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
                      onChange={(e) => {
                        setDraftStartDate(e.target.value)
                        setDraftDateFilter('custom')
                      }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                    <input
                      type="date"
                      value={draftEndDate}
                      onChange={(e) => {
                        setDraftEndDate(e.target.value)
                        setDraftDateFilter('custom')
                      }}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    />
                  </div>
                </div>
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

      {/* Таблица */}
      {!isLoading && (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
          <table className={`w-full border-collapse text-[11px] min-w-[600px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
            <thead>
              <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Приходы</th>
                <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Расходы</th>
                <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Касса</th>
              </tr>
            </thead>
            <tbody>
              {filteredCities.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {cityBalances.length === 0 ? 'Нет данных по городам' : 'Города не найдены'}
                  </td>
                </tr>
              ) : (
                filteredCities.map((city) => (
                  <tr 
                    key={city.cityId}
                    className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}
                    onClick={() => router.push(`/cashbox/${city.cityId}`)}
                  >
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{city.cityName}</td>
                    <td className={`py-3 px-3 text-right font-semibold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>
                      {formatCurrency(city.income)}
                    </td>
                    <td className={`py-3 px-3 text-right font-semibold ${isDark ? 'text-gray-200' : 'text-red-600'}`}>
                      {formatCurrency(city.expenses)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${city.balance >= 0 ? (isDark ? 'text-teal-400' : 'text-teal-700') : (isDark ? 'text-red-400' : 'text-red-600')}`}>
                      {formatCurrency(city.balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* CSS анимации */}
      <style jsx global>{`
        @keyframes slideInLeft {
          from {
            transform: translateX(-20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
      </div>
    </div>
  )
}
