'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { ExternalLink, X, Phone, MessageSquare } from 'lucide-react'

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
const CATEGORY_COLORS: Record<string, string> = {
  question: 'bg-blue-100 text-blue-700',
  complaint: 'bg-red-100 text-red-700',
  order: 'bg-green-100 text-green-700',
  consultation: 'bg-purple-100 text-purple-700',
  callback: 'bg-orange-100 text-orange-700',
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Новое',
  in_progress: 'В работе',
  waiting: 'Ожидает',
  closed_solved: 'Решено',
  closed_rejected: 'Отклонено',
}
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  waiting: 'bg-purple-100 text-purple-700',
  closed_solved: 'bg-green-100 text-green-700',
  closed_rejected: 'bg-gray-100 text-gray-500',
}

const SOURCE_LABELS: Record<string, string> = {
  call: 'Звонок',
  chat: 'Чат',
  site_order: 'Сайт',
  manual: 'Вручную',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
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

export default function AppealsPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<Appeal[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('new')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])

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
        status: statusFilter || undefined,
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
    } catch (e) {
      logger.error('Error loading appeals', { error: String(e) })
      toast.error('Не удалось загрузить обращения')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getCities().then(c => setCities(c)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, statusFilter, categoryFilter, cityFilter, dateFrom, dateTo])
  useEffect(() => { setCurrentPage(1) }, [statusFilter, categoryFilter, cityFilter, dateFrom, dateTo])

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
  const hasFilters = search || (statusFilter && statusFilter !== 'new') || categoryFilter || cityFilter || dateFrom || dateTo

  const inputCls = `px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  return (
    <div className="flex gap-4">
      {/* Main list */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Обращения клиентов</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Все контакты с клиентами {total > 0 && `— ${total}`}
            </p>
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

        {/* Filters */}
        {showFilters && (
          <div className={`mb-5 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Поиск (телефон, описание)</label>
                <input className={`${inputCls} w-full`} value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} placeholder="Телефон..." />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
                <select className={inputCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Категория</label>
                <select className={inputCls} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Город</label>
                <select className={inputCls} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                  <option value="">Все</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>С</label>
                <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>По</label>
                <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              {hasFilters && (
                <div className="flex items-end">
                  <button onClick={() => { setSearch(''); setStatusFilter('new'); setCategoryFilter(''); setCityFilter(''); setDateFrom(''); setDateTo('') }} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                    Сбросить
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status quick-tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {STATUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setStatusFilter(o.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === o.value
                  ? 'bg-teal-600 text-white'
                  : isDark ? 'bg-[#2a3441] text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
        ) : (
          <>
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Обращений не найдено</p>
                </div>
              ) : items.map(item => (
                <div
                  key={item.id}
                  onClick={() => openDetail(item)}
                  className={`rounded-xl border cursor-pointer transition-all ${
                    selectedId === item.id
                      ? isDark ? 'bg-teal-900/20 border-teal-600/50' : 'bg-teal-50 border-teal-300'
                      : isDark ? 'bg-[#2a3441] border-gray-700/50 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{item.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                            {CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          {item.city && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{item.city.name}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs">
                          <span className={`flex items-center gap-1 font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            <Phone className="w-3 h-3" />{item.phone}
                          </span>
                          {item.operator && <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Оператор: {item.operator.name}</span>}
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{SOURCE_LABELS[item.sourceType] || item.sourceType}</span>
                          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        {item.description && (
                          <p className={`text-xs mt-1.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                        )}
                        <div className="flex gap-3 mt-1 text-xs">
                          {item.orderId && (
                            <a href={`/orders/${item.orderId}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-teal-600 hover:underline">
                              <ExternalLink className="w-3 h-3" />Заказ #{item.orderId}
                            </a>
                          )}
                          {item.callbackAt && (
                            <span className={`flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                              Перезвон: {new Date(item.callbackAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={`flex items-center justify-center mt-6 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail panel */}
      {detail && (
        <div className={`w-80 flex-shrink-0 rounded-xl border sticky top-4 self-start ${isDark ? 'bg-[#2a3441] border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
            <span className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Обращение #{detail.id}</span>
            <button onClick={() => { setSelectedId(null); setDetail(null) }} className={`p-1 rounded-lg ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Телефон</span>
                <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{detail.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Категория</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[detail.category] || ''}`}>{CATEGORY_LABELS[detail.category] || detail.category}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Источник</span>
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{SOURCE_LABELS[detail.sourceType] || detail.sourceType}</span>
              </div>
              {detail.operator && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Оператор</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{detail.operator.name}</span>
                </div>
              )}
              {detail.city && (
                <div className="flex justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Город</span>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{detail.city.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Создано</span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(detail.createdAt).toLocaleString('ru-RU')}</span>
              </div>
            </div>

            {detail.description && (
              <div>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Описание</div>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{detail.description}</p>
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2 flex-wrap">
              {detail.orderId && (
                <a href={`/orders/${detail.orderId}`} className="flex items-center gap-1 text-xs text-teal-600 underline hover:no-underline">
                  <ExternalLink className="w-3 h-3" />Заказ #{detail.orderId}
                </a>
              )}
            </div>

            {/* Edit */}
            <div className={`pt-3 border-t space-y-3 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
                <select
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Итог / Результат</label>
                <textarea
                  rows={3}
                  value={editResult}
                  onChange={e => setEditResult(e.target.value)}
                  placeholder="Результат обращения..."
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Перезвонить в</label>
                <input
                  type="datetime-local"
                  value={editCallback}
                  onChange={e => setEditCallback(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}
                />
              </div>
              <button
                onClick={saveDetail}
                disabled={saving}
                className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
