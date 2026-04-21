'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDesignStore } from '@/store/design.store'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { LoadingState } from '@/components/ui/loading-state'

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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        {/* Статистика */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Всего ошибок</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{total}</div>
          </div>
          <div className={`rounded-[20px] p-4 border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
            <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>На странице</div>
            <div className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{logs.length}</div>
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

            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {filterService !== 'all' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    {SERVICE_LABELS[filterService] || filterService}
                    <button onClick={() => setFilterService('all')} className={`ml-1 ${isDark ? 'hover:text-white' : 'hover:text-black/70'}`}>×</button>
                  </span>
                )}
                {filterErrorType && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    {filterErrorType}
                    <button onClick={() => setFilterErrorType('')} className={`ml-1 ${isDark ? 'hover:text-white' : 'hover:text-black/70'}`}>×</button>
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
                  Скрыть фильтры
                </button>
              </div>

              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Сервис</h3>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES.map((service) => (
                      <button
                        key={service.value}
                        onClick={() => setDraftService(service.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border-0 shadow-sm ${
                          draftService === service.value
                            ? isDark ? 'bg-white text-[#111113]' : 'bg-[#0a4f42] text-white'
                            : isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]' : 'bg-white text-[#111113] hover:bg-black/[0.035]'
                        }`}
                      >
                        {service.label}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Тип ошибки</h3>
                  <input
                    type="text"
                    placeholder="Например: ValidationError"
                    value={draftErrorType}
                    onChange={(e) => setDraftErrorType(e.target.value)}
                    className={`w-full min-h-[44px] px-4 py-2 border rounded-2xl text-sm outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-all ${isDark ? 'bg-white/[0.04] border-white/15 text-gray-200 placeholder-gray-500 focus:border-white/30' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-gray-300'}`}
                  />
                </div>

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-4">
                  <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-white/40' : 'text-black/40'}`}>Период</h3>
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
        {!loading && logs.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-[11px] min-w-[700px] rounded-[20px] shadow-lg overflow-hidden ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-white/[0.04] border-white/20' : 'bg-gray-50 border-gray-200'}`}>
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
                      className={`border-b transition-colors cursor-pointer ${isDark ? 'hover:bg-white/[0.04] border-white/10' : 'hover:bg-black/[0.02] border-gray-200'}`}
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
          <div className={`text-center py-16 rounded-[20px] border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-black/[0.08]'}`}>
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
