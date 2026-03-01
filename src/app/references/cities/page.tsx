'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

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
  const router = useRouter()
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

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
    <div className="px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/references')} className={`flex items-center gap-1 text-sm mb-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <ArrowLeft className="w-4 h-4" /> Справочники
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Города</h1>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showAdd && (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="text-sm font-medium mb-3">Новый город</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputCls} placeholder="Название" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <input className={inputCls} placeholder="Код (msk, spb...)" value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Активен</span>
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
              <X className="w-4 h-4" /> Отмена
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse text-[11px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
            <thead>
              <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#0d5c4b' }}>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>ID</th>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Название</th>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Код</th>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Нет данных</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                  {editingId === item.id ? (
                    <>
                      <td className={`py-2 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                      <td className="py-2 px-4"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></td>
                      <td className="py-2 px-4"><input className={inputCls} value={form.code} onChange={e => setForm({...form, code: e.target.value.toLowerCase()})} /></td>
                      <td className="py-2 px-4">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                          <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{form.isActive ? 'Активен' : 'Неактивен'}</span>
                        </label>
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex gap-1">
                          <button onClick={save} disabled={saving} className="p-2 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</td>
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.code}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'}`}>
                          {item.isActive ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
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
    </div>
  )
}
