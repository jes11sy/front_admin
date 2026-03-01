'use client'

import { useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

interface SiteOrder {
  id: number
  cityId: number
  city?: { id: number; name: string }
  site: string
  clientName: string
  phone: string
  status: string | null
  comment: string | null
  commentOperator: string | null
  orderId: number | null
  callbackAt: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'new', label: 'Новая' },
  { value: 'processing', label: 'В обработке' },
  { value: 'callback', label: 'Перезвонить' },
  { value: 'no_answer', label: 'Не отвечает' },
  { value: 'rejected', label: 'Отказ' },
  { value: 'order_created', label: 'Заказ создан' },
]

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  processing: 'В обработке',
  callback: 'Перезвонить',
  no_answer: 'Не отвечает',
  rejected: 'Отказ',
  order_created: 'Заказ создан',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  callback: 'bg-purple-100 text-purple-700',
  no_answer: 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
  order_created: 'bg-green-100 text-green-700',
}

export default function SiteOrdersPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<SiteOrder[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [showFilters, setShowFilters] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Inline editor
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ status: '', commentOperator: '', callbackAt: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getSiteOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
        cityId: cityFilter ? Number(cityFilter) : undefined,
        search: search || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch (e) {
      logger.error('Error loading site orders', { error: String(e) })
      toast.error('Не удалось загрузить заявки')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getCities().then(c => setCities(c)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, statusFilter, cityFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, cityFilter])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setCurrentPage(1); load() }

  const startEdit = (item: SiteOrder) => {
    setEditingId(item.id)
    setEditForm({
      status: item.status || 'new',
      commentOperator: item.commentOperator || '',
      callbackAt: item.callbackAt ? item.callbackAt.slice(0, 16) : '',
    })
  }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await apiClient.updateSiteOrder(editingId, {
        status: editForm.status,
        commentOperator: editForm.commentOperator || undefined,
        callbackAt: editForm.callbackAt || undefined,
      })
      toast.success('Заявка обновлена')
      setEditingId(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const hasActiveFilters = search || statusFilter || cityFilter

  const inputCls = `px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Заявки с сайта</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Лиды, пришедшие через сайты {total > 0 && `— всего ${total}`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative p-2 rounded-lg transition-all ${showFilters ? (isDark ? 'bg-teal-900/20 text-teal-400' : 'bg-teal-50 text-teal-600') : (isDark ? 'bg-[#2a3441] text-gray-400' : 'bg-gray-100 text-gray-600')}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full" />}
        </button>
      </div>

      {showFilters && (
        <form onSubmit={handleSearch} className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Поиск (имя, телефон)</label>
              <input className={`${inputCls} w-full`} value={search} onChange={e => setSearch(e.target.value)} placeholder="Введите имя или телефон..." />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
              <select className={inputCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Город</label>
              <select className={inputCls} value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                <option value="">Все города</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm">Найти</button>
            {hasActiveFilters && (
              <button type="button" onClick={() => { setSearch(''); setStatusFilter(''); setCityFilter('') }} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>Сбросить</button>
            )}
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <>
          <div className="space-y-3">
            {items.length === 0 ? (
              <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет заявок</div>
            ) : items.map(item => (
              <div key={item.id} className={`rounded-xl border transition-all ${isDark ? 'bg-[#2a3441] border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
                {/* Header */}
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>#{item.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status || 'new'] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status || ''] || item.status || 'Новая'}
                      </span>
                      {item.city && <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{item.city.name}</span>}
                    </div>
                    <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.clientName}</div>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{item.phone}</span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{item.site}</span>
                      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                    {item.comment && (
                      <div className={`mt-2 text-xs italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Клиент: {item.comment}</div>
                    )}
                    {item.commentOperator && (
                      <div className={`mt-1 text-xs ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>Оператор: {item.commentOperator}</div>
                    )}
                    {item.orderId && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                        <ExternalLink className="w-3 h-3" />
                        <a href={`/orders/${item.orderId}`} className="underline hover:no-underline">Заказ #{item.orderId}</a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => editingId === item.id ? setEditingId(null) : startEdit(item)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-[#1e2530] text-gray-300 hover:bg-[#3a4451]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  >
                    {editingId === item.id ? 'Свернуть' : 'Обработать'}
                  </button>
                </div>

                {/* Edit panel */}
                {editingId === item.id && (
                  <div className={`border-t px-4 py-4 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
                        <select className={`${inputCls} w-full`} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                          {STATUS_OPTIONS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Перезвонить в</label>
                        <input type="datetime-local" className={`${inputCls} w-full`} value={editForm.callbackAt} onChange={e => setEditForm({...editForm, callbackAt: e.target.value})} />
                      </div>
                      <div>
                        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Комментарий оператора</label>
                        <input className={`${inputCls} w-full`} value={editForm.commentOperator} onChange={e => setEditForm({...editForm, commentOperator: e.target.value})} placeholder="Добавить заметку..." />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50">
                        {saving ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button onClick={() => setEditingId(null)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>Отмена</button>
                    </div>
                  </div>
                )}
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
  )
}
