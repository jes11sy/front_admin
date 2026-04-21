'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'
import { dashboardStyles } from '@/lib/dashboard-ui'

interface CashSubmission {
  id: number
  orderId: number
  order?: {
    id: number
    clientName: string
    city?: { id: number; name: string }
    master?: { id: number; name: string }
  }
  status: string
  amount: number
  receiptDoc: string | null
  submittedAt: string | null
  approvedBy: number | null
  approvedAt: string | null
  createdAt: string
}

const STATUS_TABS = [
  { value: 'pending', label: 'Ожидает' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
  { value: '', label: 'Все' },
]

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает', approved: 'Одобрено', rejected: 'Отклонено',
}

function getStatusStyle(status: string, isDark: boolean) {
  if (isDark) {
    switch (status) {
      case 'pending': return 'bg-amber-950/50 text-amber-300'
      case 'approved': return 'bg-emerald-950/50 text-emerald-300'
      case 'rejected': return 'bg-red-950/50 text-red-300'
      default: return 'bg-white/10 text-gray-400'
    }
  }
  switch (status) {
    case 'pending': return 'bg-amber-50 text-amber-800'
    case 'approved': return 'bg-emerald-50 text-emerald-800'
    case 'rejected': return 'bg-red-50 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function CashSubmissionsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  const ds = dashboardStyles(isDark)

  const [items, setItems] = useState<CashSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusTab, setStatusTab] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [processing, setProcessing] = useState<number | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getCashSubmissions({
        page: currentPage,
        limit: itemsPerPage,
        status: statusTab || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch {
      toast.error('Не удалось загрузить сдачи кассы')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [currentPage, statusTab])
  useEffect(() => { setCurrentPage(1) }, [statusTab])

  const approve = async (id: number, isApprove: boolean) => {
    setProcessing(id)
    try {
      await apiClient.approveCashSubmission(id, isApprove)
      toast.success(isApprove ? 'Сдача одобрена' : 'Сдача отклонена')
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка')
    } finally {
      setProcessing(null)
    }
  }

  const totalPages = Math.ceil(total / itemsPerPage)

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6">
          <h1 className={ds.title}>Сдачи кассы</h1>
          <p className={ds.subtitle}>Подтверждение наличных по заказам мастеров.</p>
        </div>

        <div className="mb-6 w-full max-w-md">
          <div className={ds.tabsPillTrack}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value || 'all'}
                type="button"
                onClick={() => setStatusTab(tab.value)}
                className={`${ds.tabPill} ${statusTab === tab.value ? ds.tabPillActive : ds.tabPillIdle}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

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
                    {['ID', 'Заказ', 'Мастер', 'Город', 'Сумма', 'Статус', 'Дата сдачи', 'Действия'].map(h => (
                      <th key={h} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className={ds.tr}>
                      <td className={`${ds.td} font-medium`}>{item.id}</td>
                      <td className={ds.td}>
                        <a href={`/orders/${item.orderId}`} className={`inline-flex items-center gap-1 font-medium ${ds.linkAccent}`}>
                          #{item.orderId}
                          {item.order?.clientName && <span className={`text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>({item.order.clientName})</span>}
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </td>
                      <td className={`${ds.td} ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.order?.master?.name || '—'}</td>
                      <td className={`${ds.td} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.order?.city?.name || '—'}</td>
                      <td className={`${ds.td} font-semibold tabular-nums ${isDark ? 'text-emerald-300' : 'text-[#0a4f42]'}`}>
                        {Number(item.amount).toLocaleString('ru-RU')} ₽
                      </td>
                      <td className={ds.td}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </td>
                      <td className={`${ds.td} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.submittedAt ? new Date(item.submittedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className={ds.td}>
                        {item.status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => approve(item.id, true)}
                              disabled={processing === item.id}
                              title="Одобрить"
                              className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${isDark ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            ><CheckCircle className="w-4 h-4" /></button>
                            <button
                              type="button"
                              onClick={() => approve(item.id, false)}
                              disabled={processing === item.id}
                              title="Отклонить"
                              className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${isDark ? 'text-red-400 hover:bg-red-950/40' : 'text-red-600 hover:bg-red-50'}`}
                            ><XCircle className="w-4 h-4" /></button>
                          </div>
                        )}
                        {item.status !== 'pending' && item.receiptDoc && (
                          <a href={item.receiptDoc} target="_blank" rel="noreferrer" className={`text-xs font-medium ${ds.linkAccent}`}>Чек</a>
                        )}
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
            <p className={ds.emptyTitle}>
              {statusTab === 'pending' ? 'Нет заявок, ожидающих подтверждения' : 'Данных нет'}
            </p>
            <p className={ds.emptyHint}>Смените фильтр статуса выше.</p>
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
