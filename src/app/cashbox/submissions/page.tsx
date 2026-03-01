'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { ArrowLeft, CheckCircle, XCircle, ExternalLink } from 'lucide-react'

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

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'pending', label: 'Ожидает' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'rejected', label: 'Отклонено' },
]

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  approved: 'Одобрено',
  rejected: 'Отклонено',
}

export default function CashSubmissionsPage() {
  const router = useRouter()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<CashSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [processing, setProcessing] = useState<number | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getCashSubmissions({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch (e) {
      logger.error('Error loading cash submissions', { error: String(e) })
      toast.error('Не удалось загрузить сдачи кассы')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [currentPage, statusFilter])
  useEffect(() => { setCurrentPage(1) }, [statusFilter])

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

  const selectCls = `px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/cashbox')} className={`flex items-center gap-1 text-sm mb-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <ArrowLeft className="w-4 h-4" /> Касса
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Сдача кассы</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Подтверждение сдачи денег мастерами по заказам {total > 0 && `— всего ${total}`}</p>
        </div>
        <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={`border-b-2 ${isDark ? 'border-teal-900/40 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'}`}>
                  {['ID', 'Заказ', 'Мастер', 'Город', 'Сумма', 'Статус', 'Дата сдачи', 'Действия'].map(h => (
                    <th key={h} className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} className={`py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {statusFilter === 'pending' ? 'Нет заявок, ожидающих подтверждения' : 'Нет данных'}
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={`border-b ${isDark ? 'border-gray-700/50 hover:bg-[#2a3441]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                    <td className="py-3 px-4">
                      <a href={`/orders/${item.orderId}`} className="flex items-center gap-1 text-teal-600 hover:underline text-sm">
                        #{item.orderId} {item.order?.clientName && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({item.order.clientName})</span>}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.order?.master?.name || '—'}</td>
                    <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.order?.city?.name || '—'}</td>
                    <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      {Number(item.amount).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className={`py-3 px-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => approve(item.id, true)}
                            disabled={processing === item.id}
                            title="Одобрить"
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => approve(item.id, false)}
                            disabled={processing === item.id}
                            title="Отклонить"
                            className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {item.status !== 'pending' && item.receiptDoc && (
                        <a href={item.receiptDoc} target="_blank" rel="noreferrer" className="text-xs text-teal-600 underline hover:no-underline">Чек</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
