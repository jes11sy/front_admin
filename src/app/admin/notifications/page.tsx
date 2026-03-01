'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

interface NotificationLog {
  id: number
  userId: number
  userType: string
  channel: string
  message: string
  status: string
  error: string | null
  metadata: any
  createdAt: string
}

const CHANNEL_LABELS: Record<string, string> = { telegram: 'Telegram', sms: 'SMS', email: 'Email' }
const STATUS_LABELS: Record<string, string> = { sent: 'Отправлено', failed: 'Ошибка', pending: 'Ожидает' }
const USER_TYPE_LABELS: Record<string, string> = {
  operator: 'Оператор', director: 'Директор', master: 'Мастер', admin: 'Администратор',
}

function getChannelStyle(channel: string, isDark: boolean) {
  if (isDark) {
    switch (channel) {
      case 'telegram': return 'bg-blue-900/40 text-blue-300'
      case 'sms': return 'bg-purple-900/40 text-purple-300'
      case 'email': return 'bg-orange-900/30 text-orange-300'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (channel) {
    case 'telegram': return 'bg-blue-100 text-blue-700'
    case 'sms': return 'bg-purple-100 text-purple-700'
    case 'email': return 'bg-orange-100 text-orange-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'sent': return 'bg-green-900/40 text-green-300'
      case 'failed': return 'bg-red-900/40 text-red-300'
      case 'pending': return 'bg-yellow-900/40 text-yellow-300'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (status) {
    case 'sent': return 'bg-green-100 text-green-700'
    case 'failed': return 'bg-red-100 text-red-700'
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

const CHANNELS = [
  { value: 'all', label: 'Все каналы' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
]
const STATUSES = [
  { value: 'all', label: 'Все статусы' },
  { value: 'sent', label: 'Отправлено' },
  { value: 'failed', label: 'Ошибка' },
  { value: 'pending', label: 'Ожидает' },
]
const USER_TYPES = [
  { value: 'all', label: 'Все' },
  { value: 'operator', label: 'Оператор' },
  { value: 'director', label: 'Директор' },
  { value: 'master', label: 'Мастер' },
  { value: 'admin', label: 'Администратор' },
]

export default function NotificationsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

  const [items, setItems] = useState<NotificationLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<NotificationLog | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userTypeFilter, setUserTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [draftChannel, setDraftChannel] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [draftUserType, setDraftUserType] = useState('')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getNotificationLogs({
        page: currentPage,
        limit: itemsPerPage,
        channel: channelFilter || undefined,
        status: statusFilter || undefined,
        userType: userTypeFilter || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить логи уведомлений')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [currentPage, channelFilter, statusFilter, userTypeFilter, dateFrom, dateTo])
  useEffect(() => { setCurrentPage(1) }, [channelFilter, statusFilter, userTypeFilter, dateFrom, dateTo])

  const openFilters = () => {
    setDraftChannel(channelFilter)
    setDraftStatus(statusFilter)
    setDraftUserType(userTypeFilter)
    setDraftDateFrom(dateFrom)
    setDraftDateTo(dateTo)
    setShowFilters(true)
  }

  const applyFilters = () => {
    setChannelFilter(draftChannel)
    setStatusFilter(draftStatus)
    setUserTypeFilter(draftUserType)
    setDateFrom(draftDateFrom)
    setDateTo(draftDateTo)
    setShowFilters(false)
  }

  const resetFilters = () => {
    setDraftChannel(''); setDraftStatus(''); setDraftUserType(''); setDraftDateFrom(''); setDraftDateTo('')
  }

  const totalPages = Math.ceil(total / itemsPerPage)
  const activeFiltersCount = (channelFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (userTypeFilter ? 1 : 0) + (dateFrom || dateTo ? 1 : 0)

  const sentCount = items.filter(i => i.status === 'sent').length
  const failedCount = items.filter(i => i.status === 'failed').length
  const pendingCount = items.filter(i => i.status === 'pending').length

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-gray-50 border-gray-200 text-gray-800'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Отправлено', value: sentCount, icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: isDark ? 'text-green-400' : 'text-green-600' },
            { label: 'Ошибки', value: failedCount, icon: <XCircle className="w-5 h-5 text-red-500" />, color: isDark ? 'text-red-400' : 'text-red-600' },
            { label: 'Ожидает', value: pendingCount, icon: <Clock className="w-5 h-5 text-yellow-500" />, color: isDark ? 'text-yellow-400' : 'text-yellow-600' },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-4 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
                {s.icon}
              </div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter button */}
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
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 ${isDark ? 'border-[#1e2530]' : 'border-white'}`} />
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button onClick={() => { setChannelFilter(''); setStatusFilter(''); setUserTypeFilter(''); setDateFrom(''); setDateTo('') }}
                className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}>
                Сбросить фильтры
              </button>
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
                <button onClick={() => setShowFilters(false)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-[#3a4451]' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-4 space-y-4">
                {[
                  { title: 'Канал', options: CHANNELS, value: draftChannel, set: setDraftChannel },
                  { title: 'Статус', options: STATUSES, value: draftStatus, set: setDraftStatus },
                  { title: 'Получатель', options: USER_TYPES, value: draftUserType, set: setDraftUserType },
                ].map(({ title, options, value, set }) => (
                  <div key={title} className="space-y-2">
                    <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{title}</h3>
                    <div className="flex flex-col gap-1.5">
                      {options.map(o => (
                        <button key={o.value} onClick={() => set(o.value === 'all' ? '' : o.value)}
                          className={`px-3 py-2 border rounded-lg text-sm font-medium transition-all text-left ${
                            (value === o.value) || (o.value === 'all' && !value)
                              ? isDark ? 'bg-teal-900/50 border-teal-600 text-teal-400' : 'bg-teal-50 border-teal-300 text-teal-700'
                              : isDark ? 'bg-[#3a4451] hover:bg-teal-900/30 border-gray-600 hover:border-teal-600 text-gray-300 hover:text-teal-400' : 'bg-gray-50 hover:bg-teal-50 border-gray-200 hover:border-teal-300 text-gray-700 hover:text-teal-700'
                          }`}>{o.label}</button>
                      ))}
                    </div>
                    <hr className={isDark ? 'border-gray-700' : 'border-gray-200'} />
                  </div>
                ))}
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
                  {['', 'Дата', 'Получатель', 'Канал', 'Сообщение', 'Статус'].map((h, i) => (
                    <th key={i} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <>
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      className={`border-b transition-colors cursor-pointer ${
                        selectedItem?.id === item.id
                          ? isDark ? 'bg-teal-900/20 border-gray-700' : 'bg-teal-50 border-gray-200'
                          : isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        {item.status === 'sent' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                        {item.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                      </td>
                      <td className={`py-2.5 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`py-2.5 px-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        #{item.userId} · <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{USER_TYPE_LABELS[item.userType] || item.userType}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getChannelStyle(item.channel, isDark)}`}>
                          {CHANNEL_LABELS[item.channel] || item.channel}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <p className="truncate">{item.message}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                    </tr>
                    {selectedItem?.id === item.id && (
                      <tr key={`${item.id}-detail`} className={isDark ? 'bg-[#1e2530]' : 'bg-gray-50'}>
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Текст сообщения</div>
                              <div className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-all ${isDark ? 'bg-[#2a3441] text-gray-300' : 'bg-white border border-gray-200 text-gray-700'}`}>
                                {item.message}
                              </div>
                            </div>
                            {(item.error || item.metadata) && (
                              <div className="space-y-3">
                                {item.error && (
                                  <div>
                                    <div className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1 text-red-500">
                                      <AlertTriangle className="w-3 h-3" />Ошибка
                                    </div>
                                    <div className={`p-3 rounded-lg text-xs font-mono ${isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>{item.error}</div>
                                  </div>
                                )}
                                {item.metadata && (
                                  <div>
                                    <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Метаданные</div>
                                    <div className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-all ${isDark ? 'bg-[#2a3441] text-gray-300' : 'bg-white border border-gray-200 text-gray-600'}`}>
                                      {JSON.stringify(item.metadata, null, 2)}
                                    </div>
                                  </div>
                                )}
                              </div>
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
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Уведомлений не найдено</p>
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
