'use client'

import { useState, useEffect } from 'react'
import { useDesignStore } from '@/store/design.store'
import { Badge } from '@/components/ui/badge'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import apiClient from '@/lib/api'

interface AuditLog {
  id: number
  timestamp: string
  eventType: string
  userId: number | null
  role: string | null
  login: string | null
  fullName: string
  ip: string
  userAgent: string
  success: boolean
  metadata: any
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'auth.login.success': 'Вход',
  'auth.login.failed': 'Ошибка входа',
  'auth.logout': 'Выход',
  'auth.token.refresh': 'Обновление токена',
  'auth.profile.access': 'Доступ к профилю',
  'order.create': 'Создание заказа',
  'order.update': 'Изменение заказа',
  'order.close': 'Закрытие заказа',
  'order.status.change': 'Смена статуса заказа',
  'cash.income.create': 'Создание прихода',
  'cash.expense.create': 'Создание расхода',
  'cash.update': 'Изменение транзакции',
  'cash.delete': 'Удаление транзакции',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  director: 'Директор',
  master: 'Мастер',
  operator: 'Оператор',
}

export default function UserLogsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Фильтры
  const [filterFullName, setFilterFullName] = useState('')
  const [filterLogin, setFilterLogin] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterEventType, setFilterEventType] = useState('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Черновики
  const [draftFullName, setDraftFullName] = useState('')
  const [draftLogin, setDraftLogin] = useState('')
  const [draftRole, setDraftRole] = useState('all')
  const [draftEventType, setDraftEventType] = useState('all')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  
  // Пагинация
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 50

  const ROLES = [
    { value: 'all', label: 'Все' },
    { value: 'admin', label: 'Администратор' },
    { value: 'director', label: 'Директор' },
    { value: 'master', label: 'Мастер' },
    { value: 'operator', label: 'Оператор' },
  ]

  const EVENT_TYPES = [
    { value: 'all', label: 'Все' },
    { value: 'auth.login.success', label: 'Вход' },
    { value: 'auth.logout', label: 'Выход' },
    { value: 'order.create', label: 'Создание заказа' },
    { value: 'order.update', label: 'Изменение заказа' },
    { value: 'order.close', label: 'Закрытие заказа' },
    { value: 'cash.income.create', label: 'Создание прихода' },
    { value: 'cash.expense.create', label: 'Создание расхода' },
  ]

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: any = { page: page.toString(), limit: limit.toString() }
      
      if (filterRole && filterRole !== 'all') params.role = filterRole
      if (filterEventType && filterEventType !== 'all') params.eventType = filterEventType
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString()
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString()
      
      const response = await apiClient.getUserLogs(params)
      
      if (response.success && response.data) {
        let filteredLogs = response.data.logs
        
        if (filterFullName) {
          filteredLogs = filteredLogs.filter((log: AuditLog) =>
            log.fullName.toLowerCase().includes(filterFullName.toLowerCase())
          )
        }
        if (filterLogin) {
          filteredLogs = filteredLogs.filter((log: AuditLog) =>
            log.login?.toLowerCase().includes(filterLogin.toLowerCase())
          )
        }
        
        filteredLogs = filteredLogs.filter((log: AuditLog) => 
          log.eventType !== 'auth.profile.access' && 
          log.eventType !== 'auth.token.refresh'
        )
        
        setLogs(filteredLogs)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('[UserLogs] Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, filterRole, filterEventType, filterStartDate, filterEndDate])

  const activeFiltersCount = [
    filterFullName,
    filterLogin,
    filterRole !== 'all' ? filterRole : '',
    filterEventType !== 'all' ? filterEventType : '',
    filterStartDate,
    filterEndDate
  ].filter(Boolean).length

  // Открытие drawer
  const openFilters = () => {
    setDraftFullName(filterFullName)
    setDraftLogin(filterLogin)
    setDraftRole(filterRole)
    setDraftEventType(filterEventType)
    setDraftStartDate(filterStartDate)
    setDraftEndDate(filterEndDate)
    setShowFilters(true)
  }

  // Применить фильтры
  const applyFilters = () => {
    setFilterFullName(draftFullName)
    setFilterLogin(draftLogin)
    setFilterRole(draftRole)
    setFilterEventType(draftEventType)
    setFilterStartDate(draftStartDate)
    setFilterEndDate(draftEndDate)
    setPage(1)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftFullName('')
    setDraftLogin('')
    setDraftRole('all')
    setDraftEventType('all')
    setDraftStartDate('')
    setDraftEndDate('')
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setFilterFullName('')
    setFilterLogin('')
    setFilterRole('all')
    setFilterEventType('all')
    setFilterStartDate('')
    setFilterEndDate('')
    setPage(1)
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatMetadata = (metadata: any, eventType: string) => {
    if (!metadata) return '-'
    
    if (eventType === 'order.create') {
      return `Заказ #${metadata.orderId || '?'} создан (${metadata.clientName || 'без имени'})`
    }
    
    if (eventType === 'order.status.change') {
      return `Заказ #${metadata.orderId || '?'}: ${metadata.oldStatus} → ${metadata.newStatus}`
    }
    
    if (eventType === 'order.close') {
      const result = metadata.result ? `${metadata.result}₽` : '0₽'
      return `Заказ #${metadata.orderId || '?'} закрыт. Результат: ${result}`
    }
    
    if (eventType === 'order.update') {
      return `Заказ #${metadata.orderId || '?'} изменен`
    }
    
    if (eventType === 'cash.income.create') {
      return `Приход #${metadata.cashId || '?'}: ${metadata.amount}₽ (${metadata.city})`
    }
    
    if (eventType === 'cash.expense.create') {
      return `Расход #${metadata.cashId || '?'}: ${metadata.amount}₽ (${metadata.city})`
    }
    
    if (eventType === 'auth.login.success') {
      return 'Успешный вход в систему'
    }
    
    if (eventType === 'auth.logout') {
      return 'Выход из системы'
    }
    
    return JSON.stringify(metadata).substring(0, 100)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего записей</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{total}</div>
          </div>
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>На странице</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{logs.length}</div>
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

            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {filterFullName && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    ФИО: {filterFullName}
                    <button onClick={() => { setFilterFullName(''); loadLogs(); }} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                  </span>
                )}
                {filterRole !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {ROLES.find(r => r.value === filterRole)?.label}
                    <button onClick={() => setFilterRole('all')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                  </span>
                )}
                {filterEventType !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {EVENT_TYPES.find(e => e.value === filterEventType)?.label}
                    <button onClick={() => setFilterEventType('all')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
                  Скрыть фильтры
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <input
                    type="text"
                    placeholder="ФИО..."
                    value={draftFullName}
                    onChange={(e) => setDraftFullName(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                  />
                  <input
                    type="text"
                    placeholder="Логин..."
                    value={draftLogin}
                    onChange={(e) => setDraftLogin(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                  />
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Должность</h3>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((role) => (
                      <button
                        key={role.value}
                        onClick={() => setDraftRole(role.value)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                          draftRole === role.value
                            ? isDark ? 'bg-teal-900/50 border-teal-600 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark ? 'bg-[#3a4451] border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        {role.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип действия</h3>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((event) => (
                      <button
                        key={event.value}
                        onClick={() => setDraftEventType(event.value)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                          draftEventType === event.value
                            ? isDark ? 'bg-teal-900/50 border-teal-600 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark ? 'bg-[#3a4451] border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        {event.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                      <input
                        type="date"
                        value={draftStartDate}
                        onChange={(e) => setDraftStartDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                      <input
                        type="date"
                        value={draftEndDate}
                        onChange={(e) => setDraftEndDate(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      />
                    </div>
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
        {!loading && logs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-[11px] min-w-[900px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата/Время</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ФИО</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Логин</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Должность</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>IP</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действие</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}
                      onClick={() => {
                        setSelectedLog(log)
                        setShowModal(true)
                      }}
                    >
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(log.timestamp)}</td>
                      <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{log.fullName}</td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{log.login || '-'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {ROLE_LABELS[log.role || ''] || log.role}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{log.ip}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                        </span>
                      </td>
                      <td className={`py-3 px-3 max-w-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatMetadata(log.metadata, log.eventType)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className={`flex items-center justify-center mt-6 pt-4 border-t ${
                isDark ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <OptimizedPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  isDark={isDark}
                />
              </div>
            )}
          </>
        )}

        {/* Пусто */}
        {!loading && logs.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Записей не найдено
            </p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Попробуйте изменить параметры фильтра
            </p>
          </div>
        )}
      </div>

      {/* Модальное окно */}
      {showModal && selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className={`rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`sticky top-0 p-6 rounded-t-2xl flex justify-between items-center ${isDark ? 'bg-[#3a4451]' : 'bg-teal-600'}`}>
              <h2 className="text-xl font-bold text-white">Детали события</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата и время</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID события</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>#{selectedLog.id}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Пользователь</div>
                  <div className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{selectedLog.fullName}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Логин</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>{selectedLog.login || '-'}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Должность</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>{ROLE_LABELS[selectedLog.role || ''] || selectedLog.role}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IP адрес</div>
                  <div className={`font-mono ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{selectedLog.ip}</div>
                </div>
              </div>
              
              <div>
                <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип действия</div>
                <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>{EVENT_TYPE_LABELS[selectedLog.eventType] || selectedLog.eventType}</div>
              </div>
              
              <div>
                <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>User-Agent</div>
                <div className={`text-xs p-3 rounded-lg font-mono break-all ${isDark ? 'bg-[#3a4451] text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                  {selectedLog.userAgent}
                </div>
              </div>
              
              <div>
                <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Метаданные</div>
                <div className={`p-4 rounded-lg ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`}>
                  <pre className={`text-xs font-mono whitespace-pre-wrap break-all ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className={`sticky bottom-0 p-4 rounded-b-2xl flex justify-end ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`}>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
