'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { ExternalLink } from 'lucide-react'

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
  new: 'Новая', processing: 'В обработке', callback: 'Перезвонить',
  no_answer: 'Не отвечает', rejected: 'Отказ', order_created: 'Заказ создан',
}

function getStatusStyle(status: string | null, isDark: boolean) {
  const s = status || 'new'
  if (isDark) {
    switch (s) {
      case 'new': return 'bg-blue-900/40 text-blue-300'
      case 'processing': return 'bg-yellow-900/40 text-yellow-300'
      case 'callback': return 'bg-purple-900/40 text-purple-300'
      case 'no_answer': return 'bg-gray-700 text-gray-400'
      case 'rejected': return 'bg-red-900/40 text-red-300'
      case 'order_created': return 'bg-green-900/40 text-green-300'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (s) {
    case 'new': return 'bg-blue-100 text-blue-700'
    case 'processing': return 'bg-yellow-100 text-yellow-700'
    case 'callback': return 'bg-purple-100 text-purple-700'
    case 'no_answer': return 'bg-gray-100 text-gray-600'
    case 'rejected': return 'bg-red-100 text-red-700'
    case 'order_created': return 'bg-green-100 text-green-700'
    default: return 'bg-gray-100 text-gray-600'
  }
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
        status: statusTab || undefined,
        cityId: cityFilter ? Number(cityFilter) : undefined,
        search: search || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить заявки')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    apiClient.getCities().then(c => setCities(c)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, statusTab, cityFilter, search])
  useEffect(() => { setCurrentPage(1) }, [statusTab, cityFilter, search])

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

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-4 py-6">

        {/* Status tabs + filter button */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className={`flex gap-1 p-1 rounded-lg w-max ${isDark ? 'bg-[#2a3441]' : 'bg-gray-100'}`}>
                {STATUS_TABS.map(tab => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusTab(tab.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                      statusTab === tab.value
                        ? 'bg-[#0d5c4b] text-white shadow-sm'
                        : isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >{tab.label}</button>
                ))}
              </div>
            </div>
            <button
              onClick={openFilters}
              className={`relative flex-shrink-0 p-2 rounded-lg transition-all duration-200 ${isDark ? 'bg-[#2a3441] hover:bg-[#3a4451] text-gray-400 hover:text-teal-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-teal-600'}`}
              title="Фильтры"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFiltersCount > 0 && (
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Filter drawer */}
        {showFilters && (
          <>
            <div className={`fixed inset-0 z-40 ${isDark ? 'bg-black/50' : 'bg-black/30'}`} onClick={() => setShowFilters(false)} />
            <div className={`fixed top-0 right-0 h-full w-full sm:w-80 shadow-xl z-50 overflow-y-auto ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
              <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between z-10 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Фильтры</h2>
                <button onClick={() => setShowFilters(false)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Поиск</h3>
                  <input type="text" placeholder="Имя или телефон..." value={draftSearch} onChange={e => setDraftSearch(e.target.value)} className={inputCls} />
                </div>
                <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                <div className="space-y-3">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Город</h3>
                  <select value={draftCity} onChange={e => setDraftCity(e.target.value)} className={inputCls}>
                    <option value="">Все города</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
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
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
            <p className={`font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Загрузка заявок...</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Заявок не найдено</p>
            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Попробуйте изменить параметры фильтра</p>
          </div>
        )}

        {/* Table desktop */}
        {!isLoading && items.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className={`w-full border-collapse text-[11px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#0d5c4b' }}>
                    {['ID', 'Клиент', 'Телефон', 'Сайт', 'Город', 'Статус', 'Перезвон', 'Создано', ''].map(h => (
                      <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <>
                      <tr
                        key={item.id}
                        className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}
                      >
                        <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                        <td className={`py-2.5 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.clientName}</td>
                        <td className={`py-2.5 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.phone}</td>
                        <td className={`py-2.5 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.site}</td>
                        <td className={`py-2.5 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.city?.name || '-'}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                            {STATUS_LABELS[item.status || ''] || 'Новая'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 ${item.callbackAt ? (isDark ? 'text-orange-400' : 'text-orange-600') : (isDark ? 'text-gray-500' : 'text-gray-400')}`}>
                          {item.callbackAt ? new Date(item.callbackAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className={`py-2.5 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => editingId === item.id ? setEditingId(null) : startEdit(item)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              editingId === item.id
                                ? 'bg-teal-600 text-white'
                                : isDark ? 'bg-[#3a4451] text-gray-300 hover:bg-[#4a5461]' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >{editingId === item.id ? 'Свернуть' : 'Обработать'}</button>
                        </td>
                      </tr>
                      {editingId === item.id && (
                        <tr key={`${item.id}-edit`} className={isDark ? 'bg-[#1e2530]' : 'bg-gray-50'}>
                          <td colSpan={9} className="px-4 py-4">
                            {item.comment && (
                              <div className={`text-xs mb-3 italic ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Комментарий клиента: {item.comment}
                              </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Статус</label>
                                <select className={inputCls} value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                  {STATUS_TABS.filter(o => o.value).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Перезвонить в</label>
                                <input type="datetime-local" className={inputCls} value={editForm.callbackAt} onChange={e => setEditForm({...editForm, callbackAt: e.target.value})} />
                              </div>
                              <div>
                                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Комментарий оператора</label>
                                <input className={inputCls} value={editForm.commentOperator} onChange={e => setEditForm({...editForm, commentOperator: e.target.value})} placeholder="Заметка..." />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
                                {saving ? 'Сохранение...' : 'Сохранить'}
                              </button>
                              <button onClick={() => setEditingId(null)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>Отмена</button>
                              {item.orderId && (
                                <a href={`/orders/${item.orderId}`} className="flex items-center gap-1 ml-auto text-sm text-teal-600 hover:underline">
                                  <ExternalLink className="w-4 h-4" />Заказ #{item.orderId}
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {items.map(item => (
                <div key={item.id} className={`rounded-xl overflow-hidden border transition-all duration-200 shadow-sm ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'bg-[#3a4451] border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>#{item.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                        {STATUS_LABELS[item.status || ''] || 'Новая'}
                      </span>
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="px-3 py-2.5">
                    <div className={`font-medium text-sm mb-1 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.clientName}</div>
                    <div className={`text-xs mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.phone}</div>
                    <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.city?.name} · {item.site}</div>
                  </div>
                  <div className={`flex items-center justify-between px-3 py-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button onClick={() => editingId === item.id ? setEditingId(null) : startEdit(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isDark ? 'bg-[#3a4451] text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      Обработать
                    </button>
                    {item.orderId && <a href={`/orders/${item.orderId}`} className="text-xs text-teal-600 flex items-center gap-1"><ExternalLink className="w-3 h-3" />Заказ #{item.orderId}</a>}
                  </div>
                </div>
              ))}
            </div>
          </>
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
