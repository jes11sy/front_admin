'use client'

import { Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  // Состояния
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Фильтры
  const [period, setPeriod] = useState<DatePeriod>('month')
  const [searchQuery, setSearchQuery] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Черновики
  const [draftPeriod, setDraftPeriod] = useState<DatePeriod>('month')
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [draftCityFilter, setDraftCityFilter] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')

  // Функция для получения дат периода
  const getDateRange = (selectedPeriod: DatePeriod, customStart?: string, customEnd?: string) => {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (selectedPeriod) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'custom':
        return { 
          start: customStart ? `${customStart} 00:00:00` : '', 
          end: customEnd ? `${customEnd} 23:59:59` : '' 
        }
      default:
        start = now
    }

    const formatLocalDateTime = (date: Date, isEndOfDay: boolean = false) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      if (isEndOfDay) {
        return `${year}-${month}-${day} 23:59:59`
      }
      return `${year}-${month}-${day} 00:00:00`
    }

    return {
      start: formatLocalDateTime(start, false),
      end: formatLocalDateTime(end, true)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const directorsResponse = await apiClient.getDirectors()
        if (!directorsResponse.success || !directorsResponse.data) {
          toast.error('Не удалось загрузить данных директоров')
          return
        }

        const directors: Director[] = directorsResponse.data
        const dateRange = getDateRange(period, startDate, endDate)

        const citiesReportResponse = await apiClient.getCitiesReport({
          startDate: dateRange.start,
          endDate: dateRange.end
        })

        if (!citiesReportResponse.success || !citiesReportResponse.data) {
          toast.error('Не удалось загрузить отчет по городам')
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
              salary
            })
          })
        })

        setSalaryRecords(records)
      } catch (error) {
        console.error('Error loading salary data:', error)
        toast.error('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [period, startDate, endDate])

  // Уникальные города
  const uniqueCities = [...new Set(salaryRecords.map(r => r.city).filter(Boolean))]

  // Фильтрация
  const filteredRecords = salaryRecords.filter(record => {
    const matchesSearch = !searchQuery || 
      record.directorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.city.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCity = !cityFilter || record.city === cityFilter
    return matchesSearch && matchesCity
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Статистика
  const stats = {
    totalTurnoverOur: filteredRecords.reduce((sum, r) => sum + r.turnoverOur, 0),
    totalTurnoverPartner: filteredRecords.reduce((sum, r) => sum + r.turnoverPartner, 0),
    totalSalary: filteredRecords.reduce((sum, r) => sum + r.salary, 0),
  }

  // Открытие панели фильтров
  const openFiltersPanel = () => {
    setDraftPeriod(period)
    setDraftSearchQuery(searchQuery)
    setDraftCityFilter(cityFilter)
    setDraftStartDate(startDate)
    setDraftEndDate(endDate)
    setShowFilters(true)
  }

  // Применение фильтров
  const applyFilters = () => {
    setPeriod(draftPeriod)
    setSearchQuery(draftSearchQuery)
    setCityFilter(draftCityFilter)
    setStartDate(draftStartDate)
    setEndDate(draftEndDate)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftPeriod('month')
    setDraftSearchQuery('')
    setDraftCityFilter('')
    setDraftStartDate('')
    setDraftEndDate('')
  }

  // Получаем текст периода
  const getPeriodText = () => {
    if (period === 'custom' && startDate && endDate) {
      return `${startDate} — ${endDate}`
    }
    const range = getDateRange(period)
    const startDisplay = range.start.split(' ')[0]
    const endDisplay = range.end.split(' ')[0]
    return `${startDisplay} — ${endDisplay}`
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-4 py-6">
        
        {/* Статистика - минималистичные карточки */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот Наш</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {formatCurrency(stats.totalTurnoverOur)}
            </div>
          </div>
          
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оборот Партнер</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {formatCurrency(stats.totalTurnoverPartner)}
            </div>
          </div>
          
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Зарплата</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              {formatCurrency(stats.totalSalary)}
            </div>
          </div>
        </div>

        {/* Панель действий */}
        <div className="flex items-center gap-2 mb-4">
          <h1 className={`text-lg font-semibold flex-1 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Зарплата директоров
            <span className={`ml-2 text-sm font-normal ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({filteredRecords.length})
            </span>
          </h1>
          
          {/* Период */}
          <span className={`text-xs hidden sm:inline ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {getPeriodText()}
          </span>
          
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
            {(searchQuery || cityFilter || period !== 'month') && (
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${
                isDark ? 'border-[#1e2530]' : 'border-white'
              }`}></span>
            )}
          </button>

          {/* Кнопка экспорта */}
          <button
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
              isDark 
                ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Экспорт</span>
          </button>
        </div>

        {/* Выезжающая панель фильтров */}
        {showFilters && (
          <>
            <div 
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${isDark ? 'bg-black/50' : 'bg-black/30'}`}
              onClick={() => setShowFilters(false)}
            />
            
            <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${
              isDark ? 'bg-[#2a3441]' : 'bg-white'
            }`}>
              {/* Заголовок */}
              <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${
                isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Мобильная кнопка скрыть */}
              <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
                isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Скрыть фильтры
                </button>
              </div>

              {/* Содержимое */}
              <div className="p-4 space-y-4">
                {/* Период */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                  
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { id: 'day', label: 'День' },
                      { id: 'week', label: 'Неделя' },
                      { id: 'month', label: 'Месяц' },
                      { id: 'custom', label: 'Свой' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setDraftPeriod(item.id as DatePeriod)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                          draftPeriod === item.id
                            ? 'bg-teal-600 text-white'
                            : isDark
                              ? 'bg-[#3a4451] text-gray-300 hover:bg-[#4a5461]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  
                  {draftPeriod === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                        <input
                          type="date"
                          value={draftStartDate}
                          onChange={(e) => setDraftStartDate(e.target.value)}
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
                          value={draftEndDate}
                          onChange={(e) => setDraftEndDate(e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                            isDark 
                              ? 'bg-[#3a4451] border-gray-600 text-gray-100'
                              : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                {/* Поиск и фильтры */}
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Фильтры</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Поиск</label>
                    <input
                      type="text"
                      value={draftSearchQuery}
                      onChange={(e) => setDraftSearchQuery(e.target.value)}
                      placeholder="Город или директор..."
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                        isDark 
                          ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                          : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
                    <Select value={draftCityFilter || "all"} onValueChange={(v) => setDraftCityFilter(v === "all" ? "" : v)}>
                      <SelectTrigger className={`w-full ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`}>
                        <SelectValue placeholder="Все города" />
                      </SelectTrigger>
                      <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                        <SelectItem value="all" className={isDark ? 'text-gray-100' : 'text-gray-800'}>Все города</SelectItem>
                        {uniqueCities.map(city => (
                          <SelectItem key={city} value={city} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Кнопки */}
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

        {/* Загрузка */}
        {isLoading && (
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка...</p>
          </div>
        )}

        {/* Пусто */}
        {!isLoading && filteredRecords.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {searchQuery || cityFilter ? 'Записи не найдены' : 'Нет данных'}
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {searchQuery || cityFilter ? 'Попробуйте изменить фильтры' : 'Выберите другой период'}
            </p>
          </div>
        )}

        {/* Десктопная таблица */}
        {!isLoading && filteredRecords.length > 0 && (
          <div className="hidden md:block animate-fade-in">
            <div className={`rounded-lg shadow-lg overflow-hidden ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-50 border-[#0d5c4b]'}`}>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Город</th>
                    <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Директор</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот Наш</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Оборот Партнер</th>
                    <th className={`text-right py-3 px-4 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Зарплата</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      className={`border-b transition-colors ${isDark ? 'border-gray-700 hover:bg-[#3a4451]' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{record.city}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {record.directorName}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatCurrency(record.turnoverOur)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatCurrency(record.turnoverPartner)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                        {formatCurrency(record.salary)}
                      </td>
                    </tr>
                  ))}
                  {/* Итого */}
                  <tr className={`font-bold border-t-2 ${isDark ? 'bg-[#3a4451] border-[#0d5c4b]' : 'bg-gray-100 border-[#0d5c4b]'}`}>
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

        {/* Мобильные карточки */}
        {!isLoading && filteredRecords.length > 0 && (
          <div className="md:hidden space-y-3 animate-fade-in">
            {filteredRecords.map((record) => (
              <div 
                key={record.id}
                className={`rounded-lg overflow-hidden border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}
              >
                {/* Верхняя строка */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{record.city}</span>
                  <span className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    {formatCurrency(record.salary)}
                  </span>
                </div>
                
                {/* Контент */}
                <div className="px-4 py-3">
                  <div className={`mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {record.directorName}
                  </div>
                  
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
            
            {/* Итого карточка */}
            <div className={`rounded-lg overflow-hidden border-2 ${isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>ИТОГО</span>
                  <span className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                    {formatCurrency(stats.totalSalary)}
                  </span>
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
