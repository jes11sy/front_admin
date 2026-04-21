'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'
import { DateRangePicker } from '@/components/ui/date-range-picker'

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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)
  
  // Черновые фильтры для drawer
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>('all')

  // Быстрые периоды
  const quickPeriods = [
    { label: 'День', filter: 'day' as DateFilter },
    { label: 'Неделя', filter: 'week' as DateFilter },
    { label: 'Месяц', filter: 'month' as DateFilter },
    { label: 'Свой', filter: 'custom' as DateFilter },
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
      setLoadError(null)
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
        } else {
          setLoadError('Ошибка загрузки данных')
        }
      } catch (error) {
        logger.error('Error loading cash data', { error: String(error) })
        setLoadError(error instanceof Error ? error.message : 'Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [dateFilter, startDate, endDate, getDateRange, reloadTick])

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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
      {/* Статистика */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-left">
        <div className={`rounded-[20px] p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Приходы</div>
          <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatCurrency(stats.totalIncome)}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
        </div>
        <div className={`rounded-[20px] p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Расходы</div>
          <div className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-red-600'}`}>{formatCurrency(stats.totalExpenses)}</div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
        </div>
        <div className={`rounded-[20px] p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
          <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Баланс</div>
          <div className={`text-xl font-bold ${stats.balance >= 0 ? (isDark ? 'text-white' : 'text-[#0d5c4b]') : (isDark ? 'text-gray-200' : 'text-red-600')}`}>
            {formatCurrency(stats.balance)}
          </div>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Чистая прибыль</p>
        </div>
      </div>

      {/* Заголовок и фильтры */}
      <div className="mb-4 animate-slide-in-left">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Иконка фильтров */}
          <button
            onClick={openFilterDrawer}
            className={`relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ${
              isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' : 'text-[#3a3a3c] hover:bg-black/[0.035] hover:text-[#111113]'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFiltersCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
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
              className={`w-full pl-10 pr-4 py-2 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0a4f42]/20 focus:border-transparent transition-all ${isDark ? 'bg-white/[0.04] border-white/15 text-gray-200 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
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
      <>
          {/* Overlay */}
          <div 
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilterDrawer ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
            onClick={() => setShowFilterDrawer(false)}
          />
          
          {/* Drawer */}
          <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${showFilterDrawer ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'} ${isDark ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]' : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'}`}>
            {/* Header */}
            <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Мобильный хедер */}
            <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Скрыть фильтры
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8">
              {/* Секция: Период */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>
                
                <div className="flex gap-2 flex-wrap">
                  {quickPeriods.map((period) => (
                    <button
                      key={period.filter}
                      onClick={() => {
                        if (draftDateFilter === period.filter) {
                          setDraftDateFilter('all')
                          setDraftStartDate('')
                          setDraftEndDate('')
                          return
                        }
                        setDraftDateFilter(period.filter)
                        if (period.filter !== 'custom') {
                          setDraftStartDate('')
                          setDraftEndDate('')
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                        draftDateFilter === period.filter
                          ? isDark 
                            ? 'bg-white text-[#111113]'
                            : 'bg-[#0a4f42] text-white'
                          : isDark 
                            ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                            : 'bg-[#e7eaef] border border-[#d1d5db] text-[#111113] hover:bg-[#dde2e8]'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>

                {draftDateFilter === 'custom' && (
                  <div className="mt-3">
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
                )}
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

      {/* Состояния загрузки/ошибки ниже фильтров */}
      {isLoading && <LoadingState isDark={isDark} message="Загрузка..." />}
      {!isLoading && loadError && <NetworkError isDark={isDark} onRetry={() => setReloadTick((prev) => prev + 1)} message={loadError} />}

      {/* Таблица */}
      {!isLoading && !loadError && (
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
          <table className={`w-full border-collapse text-[11px] min-w-[600px] rounded-[20px] shadow-lg ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
            <thead>
              <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-50 border-gray-200'}`}>
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

      </div>
    </div>
  )
}
