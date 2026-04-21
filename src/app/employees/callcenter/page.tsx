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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Operator {
  id: number
  name: string
  login: string
  status: string
  createdAt: string
  sipAddress?: string
  note?: string
}

export default function CallCenterPage() {
  const router = useRouter()
  const [operators, setOperators] = useState<Operator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  // Фильтры
  const [showFilters, setShowFilters] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Загрузка сотрудников при монтировании компонента
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await apiClient.getOperators({ type: 'operator' })
      if (response.success && response.data) {
        setOperators(response.data)
      } else {
        setLoadError('Ошибка загрузки данных')
      }
    } catch (error) {
      logger.error('Error loading operators', { error: String(error) })
      setLoadError('Ошибка загрузки данных')
    } finally {
      setIsLoading(false)
    }
  }

  // Проверка статуса работы
  const isWorking = (status: string | undefined) => {
    if (!status) return false
    return status === 'active' || status.toLowerCase().includes('работает')
  }

  const isFired = (status: string | undefined) => {
    if (!status) return false
    return status === 'inactive' || status.toLowerCase().includes('уволен')
  }

  // Фильтрация и сортировка данных
  const { filteredAndSortedData, totalPages, paginatedData } = useMemo(() => {
    const safeOperators = Array.isArray(operators) ? operators : []
    
    // Фильтруем по статусу
    let filtered = safeOperators.filter(operator => {
      if (statusFilter === 'active') return isWorking(operator.status)
      if (statusFilter === 'inactive') return isFired(operator.status)
      return true // 'all'
    })
    
    // Фильтруем по имени/логину
    if (searchName.trim()) {
      const searchLower = searchName.toLowerCase().trim()
      filtered = filtered.filter(operator => 
        operator.name?.toLowerCase().includes(searchLower) ||
        operator.login?.toLowerCase().includes(searchLower)
      )
    }
    
    // Сортируем: работающие первыми, затем по дате создания
    const sorted = filtered.sort((a, b) => {
      const aIsWorking = isWorking(a.status)
      const bIsWorking = isWorking(b.status)
      
      if (aIsWorking && !bIsWorking) return -1
      if (!aIsWorking && bIsWorking) return 1
      
      const aDate = new Date(a.createdAt || 0).getTime()
      const bDate = new Date(b.createdAt || 0).getTime()
      return bDate - aDate
    })
    
    // Пагинация
    const pages = Math.ceil(sorted.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginated = sorted.slice(startIndex, startIndex + itemsPerPage)
    
    return { filteredAndSortedData: sorted, totalPages: pages, paginatedData: paginated }
  }, [operators, statusFilter, searchName, currentPage, itemsPerPage])
  
  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchName, statusFilter])

  // Проверка есть ли активные фильтры (кроме дефолтного)
  const hasActiveFilters = searchName.trim() !== '' || statusFilter !== 'active'

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return '#6b7280'
    return isWorking(status) ? '#0d5c4b' : '#6b7280'
  }

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return 'Не указан'
    if (status === 'active') return 'Работает'
    if (status === 'inactive') return 'Уволен'
    return status
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      return
    }

    try {
      const response = await apiClient.deleteOperator(id.toString())
      if (response.success) {
        toast.success('Сотрудник успешно удалён')
        loadEmployees()
      } else {
        toast.error('Не удалось удалить сотрудника')
      }
    } catch (error) {
      logger.error('Error deleting employee', { error: String(error) })
      toast.error('Ошибка при удалении сотрудника')
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
      {/* Панель управления: фильтры + добавление */}
      <div className="mb-6 flex items-center justify-end gap-2">
        <button 
          onClick={() => router.push('/employees/callcenter/add')}
          className={`px-4 py-2 rounded-2xl transition-colors text-sm font-medium ${
            isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'
          }`}
        >
          + Добавить оператора
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
                className={`w-full px-3 py-2 border rounded-2xl text-sm outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-transparent transition-all ${
                  isDark
                    ? 'bg-white/[0.04] border-white/15 text-gray-200 placeholder-gray-500 focus:border-white/30'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-300'
                }`}
              />
            </div>

<<<<<<< Updated upstream
            {/* Статус */}
            <div className="min-w-[180px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#1e2530] border-[#0d5c4b]/30 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <option value="active">Работает</option>
                <option value="inactive">Уволен</option>
                <option value="all">Все</option>
              </select>
            </div>
=======
            <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
>>>>>>> Stashed changes

            <div className="space-y-3">
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Статус</h3>
              <Select
                value={statusFilter}
                onValueChange={(value: 'working' | 'fired' | 'all') => setStatusFilter(value)}
              >
                <SelectTrigger className={`w-full min-h-[44px] rounded-2xl border shadow-sm focus:ring-0 focus-visible:ring-0 data-[state=open]:ring-0 ${
                  isDark
                    ? 'bg-white/[0.04] text-gray-200 border-white/15 data-[state=open]:border-white/25'
                    : 'bg-white text-gray-800 border-gray-200 data-[state=open]:border-gray-300'
                }`}>
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-[#1e1e20] border-white/10' : 'bg-white border-black/[0.08]'}>
                  <SelectItem value="working" className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}>Работает</SelectItem>
                  <SelectItem value="fired" className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}>Уволен</SelectItem>
                  <SelectItem value="all" className={isDark ? 'text-gray-100 focus:bg-white/10 focus:text-white' : 'text-gray-800 focus:bg-gray-100 focus:text-gray-900'}>Все</SelectItem>
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
                setStatusFilter('active')
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
      {isLoading && <LoadingState isDark={isDark} message="Загрузка операторов..." />}

      {!isLoading && loadError && (
        <NetworkError isDark={isDark} onRetry={loadEmployees} message={loadError} />
      )}

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
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>SIP адрес</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Дата создания</th>
              <th className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={7} className={`py-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  {hasActiveFilters 
                    ? 'Нет операторов по заданным фильтрам'
                    : 'Нет работающих операторов'
                  }
                </td>
              </tr>
            ) : (
              paginatedData.map((operator) => (
                <tr 
                  key={operator.id} 
                  className={`border-b transition-colors cursor-pointer ${
                    isDark 
                      ? 'border-white/10 hover:bg-white/[0.04]' 
                      : 'border-gray-100 hover:bg-black/[0.02]'
                  }`}
                  onClick={() => router.push(`/employees/callcenter/edit/${operator.id}`)}
                >
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{operator.id}</td>
                  <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{operator.name}</td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{operator.login || '-'}</td>
                  <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{operator.sipAddress || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getStatusColor(operator.status)}}>
                      {getStatusLabel(operator.status)}
                    </span>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(operator.createdAt)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isDark 
                            ? 'text-gray-300 hover:text-white hover:bg-white/[0.08]' 
                            : 'text-gray-500 hover:text-[#0a4f42] hover:bg-[#0a4f42]/10'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/employees/callcenter/edit/${operator.id}`)
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
                            ? 'text-gray-300 hover:text-red-300 hover:bg-white/[0.08]' 
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                        onClick={(e) => handleDelete(operator.id, e)}
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

