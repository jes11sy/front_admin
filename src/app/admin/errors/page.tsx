'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDesignStore } from '@/store/design.store'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'

interface ErrorLog {
  id: number
  timestamp: string
  service: string
  errorType: string
  errorMessage: string
  stackTrace: string | null
  userId: number | null
  userRole: string | null
  requestUrl: string | null
  requestMethod: string | null
  ip: string | null
  userAgent: string | null
  metadata: any
}

const SERVICE_LABELS: Record<string, string> = {
  'auth-service': 'Auth Service',
  'orders-service': 'Orders Service',
  'cash-service': 'Cash Service',
  'users-service': 'Users Service',
  'notifications-service': 'Notifications Service',
  'reports-service': 'Reports Service',
  'calls-service': 'Calls Service',
  'masters-service': 'Masters Service',
  'backup-service': 'Backup Service',
}

const SERVICES = [
  { value: 'all', label: 'Все сервисы' },
  { value: 'auth-service', label: 'Auth Service' },
  { value: 'orders-service', label: 'Orders Service' },
  { value: 'cash-service', label: 'Cash Service' },
  { value: 'notifications-service', label: 'Notifications Service' },
  { value: 'reports-service', label: 'Reports Service' },
  { value: 'calls-service', label: 'Calls Service' },
  { value: 'masters-service', label: 'Masters Service' },
  { value: 'users-service', label: 'Users Service' },
  { value: 'backup-service', label: 'Backup Service' },
]

export default function ErrorLogsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Фильтры
  const [filterService, setFilterService] = useState('all')
  const [filterErrorType, setFilterErrorType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Черновики
  const [draftService, setDraftService] = useState('all')
  const [draftErrorType, setDraftErrorType] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftEndDate, setDraftEndDate] = useState('')
  
  // Пагинация
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 50

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: page.toString(), limit: limit.toString() }
      
      if (filterService && filterService !== 'all') params.service = filterService
      if (filterErrorType) params.errorType = filterErrorType
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString()
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString()
      
      const response = await apiClient.getErrorLogs(params)
      
      if (response.success && response.data) {
        setLogs(response.data.logs)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      logger.error('[ErrorLogs] Error loading logs', { error: String(error) })
      toast.error('Ошибка загрузки логов')
    } finally {
      setLoading(false)
    }
  }, [page, filterService, filterErrorType, filterStartDate, filterEndDate])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const activeFiltersCount = [
    filterService !== 'all' ? filterService : '',
    filterErrorType,
    filterStartDate,
    filterEndDate
  ].filter(Boolean).length

  // Открытие drawer
  const openFilters = () => {
    setDraftService(filterService)
    setDraftErrorType(filterErrorType)
    setDraftStartDate(filterStartDate)
    setDraftEndDate(filterEndDate)
    setShowFilters(true)
  }

  // Применить фильтры
  const applyFilters = () => {
    setFilterService(draftService)
    setFilterErrorType(draftErrorType)
    setFilterStartDate(draftStartDate)
    setFilterEndDate(draftEndDate)
    setPage(1)
    setShowFilters(false)
  }

  // Сброс фильтров
  const resetFilters = () => {
    setDraftService('all')
    setDraftErrorType('')
    setDraftStartDate('')
    setDraftEndDate('')
  }

  // Сброс основных фильтров
  const clearAllFilters = () => {
    setFilterService('all')
    setFilterErrorType('')
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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего ошибок</div>
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
                {filterService !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {SERVICE_LABELS[filterService] || filterService}
                    <button onClick={() => setFilterService('all')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
                  </span>
                )}
                {filterErrorType && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {filterErrorType}
                    <button onClick={() => setFilterErrorType('')} className={`ml-1 ${isDark ? 'hover:text-teal-100' : 'hover:text-teal-900'}`}>×</button>
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
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сервис</h3>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((service) => (
                      <button
                        key={service.value}
                        onClick={() => setDraftService(service.value)}
                        className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-all ${
                          draftService === service.value
                            ? isDark ? 'bg-teal-900/50 border-teal-600 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark ? 'bg-[#3a4451] border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип ошибки</h3>
                  <input
                    type="text"
                    placeholder="Например: ValidationError"
                    value={draftErrorType}
                    onChange={(e) => setDraftErrorType(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-200 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`}
                  />
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
              <table className={`w-full border-collapse text-[11px] min-w-[700px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#ef4444'}}>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата/Время</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сервис</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Тип ошибки</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Сообщение</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-red-900/20 border-gray-700' : 'hover:bg-red-50 border-gray-200'}`}
                      onClick={() => {
                        setSelectedLog(log)
                        setShowModal(true)
                      }}
                    >
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(log.timestamp)}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                          {SERVICE_LABELS[log.service] || log.service}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-mono ${isDark ? 'text-red-400' : 'text-red-600'}`}>{log.errorType}</td>
                      <td className={`py-3 px-3 max-w-md truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {log.errorMessage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Пагинация */}
            <div className="mt-6 flex items-center justify-between">
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Показано {logs.length} из {total} записей
              </div>
              {totalPages > 1 && (
                <OptimizedPagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </div>
          </>
        )}

        {/* Пусто */}
        {!loading && logs.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Ошибок не найдено
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
            className={`rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`sticky top-0 p-6 rounded-t-2xl flex justify-between items-center ${isDark ? 'bg-red-900/50' : 'bg-red-600'}`}>
              <h2 className="text-xl font-bold text-white">Детали ошибки</h2>
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
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID ошибки</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>#{selectedLog.id}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сервис</div>
                  <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>{SERVICE_LABELS[selectedLog.service] || selectedLog.service}</div>
                </div>
                <div>
                  <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Тип ошибки</div>
                  <div className={`font-mono ${isDark ? 'text-red-400' : 'text-red-600'}`}>{selectedLog.errorType}</div>
                </div>
                {selectedLog.requestUrl && (
                  <div className="col-span-2">
                    <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>URL запроса</div>
                    <div className={`font-mono text-sm p-2 rounded ${isDark ? 'bg-[#3a4451] text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                      {selectedLog.requestMethod} {selectedLog.requestUrl}
                    </div>
                  </div>
                )}
                {selectedLog.ip && (
                  <div>
                    <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IP адрес</div>
                    <div className={`font-mono ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{selectedLog.ip}</div>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <div className={`text-sm font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>User ID</div>
                    <div className={isDark ? 'text-gray-100' : 'text-gray-800'}>#{selectedLog.userId} ({selectedLog.userRole})</div>
                  </div>
                )}
              </div>
              
              <div>
                <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Сообщение ошибки</div>
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-red-900/20 text-red-300 border-red-800' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {selectedLog.errorMessage}
                </div>
              </div>
              
              {selectedLog.stackTrace && (
                <div>
                  <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Stack Trace</div>
                  <div className={`p-4 rounded-lg overflow-auto max-h-96 ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-900 text-gray-100'}`}>
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                </div>
              )}
              
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дополнительные данные</div>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`}>
                    <pre className={`text-xs font-mono whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
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
