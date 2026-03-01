'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

interface WorkSession {
  id: number
  operatorId: number
  operator?: { id: number; name: string }
  startedAt: string
  endedAt: string | null
  status: 'active' | 'break' | 'ended'
  createdAt: string
}

interface Operator { id: number; name: string }

const STATUS_LABELS: Record<string, string> = {
  active: 'Работает',
  break: 'Перерыв',
  ended: 'Завершена',
}

function getStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'active': return 'bg-green-900/40 text-green-300'
      case 'break': return 'bg-yellow-900/40 text-yellow-300'
      case 'ended': return 'bg-gray-700 text-gray-400'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700'
    case 'break': return 'bg-yellow-100 text-yellow-700'
    case 'ended': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function getDuration(start: string, end: string | null): string {
  const from = new Date(start).getTime()
  const to = end ? new Date(end).getTime() : Date.now()
  const diffMs = to - from
  if (diffMs < 0) return '—'
  const hours = Math.floor(diffMs / 3_600_000)
  const minutes = Math.floor((diffMs % 3_600_000) / 60_000)
  if (hours > 0) return `${hours} ч ${minutes} мин`
  return `${minutes} мин`
}

const STATUSES = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Работает' },
  { value: 'break', label: 'Перерыв' },
  { value: 'ended', label: 'Завершена' },
]

export default function WorkSessionsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [items, setItems] = useState<WorkSession[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [operators, setOperators] = useState<Operator[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  const [showFilters, setShowFilters] = useState(false)
  const [operatorFilter, setOperatorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [draftOperator, setDraftOperator] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getOperatorWorkSessions({
        page: currentPage,
        limit: itemsPerPage,
        operatorId: operatorFilter ? Number(operatorFilter) : undefined,
        status: statusFilter || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить рабочие сессии')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getOperators().then(r => {
      if (r.success) setOperators(Array.isArray(r.data) ? r.data : (r.data?.data || []))
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, operatorFilter, statusFilter, dateFrom, dateTo])
  useEffect(() => { setCurrentPage(1) }, [operatorFilter, statusFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    active: items.filter(i => i.status === 'active').length,
    onBreak: items.filter(i => i.status === 'break').length,
    ended: items.filter(i => i.status === 'ended').length,
  }), [items])

  const totalPages = Math.ceil(total / itemsPerPage)
  const activeFiltersCount = (operatorFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)

  const openFilters = () => {
    setDraftOperator(operatorFilter)
    setDraftStatus(statusFilter)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setOperatorFilter(draftOperator)
    setStatusFilter(draftStatus)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setDraftOperator('')
    setDraftStatus('')
    setDraftDateFrom('')
    setDraftDateTo('')
  }

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Работают', value: stats.active, color: isDark ? 'text-green-400' : 'text-green-600' },
            { label: 'На перерыве', value: stats.onBreak, color: isDark ? 'text-yellow-400' : 'text-yellow-600' },
            { label: 'Завершено', value: stats.ended, color: isDark ? 'text-gray-300' : 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter button + active chips */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={openFilters}
              className={`relative p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300 hover:text-teal-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'}`}
              title="Фильтры"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFiltersCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`} />
              )}
            </button>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {operatorFilter && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {operators.find(o => String(o.id) === operatorFilter)?.name || 'Оператор'}
                    <button onClick={() => setOperatorFilter('')} className="ml-1">×</button>
                  </span>
                )}
                {statusFilter && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-teal-900/30 text-teal-300 border-teal-700' : 'bg-teal-50 text-teal-700 border-teal-200'}`}>
                    {STATUS_LABELS[statusFilter] || statusFilter}
                    <button onClick={() => setStatusFilter('')} className="ml-1">×</button>
                  </span>
                )}
                <button onClick={() => { setOperatorFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }} className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>Сбросить</button>
              </div>
            )}
          </div>
        </div>

        {/* Filter drawer */}
        {showFilters && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setShowFilters(false)} />
            <div className={`fixed top-16 md:top-0 right-0 h-[calc(100%-4rem)] md:h-full w-full sm:w-80 shadow-xl z-50 overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <div className={`hidden md:flex sticky top-0 border-b px-4 py-3 items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                <button onClick={() => setShowFilters(false)} className={`p-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Оператор</h3>
                  <select value={draftOperator} onChange={e => setDraftOperator(e.target.value)} className={inputCls}>
                    <option value="">Все операторы</option>
                    {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Статус</h3>
                  <div className="flex flex-col gap-2">
                    {STATUSES.map(s => (
                      <button key={s.value} onClick={() => setDraftStatus(s.value === 'all' ? '' : s.value)}
                        className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                          (draftStatus === s.value) || (s.value === 'all' && !draftStatus)
                            ? isDark ? 'bg-teal-900/50 border-teal-600 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700'
                            : isDark ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'
                        }`}>{s.label}</button>
                    ))}
                  </div>
                </div>
                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Период</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>С</label>
                      <input type="date" value={draftDateFrom} onChange={e => setDraftDateFrom(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>По</label>
                      <input type="date" value={draftDateTo} onChange={e => setDraftDateTo(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
              <div className={`sticky bottom-0 border-t px-4 py-3 flex gap-2 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                <button onClick={resetFilters} className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Сбросить</button>
                <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">Применить</button>
              </div>
            </div>
          </>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
            <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
          </div>
        )}

        {/* Table */}
        {!isLoading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[11px] min-w-[700px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <thead>
                <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#0d5c4b' }}>
                  {['ID', 'Оператор', 'Начало смены', 'Конец смены', 'Продолжительность', 'Статус'].map(h => (
                    <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.operator?.name || `#${item.operatorId}`}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(item.startedAt).toLocaleString('ru-RU')}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {item.endedAt ? new Date(item.endedAt).toLocaleString('ru-RU') : (
                        <span className={isDark ? 'text-green-400 font-medium' : 'text-green-600 font-medium'}>Сейчас</span>
                      )}
                    </td>
                    <td className={`py-3 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{getDuration(item.startedAt, item.endedAt)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Активных сессий не найдено</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Попробуйте изменить параметры фильтра</p>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className={`flex items-center justify-center mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  )
}
