'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { LoadingState } from '@/components/ui/loading-state'
import { NetworkError } from '@/components/ui/network-error'
import { getFormFieldClass } from '@/components/ui/form-styles'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Director {
  id: number
  cityIds: number[]
  name: string
  login: string
  createdAt: string
  note?: string
  contract?: string
  passport?: string
}

export default function DirectorsPage() {
  const router = useRouter()
  const [directors, setDirectors] = useState<Director[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  // Фильтры
  const [showFilters, setShowFilters] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Загрузка директоров при монтировании компонента
  useEffect(() => {
    loadDirectors()
  }, [])

  const loadDirectors = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await apiClient.getDirectors()
      if (response.success && response.data) {
        setDirectors(response.data)
      } else {
        setLoadError('Ошибка загрузки данных')
      }
    } catch (error) {
      logger.error('Error loading directors', { error: String(error) })
      setLoadError('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  const [availableCities, setAvailableCities] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    apiClient.getCities().then(cities => setAvailableCities(cities)).catch(console.error)
  }, [])

  const uniqueCities = availableCities

  // Фильтрация и сортировка данных
  const { filteredAndSortedData, totalPages, paginatedData } = useMemo(() => {
    const safeDirectors = Array.isArray(directors) ? directors : []
    
    let filtered = safeDirectors
    
    // Фильтруем по имени/логину
    if (searchName.trim()) {
      const searchLower = searchName.toLowerCase().trim()
      filtered = filtered.filter(director => 
        director.name?.toLowerCase().includes(searchLower) ||
        director.login?.toLowerCase().includes(searchLower)
      )
    }
    
    // Фильтруем по городу
    if (cityFilter) {
      const cityIdNum = Number(cityFilter)
      filtered = filtered.filter(director => 
        director.cityIds?.includes(cityIdNum)
      )
    }
    
    // Сортируем по дате создания (новые первыми)
    const sorted = filtered.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })
    
    // Пагинация
    const pages = Math.ceil(sorted.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage)
    
    return { filteredAndSortedData: sorted, totalPages: pages, paginatedData: paginated }
  }, [directors, searchName, cityFilter, currentPage, itemsPerPage])
  
  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, cityFilter])

  // Проверка есть ли активные фильтры
  const hasActiveFilters = searchName.trim() !== '' || cityFilter !== ''

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Вы уверены, что хотите удалить этого директора?')) {
      return
    }
    toast.error('Удаление директоров пока не реализовано')
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
      {/* Панель управления: фильтры + добавление */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <button 
          onClick={() => router.push('/employees/directors/add')}
          className={`px-4 py-2 rounded-2xl transition-colors text-sm font-medium ${
            isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
          }`}
        >
          + Добавить директора
        </button>

        {/* Иконка фильтров */}
        <button
          onClick={() => setShowFilters(true)}
          className={`relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ${
            showFilters 
              ? isDark 
                ? 'bg-white/[0.08] text-white'
                : 'bg-[#0a4f42] text-white'
              : isDark
                ? 'text-white/92 hover:bg-white/[0.04] hover:text-white'
                : 'text-[#3a3a3c] hover:bg-black/[0.035] hover:text-[#111113]'
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

      {/* Панель фильтров справа */}
      <>
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 ${
            showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          } ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
          onClick={() => setShowFilters(false)}
        />

        <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
          showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
        } ${
          isDark
            ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
            : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
        }`}>
          <div className={`hidden md:flex sticky top-0 border-b px-4 py-4 items-center justify-start z-10 ${
            isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            <button
              onClick={() => setShowFilters(false)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
              title="Закрыть"
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${
            isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            <button
              onClick={() => setShowFilters(false)}
              className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${
                isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'
              }`}
            >
              Скрыть фильтры
            </button>
          </div>

          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Введите имя или логин..."
                className={`${getFormFieldClass(isDark, 'md')} rounded-2xl text-sm`}
              />
            </div>

            {/* Город */}
            <div className="min-w-[180px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Город</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className={`${getFormFieldClass(isDark, 'md')} rounded-lg text-sm`}
              >
                <option value="">Все города</option>
                {uniqueCities.map(city => (
                  <option key={city.id} value={String(city.id)}>{city.name}</option>
                ))}
              </select>
            </div>


            <div className="space-y-3">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
              <Select value={cityFilter || 'all'} onValueChange={(value) => setCityFilter(value === 'all' ? '' : value)}>
                <SelectTrigger className={`w-full min-h-[44px] rounded-2xl border shadow-sm focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 ${
                  isDark
                    ? 'bg-white/[0.04] text-gray-200 border-white/15 data-[state=open]:border-white/25'
                    : 'bg-white text-gray-800 border-gray-200 data-[state=open]:border-gray-300'
                }`}>
                  <SelectValue placeholder="Все города" />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-[#1e1e20] border-white/10' : 'bg-white border-black/[0.08]'}>
                  <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}>Все города</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem
                      key={city.id}
                      value={String(city.id)}
                      className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}
                    >
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
            isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
          }`}>
            <button
              onClick={() => {
                setSearchName('')
                setCityFilter('')
              }}
              className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${
                isDark
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white'
                  : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'
              }`}
            >
              Сбросить
            </button>
            <button
              onClick={() => setShowFilters(false)}
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

      {/* Таблица */}
      {isLoading && <LoadingState isDark={isDark} message="Загрузка директоров..." />}
      {!isLoading && loadError && <NetworkError isDark={isDark} onRetry={loadDirectors} message={loadError} />}

      {!isLoading && !loadError && (
      <div className="overflow-x-auto animate-fade-in">
        <table className={`w-full border-collapse text-sm rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
          <thead>
            <tr className={`border-b-2 ${
              isDark ? 'border-white/20 bg-white/[0.04]' : 'border-gray-200 bg-gray-50'
            }`}>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>ID</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Имя</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Логин</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Города</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата создания</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {hasActiveFilters 
                    ? 'Нет директоров по заданным фильтрам'
                    : 'Нет директоров'
                  }
                </td>
              </tr>
            ) : (
              paginatedData.map((director) => (
                <tr 
                  key={director.id} 
                  className={`border-b transition-colors cursor-pointer ${
                    isDark 
                      ? 'border-white/10 hover:bg-white/[0.04]' 
                      : 'border-gray-100 hover:bg-black/[0.02]'
                  }`}
                  onClick={() => router.push(`/employees/directors/edit/${director.id}`)}
                >
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{director.id}</td>
                  <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{director.name}</td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{director.login || '-'}</td>
                  <td className="py-3 px-4">
                    {director.cityIds && director.cityIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {director.cityIds.map((cityId) => {
                          const city = availableCities.find(c => c.id === cityId)
                          return (
                            <span 
                              key={cityId} 
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isDark 
                                  ? 'bg-gray-600 text-gray-100' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {city?.name || cityId}
                            </span>
                          )
                        })}
                      </div>
                    ) : (
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(director.createdAt)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isDark 
                            ? 'text-gray-400 hover:text-teal-400 hover:bg-teal-900/30' 
                            : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/employees/directors/edit/${director.id}`)
                        }}
                        title="Редактировать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isDark 
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' 
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                        onClick={(e) => handleDelete(director.id, e)}
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
      
      {/* Пагинация */}
      {!isLoading && !loadError && totalPages > 1 && (
        <div className="mt-6 animate-fade-in">
          <OptimizedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      </div>
    </div>
  )
}
