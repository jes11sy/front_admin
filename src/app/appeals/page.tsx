'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { ExternalLink, X, Phone } from 'lucide-react'
import { getFormFieldClass } from '@/components/ui/form-styles'

interface Appeal {
  id: number
  operatorId: number
  operator?: { id: number; name: string }
  cityId: number
  city?: { id: number; name: string }
  phone: string
  category: string
  description: string | null
  result: string | null
  status: string
  sourceType: string
  callId: number | null
  siteOrderId: number | null
  orderId: number | null
  callbackAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABELS: Record<string, string> = {
  question: 'Вопрос',
  complaint: 'Жалоба',
  order: 'Заказ',
  consultation: 'Консультация',
  callback: 'Перезвон',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  waiting: 'Ожидает',
  closed_solved: 'Решено',
  closed_rejected: 'Отклонено',
}

const SOURCE_LABELS: Record<string, string> = {
  call: 'Звонок',
  chat: 'Чат',
  site_order: 'Сайт',
  manual: 'Вручную',
}

const STATUS_TABS = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'waiting', label: 'Ожидает' },
  { value: 'closed_solved', label: 'Решено' },
  { value: 'closed_rejected', label: 'Отклонено' },
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Все категории' },
  { value: 'question', label: 'Вопрос' },
  { value: 'complaint', label: 'Жалоба' },
  { value: 'order', label: 'Заказ' },
  { value: 'consultation', label: 'Консультация' },
  { value: 'callback', label: 'Перезвон' },
]

function getStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'new': return 'bg-blue-900/40 text-blue-300'
      case 'in_progress': return 'bg-yellow-900/40 text-yellow-300'
      case 'waiting': return 'bg-purple-900/40 text-purple-300'
      case 'closed_solved': return 'bg-green-900/40 text-green-300'
      case 'closed_rejected': return 'bg-gray-700 text-gray-400'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (status) {
    case 'new': return 'bg-blue-100 text-blue-700'
    case 'in_progress': return 'bg-yellow-100 text-yellow-700'
    case 'waiting': return 'bg-purple-100 text-purple-700'
    case 'closed_solved': return 'bg-green-100 text-green-700'
    case 'closed_rejected': return 'bg-gray-100 text-gray-500'
    default: return 'bg-gray-100 text-gray-500'
  }
}

function getCategoryStyle(category: string, isDark: boolean) {
  if (isDark) {
    switch (category) {
      case 'question': return 'bg-blue-900/30 text-blue-300'
      case 'complaint': return 'bg-red-900/40 text-red-300'
      case 'order': return 'bg-green-900/30 text-green-300'
      case 'consultation': return 'bg-purple-900/30 text-purple-300'
      case 'callback': return 'bg-orange-900/30 text-orange-300'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (category) {
    case 'question': return 'bg-blue-100 text-blue-700'
    case 'complaint': return 'bg-red-100 text-red-700'
    case 'order': return 'bg-green-100 text-green-700'
    case 'consultation': return 'bg-purple-100 text-purple-700'
    case 'callback': return 'bg-orange-100 text-orange-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function AppealsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [items, setItems] = useState<Appeal[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [statusTab, setStatusTab] = useState('new')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])

  // Draft filters
  const [draftCategory, setDraftCategory] = useState('')
  const [draftCity, setDraftCity] = useState('')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')
  const [draftSearch, setDraftSearch] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Detail panel
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<Appeal | null>(null)
  const [editResult, setEditResult] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editCallback, setEditCallback] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getAppeals({
        page: currentPage,
        limit: itemsPerPage,
        status: statusTab || undefined,
        category: categoryFilter || undefined,
        cityId: cityFilter ? Number(cityFilter) : undefined,
        search: search || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить обращения')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getCities().then(c => setCities(c)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, statusTab, categoryFilter, cityFilter, dateFrom, dateTo, search])
  useEffect(() => { setCurrentPage(1) }, [statusTab, categoryFilter, cityFilter, dateFrom, dateTo, search])

  const openFilters = () => {
    setDraftCategory(categoryFilter)
    setDraftCity(cityFilter)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setDraftSearch(search)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setCategoryFilter(draftCategory)
    setCityFilter(draftCity)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setSearch(draftSearch)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setDraftCategory('')
    setDraftCity('')
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftSearch('')
  }

  const clearAllFilters = () => {
    setCategoryFilter('')
    setCityFilter('')
    setDateFrom('')
    setDateTo('')
    setSearch('')
  }

  const openDetail = async (item: Appeal) => {
    setSelectedId(item.id)
    setDetail(item)
    setEditResult(item.result || '')
    setEditStatus(item.status)
    setEditCallback(item.callbackAt ? item.callbackAt.slice(0, 16) : '')
    try {
      const res = await apiClient.getAppeal(item.id)
      if (res.success && res.data) {
        setDetail(res.data)
        setEditResult(res.data.result || '')
        setEditStatus(res.data.status)
        setEditCallback(res.data.callbackAt ? res.data.callbackAt.slice(0, 16) : '')
      }
    } catch {}
  }

  const saveDetail = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      await apiClient.updateAppeal(selectedId, {
        status: editStatus,
        result: editResult || undefined,
        callbackAt: editCallback || null,
      })
      toast.success('Обращение обновлено')
      setSelectedId(null)
      setDetail(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const activeFiltersCount = (categoryFilter ? 1 : 0) + (cityFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0) + (search ? 1 : 0)

  const pageClass = isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
  const panelClass = isDark
    ? 'border border-white/10 bg-white/[0.03]'
    : 'border border-black/[0.08] bg-white'
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const titleClass = isDark ? 'text-white' : 'text-[#111113]'
  const inputCls = `${getFormFieldClass(isDark, 'lg')} min-h-[44px] px-4`
  const secondaryButtonCls = isDark
    ? 'rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]'
    : 'rounded-2xl border border-[#cfd2d8] bg-white px-4 py-3 text-sm font-medium text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:bg-[#f3f4f6]'
  const primaryButtonCls = isDark
    ? 'rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#111113] transition hover:bg-gray-200'
    : 'rounded-2xl bg-[#0a4f42] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#083f35]'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex w-max gap-2">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusTab(tab.value)}
                  className={`min-h-[40px] whitespace-nowrap rounded-2xl px-4 text-sm font-medium transition-all duration-200 ${
                    statusTab === tab.value
                      ? isDark
                        ? 'bg-white/[0.08] text-white'
                        : 'bg-[#0a4f42] text-white'
                      : isDark
                        ? 'bg-transparent text-white/92 hover:bg-white/[0.04] hover:text-white'
                        : 'bg-transparent text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={openFilters}
            className={`relative flex h-[40px] w-[40px] items-center justify-center rounded-2xl transition-all duration-200 ${
              isDark
                ? 'text-white/92 hover:bg-white/[0.04] hover:text-white'
                : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
            }`}
            title="Фильтры"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFiltersCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full" />}
          </button>
        </div>
        {(activeFiltersCount > 0 || total > 0) && (
          <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 text-sm ${mutedClass}`}>
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? 'bg-white/[0.04] text-white/80' : 'bg-white text-[#3a3a3c] border border-black/[0.06]'}`}>
                  Поиск: {search}
                </span>
              )}
              {categoryFilter && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? 'bg-white/[0.04] text-white/80' : 'bg-white text-[#3a3a3c] border border-black/[0.06]'}`}>
                  {CATEGORY_OPTIONS.find((o) => o.value === categoryFilter)?.label}
                </span>
              )}
              {cityFilter && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? 'bg-white/[0.04] text-white/80' : 'bg-white text-[#3a3a3c] border border-black/[0.06]'}`}>
                  {cities.find((city) => String(city.id) === cityFilter)?.name || 'Город'}
                </span>
              )}
              {activeFiltersCount > 0 && (
                <button onClick={clearAllFilters} className={`${isDark ? 'text-white/70 hover:text-white' : 'text-[#6e6e73] hover:text-[#111113]'}`}>
                  Очистить
                </button>
              )}
            </div>
            <div>{total > 0 ? `${total} обращений` : ''}</div>
          </div>
        )}

        {/* Filter drawer */}
        {showFilters && (
          <>
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Скрыть фильтры
                </button>
              </div>
              <div className="p-6 space-y-8">
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <input type="text" placeholder="Телефон..." value={draftSearch} onChange={e => setDraftSearch(e.target.value)} className={inputCls} />
                </div>
                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Категория</h3>
                  <div className="flex flex-col gap-2">
                    {CATEGORY_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setDraftCategory(opt.value)}
                        className={`px-3 py-2 rounded-2xl text-sm font-medium transition-all duration-200 text-left ${
                          draftCategory === opt.value
                            ? isDark ? 'bg-white text-[#111113]' : 'bg-[#0a4f42] text-white'
                            : isDark ? 'bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:text-white' : 'border border-[#cfd2d8] bg-white text-[#111113] hover:bg-[#f3f4f6]'
                        }`}
                      >{opt.label}</button>
                    ))}
                  </div>
                </div>
                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                  <select value={draftCity} onChange={e => setDraftCity(e.target.value)} className={inputCls}>
                    <option value="">Все города</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
              <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
              }`}>
                <button onClick={resetFilters} className={`flex-1 ${secondaryButtonCls}`}>Сбросить</button>
                <button onClick={applyFilters} className={`flex-1 ${primaryButtonCls}`}>Применить</button>
              </div>
            </div>
          </>
        )}

        {/* Detail drawer */}
        {detail && (
          <>
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`} onClick={() => { setSelectedId(null); setDetail(null) }} />
            <div className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-96 z-50 overflow-y-auto md:rounded-[30px] ${
              isDark
                ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
            }`}>
              <div className={`sticky top-0 border-b px-4 py-4 flex items-center justify-between z-10 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
                <span className={`font-semibold text-sm ${titleClass}`}>Обращение #{detail.id}</span>
                <button onClick={() => { setSelectedId(null); setDetail(null) }} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className={`rounded-[20px] p-4 space-y-2 text-sm border ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-[#f8f9fb] border-black/[0.08]'}`}>
                  {[
                    { label: 'Телефон', value: <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{detail.phone}</span> },
                    { label: 'Категория', value: <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryStyle(detail.category, isDark)}`}>{CATEGORY_LABELS[detail.category] || detail.category}</span> },
                    { label: 'Источник', value: SOURCE_LABELS[detail.sourceType] || detail.sourceType },
                    ...(detail.operator ? [{ label: 'Оператор', value: detail.operator.name }] : []),
                    ...(detail.city ? [{ label: 'Город', value: detail.city.name }] : []),
                    { label: 'Создано', value: new Date(detail.createdAt).toLocaleString('ru-RU') },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{row.label}</span>
                      <span className={`text-xs font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {detail.description && (
                  <div>
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Описание</div>
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{detail.description}</p>
                  </div>
                )}

                {detail.orderId && (
                  <a href={`/orders/${detail.orderId}`} className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
                    <ExternalLink className="w-4 h-4" />Перейти к заказу #{detail.orderId}
                  </a>
                )}

                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />

                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className={inputCls}>
                      {STATUS_TABS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Результат</label>
                    <textarea
                      rows={3}
                      value={editResult}
                      onChange={e => setEditResult(e.target.value)}
                      placeholder="Результат обращения..."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Перезвонить в</label>
                    <input type="datetime-local" value={editCallback} onChange={e => setEditCallback(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>
              <div className={`sticky bottom-0 border-t px-6 py-4 ${isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'}`}>
                <button onClick={saveDetail} disabled={saving} className={`w-full ${primaryButtonCls} disabled:opacity-50`}>
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Loading */}
        {isLoading && (
          <div className={`rounded-[20px] ${panelClass} text-center py-8 animate-fade-in`}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка обращений...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className={`text-center py-16 rounded-[20px] ${panelClass}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Обращений не найдено</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Попробуйте изменить параметры фильтра</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[11px] rounded-[20px] overflow-hidden ${panelClass}`}>
              <thead>
                <tr className={`${isDark ? 'bg-white/[0.04] border-b border-white/10' : 'bg-black/[0.02] border-b border-black/10'}`}>
                  {['ID', 'Телефон', 'Категория', 'Статус', 'Источник', 'Оператор', 'Город', 'Перезвон', 'Создано'].map(h => (
                    <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => openDetail(item)}
                    className={`border-b transition-colors cursor-pointer ${
                      selectedId === item.id
                        ? isDark ? 'bg-white/[0.06] border-white/10' : 'bg-black/[0.03] border-black/10'
                        : isDark ? 'hover:bg-white/[0.04] border-white/10' : 'hover:bg-black/[0.02] border-black/10'
                    }`}
                  >
                    <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                    <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.phone}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryStyle(item.category, isDark)}`}>
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{SOURCE_LABELS[item.sourceType] || item.sourceType}</td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.operator?.name || '-'}</td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.city?.name || '-'}</td>
                    <td className={`py-2.5 px-3 ${item.callbackAt ? (isDark ? 'text-orange-400' : 'text-orange-600') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                      {item.callbackAt ? new Date(item.callbackAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className={`py-2.5 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && totalPages > 1 && (
          <div className={`flex items-center justify-center mt-6 pt-4 border-t ${isDark ? 'border-white/10' : 'border-black/[0.08]'}`}>
            <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  )
}
