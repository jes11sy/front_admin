'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { Badge } from '@/components/ui/badge'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { LoadingState } from '@/components/ui/loading-state'

interface Session {
  userId: number
  fullName: string
  role: 'admin' | 'director' | 'operator' | 'master'
  device: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  ip: string
  loginDate: string
  lastActivity: string
}

export default function SessionsPage() {
  const router = useRouter()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  
  // Черновики фильтров
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [draftFilterRole, setDraftFilterRole] = useState<string>('all')

  const ROLES = [
    { value: 'all', label: 'Все роли' },
    { value: 'admin', label: 'Администратор' },
    { value: 'director', label: 'Директор' },
    { value: 'operator', label: 'Кол-центр' },
    { value: 'master', label: 'Мастер' },
  ]

  const loadSessions = async () => {
    logger.info('[Sessions] Loading sessions...')
    setLoading(true)
    try {
      const response = await apiClient.getSessions()
      if (response.success && response.data) {
        logger.info('[Sessions] Sessions loaded', { count: response.data.sessions.length })
        setSessions(response.data.sessions)
      } else {
        logger.error('[Sessions] Response not successful', { response })
        toast.error('Не удалось загрузить сессии')
      }
    } catch (error) {
      logger.error('[Sessions] Error loading sessions', { error: String(error) })
      toast.error('Ошибка загрузки сессий')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      director: 'Директор',
      operator: 'Оператор',
      callcenter: 'Кол-центр',
      master: 'Мастер',
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeauthorize = async (userName: string, userId: number, role: string) => {
    if (!confirm(`Вы уверены, что хотите деавторизовать ${userName}?`)) {
      return
    }

    try {
      const response = await apiClient.deauthorizeUser(userId, role)
      
      if (response.success) {
        setSessions(sessions.filter(s => s.userId !== userId))
        toast.success('Пользователь успешно деавторизован')
      } else {
        toast.error('Ошибка при деавторизации пользователя')
      }
    } catch (error) {
      logger.error('Ошибка деавторизации', { error: String(error) })
      toast.error('Ошибка при деавторизации пользователя')
    }
  }

  const { filteredSessions, totalPages, paginatedSessions } = useMemo(() => {
    const filtered = sessions.filter(session => {
      const matchesSearch = 
        session.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.ip.includes(searchQuery) ||
        session.device.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = filterRole === 'all' || session.role === filterRole

      return matchesSearch && matchesRole
    })
    
    // Пагинация
    const pages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage)
    
    return { filteredSessions: filtered, totalPages: pages, paginatedSessions: paginated }
  }, [sessions, searchQuery, filterRole, currentPage, itemsPerPage])
  
  // Сброс страницы при изменении фильтров
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterRole])

  const activeFiltersCount = (searchQuery ? 1 : 0) + (filterRole !== 'all' ? 1 : 0)

  // Открытие drawer
  const openFilters = () => {
    setDraftSearchQuery(searchQuery)
    setDraftFilterRole(filterRole)
    setShowFilters(true)
  }

  // Применить фильтры
  const applyFilters = () => {
    setSearchQuery(draftSearchQuery)
    setFilterRole(draftFilterRole)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftSearchQuery('')
    setDraftFilterRole('all')
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterRole('all')
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего сессий</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{sessions.length}</div>
          </div>
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Отфильтровано</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{filteredSessions.length}</div>
          </div>
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Активных фильтров</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{activeFiltersCount}</div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openFilters}
              className={`relative flex items-center justify-center min-h-[40px] w-[40px] rounded-2xl transition-all duration-200 bg-transparent ${isDark ? 'text-white/92 hover:bg-white/[0.04] hover:text-white' : 'text-[#3a3a3c] hover:bg-black/[0.035] hover:text-[#111113]'}`}
              title="Фильтры"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFiltersCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full"></span>
              )}
            </button>

            {/* Активные фильтры */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {searchQuery && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    Поиск: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className={`ml-1 ${isDark ? 'hover:text-white' : 'hover:text-black/70'}`}>×</button>
                  </span>
                )}
                {filterRole !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    {ROLES.find(r => r.value === filterRole)?.label}
                    <button onClick={() => setFilterRole('all')} className={`ml-1 ${isDark ? 'hover:text-white' : 'hover:text-black/70'}`}>×</button>
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

        {/* Drawer фильтров */}
        <>
            <div 
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
              onClick={() => setShowFilters(false)}
            />
            
            <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'} ${isDark ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]' : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'}`}>
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
                  className={`w-full py-3 px-4 rounded-2xl text-base font-medium transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'bg-black/[0.04] hover:bg-black/[0.07] text-[#111113]'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Скрыть фильтры
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Поиск</h3>
                  <input
                    type="text"
                    placeholder="ФИО, IP, устройство..."
                    value={draftSearchQuery}
                    onChange={(e) => setDraftSearchQuery(e.target.value)}
                    className={`w-full min-h-[44px] px-4 py-2 border rounded-2xl text-sm outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all ${isDark ? 'bg-white/[0.04] border-white/15 text-gray-200 placeholder-gray-500 focus:border-white/30' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-300'}`}
                  />
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Роль</h3>
                  <div className="flex flex-col gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => setDraftFilterRole(role.value)}
                        className={`min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left border-0 shadow-sm ${
                          draftFilterRole === role.value
                            ? isDark 
                              ? 'bg-white text-[#111113]' 
                              : 'bg-[#0a4f42] text-white'
                            : isDark 
                              ? 'bg-white/[0.04] hover:bg-white/10 text-white' 
                              : 'bg-white hover:bg-black/[0.035] text-[#111113]'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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

        {/* Загрузка */}
        {loading && (
          <LoadingState isDark={isDark} message="Загрузка..." />
        )}

        {/* Таблица */}
        {!loading && paginatedSessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[11px] min-w-[800px] rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
              <thead>
                <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-50 border-gray-200'}`}>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ФИО</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Роль</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Устройство</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>IP</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Авторизация</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Последний вход</th>
                  <th className={`text-center py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSessions.map((session) => (
                  <tr 
                    key={session.userId}
                    onClick={() => router.push(`/admin/sessions/${session.userId}`)}
                    className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-white/[0.04] border-white/10' : 'hover:bg-black/[0.02] border-gray-200'}`}
                  >
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                      {session.fullName}
                    </td>
                    <td className="py-3 px-3">
                      {getRoleBadge(session.role)}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {session.device}
                    </td>
                    <td className={`py-3 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {session.ip}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDate(session.loginDate)}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDate(session.lastActivity)}
                    </td>
                    <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDeauthorize(session.fullName, session.userId, session.role)}
                        className={`p-1.5 rounded-lg transition-all duration-200 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
                        title="Деавторизовать"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Пагинация */}
        {!loading && totalPages > 1 && (
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

        {/* Пусто */}
        {!loading && filteredSessions.length === 0 && (
          <div className={`text-center py-16 rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Активных сессий не найдено
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Попробуйте изменить параметры фильтра
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
