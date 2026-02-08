'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

interface Operator {
  id: number
  name: string
  login: string
  statusWork: string
  dateCreate: string
  sipAddress?: string
  note?: string
}

export default function CallCenterPage() {
  const router = useRouter()
  const [operators, setOperators] = useState<Operator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  // Фильтры
  const [showFilters, setShowFilters] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'working' | 'fired' | 'all'>('working')
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Загрузка сотрудников при монтировании компонента
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getOperators({ type: 'operator' })
      if (response.success && response.data) {
        setOperators(response.data)
      } else {
        toast.error('Не удалось загрузить список операторов')
      }
    } catch (error) {
      logger.error('Error loading operators', { error: String(error) })
      toast.error('Ошибка при загрузке операторов')
    } finally {
      setIsLoading(false)
    }
  }

  // Проверка статуса работы
  const isWorking = (status: string | undefined) => {
    if (!status) return false
    const statusLower = status.toLowerCase()
    return statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active'
  }

  const isFired = (status: string | undefined) => {
    if (!status) return false
    const statusLower = status.toLowerCase()
    return statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive'
  }

  // Фильтрация и сортировка данных
  const { filteredAndSortedData, totalPages, paginatedData } = useMemo(() => {
    const safeOperators = Array.isArray(operators) ? operators : []
    
    // Фильтруем по статусу
    let filtered = safeOperators.filter(operator => {
      if (statusFilter === 'working') return isWorking(operator.statusWork)
      if (statusFilter === 'fired') return isFired(operator.statusWork)
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
      const aIsWorking = isWorking(a.statusWork)
      const bIsWorking = isWorking(b.statusWork)
      
      if (aIsWorking && !bIsWorking) return -1
      if (!aIsWorking && bIsWorking) return 1
      
      const aDate = new Date(a.dateCreate || 0).getTime()
      const bDate = new Date(b.dateCreate || 0).getTime()
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
  const hasActiveFilters = searchName.trim() !== '' || statusFilter !== 'working'

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Не указана'
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  const getStatusColor = (status: string | undefined) => {
    if (!status) return '#6b7280'
    const statusLower = status.toLowerCase()
    if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
      return '#0d5c4b'
    }
    if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
      return '#6b7280'
    }
    return '#6b7280'
  }

  const getStatusLabel = (status: string | undefined) => {
    if (!status) return 'Не указан'
    const statusLower = status.toLowerCase()
    if (statusLower.includes('работает') || statusLower.includes('работающий') || statusLower === 'active') {
      return 'Работает'
    }
    if (statusLower.includes('уволен') || statusLower.includes('уволенный') || statusLower === 'fired' || statusLower === 'inactive') {
      return 'Уволен'
    }
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

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className={`inline-block animate-spin rounded-full h-8 w-8 border-b-2 ${
          isDark ? 'border-[#0d5c4b]' : 'border-[#0d5c4b]'
        }`}></div>
        <div className={`text-lg mt-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка операторов...</div>
      </div>
    )
  }
  
  return (
    <div>
      {/* Панель управления: фильтры + добавление */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Иконка фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-lg transition-all duration-200 ${
              showFilters 
                ? isDark 
                  ? 'bg-[#0d5c4b]/20 text-[#0d5c4b]'
                  : 'bg-[#daece2] text-[#0d5c4b]'
                : isDark
                  ? 'bg-[#2a3441] text-gray-400 hover:bg-[#2a3441]/80 hover:text-[#0d5c4b]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#0d5c4b]'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {/* Индикатор активных фильтров */}
            {hasActiveFilters && (
              <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#0d5c4b] rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`}></span>
            )}
          </button>
        </div>

        <button 
          onClick={() => router.push('/employees/callcenter/add')}
          className="px-4 py-2 bg-[#0d5c4b] hover:bg-[#0a4a3c] text-white rounded-lg transition-colors text-sm font-medium"
        >
          + Добавить оператора
        </button>
      </div>

      {/* Панель фильтров */}
      {showFilters && (
        <div className={`mb-6 p-4 rounded-lg border animate-fade-in ${
          isDark 
            ? 'bg-[#2a3441] border-[#0d5c4b]/30' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Поиск по имени */}
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Поиск по имени или логину</label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Введите имя или логин..."
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#1e2530] border-[#0d5c4b]/30 text-gray-200 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Статус */}
            <div className="min-w-[180px]">
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'working' | 'fired' | 'all')}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0d5c4b] focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#1e2530] border-[#0d5c4b]/30 text-gray-200'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                <option value="working">Работает</option>
                <option value="fired">Уволен</option>
                <option value="all">Все</option>
              </select>
            </div>

            {/* Кнопка сброса */}
            <button
              onClick={() => {
                setSearchName('')
                setStatusFilter('working')
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors font-medium ${
                isDark 
                  ? 'bg-[#1e2530] hover:bg-[#1e2530]/80 text-gray-300'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Сбросить
            </button>
          </div>
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className={`border-b-2 ${
              isDark ? 'border-[#0d5c4b]/30 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'
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
                      ? 'border-[#0d5c4b]/20 hover:bg-[#2a3441]' 
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                  onClick={() => router.push(`/employees/callcenter/edit/${operator.id}`)}
                >
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{operator.id}</td>
                  <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{operator.name}</td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{operator.login || '-'}</td>
                  <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{operator.sipAddress || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium text-white" style={{backgroundColor: getStatusColor(operator.statusWork)}}>
                      {getStatusLabel(operator.statusWork)}
                    </span>
                  </td>
                  <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate(operator.dateCreate)}</td>
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
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' 
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
      
      {/* Пагинация */}
      {totalPages > 1 && (
        <div className={`flex items-center justify-center mt-6 pt-4 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <OptimizedPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            isDark={isDark}
          />
        </div>
      )}
    </div>
  )
}
