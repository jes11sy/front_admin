'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'

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
      case 'pending': return 'bg-yellow-900/40 text-yellow-300'
      case 'approved': return 'bg-green-900/40 text-green-300'
      case 'rejected': return 'bg-red-900/40 text-red-300'
      default: return 'bg-gray-700 text-gray-400'
    }
  }
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700'
    case 'approved': return 'bg-green-100 text-green-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export default function CashSubmissionsPage() {
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'

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
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-4 py-6">

        {/* Tabs */}
        <div className="mb-4">
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
                  {['ID', 'Заказ', 'Мастер', 'Город', 'Сумма', 'Статус', 'Дата сдачи', 'Действия'].map(h => (
                    <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                    <td className="py-3 px-3">
                      <a href={`/orders/${item.orderId}`} className="flex items-center gap-1 text-teal-600 hover:underline">
                        #{item.orderId}
                        {item.order?.clientName && <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>({item.order.clientName})</span>}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.order?.master?.name || '—'}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.order?.city?.name || '—'}</td>
                    <td className={`py-3 px-3 font-semibold ${isDark ? 'text-teal-400' : 'text-green-600'}`}>
                      {Number(item.amount).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(item.status, isDark)}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.submittedAt ? new Date(item.submittedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="py-3 px-3">
                      {item.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => approve(item.id, true)}
                            disabled={processing === item.id}
                            title="Одобрить"
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}
                          ><CheckCircle className="w-4 h-4" /></button>
                          <button
                            onClick={() => approve(item.id, false)}
                            disabled={processing === item.id}
                            title="Отклонить"
                            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-red-400 hover:bg-red-900/30' : 'text-red-600 hover:bg-red-50'}`}
                          ><XCircle className="w-4 h-4" /></button>
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
        )}

        {/* Empty */}
        {!isLoading && items.length === 0 && (
          <div className={`text-center py-16 rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
            <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {statusTab === 'pending' ? 'Нет заявок, ожидающих подтверждения' : 'Данных нет'}
            </p>
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
