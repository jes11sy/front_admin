'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

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
  const router = useRouter()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

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

  const inputCls = `w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`

  const FormFields = ({ inline = false }: { inline?: boolean }) => (
    <div className={`${inline ? 'flex gap-3 flex-wrap items-end' : 'grid grid-cols-2 sm:grid-cols-3 gap-3'}`}>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Название</label>
        <input className={inputCls} placeholder="Новый, В работе..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      </div>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Код</label>
        <input className={inputCls} placeholder="new, in_progress..." value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} />
      </div>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Цвет</label>
        <div className="flex gap-2">
          <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="h-9 w-10 rounded border border-gray-300 cursor-pointer" />
          <input className={inputCls} placeholder="#FF5733" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
        </div>
      </div>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Порядок</label>
        <input type="number" className={inputCls} value={form.sortOrder} onChange={e => setForm({...form, sortOrder: Number(e.target.value)})} />
      </div>
      <div className="flex items-center gap-2 pt-4">
        <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
        <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Активен</span>
      </div>
    </div>
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/references')} className={`flex items-center gap-1 text-sm mb-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <ArrowLeft className="w-4 h-4" /> Справочники
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Статусы заказов</h1>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-[#2a3441] border-teal-700/40' : 'bg-teal-50 border-teal-200'}`}>
          <div className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Новый статус</div>
          <FormFields />
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Сохранение...' : 'Сохранить'}</button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}><X className="w-4 h-4" />Отмена</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className={`border-b-2 ${isDark ? 'border-teal-900/40 bg-[#2a3441]' : 'border-gray-200 bg-gray-50'}`}>
                {['ID', 'Название', 'Код', 'Цвет', 'Порядок', 'Статус', 'Действия'].map(h => (
                  <th key={h} className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Нет данных</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`border-b ${isDark ? 'border-gray-700/50 hover:bg-[#2a3441]' : 'border-gray-100 hover:bg-gray-50'}`}>
                  {editingId === item.id ? (
                    <td colSpan={7} className="py-3 px-4">
                      <FormFields />
                      <div className="flex gap-2 mt-3">
                        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Сохр...' : 'Сохранить'}</button>
                        <button onClick={cancelEdit} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}><X className="w-4 h-4" />Отмена</button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: item.color || '#6b7280' }}>
                          {item.name}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.code}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: item.color || '#6b7280' }} />
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.color || '—'}</span>
                        </div>
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.sortOrder}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'Активен' : 'Неактивен'}</span></td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(item)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-teal-400 hover:bg-teal-900/30' : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'}`}><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(item.id)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
