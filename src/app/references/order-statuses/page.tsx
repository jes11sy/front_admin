'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { dashboardStyles } from '@/lib/dashboard-ui'

interface OrderStatus {
  id: number
  name: string
  code: string
  color: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
}

interface FormState {
  name: string
  code: string
  color: string
  sortOrder: number
  isActive: boolean
}

const emptyForm: FormState = { name: '', code: '', color: '#6b7280', sortOrder: 0, isActive: true }

export default function OrderStatusesPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  const ds = dashboardStyles(isDark)

  const [items, setItems] = useState<OrderStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getOrderStatusesList()
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : []
        setItems(data.sort((a: OrderStatus, b: OrderStatus) => a.sortOrder - b.sortOrder))
      }
    } catch { toast.error('Не удалось загрузить статусы') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: OrderStatus) => {
    setEditingId(item.id)
    setForm({ name: item.name, code: item.code, color: item.color || '#6b7280', sortOrder: item.sortOrder, isActive: item.isActive })
    setShowAdd(false)
  }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Заполните название и код'); return }
    setSaving(true)
    try {
      if (editingId) { await apiClient.updateOrderStatus(editingId, form); toast.success('Обновлено') }
      else { await apiClient.createOrderStatus(form); toast.success('Добавлено') }
      setEditingId(null); setShowAdd(false); setForm(emptyForm); await load()
    } catch (e: any) { toast.error(e.message || 'Ошибка') }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить статус заказа?')) return
    try { await apiClient.deleteOrderStatus(id); toast.success('Удалено'); setItems(items.filter(i => i.id !== id)) }
    catch (e: any) { toast.error(e.message || 'Ошибка удаления') }
  }

  const FormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className={`mb-2 block ${ds.sectionLabel}`}>Название</label>
        <input className={ds.input} placeholder="Новый, В работе..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className={`mb-2 block ${ds.sectionLabel}`}>Код</label>
        <input className={ds.input} placeholder="new, in_progress..." value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase() })} />
      </div>
      <div>
        <label className={`mb-2 block ${ds.sectionLabel}`}>Цвет</label>
        <div className="flex gap-2">
          <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-11 w-12 cursor-pointer rounded-xl border border-black/10" />
          <input className={ds.input} placeholder="#FF5733" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={`mb-2 block ${ds.sectionLabel}`}>Порядок</label>
        <input type="number" className={ds.input} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} />
      </div>
      <div className="flex items-center gap-2 pt-6 sm:pt-8">
        <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className={`rounded h-4 w-4 ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`} />
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Активен</span>
      </div>
    </div>
  )

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={ds.title}>Статусы заказов</h1>
            <p className={ds.subtitle}>Цвета и порядок в воронке и списках заказов.</p>
          </div>
          <button type="button" onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }} className={`${ds.primaryBtn} shrink-0`}>
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>

        {showAdd && (
          <div className={`${ds.panelPadded} mb-6`}>
            <div className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#111113]'}`}>Новый статус</div>
            <FormFields />
            <div className="flex gap-2 mt-6 flex-wrap">
              <button type="button" onClick={save} disabled={saving} className={ds.primaryBtn}><Check className="w-4 h-4" />{saving ? 'Сохранение...' : 'Сохранить'}</button>
              <button type="button" onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={ds.secondaryBtn}><X className="w-4 h-4" />Отмена</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={ds.spinner} />
            <p className={`mt-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Загрузка...</p>
          </div>
        ) : (
          <div className={ds.tableScroll}>
            <div className={ds.tableWrap}>
              <table className="w-full border-collapse text-sm min-w-[800px]">
                <thead>
                  <tr className={ds.theadRow}>
                    {['ID', 'Название', 'Код', 'Цвет', 'Порядок', 'Статус', 'Действия'].map(h => (
                      <th key={h} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={7} className={`${ds.td} text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} className={ds.tr}>
                      {editingId === item.id ? (
                        <td colSpan={7} className={`${ds.td} align-top`}>
                          <FormFields />
                          <div className="flex gap-2 mt-4">
                            <button type="button" onClick={save} disabled={saving} className={ds.primaryBtn}><Check className="w-4 h-4" />{saving ? 'Сохр...' : 'Сохранить'}</button>
                            <button type="button" onClick={cancelEdit} className={ds.secondaryBtn}><X className="w-4 h-4" />Отмена</button>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className={`${ds.td} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.id}</td>
                          <td className={ds.td}>
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: item.color || '#6b7280' }}>
                              {item.name}
                            </span>
                          </td>
                          <td className={`${ds.td} font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.code}</td>
                          <td className={ds.td}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: item.color || '#6b7280' }} />
                              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.color || '—'}</span>
                            </div>
                          </td>
                          <td className={`${ds.td} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.sortOrder}</td>
                          <td className={ds.td}>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.isActive ? (isDark ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-800') : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                              {item.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className={ds.td}>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEdit(item)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/10' : 'text-gray-500 hover:bg-black/[0.04]'}`}><Pencil className="w-4 h-4" /></button>
                              <button type="button" onClick={() => remove(item.id)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-red-950/40' : 'text-gray-500 hover:bg-red-50'}`}><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
