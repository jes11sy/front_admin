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
const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  break: 'bg-yellow-100 text-yellow-700',
  ended: 'bg-gray-100 text-gray-500',
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

export default function WorkSessionsPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<WorkSession[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [operators, setOperators] = useState<Operator[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 30

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [operatorFilter, setOperatorFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

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
    } catch (e) {
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

  // Stats
  const stats = useMemo(() => {
    const active = items.filter(i => i.status === 'active').length
    const onBreak = items.filter(i => i.status === 'break').length
    const ended = items.filter(i => i.status === 'ended').length
    return { active, onBreak, ended }
  }, [items])

  const totalPages = Math.ceil(total / itemsPerPage)
  const hasFilters = operatorFilter || statusFilter || dateFrom || dateTo

  const selectCls = `px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Рабочие сессии операторов</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Учёт рабочего времени и активности операторов</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-2 rounded-lg transition-all ${showFilters ? (isDark ? 'bg-teal-900/20 text-teal-400' : 'bg-teal-50 text-teal-600') : (isDark ? 'bg-[#2a3441] text-gray-400' : 'bg-gray-100 text-gray-600')}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {hasFilters && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full" />}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Работают', value: stats.active, color: 'text-green-600' },
          { label: 'Перерыв', value: stats.onBreak, color: 'text-yellow-600' },
          { label: 'Завершено', value: stats.ended, color: isDark ? 'text-gray-300' : 'text-gray-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${isDark ? 'bg-[#2a3441] border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={`mb-5 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Оператор</label>
              <select className={selectCls} value={operatorFilter} onChange={e => setOperatorFilter(e.target.value)}>
                <option value="">Все операторы</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
              <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Все</option>
                <option value="active">Работает</option>
                <option value="break">Перерыв</option>
                <option value="ended">Завершена</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>С</label>
              <input type="date" className={selectCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>По</label>
              <input type="date" className={selectCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {hasFilters && (
              <button onClick={() => { setOperatorFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={`border-b-2 ${isDark ? 'border-teal-900/40 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'}`}>
                  {['ID', 'Оператор', 'Начало смены', 'Конец смены', 'Продолжительность', 'Статус'].map(h => (
                    <th key={h} className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={6} className={`py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={`border-b ${isDark ? 'border-gray-700/50 hover:bg-[#2a3441]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {item.operator?.name || `#${item.operatorId}`}
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {new Date(item.startedAt).toLocaleString('ru-RU')}
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.endedAt ? new Date(item.endedAt).toLocaleString('ru-RU') : (
                        <span className="text-green-600 font-medium">Сейчас</span>
                      )}
                    </td>
                    <td className={`py-3 px-4 font-mono text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      {getDuration(item.startedAt, item.endedAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={`flex items-center justify-center mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
