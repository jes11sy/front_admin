'use client'

import { Fragment, useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import { dashboardStyles } from '@/lib/dashboard-ui'

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
      case 'telegram': return 'bg-sky-950/50 text-sky-300'
      case 'sms': return 'bg-violet-950/50 text-violet-300'
      case 'email': return 'bg-orange-950/50 text-orange-300'
      default: return 'bg-white/10 text-gray-400'
    }
  }
  switch (channel) {
    case 'telegram': return 'bg-sky-50 text-sky-800'
    case 'sms': return 'bg-violet-50 text-violet-800'
    case 'email': return 'bg-orange-50 text-orange-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'sent': return 'bg-emerald-950/50 text-emerald-300'
      case 'failed': return 'bg-red-950/50 text-red-300'
      case 'pending': return 'bg-amber-950/50 text-amber-300'
      default: return 'bg-white/10 text-gray-400'
    }
  }
  switch (status) {
    case 'sent': return 'bg-emerald-50 text-emerald-800'
    case 'failed': return 'bg-red-50 text-red-700'
    case 'pending': return 'bg-amber-50 text-amber-800'
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
  const ds = dashboardStyles(isDark)

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

  const FilterSection = ({
    title,
    options,
    value,
    setValue,
  }: {
    title: string
    options: { value: string; label: string }[]
    value: string
    setValue: (v: string) => void
  }) => (
    <div className="space-y-4">
      <h3 className={ds.sectionLabel}>{title}</h3>
      <div className="flex flex-col gap-2">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => setValue(o.value === 'all' ? '' : o.value)}
            className={`min-h-[40px] px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 text-left border-0 shadow-sm ${
              (value === o.value) || (o.value === 'all' && !value)
                ? ds.filterOptionActive
                : ds.filterOptionIdle
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6">
          <h1 className={ds.title}>Уведомления</h1>
          <p className={ds.subtitle}>Логи отправки в Telegram, SMS и email.</p>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Отправлено (на странице)', value: sentCount, icon: <CheckCircle className="w-5 h-5 text-emerald-500" />, color: isDark ? 'text-emerald-400' : 'text-emerald-700' },
            { label: 'Ошибки', value: failedCount, icon: <XCircle className="w-5 h-5 text-red-500" />, color: isDark ? 'text-red-400' : 'text-red-600' },
            { label: 'Ожидает', value: pendingCount, icon: <Clock className="w-5 h-5 text-amber-500" />, color: isDark ? 'text-amber-300' : 'text-amber-700' },
          ].map(s => (
            <div key={s.label} className={ds.statCard}>
              <div className="flex items-center justify-between mb-1">
                <div className={ds.statLabel}>{s.label}</div>
                {s.icon}
              </div>
              <div className={`${ds.statValue} ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <button type="button" onClick={openFilters} className={ds.iconFilterBtn} title="Фильтры">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFiltersCount > 0 && (
              <span className={`absolute top-2 right-2 w-2 h-2 bg-[#b3261e] rounded-full border-2 ${isDark ? 'border-[#111113]' : 'border-[#f5f5f7]'}`} />
            )}
          </button>
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={() => { setChannelFilter(''); setStatusFilter(''); setUserTypeFilter(''); setDateFrom(''); setDateTo('') }}
              className={`text-xs transition-colors ${isDark ? 'text-gray-400 hover:text-red-400' : 'text-gray-500 hover:text-red-500'}`}
            >
              Сбросить фильтры
            </button>
          )}
        </div>

        <>
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 ${showFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${ds.drawerBackdrop}`}
            onClick={() => setShowFilters(false)}
            aria-hidden
          />
          <div className={`${ds.drawerPanel} transform transition-all duration-300 ease-out ${showFilters ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0 pointer-events-none'}`}>
            <div className={ds.drawerHeader}>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
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
              <FilterSection title="Канал" options={CHANNELS} value={draftChannel} setValue={setDraftChannel} />
              <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
              <FilterSection title="Статус" options={STATUSES} value={draftStatus} setValue={setDraftStatus} />
              <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
              <FilterSection title="Получатель" options={USER_TYPES} value={draftUserType} setValue={setDraftUserType} />
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
              <table className="w-full border-collapse text-sm min-w-[760px]">
                <thead>
                  <tr className={ds.theadRow}>
                    {['', 'Дата', 'Получатель', 'Канал', 'Сообщение', 'Статус'].map((h, i) => (
                      <th key={i} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <Fragment key={item.id}>
                      <tr
                        onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                        className={`${ds.tr} cursor-pointer ${selectedItem?.id === item.id ? (isDark ? 'bg-white/[0.06]' : 'bg-[#0a4f42]/[0.06]') : ''}`}
                      >
                        <td className={`${ds.td} w-10`}>
                          {item.status === 'sent' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                          {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-500" />}
                          {item.status === 'pending' && <Clock className="w-4 h-4 text-amber-500" />}
                        </td>
                        <td className={`${ds.td} ${isDark ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                          {new Date(item.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className={ds.td}>
                          #{item.userId} · <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{USER_TYPE_LABELS[item.userType] || item.userType}</span>
                        </td>
                        <td className={ds.td}>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getChannelStyle(item.channel, isDark)}`}>
                            {CHANNEL_LABELS[item.channel] || item.channel}
                          </span>
                        </td>
                        <td className={`${ds.td} max-w-xs`}>
                          <p className="truncate">{item.message}</p>
                        </td>
                        <td className={ds.td}>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </td>
                      </tr>
                      {selectedItem?.id === item.id && (
                        <tr className={isDark ? 'bg-white/[0.02]' : 'bg-gray-50/80'}>
                          <td colSpan={6} className="px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                              <div>
                                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${ds.sectionLabel}`}>Текст сообщения</div>
                                <div className={`p-3 rounded-2xl text-xs font-mono whitespace-pre-wrap break-all border ${isDark ? 'bg-white/[0.04] border-white/10 text-gray-200' : 'bg-white border-black/[0.08] text-gray-700'}`}>
                                  {item.message}
                                </div>
                              </div>
                              {(item.error || item.metadata) && (
                                <div className="space-y-3">
                                  {item.error && (
                                    <div>
                                      <div className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1 text-red-500">
                                        <AlertTriangle className="w-3 h-3" />Ошибка
                                      </div>
                                      <div className={`p-3 rounded-2xl text-xs font-mono border ${isDark ? 'bg-red-950/40 border-red-900/50 text-red-200' : 'bg-red-50 border-red-100 text-red-800'}`}>{item.error}</div>
                                    </div>
                                  )}
                                  {item.metadata && (
                                    <div>
                                      <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${ds.sectionLabel}`}>Метаданные</div>
                                      <div className={`p-3 rounded-2xl text-xs font-mono whitespace-pre-wrap break-all border ${isDark ? 'bg-white/[0.04] border-white/10 text-gray-300' : 'bg-white border-black/[0.08] text-gray-600'}`}>
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
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className={ds.emptyState}>
            <p className={ds.emptyTitle}>Уведомлений не найдено</p>
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
