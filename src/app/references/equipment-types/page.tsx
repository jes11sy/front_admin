'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { dashboardStyles } from '@/lib/dashboard-ui'

interface EquipmentType { id: number; name: string; isActive: boolean; createdAt: string }
interface FormState { name: string; isActive: boolean }
const emptyForm: FormState = { name: '', isActive: true }

export default function EquipmentTypesPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  const ds = dashboardStyles(isDark)

  const [items, setItems] = useState<EquipmentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getEquipmentTypesList()
      if (res.success) setItems(Array.isArray(res.data) ? res.data : [])
    } catch { toast.error('Не удалось загрузить типы оборудования') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: EquipmentType) => { setEditingId(item.id); setForm({ name: item.name, isActive: item.isActive }); setShowAdd(false) }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Введите название'); return }
    setSaving(true)
    try {
      if (editingId) { await apiClient.updateEquipmentType(editingId, form); toast.success('Обновлено') }
      else { await apiClient.createEquipmentType(form); toast.success('Добавлено') }
      setEditingId(null); setShowAdd(false); setForm(emptyForm); await load()
    } catch (e: any) { toast.error(e.message || 'Ошибка') }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить тип оборудования?')) return
    try { await apiClient.deleteEquipmentType(id); toast.success('Удалено'); setItems(items.filter(i => i.id !== id)) }
    catch (e: any) { toast.error(e.message || 'Ошибка удаления') }
  }

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={ds.title}>Типы оборудования</h1>
            <p className={ds.subtitle}>Справочник для карточек заказов и отчётов.</p>
          </div>
          <button type="button" onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }} className={`${ds.primaryBtn} shrink-0`}>
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>

        {showAdd && (
          <div className={`${ds.panelPadded} mb-6`}>
            <div className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#111113]'}`}>Новый тип</div>
            <div className="flex gap-3 items-end flex-wrap">
              <input
                className={`${ds.input} max-w-xl flex-1 min-w-[220px]`}
                placeholder="Название (холодильник, стиральная машина...)"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className={`rounded ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`} />
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Активен</span>
              </label>
              <button type="button" onClick={save} disabled={saving} className={ds.primaryBtn}><Check className="w-4 h-4" />{saving ? 'Сохр...' : 'Сохранить'}</button>
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
              <table className="w-full border-collapse text-sm min-w-[560px]">
                <thead>
                  <tr className={ds.theadRow}>
                    {['ID', 'Название', 'Статус', 'Действия'].map(h => (
                      <th key={h} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr><td colSpan={4} className={`${ds.td} text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td></tr>
                  ) : items.map(item => (
                    <tr key={item.id} className={ds.tr}>
                      {editingId === item.id ? (
                        <>
                          <td className={`${ds.td} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.id}</td>
                          <td className={ds.td}><input className={ds.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></td>
                          <td className={ds.td}>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className={`rounded ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`} />
                              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{form.isActive ? 'Активен' : 'Неактивен'}</span>
                            </label>
                          </td>
                          <td className={ds.td}>
                            <div className="flex gap-1">
                              <button type="button" onClick={save} disabled={saving} className={`p-2 rounded-xl ${ds.linkAccent}`}><Check className="w-4 h-4" /></button>
                              <button type="button" onClick={cancelEdit} className={`p-2 rounded-xl ${isDark ? 'text-gray-500 hover:bg-white/10' : 'text-gray-400 hover:bg-black/[0.04]'}`}><X className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={`${ds.td} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.id}</td>
                          <td className={`${ds.td} font-medium`}>{item.name}</td>
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
