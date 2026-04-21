'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { dashboardStyles } from '@/lib/dashboard-ui'

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
      case 'active': return 'bg-emerald-950/50 text-emerald-300'
      case 'break': return 'bg-amber-950/50 text-amber-300'
      case 'ended': return 'bg-white/10 text-gray-400'
      default: return 'bg-white/10 text-gray-400'
    }
  }
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-800'
    case 'break': return 'bg-amber-50 text-amber-800'
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
  const ds = dashboardStyles(isDark)

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

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6">
          <h1 className={ds.title}>Рабочие сессии</h1>
          <p className={ds.subtitle}>Смены операторов кол-центра по периоду.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Работают', value: stats.active, color: isDark ? 'text-emerald-400' : 'text-emerald-600' },
            { label: 'На перерыве', value: stats.onBreak, color: isDark ? 'text-amber-300' : 'text-amber-700' },
            { label: 'Завершено (на странице)', value: stats.ended, color: isDark ? 'text-gray-200' : 'text-gray-800' },
          ].map(s => (
            <div key={s.label} className={ds.statCard}>
              <div className={ds.statLabel}>{s.label}</div>
              <div className={`${ds.statValue} ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={openFilters} className={ds.iconFilterBtn} title="Фильтры">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFiltersCount > 0 && (
                <span className={`absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full border-2 ${isDark ? 'border-[#111113]' : 'border-[#f5f5f7]'}`} />
              )}
            </button>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {operatorFilter && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    {operators.find(o => String(o.id) === operatorFilter)?.name || 'Оператор'}
                    <button type="button" onClick={() => setOperatorFilter('')} className={isDark ? 'hover:text-white' : 'hover:text-black/70'}>×</button>
                  </span>
                )}
                {statusFilter && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-white/[0.08] text-white border-white/20' : 'bg-white text-[#111113] border-black/[0.08]'}`}>
                    {STATUS_LABELS[statusFilter] || statusFilter}
                    <button type="button" onClick={() => setStatusFilter('')} className={isDark ? 'hover:text-white' : 'hover:text-black/70'}>×</button>
                  </span>
                )}
                <button type="button" onClick={() => { setOperatorFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }} className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
                  Сбросить
                </button>
              </div>
            )}
          </div>
        </div>

        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${ds.drawerBackdrop}`}
            onClick={() => setShowFilters(false)}
            aria-hidden
          />
          <div
            className={`${ds.drawerPanel} transform transition-all duration-300 ease-out ${showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}`}
          >
            <div className={ds.drawerHeader}>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                title="Закрыть"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
            <div className={ds.drawerMobileClose}>
              <button
                type="button"
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
                <h3 className={ds.sectionLabel}>Оператор</h3>
                <select value={draftOperator} onChange={e => setDraftOperator(e.target.value)} className={ds.select}>
                  <option value="">Все операторы</option>
                  {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
              <div className="space-y-4">
                <h3 className={ds.sectionLabel}>Статус</h3>
                <div className="flex flex-col gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setDraftStatus(s.value === 'all' ? '' : s.value)}
                      className={`min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left border-0 shadow-sm ${
                        (draftStatus === s.value) || (s.value === 'all' && !draftStatus)
                          ? ds.filterOptionActive
                          : ds.filterOptionIdle
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
              <div className="space-y-4">
                <h3 className={ds.sectionLabel}>Период</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>С</label>
                    <input type="date" value={draftDateFrom} onChange={e => setDraftDateFrom(e.target.value)} className={ds.input} />
                  </div>
                  <div>
                    <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>По</label>
                    <input type="date" value={draftDateTo} onChange={e => setDraftDateTo(e.target.value)} className={ds.input} />
                  </div>
                </div>
              </div>
            </div>
            <div className={ds.drawerFooter}>
              <button type="button" onClick={resetFilters} className={`flex-1 py-3.5 rounded-2xl text-[15px] font-semibold transition-colors ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white' : 'border border-[#cfd2d8] bg-white hover:bg-[#f3f4f6] text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)]'}`}>
                Сбросить
              </button>
              <button type="button" onClick={applyFilters} className={`flex-1 py-3.5 rounded-2xl transition-colors text-[15px] font-semibold ${isDark ? 'bg-white hover:bg-gray-200 text-[#111113]' : 'bg-[#0a4f42] hover:bg-[#0a4f42]/90 text-white shadow-md shadow-[#0a4f42]/20'}`}>
                Применить
              </button>
            </div>
          </div>
        </>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={ds.spinner} />
            <div className={`text-sm mt-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка...</div>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className={ds.tableScroll}>
            <div className={ds.tableWrap}>
              <table className="w-full border-collapse text-sm min-w-[720px]">
                <thead>
                  <tr className={ds.theadRow}>
                    {['ID', 'Оператор', 'Начало смены', 'Конец смены', 'Продолжительность', 'Статус'].map(h => (
                      <th key={h} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className={ds.tr}>
                      <td className={`${ds.td} font-medium`}>{item.id}</td>
                      <td className={`${ds.td} font-medium`}>{item.operator?.name || `#${item.operatorId}`}</td>
                      <td className={`${ds.td} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{new Date(item.startedAt).toLocaleString('ru-RU')}</td>
                      <td className={`${ds.td} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {item.endedAt ? new Date(item.endedAt).toLocaleString('ru-RU') : (
                          <span className={isDark ? 'text-emerald-400 font-medium' : 'text-emerald-700 font-medium'}>Сейчас</span>
                        )}
                      </td>
                      <td className={`${ds.td} font-mono tabular-nums ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{getDuration(item.startedAt, item.endedAt)}</td>
                      <td className={ds.td}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className={ds.emptyState}>
            <p className={ds.emptyTitle}>Сессий не найдено</p>
            <p className={ds.emptyHint}>Попробуйте изменить параметры фильтра</p>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className={`flex items-center justify-center mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  )
}
