'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'
import { ArrowLeft, Plus, CheckCircle, CreditCard, X } from 'lucide-react'

interface OperatorSalary {
  id: number
  operatorId: number
  operator?: { id: number; name: string }
  periodStart: string
  periodEnd: string
  ordersCount: number
  callsCount: number
  baseAmount: number
  bonusAmount: number
  penaltyAmount: number
  totalAmount: number
  status: string
  approvedBy: number | null
  approvedAt: string | null
  paidAt: string | null
  note: string | null
  createdAt: string
}

interface Operator { id: number; name: string }

const STATUS_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'draft', label: 'Черновик' },
  { value: 'approved', label: 'Одобрено' },
  { value: 'paid', label: 'Выплачено' },
]
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
}
const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  approved: 'Одобрено',
  paid: 'Выплачено',
}

export default function OperatorSalaryPage() {
  const router = useRouter()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<OperatorSalary[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('draft')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [processing, setProcessing] = useState<number | null>(null)
  const [operators, setOperators] = useState<Operator[]>([])

  // Add form
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({
    operatorId: '',
    periodStart: '',
    periodEnd: '',
    ordersCount: '',
    callsCount: '',
    baseAmount: '',
    bonusAmount: '0',
    penaltyAmount: '0',
    note: '',
  })
  const [addSaving, setAddSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getOperatorSalaries({
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter || undefined,
      })
      if (res.success) {
        const data = res.data
        setItems(Array.isArray(data) ? data : (data?.items || data?.data || []))
        setTotal(data?.total || data?.pagination?.total || (Array.isArray(data) ? data.length : 0))
      }
    } catch { toast.error('Не удалось загрузить зарплаты') }
    finally { setIsLoading(false) }
  }

  useEffect(() => {
    apiClient.getOperators().then(r => {
      if (r.success) setOperators(Array.isArray(r.data) ? r.data : (r.data?.data || []))
    }).catch(() => {})
  }, [])

  useEffect(() => { load() }, [currentPage, statusFilter])
  useEffect(() => { setCurrentPage(1) }, [statusFilter])

  const doApprove = async (id: number) => {
    setProcessing(id)
    try { await apiClient.approveOperatorSalary(id); toast.success('Начисление одобрено'); await load() }
    catch (e: any) { toast.error(e.message || 'Ошибка') }
    finally { setProcessing(null) }
  }

  const doPay = async (id: number) => {
    setProcessing(id)
    try { await apiClient.markOperatorSalaryPaid(id); toast.success('Выплата отмечена'); await load() }
    catch (e: any) { toast.error(e.message || 'Ошибка') }
    finally { setProcessing(null) }
  }

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.operatorId || !addForm.periodStart || !addForm.periodEnd || !addForm.baseAmount) {
      toast.error('Заполните обязательные поля')
      return
    }
    setAddSaving(true)
    try {
      await apiClient.createOperatorSalary({
        operatorId: Number(addForm.operatorId),
        periodStart: addForm.periodStart,
        periodEnd: addForm.periodEnd,
        ordersCount: addForm.ordersCount ? Number(addForm.ordersCount) : undefined,
        callsCount: addForm.callsCount ? Number(addForm.callsCount) : undefined,
        baseAmount: Number(addForm.baseAmount),
        bonusAmount: Number(addForm.bonusAmount),
        penaltyAmount: Number(addForm.penaltyAmount),
        note: addForm.note || undefined,
      })
      toast.success('Начисление создано')
      setShowAdd(false)
      setAddForm({ operatorId: '', periodStart: '', periodEnd: '', ordersCount: '', callsCount: '', baseAmount: '', bonusAmount: '0', penaltyAmount: '0', note: '' })
      await load()
    } catch (e: any) { toast.error(e.message || 'Ошибка создания') }
    finally { setAddSaving(false) }
  }

  const totalPages = Math.ceil(total / itemsPerPage)

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`
  const selectCls = `px-3 py-2 rounded-lg text-sm border ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/salary')} className={`flex items-center gap-1 text-sm mb-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <ArrowLeft className="w-4 h-4" /> Зарплата
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Зарплата операторов</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Начисления и выплаты</p>
        </div>
        <div className="flex gap-2">
          <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Начислить
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={submitAdd} className={`mb-6 p-5 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-teal-50 border-teal-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`font-medium text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Новое начисление</div>
            <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Оператор *</label>
              <select required className={inputCls} value={addForm.operatorId} onChange={e => setAddForm({...addForm, operatorId: e.target.value})}>
                <option value="">Выберите оператора</option>
                {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Период с *</label>
              <input required type="date" className={inputCls} value={addForm.periodStart} onChange={e => setAddForm({...addForm, periodStart: e.target.value})} />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Период по *</label>
              <input required type="date" className={inputCls} value={addForm.periodEnd} onChange={e => setAddForm({...addForm, periodEnd: e.target.value})} />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Кол-во заказов</label>
              <input type="number" min="0" className={inputCls} value={addForm.ordersCount} onChange={e => setAddForm({...addForm, ordersCount: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Кол-во звонков</label>
              <input type="number" min="0" className={inputCls} value={addForm.callsCount} onChange={e => setAddForm({...addForm, callsCount: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Базовая часть ₽ *</label>
              <input required type="number" min="0" className={inputCls} value={addForm.baseAmount} onChange={e => setAddForm({...addForm, baseAmount: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Премия ₽</label>
              <input type="number" min="0" className={inputCls} value={addForm.bonusAmount} onChange={e => setAddForm({...addForm, bonusAmount: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Штраф ₽</label>
              <input type="number" min="0" className={inputCls} value={addForm.penaltyAmount} onChange={e => setAddForm({...addForm, penaltyAmount: e.target.value})} placeholder="0" />
            </div>
            <div className="sm:col-span-3">
              <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Заметка</label>
              <input className={inputCls} value={addForm.note} onChange={e => setAddForm({...addForm, note: e.target.value})} placeholder="Необязательный комментарий" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button type="submit" disabled={addSaving} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50">
              {addSaving ? 'Создание...' : 'Создать начисление'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>Отмена</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className={`border-b-2 ${isDark ? 'border-teal-900/40 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'}`}>
                  {['Оператор', 'Период', 'Заказов', 'Звонков', 'База', 'Премия', 'Штраф', 'Итого', 'Статус', 'Действия'].map(h => (
                    <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={10} className={`py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет начислений</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={`border-b ${isDark ? 'border-gray-700/50 hover:bg-[#2a3441]' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.operator?.name || `#${item.operatorId}`}</td>
                    <td className={`py-3 px-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(item.periodStart).toLocaleDateString('ru-RU')} — {new Date(item.periodEnd).toLocaleDateString('ru-RU')}
                    </td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.ordersCount}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.callsCount}</td>
                    <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{Number(item.baseAmount).toLocaleString('ru-RU')} ₽</td>
                    <td className={`py-3 px-3 text-green-600`}>{Number(item.bonusAmount) > 0 ? `+${Number(item.bonusAmount).toLocaleString('ru-RU')} ₽` : '—'}</td>
                    <td className={`py-3 px-3 text-red-500`}>{Number(item.penaltyAmount) > 0 ? `-${Number(item.penaltyAmount).toLocaleString('ru-RU')} ₽` : '—'}</td>
                    <td className={`py-3 px-3 font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{Number(item.totalAmount).toLocaleString('ru-RU')} ₽</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-1">
                        {item.status === 'draft' && (
                          <button onClick={() => doApprove(item.id)} disabled={processing === item.id} title="Одобрить" className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-600 hover:bg-blue-50'}`}>
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'approved' && (
                          <button onClick={() => doPay(item.id)} disabled={processing === item.id} title="Отметить выплаченным" className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'text-green-400 hover:bg-green-900/30' : 'text-green-600 hover:bg-green-50'}`}>
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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
