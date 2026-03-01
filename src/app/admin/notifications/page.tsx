'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { CheckCircle, XCircle, Clock, MessageSquare, Send, AlertTriangle } from 'lucide-react'

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
const CHANNEL_COLORS: Record<string, string> = {
  telegram: 'bg-blue-100 text-blue-700',
  sms: 'bg-purple-100 text-purple-700',
  email: 'bg-orange-100 text-orange-700',
}
const STATUS_LABELS: Record<string, string> = { sent: 'Отправлено', failed: 'Ошибка', pending: 'Ожидает' }
const STATUS_COLORS: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
}
const USER_TYPE_LABELS: Record<string, string> = {
  operator: 'Оператор',
  director: 'Директор',
  master: 'Мастер',
  admin: 'Администратор',
}

export default function NotificationsPage() {
  const theme = useDesignStore((state) => state.theme)
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
    } catch (e) {
      toast.error('Не удалось загрузить логи уведомлений')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [currentPage, channelFilter, statusFilter, userTypeFilter, dateFrom, dateTo])
  useEffect(() => { setCurrentPage(1) }, [channelFilter, statusFilter, userTypeFilter, dateFrom, dateTo])

  const totalPages = Math.ceil(total / itemsPerPage)
  const hasFilters = channelFilter || statusFilter || userTypeFilter || dateFrom || dateTo

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'sent') return <CheckCircle className="w-4 h-4 text-green-500" />
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-500" />
    return <Clock className="w-4 h-4 text-yellow-500" />
  }

  const selectCls = `px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  // Quick stats from current page
  const sentCount = items.filter(i => i.status === 'sent').length
  const failedCount = items.filter(i => i.status === 'failed').length
  const pendingCount = items.filter(i => i.status === 'pending').length

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Логи уведомлений</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Telegram, SMS, Email — история отправки {total > 0 && `— всего ${total}`}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Отправлено', value: sentCount, icon: <CheckCircle className="w-5 h-5 text-green-500" />, color: 'text-green-600' },
          { label: 'Ошибки', value: failedCount, icon: <XCircle className="w-5 h-5 text-red-500" />, color: 'text-red-600' },
          { label: 'Ожидает', value: pendingCount, icon: <Clock className="w-5 h-5 text-yellow-500" />, color: 'text-yellow-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${isDark ? 'bg-[#2a3441] border-gray-700/50' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</div>
              {s.icon}
            </div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={`mb-5 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Канал</label>
              <select className={selectCls} value={channelFilter} onChange={e => setChannelFilter(e.target.value)}>
                <option value="">Все каналы</option>
                <option value="telegram">Telegram</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
              <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Все</option>
                <option value="sent">Отправлено</option>
                <option value="failed">Ошибка</option>
                <option value="pending">Ожидает</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Получатель</label>
              <select className={selectCls} value={userTypeFilter} onChange={e => setUserTypeFilter(e.target.value)}>
                <option value="">Все</option>
                <option value="operator">Оператор</option>
                <option value="director">Директор</option>
                <option value="master">Мастер</option>
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
              <button onClick={() => { setChannelFilter(''); setStatusFilter(''); setUserTypeFilter(''); setDateFrom(''); setDateTo('') }} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
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
                  {['', 'Дата', 'Получатель', 'Тип', 'Канал', 'Сообщение', 'Статус'].map((h, i) => (
                    <th key={i} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={7} className={`py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td></tr>
                ) : items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                    className={`border-b cursor-pointer transition-colors ${
                      selectedItem?.id === item.id
                        ? isDark ? 'bg-teal-900/20 border-teal-800/50' : 'bg-teal-50 border-teal-200'
                        : isDark ? 'border-gray-700/50 hover:bg-[#2a3441]' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <td className="py-2 px-3"><StatusIcon status={item.status} /></td>
                    <td className={`py-2 px-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                    </td>
                    <td className={`py-2 px-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <div className="text-xs">#{item.userId}</div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{USER_TYPE_LABELS[item.userType] || item.userType}</div>
                    </td>
                    <td className={`py-2 px-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {USER_TYPE_LABELS[item.userType] || item.userType}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHANNEL_COLORS[item.channel] || 'bg-gray-100 text-gray-600'}`}>
                        {CHANNEL_LABELS[item.channel] || item.channel}
                      </span>
                    </td>
                    <td className={`py-2 px-3 max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <p className="truncate text-xs">{item.message}</p>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail row */}
          {selectedItem && (
            <div className={`mt-4 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-teal-50 border-teal-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Детали уведомления #{selectedItem.id}</span>
                <button onClick={() => setSelectedItem(null)} className={`text-xs ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>✕</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Полный текст сообщения</div>
                  <div className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-all ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-white text-gray-700'}`}>
                    {selectedItem.message}
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedItem.error && (
                    <div>
                      <div className={`text-xs font-medium mb-1 flex items-center gap-1 text-red-500`}>
                        <AlertTriangle className="w-3 h-3" />Ошибка
                      </div>
                      <div className={`p-3 rounded-lg text-xs font-mono ${isDark ? 'bg-red-900/20 text-red-300' : 'bg-red-50 text-red-700'}`}>
                        {selectedItem.error}
                      </div>
                    </div>
                  )}
                  {selectedItem.metadata && (
                    <div>
                      <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Метаданные</div>
                      <div className={`p-3 rounded-lg text-xs font-mono whitespace-pre-wrap break-all ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-white text-gray-600'}`}>
                        {JSON.stringify(selectedItem.metadata, null, 2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
