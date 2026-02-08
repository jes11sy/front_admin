'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { useDesignStore } from '@/store/design.store'
import { Badge } from '@/components/ui/badge'

interface Session {
  userId: number
  fullName: string
  role: 'admin' | 'director' | 'callcenter' | 'master'
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
  
  // Черновики фильтров
  const [draftSearchQuery, setDraftSearchQuery] = useState('')
  const [draftFilterRole, setDraftFilterRole] = useState<string>('all')

  const ROLES = [
    { value: 'all', label: 'Все роли' },
    { value: 'admin', label: 'Администратор' },
    { value: 'director', label: 'Директор' },
    { value: 'callcenter', label: 'Кол-центр' },
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

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.ip.includes(searchQuery) ||
      session.device.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = filterRole === 'all' || session.role === filterRole

    return matchesSearch && matchesRole
  })

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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего сессий</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{sessions.length}</div>
          </div>
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Отфильтровано</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{filteredSessions.length}</div>
          </div>
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Активных фильтров</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{activeFiltersCount}</div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={openFilters}
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

            {/* Активные фильтры */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {searchQuery && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    Поиск: {searchQuery}
                    <button onClick={() => setSearchQuery('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                  </span>
                )}
                {filterRole !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {ROLES.find(r => r.value === filterRole)?.label}
                    <button onClick={() => setFilterRole('all')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
        {showFilters && (
          <>
            <div 
              className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
              onClick={() => setShowFilters(false)}
            />
            
            <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 transform transition-transform duration-300 ease-out overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`md:hidden sticky top-0 border-b px-4 py-3 z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                <button
                  onClick={() => setShowFilters(false)}
                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Скрыть фильтры
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <input
                    type="text"
                    placeholder="ФИО, IP, устройство..."
                    value={draftSearchQuery}
                    onChange={(e) => setDraftSearchQuery(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                  />
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Роль</h3>
                  <div className="flex flex-col gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => setDraftFilterRole(role.value)}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                          draftFilterRole === role.value
                            ? isDark 
                              ? 'bg-teal-900/50 border-teal-600 text-teal-400' 
                              : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark 
                              ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' 
                              : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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

        {/* Загрузка */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
          </div>
        )}

        {/* Таблица */}
        {!loading && filteredSessions.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[11px] min-w-[800px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <thead>
                <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
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
                {filteredSessions.map((session) => (
                  <tr 
                    key={session.userId}
                    onClick={() => router.push(`/admin/sessions/${session.userId}`)}
                    className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}
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

        {/* Пусто */}
        {!loading && filteredSessions.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
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
