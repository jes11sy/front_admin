'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

interface Transaction {
  id: number
  name: string
  amount: number
  city: string
  note?: string
  createdAt: string
  paymentPurpose?: string
}

interface CityStats {
  totalIncome: number
  totalExpenses: number
  balance: number
}

type DateFilter = 'day' | 'week' | 'month' | 'custom' | 'all'

export default function CityTransactionsPage() {
  const router = useRouter()
  const params = useParams()
  const cityName = decodeURIComponent(params.city as string)
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [cityStats, setCityStats] = useState<CityStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  
  // Черновые фильтры
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  const [draftTypeFilter, setDraftTypeFilter] = useState('all')
  const [draftDateFilter, setDraftDateFilter] = useState<DateFilter>('all')

  const PAGE_SIZES = [
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  const TRANSACTION_TYPES = [
    { value: 'all', label: 'Все типы' },
    { value: 'приход', label: 'Приход' },
    { value: 'расход', label: 'Расход' },
  ]

  const quickPeriods = [
    { label: 'Сегодня', filter: 'day' as DateFilter },
    { label: 'Неделя', filter: 'week' as DateFilter },
    { label: 'Месяц', filter: 'month' as DateFilter },
    { label: 'Всё время', filter: 'all' as DateFilter },
  ]

  // Функция для получения диапазона дат
  const getDateRange = useCallback(() => {
    const now = new Date()
    let start: Date | null = null
    let end: Date = now

    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    switch (dateFilter) {
      case 'day':
        start = new Date(now)
        start.setHours(0, 0, 0, 0)
        end = new Date(now)
        end.setHours(23, 59, 59)
        return { startDate: formatDateTime(start), endDate: formatDateTime(end) }
      case 'week':
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        return { startDate: formatDateTime(start), endDate: formatDateTime(end) }
      case 'month':
        start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        return { startDate: formatDateTime(start), endDate: formatDateTime(end) }
      case 'custom':
        if (startDate && endDate) {
          const customStart = new Date(startDate)
          customStart.setHours(0, 0, 0, 0)
          const customEnd = new Date(endDate)
          customEnd.setHours(23, 59, 59)
          return { startDate: formatDateTime(customStart), endDate: formatDateTime(customEnd) }
        }
        return { startDate, endDate }
      case 'all':
      default:
        return { startDate: '', endDate: '' }
    }
  }, [dateFilter, startDate, endDate])

  // Подсчёт активных фильтров
  const activeFiltersCount = [
    dateFilter !== 'all' ? 1 : 0,
    typeFilter !== 'all' ? 1 : 0
  ].reduce((a, b) => a + b, 0)

  // Открытие drawer
  const openFilterDrawer = () => {
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setDraftTypeFilter(typeFilter)
    setDraftDateFilter(dateFilter)
    setShowFilterDrawer(true)
  }

  // Применить фильтры
  const applyFilters = () => {
    setDateFilter(draftDateFilter)
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setTypeFilter(draftTypeFilter)
    setCurrentPage(1)
    setShowFilterDrawer(false)
  }

  // Сброс фильтров в drawer
  const resetFilters = () => {
    setDraftDateFilter('all')
    setDraftStartDate('')
    setDraftEndDate('')
    setDraftTypeFilter('all')
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setDateFilter('all')
    setStartDate('')
    setEndDate('')
    setTypeFilter('all')
    setCurrentPage(1)
  }

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'day': return 'За сегодня'
      case 'week': return 'За неделю'
      case 'month': return 'За месяц'
      case 'custom': return 'За период'
      case 'all': return 'За всё время'
      default: return 'За период'
    }
  }

  // Загрузка данных
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const dateRange = getDateRange()
        
        const [statsResp, transResp] = await Promise.all([
          apiClient.getCashStats({ 
            city: cityName,
            type: typeFilter !== 'all' ? typeFilter as 'приход' | 'расход' : undefined,
            startDate: dateRange.startDate || undefined,
            endDate: dateRange.endDate || undefined
          }),
          apiClient.getCashByCity(cityName, { 
            page: currentPage, 
            limit: itemsPerPage,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            startDate: dateRange.startDate || undefined,
            endDate: dateRange.endDate || undefined
          })
        ])
        
        if (statsResp.success && statsResp.data) {
          setCityStats({
            totalIncome: statsResp.data.totalIncome,
            totalExpenses: statsResp.data.totalExpense,
            balance: statsResp.data.balance
          })
        }
        
        if (transResp.success && transResp.data) {
          const data = transResp.data.data || transResp.data
          setTransactions(Array.isArray(data) ? data : [])
          
          if (transResp.data.pagination) {
            setTotalTransactions(transResp.data.pagination.total)
            setTotalPages(transResp.data.pagination.totalPages)
          } else {
            setTotalTransactions(Array.isArray(data) ? data.length : 0)
            setTotalPages(1)
          }
        }
      } catch (error) {
        console.error('Error loading city transactions:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке транзакций'
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cityName, currentPage, itemsPerPage, typeFilter, dateFilter, startDate, endDate, getDateRange])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
    }).format(amount) + ' ₽'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'приход': return '#0d5c4b'
      case 'расход': return '#ef4444'
      default: return '#6b7280'
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Кнопка назад */}
        <button 
          onClick={() => router.push('/cashbox')}
          className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Назад к списку
        </button>

        {/* Заголовок */}
        <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
          Транзакции: {cityName}
        </h1>

        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-left">
          <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Приходы</div>
            <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>{formatCurrency(cityStats.totalIncome)}</div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
          </div>
          <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Расходы</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-200' : 'text-red-600'}`}>{formatCurrency(cityStats.totalExpenses)}</div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{getFilterLabel()}</p>
          </div>
          <div className={`rounded-lg p-4 border shadow-sm hover:shadow-md transition-all duration-200 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Баланс</div>
            <div className={`text-xl font-bold ${cityStats.balance >= 0 ? (isDark ? 'text-white' : 'text-[#0d5c4b]') : (isDark ? 'text-gray-200' : 'text-red-600')}`}>
              {formatCurrency(cityStats.balance)}
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Касса</p>
          </div>
        </div>

        {/* Состояние загрузки */}
        {loading && (
          <div className="text-center py-8 animate-fade-in">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
          </div>
        )}

        {/* Фильтры */}
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

            {/* Активные фильтры как теги */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {dateFilter !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {getFilterLabel()}
                    <button onClick={() => { setDateFilter('all'); setStartDate(''); setEndDate(''); setCurrentPage(1); }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                  </span>
                )}
                {typeFilter !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {TRANSACTION_TYPES.find(t => t.value === typeFilter)?.label}
                    <button onClick={() => { setTypeFilter('all'); setCurrentPage(1); }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                {/* Секция: Основные */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип</h3>
                  
                  <div className="flex flex-col gap-2">
                    {TRANSACTION_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setDraftTypeFilter(type.value)}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                          draftTypeFilter === type.value
                            ? isDark 
                              ? 'bg-teal-900/50 border-teal-600 text-teal-400' 
                              : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark 
                              ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' 
                              : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
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
        {!loading && (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 animate-fade-in">
            <table className={`w-full border-collapse text-[11px] min-w-[700px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <thead>
                <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Описание</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Назначение</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                  <th className={`text-right py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Нет транзакций для этого города
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(transaction.name)}}>
                          {transaction.name === 'приход' ? 'Приход' : 'Расход'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        {transaction.note || '-'}
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        {transaction.paymentPurpose || '-'}
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        {transaction.city}
                      </td>
                      <td className={`py-3 px-3 text-right font-semibold ${
                        transaction.name === 'приход' 
                          ? (isDark ? 'text-white' : 'text-[#0d5c4b]')
                          : (isDark ? 'text-gray-200' : 'text-red-600')
                      }`}>
                        {transaction.name === 'приход' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Пагинация */}
        {!loading && transactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t pt-4 animate-fade-in" style={{borderColor: isDark ? '#374151' : '#e5e7eb'}}>
            <div className="flex items-center gap-4">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Показано {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalTransactions)} из {totalTransactions}
              </div>
              <div className="flex items-center gap-2">
                <label className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  На странице:
                </label>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value))
                    setCurrentPage(1)
                  }}
                  className={`px-2 py-1 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-white border-gray-200 text-gray-800'}`}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {totalPages > 1 && (
              <OptimizedPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                showFirstLast={true}
                showPrevNext={true}
                maxVisiblePages={5}
                disabled={loading}
              />
            )}
          </div>
        )}
      </div>

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
  )
}
