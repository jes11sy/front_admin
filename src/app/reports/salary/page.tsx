'use client'

import { Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'
import { DateRangePicker } from '@/components/ui/date-range-picker'

interface Director {
  id: number
  name: string
  cities: string[]
}

interface SalaryRecord {
  id: string
  city: string
  directorName: string
  turnoverOur: number
  turnoverPartner: number
  salary: number
}

type DatePeriod = 'day' | 'week' | 'month' | 'custom'

export default function SalaryPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [period, setPeriod] = useState<DatePeriod>('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [draftPeriod, setDraftPeriod] = useState<DatePeriod>('month')
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')

  const getDateRange = (selectedPeriod: DatePeriod, customStart?: string, customEnd?: string) => {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (selectedPeriod) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week': {
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59)
        break
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'custom':
        return {
          start: customStart ? `${customStart} 00:00:00` : '',
          end: customEnd ? `${customEnd} 23:59:59` : '',
        }
      default:
        start = now
    }

    const formatLocalDateTime = (date: Date, isEndOfDay = false) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      if (isEndOfDay) return `${year}-${month}-${day} 23:59:59`
      return `${year}-${month}-${day} 00:00:00`
    }

    return {
      start: formatLocalDateTime(start, false),
      end: formatLocalDateTime(end, true),
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const directorsResponse = await apiClient.getDirectors()
        if (!directorsResponse.success || !directorsResponse.data) {
          setLoadError('Ошибка загрузки данных')
          return
        }

        const directors: Director[] = directorsResponse.data
        const dateRange = getDateRange(period, startDate, endDate)

        const citiesReportResponse = await apiClient.getCitiesReport({
          startDate: dateRange.start,
          endDate: dateRange.end,
        })

        if (!citiesReportResponse.success || !citiesReportResponse.data) {
          setLoadError('Ошибка загрузки данных')
          return
        }

        const cityTurnoverOur = new Map<string, number>()
        const cityTurnoverPartner = new Map<string, number>()

        citiesReportResponse.data.forEach((cityData: any) => {
          cityTurnoverOur.set(cityData.city, cityData.orders.totalCleanOur || 0)
          cityTurnoverPartner.set(cityData.city, cityData.orders.totalCleanPartner || 0)
        })

        const records: SalaryRecord[] = []
        directors.forEach((director) => {
          director.cities.forEach((city) => {
            const turnoverOur = cityTurnoverOur.get(city) || 0
            const turnoverPartner = cityTurnoverPartner.get(city) || 0
            const salary = turnoverOur * 0.07

            records.push({
              id: `${director.id}-${city}`,
              city,
              directorName: director.name,
              turnoverOur,
              turnoverPartner,
              salary,
            })
          })
        })

        setSalaryRecords(records)
      } catch {
        setLoadError('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [period, startDate, endDate])

  const uniqueCities = [...new Set(salaryRecords.map((r) => r.city).filter(Boolean))]

  const filteredRecords = salaryRecords.filter((record) => {
    const matchesSearch =
      !searchQuery ||
      record.directorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.city.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCity = !cityFilter || record.city === cityFilter
    return matchesSearch && matchesCity
  })

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)

  const stats = {
    totalTurnoverOur: filteredRecords.reduce((sum, r) => sum + r.turnoverOur, 0),
    totalTurnoverPartner: filteredRecords.reduce((sum, r) => sum + r.turnoverPartner, 0),
    totalSalary: filteredRecords.reduce((sum, r) => sum + r.salary, 0),
  }

  const openFiltersPanel = () => {
    setDraftPeriod(period)
    setDraftSearchQuery(searchQuery)
    setDraftCityFilter(cityFilter)
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setPeriod(draftPeriod)
    setSearchQuery(draftSearchQuery)
    setCityFilter(draftCityFilter)
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setDraftPeriod('month')
    setDraftSearchQuery('')
    setDraftCityFilter('')
    setDraftStartDate('')
    setDraftEndDate('')
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот Наш</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverOur)}</div>
          </div>
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот Партнер</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverPartner)}</div>
          </div>
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Зарплата</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalSalary)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1" />
          <button
            onClick={openFiltersPanel}
            className={`relative flex items-center justify-center min-h-[40px] w-[40px] flex-shrink-0 rounded-2xl transition-all duration-200 bg-transparent ${
              isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {(searchQuery || cityFilter || period !== 'month') && <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full" />}
          </button>
          <button
            className={`flex items-center gap-2 min-h-[40px] px-3 rounded-2xl transition-all duration-200 text-sm font-medium ${
              isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
            }`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Экспорт</span>
          </button>
        </div>

        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${
              showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            } ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
            onClick={() => setShowFilters(false)}
          />

          <div
            className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
              showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
            } ${
              isDark
                ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
            }`}
          >
            <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <button
                onClick={() => setShowFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>

            <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <button
                onClick={() => setShowFilters(false)}
                className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                  isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Скрыть фильтры
              </button>
            </div>

            <div className="p-6 space-y-8">
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>
                <div className="flex gap-2 flex-wrap">
                  {[{ id: 'day', label: 'День' }, { id: 'week', label: 'Неделя' }, { id: 'month', label: 'Месяц' }, { id: 'custom', label: 'Свой' }].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setDraftPeriod(item.id as DatePeriod)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                        draftPeriod === item.id
                          ? (isDark ? 'bg-white text-[#111113]' : 'bg-[#0a4f42] text-white')
                          : isDark
                            ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]'
                            : 'bg-[#e7eaef] border border-[#d1d5db] text-[#111113] hover:bg-[#dde2e8]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {draftPeriod === 'custom' && (
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

              <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Поиск</label>
                  <input
                    type="text"
                    value={draftSearchQuery}
                    onChange={(e) => setDraftSearchQuery(e.target.value)}
                    placeholder="Город или директор..."
                    className={`w-full px-3 py-2 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                      isDark ? 'bg-white/[0.04] border-white/15 text-gray-100 placeholder-gray-500 focus:ring-white/20' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-gray-300'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                  <Select value={draftCityFilter || 'all'} onValueChange={(v) => setDraftCityFilter(v === 'all' ? '' : v)}>
                    <SelectTrigger className={`w-full min-h-[44px] px-4 rounded-2xl text-[15px] shadow-sm focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${isDark ? 'bg-white/[0.04] border-white/15 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                      <SelectValue placeholder="Все города" />
                    </SelectTrigger>
                    <SelectContent className={`rounded-2xl border-0 shadow-xl ${isDark ? 'bg-[#1e1e20]' : 'bg-white'}`}>
                      <SelectItem value="all" className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>
                        Все города
                      </SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city} className={`rounded-xl mx-1 my-0.5 cursor-pointer ${isDark ? 'text-white focus:bg-white/10 focus:text-white' : 'text-[#111113] focus:bg-black/5 focus:text-[#111113]'}`}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
              <button
                onClick={resetFilters}
                className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                  isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
                }`}
              >
                Сбросить
              </button>
              <button
                onClick={applyFilters}
                className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${
                  isDark ? 'bg-white hover:bg-gray-200 text-[#111113]' : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'
                }`}
              >
                Применить
              </button>
            </div>
          </div>
        </>

        {isLoading && <LoadingState isDark={isDark} message="Загрузка..." />}
        {!isLoading && loadError && <NetworkError isDark={isDark} onRetry={() => window.location.reload()} message={loadError} />}

        {!isLoading && !loadError && filteredRecords.length === 0 && (
          <div className={`text-center py-16 rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{searchQuery || cityFilter ? 'Записи не найдены' : 'Нет данных'}</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{searchQuery || cityFilter ? 'Попробуйте изменить фильтры' : 'Выберите другой период'}</p>
          </div>
        )}

        {!isLoading && !loadError && filteredRecords.length > 0 && (
          <div className="hidden md:block animate-fade-in">
            <div className={`rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-50 border-gray-200'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Директор</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот Наш</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот Партнер</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className={`border-b transition-colors ${isDark ? 'border-white/10 hover:bg-white/[0.04]' : 'border-gray-200 hover:bg-black/[0.02]'}`}>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{record.city}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{record.directorName}</td>
                      <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.turnoverOur)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.turnoverPartner)}</td>
                      <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.salary)}</td>
                    </tr>
                  ))}
                  <tr className={`font-bold border-t-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-100 border-gray-200'}`}>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`} colSpan={2}>ИТОГО</td>
                    <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverOur)}</td>
                    <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverPartner)}</td>
                    <td className={`py-3 px-4 text-right ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalSalary)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && !loadError && filteredRecords.length > 0 && (
          <div className="md:hidden space-y-3 animate-fade-in">
            {filteredRecords.map((record) => (
              <div key={record.id} className={`rounded-[20px] overflow-hidden border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-gray-200'}`}>
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{record.city}</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.salary)}</span>
                </div>
                <div className="px-4 py-3">
                  <div className={`mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{record.directorName}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Оборот Наш</span>
                      <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.turnoverOur)}</p>
                    </div>
                    <div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Оборот Партнер</span>
                      <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(record.turnoverPartner)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className={`rounded-[20px] overflow-hidden border-2 ${isDark ? 'bg-white/[0.03] border-white/20' : 'bg-gray-50 border-gray-300'}`}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</span>
                  <span className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalSalary)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Оборот Наш</span>
                    <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverOur)}</p>
                  </div>
                  <div>
                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Оборот Партнер</span>
                    <p className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatCurrency(stats.totalTurnoverPartner)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
