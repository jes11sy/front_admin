'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { getFormFieldClass } from '@/components/ui/form-styles'

interface City {
  id: number
  name: string
  code: string
  isActive: boolean
  createdAt: string
}

interface FormState {
  name: string
  code: string
  isActive: boolean
}

const emptyForm: FormState = { name: '', code: '', isActive: true }

export default function CitiesPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<City[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getCitiesList()
      if (res.success) setItems(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Не удалось загрузить города')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: City) => {
    setEditingId(item.id)
    setForm({ name: item.name, code: item.code, isActive: item.isActive })
    setShowAdd(false)
  }

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Заполните название и код'); return }
    setSaving(true)
    try {
      if (editingId) {
        await apiClient.updateCity(editingId, form)
        toast.success('Город обновлён')
      } else {
        await apiClient.createCity(form)
        toast.success('Город добавлен')
      }
      setEditingId(null)
      setShowAdd(false)
      setForm(emptyForm)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить город?')) return
    try {
      await apiClient.deleteCity(id)
      toast.success('Удалено')
      setItems(items.filter(i => i.id !== id))
    } catch (e: any) {
      toast.error(e.message || 'Ошибка удаления')
    }
  }

  const panelClass = isDark
    ? 'border border-white/10 bg-white/[0.03]'
    : 'border border-black/[0.08] bg-white'
  const titleClass = isDark ? 'text-white' : 'text-[#111113]'
  const mutedClass = isDark ? 'text-gray-400' : 'text-gray-500'
  const inputCls = `${getFormFieldClass(isDark, 'lg')} min-h-[44px] px-4`
  const secondaryButtonCls = isDark
    ? 'rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]'
    : 'rounded-2xl border border-[#cfd2d8] bg-white px-4 py-3 text-sm font-medium text-[#111113] shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition hover:bg-[#f3f4f6]'
  const primaryButtonCls = isDark
    ? 'rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#111113] transition hover:bg-gray-200'
    : 'rounded-2xl bg-[#0a4f42] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#083f35]'

  return (
    <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className={`text-xl font-semibold ${titleClass}`}>Города</h1>
            <p className={`mt-1 text-sm ${mutedClass}`}>Справочник городов для заказов и сотрудников.</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }}
            className={`flex items-center gap-2 min-h-[40px] px-4 ${primaryButtonCls}`}
          >
            <Plus className="w-4 h-4" /> Добавить
          </button>
        </div>

        {showAdd && (
          <div className={`mb-6 rounded-[20px] p-5 ${panelClass}`}>
            <div className={`text-sm font-medium mb-4 ${titleClass}`}>Новый город</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input className={inputCls} placeholder="Название" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <input className={inputCls} placeholder="Код (msk, spb...)" value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} />
              <label className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 ${isDark ? 'bg-white/[0.04] text-gray-300' : 'border border-[#cfd2d8] bg-white text-[#111113]'}`}>
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
                <span className="text-sm">Активен</span>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={saving} className={`flex items-center gap-1 ${primaryButtonCls} disabled:opacity-50`}>
                <Check className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={`flex items-center gap-1 ${secondaryButtonCls}`}>
                <X className="w-4 h-4" /> Отмена
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className={`rounded-[20px] ${panelClass} text-center py-12`}>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : (
          <div className={`rounded-[20px] overflow-hidden ${panelClass}`}>
            <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-[11px] rounded-[20px] overflow-hidden ${panelClass}`}>
              <thead>
                <tr className={`${isDark ? 'bg-white/[0.04] border-b border-white/10' : 'bg-black/[0.02] border-b border-black/10'}`}>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Название</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Код</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                  <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={5} className={`py-8 text-center ${mutedClass}`}>Нет данных</td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-white/[0.04] border-white/10' : 'hover:bg-black/[0.02] border-black/10'}`}>
                    {editingId === item.id ? (
                      <>
                        <td className={`py-2 px-4 ${mutedClass}`}>{item.id}</td>
                        <td className="py-2 px-4"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></td>
                        <td className="py-2 px-4"><input className={inputCls} value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} /></td>
                        <td className="py-2 px-4">
                          <label className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-4 ${isDark ? 'bg-white/[0.04] text-gray-300' : 'border border-[#cfd2d8] bg-white text-[#111113]'}`}>
                            <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                            <span>{form.isActive ? 'Активен' : 'Неактивен'}</span>
                          </label>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex gap-1">
                            <button onClick={save} disabled={saving} className={`p-2 rounded-xl ${isDark ? 'text-white hover:bg-white/[0.08]' : 'text-[#0a4f42] hover:bg-black/[0.04]'}`}><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEdit} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-black/[0.04] hover:text-[#111113]'}`}><X className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`py-3 px-4 ${mutedClass}`}>{item.id}</td>
                        <td className={`py-3 px-4 font-medium ${titleClass}`}>{item.name}</td>
                        <td className={`py-3 px-4 font-mono text-xs ${mutedClass}`}>{item.code}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'}`}>
                            {item.isActive ? 'Активен' : 'Неактивен'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(item)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-white/[0.06] hover:text-white' : 'text-gray-500 hover:bg-black/[0.04] hover:text-[#111113]'}`}><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => remove(item.id)} className={`p-2 rounded-xl ${isDark ? 'text-gray-400 hover:bg-red-900/30 hover:text-red-400' : 'text-gray-500 hover:bg-red-50 hover:text-red-600'}`}><Trash2 className="w-4 h-4" /></button>
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
  )
}
