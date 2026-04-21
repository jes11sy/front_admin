'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { Building2, CalendarClock, ExternalLink, Filter, Globe, MessageSquare, Phone, Search, X } from 'lucide-react'

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

const STATUS_TABS = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
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

function getStatusStyle(status: string | null, isDark: boolean) {
  const s = status || 'new'
  if (isDark) {
    switch (s) {
      case 'new':
        return 'bg-sky-500/12 text-sky-300'
      case 'processing':
        return 'bg-amber-500/12 text-amber-300'
      case 'callback':
        return 'bg-violet-500/12 text-violet-300'
      case 'no_answer':
        return 'bg-white/[0.06] text-gray-300'
      case 'rejected':
        return 'bg-rose-500/12 text-rose-300'
      case 'order_created':
        return 'bg-emerald-500/12 text-emerald-300'
      default:
        return 'bg-white/[0.06] text-gray-300'
    }
  }

  switch (s) {
    case 'new':
      return 'bg-sky-50 text-sky-700'
    case 'processing':
      return 'bg-amber-50 text-amber-700'
    case 'callback':
      return 'bg-violet-50 text-violet-700'
    case 'no_answer':
      return 'bg-gray-100 text-gray-700'
    case 'rejected':
      return 'bg-rose-50 text-rose-700'
    case 'order_created':
      return 'bg-emerald-50 text-emerald-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

function formatDate(date: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  return new Date(date).toLocaleString('ru-RU', options || { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function SiteOrdersPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [items, setItems] = useState<SiteOrder[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const [showFilters, setShowFilters] = useState(false)
  const [statusTab, setStatusTab] = useState('')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const [draftSearch, setDraftSearch] = useState('')
  const [draftCity, setDraftCity] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ status: '', commentOperator: '', callbackAt: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getSiteOrders({
        page: currentPage,
        limit: itemsPerPage,
        status: statusTab || undefined,
        cityId: cityFilter ? Number(cityFilter) : undefined,
        search: search || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : data?.items || data?.data || [])
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить заявки')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient
      .getCities()
      .then((c) => setCities(c))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [currentPage, statusTab, cityFilter, search])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusTab, cityFilter, search])

  const openFilters = () => {
    setDraftSearch(search)
    setDraftCity(cityFilter)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setSearch(draftSearch)
    setCityFilter(draftCity)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setDraftSearch('')
    setDraftCity('')
  }

  const clearAppliedFilters = () => {
    setSearch('')
    setCityFilter('')
    setDraftSearch('')
    setDraftCity('')
  }

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
  const activeFiltersCount = (search ? 1 : 0) + (cityFilter ? 1 : 0)

  const pageClass = isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'
  const panelClass = isDark
    ? 'border border-white/10 bg-white/[0.03]'
    : 'border border-black/[0.08] bg-white'
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const titleClass = isDark ? 'text-white' : 'text-[#111113]'
  const inputCls = isDark
    ? 'w-full rounded-2xl border border-[#313136] bg-white/[0.04] px-4 py-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition focus:border-[#313136]'
    : 'w-full rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#e5e7eb]'
  const secondaryButtonCls = isDark
    ? 'rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]'
    : 'rounded-2xl border border-[#cfd2d8] bg-white px-4 py-3 text-sm font-medium text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:bg-[#f3f4f6]'
  const primaryButtonCls = isDark
    ? 'rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#111113] transition hover:bg-gray-200'
    : 'rounded-2xl bg-[#0a4f42] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#083f35]'

  const renderEditForm = (item: SiteOrder, compact = false) => (
    <div className={`rounded-[24px] border p-4 ${isDark ? 'border-[#313136] bg-[#0f0f11]/40' : 'border-[#e5e7eb] bg-[#fafafa]'}`}>
      {item.comment && (
        <div className={`mb-4 rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-white/[0.04] text-gray-300' : 'bg-white text-gray-600'}`}>
          Комментарий клиента: {item.comment}
        </div>
      )}

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        <div>
          <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
          <select className={inputCls} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
            {STATUS_TABS.filter((option) => option.value).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Перезвонить в</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={editForm.callbackAt}
            onChange={(e) => setEditForm({ ...editForm, callbackAt: e.target.value })}
          />
        </div>

        <div>
          <label className={`mb-2 block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Комментарий оператора</label>
          <input
            className={inputCls}
            value={editForm.commentOperator}
            onChange={(e) => setEditForm({ ...editForm, commentOperator: e.target.value })}
            placeholder="Заметка..."
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button onClick={saveEdit} disabled={saving} className={`${primaryButtonCls} disabled:opacity-60`}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        <button onClick={() => setEditingId(null)} className={secondaryButtonCls}>
          Отмена
        </button>
        {item.orderId && (
          <a href={`/orders/${item.orderId}`} className={`sm:ml-auto inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#111113]'}`}>
            <ExternalLink className="h-4 w-4" />
            Заказ #{item.orderId}
          </a>
        )}
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 ${pageClass}`}>
      <div className="px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex w-max gap-2">
              {STATUS_TABS.map((tab) => {
                const active = statusTab === tab.value
                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={`min-h-[40px] whitespace-nowrap rounded-2xl px-4 text-sm font-medium transition-all duration-200 ${
                      active
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
                )
              })}
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
            <Filter className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#b3261e] border-2 ${isDark ? 'border-[#111113]' : 'border-white'}`} />
            )}
          </button>
        </div>

        {(activeFiltersCount > 0 || total > 0) && (
          <div className={`mb-4 flex flex-wrap items-center justify-between gap-2 text-sm ${mutedClass}`}>
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? 'bg-white/[0.04] text-white/80' : 'bg-white text-[#3a3a3c] border border-black/[0.06]'}`}>
                  <Search className="h-3.5 w-3.5" />
                  {search}
                </span>
              )}
              {cityFilter && (
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${isDark ? 'bg-white/[0.04] text-white/80' : 'bg-white text-[#3a3a3c] border border-black/[0.06]'}`}>
                  <Building2 className="h-3.5 w-3.5" />
                  {cities.find((city) => String(city.id) === cityFilter)?.name || 'Город'}
                </span>
              )}
              {activeFiltersCount > 0 && (
                <button onClick={clearAppliedFilters} className={`${isDark ? 'text-white/70 hover:text-white' : 'text-[#6e6e73] hover:text-[#111113]'}`}>
                  Очистить
                </button>
              )}
            </div>
            <div>{total > 0 ? `${total} заявок` : ''}</div>
          </div>
        )}

        {showFilters && (
          <>
            <div
              className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${isDark ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'}`}
              onClick={() => setShowFilters(false)}
            />
            <div
              className={`fixed top-16 md:top-4 right-0 md:right-4 h-[calc(100%-4rem)] md:h-[calc(100vh-2rem)] w-full sm:w-[360px] z-50 transform transition-all duration-300 ease-out overflow-y-auto md:rounded-[30px] ${
                showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'
              } ${
                isDark
                  ? 'bg-[#111113]/92 backdrop-blur-xl border-l md:border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)]'
                  : 'bg-white border-l md:border border-black/[0.08] shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
              }`}
            >
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

              <div className="space-y-5 p-6">
                <div>
                  <label className={`mb-2 flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Search className="h-4 w-4" />
                    Поиск
                  </label>
                  <input
                    type="text"
                    placeholder="Имя или телефон..."
                    value={draftSearch}
                    onChange={(e) => setDraftSearch(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={`mb-2 flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    <Building2 className="h-4 w-4" />
                    Город
                  </label>
                  <select value={draftCity} onChange={(e) => setDraftCity(e.target.value)} className={inputCls}>
                    <option value="">Все города</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={`sticky bottom-0 border-t px-6 py-4 flex gap-3 ${
                isDark ? 'bg-[#111113]/40 backdrop-blur-md border-white/10' : 'bg-white border-black/[0.08]'
              }`}>
                <button onClick={resetFilters} className={`flex-1 ${secondaryButtonCls}`}>
                  Сбросить
                </button>
                <button onClick={applyFilters} className={`flex-1 ${primaryButtonCls}`}>
                  Применить
                </button>
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <section className={`rounded-[20px] border p-16 text-center ${panelClass}`}>
            <div className={`mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-transparent ${isDark ? 'border-t-white border-r-white/40' : 'border-t-[#111113] border-r-gray-300'}`} />
            <p className={`text-sm ${mutedClass}`}>Загрузка заявок...</p>
          </section>
        )}

        {!isLoading && items.length === 0 && (
          <section className={`rounded-[20px] border p-16 text-center ${panelClass}`}>
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${isDark ? 'bg-white/[0.05] text-gray-300' : 'bg-[#f5f5f7] text-gray-500'}`}>
              <Globe className="h-6 w-6" />
            </div>
            <h2 className={`text-lg font-semibold ${titleClass}`}>Заявок не найдено</h2>
            <p className={`mt-2 text-sm ${mutedClass}`}>Попробуйте изменить статус или параметры фильтра.</p>
          </section>
        )}

        {!isLoading && items.length > 0 && (
          <>
            <section className={`hidden overflow-hidden rounded-[20px] md:block ${panelClass}`}>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className={isDark ? 'border-b border-[#313136] bg-white/[0.03]' : 'border-b border-[#e5e7eb] bg-[#fafafa]'}>
                      {['ID', 'Клиент', 'Телефон', 'Сайт', 'Город', 'Статус', 'Перезвон', 'Создано', ''].map((header) => (
                        <th key={header} className={`px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.14em] ${mutedClass}`}>
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <>
                        <tr key={item.id} className={`border-b ${isDark ? 'border-[#26262b] hover:bg-white/[0.03]' : 'border-[#f0f0f2] hover:bg-[#fcfcfd]'}`}>
                          <td className={`px-4 py-4 text-sm font-semibold ${titleClass}`}>#{item.id}</td>
                          <td className={`px-4 py-4 text-sm font-medium ${titleClass}`}>{item.clientName}</td>
                          <td className={`px-4 py-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.phone}</td>
                          <td className={`px-4 py-4 text-sm ${mutedClass}`}>{item.site}</td>
                          <td className={`px-4 py-4 text-sm ${mutedClass}`}>{item.city?.name || '—'}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                              {STATUS_LABELS[item.status || 'new'] || 'Новая'}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm ${item.callbackAt ? (isDark ? 'text-amber-300' : 'text-amber-700') : mutedClass}`}>
                            {formatDate(item.callbackAt)}
                          </td>
                          <td className={`px-4 py-4 text-sm ${mutedClass}`}>{formatDate(item.createdAt)}</td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
                              className={editingId === item.id ? primaryButtonCls : secondaryButtonCls}
                            >
                              {editingId === item.id ? 'Свернуть' : 'Обработать'}
                            </button>
                          </td>
                        </tr>
                        {editingId === item.id && (
                          <tr key={`${item.id}-edit`}>
                            <td colSpan={9} className="p-4">
                              {renderEditForm(item)}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="space-y-4 md:hidden">
              {items.map((item) => (
                <section key={item.id} className={`rounded-[20px] p-5 ${panelClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`text-sm font-semibold ${titleClass}`}>#{item.id}</div>
                      <div className={`mt-1 text-base font-semibold ${titleClass}`}>{item.clientName}</div>
                    </div>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                      {STATUS_LABELS[item.status || 'new'] || 'Новая'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Phone className="h-4 w-4" />
                      {item.phone}
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${mutedClass}`}>
                      <Globe className="h-4 w-4" />
                      {item.site}
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${mutedClass}`}>
                      <Building2 className="h-4 w-4" />
                      {item.city?.name || 'Город не указан'}
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${mutedClass}`}>
                      <CalendarClock className="h-4 w-4" />
                      {item.callbackAt ? `Перезвон: ${formatDate(item.callbackAt)}` : `Создано: ${formatDate(item.createdAt)}`}
                    </div>
                    {item.comment && (
                      <div className={`flex items-start gap-2 rounded-2xl px-4 py-3 text-sm ${isDark ? 'bg-white/[0.04] text-gray-300' : 'bg-[#f5f5f7] text-gray-600'}`}>
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{item.comment}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
                      className={editingId === item.id ? primaryButtonCls : secondaryButtonCls}
                    >
                      {editingId === item.id ? 'Свернуть' : 'Обработать'}
                    </button>
                    {item.orderId && (
                      <a href={`/orders/${item.orderId}`} className={`inline-flex items-center gap-2 text-sm font-medium ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-[#111113]'}`}>
                        <ExternalLink className="h-4 w-4" />
                        Заказ #{item.orderId}
                      </a>
                    )}
                  </div>

                  {editingId === item.id && <div className="mt-4">{renderEditForm(item, true)}</div>}
                </section>
              ))}
            </div>
          </>
        )}

        {!isLoading && totalPages > 1 && (
          <div className={`mt-6 border-t pt-4 ${isDark ? 'border-[#313136]' : 'border-[#e5e7eb]'}`}>
            <OptimizedPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} isDark={isDark} />
          </div>
        )}
      </div>
    </div>
  )
}
