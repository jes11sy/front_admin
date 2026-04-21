'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { dashboardStyles } from '@/lib/dashboard-ui'

interface Rk {
  id: number
  name: string
  code: string
  isActive: boolean
  createdAt: string
}

interface FormState { name: string; code: string; isActive: boolean }
const emptyForm: FormState = { name: '', code: '', isActive: true }

export default function RkPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  const ds = dashboardStyles(isDark)

  const [items, setItems] = useState<Rk[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getRkList()
      if (res.success) setItems(Array.isArray(res.data) ? res.data : [])
    } catch { toast.error('Не удалось загрузить РК') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: Rk) => { setEditingId(item.id); setForm({ name: item.name, code: item.code, isActive: item.isActive }); setShowAdd(false) }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Заполните название и код'); return }
    setSaving(true)
    try {
      if (editingId) { await apiClient.updateRk(editingId, form); toast.success('РК обновлён') }
      else { await apiClient.createRk(form); toast.success('РК добавлен') }
      setEditingId(null); setShowAdd(false); setForm(emptyForm); await load()
    } catch (e: any) { toast.error(e.message || 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить РК?')) return
    try { await apiClient.deleteRk(id); toast.success('Удалено'); setItems(items.filter(i => i.id !== id)) }
    catch (e: any) { toast.error(e.message || 'Ошибка удаления') }
  }

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className={ds.title}>Рекламные каналы (РК)</h1>
            <p className={ds.subtitle}>Справочник источников для заказов и отчётов.</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }}
            className={`${ds.primaryBtn} shrink-0`}
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>

        {showAdd && (
          <div className={`${ds.panelPadded} mb-6`}>
            <div className={`text-sm font-semibold mb-4 ${isDark ? 'text-white' : 'text-[#111113]'}`}>Новый РК</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className={ds.input} placeholder="Название" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className={ds.input} placeholder="Код (avito, yandex...)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase() })} />
              <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className={`rounded ${isDark ? 'accent-white' : 'accent-[#0a4f42]'}`} />
                <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Активен</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button type="button" onClick={save} disabled={saving} className={ds.primaryBtn}>
                <Check className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={ds.secondaryBtn}>
                <X className="w-4 h-4" /> Отмена
              </button>
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
              <table className="w-full border-collapse text-sm min-w-[640px]">
                <thead>
                  <tr className={ds.theadRow}>
                    {['ID', 'Название', 'Код', 'Статус', 'Действия'].map(h => (
                      <th key={h} className={ds.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={`${ds.td} text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.id} className={ds.tr}>
                      {editingId === item.id ? (
                        <>
                          <td className={`${ds.td} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{item.id}</td>
                          <td className={ds.td}><input className={ds.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></td>
                          <td className={ds.td}><input className={ds.input} value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toLowerCase() })} /></td>
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
                          <td className={`${ds.td} font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.code}</td>
                          <td className={ds.td}>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.isActive ? (isDark ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-800') : (isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500')}`}>
                              {item.isActive ? 'Активен' : 'Неактивен'}
                            </span>
                          </td>
                          <td className={ds.td}>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => startEdit(item)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-black/[0.04] hover:text-[#0a4f42]'}`}><Pencil className="w-4 h-4" /></button>
                              <button type="button" onClick={() => remove(item.id)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-red-950/40 hover:text-red-300' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
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
