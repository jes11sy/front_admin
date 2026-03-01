'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

interface EquipmentType { id: number; name: string; isActive: boolean; createdAt: string }
interface FormState { name: string; isActive: boolean }
const emptyForm: FormState = { name: '', isActive: true }

export default function EquipmentTypesPage() {
  const router = useRouter()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

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

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
    <div className="px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button onClick={() => router.push('/references')} className={`flex items-center gap-1 text-sm mb-2 ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            <ArrowLeft className="w-4 h-4" /> Справочники
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Типы оборудования</h1>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <div className={`mb-6 p-4 rounded-lg border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="text-sm font-medium mb-3">Новый тип</div>
          <div className="flex gap-3 items-end flex-wrap">
            <input className={`${inputCls} max-w-xs`} placeholder="Название (Холодильник, Стиральная машина...)" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
              <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Активен</span>
            </label>
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Сохр...' : 'Сохранить'}</button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}><X className="w-4 h-4" />Отмена</button>
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
                {['ID', 'Название', 'Статус', 'Действия'].map(h => (
                  <th key={h} className={`text-left py-3 px-4 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Нет данных</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                  {editingId === item.id ? (
                    <>
                      <td className={`py-2 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                      <td className="py-2 px-4 w-72"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></td>
                      <td className="py-2 px-4"><label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} /><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{form.isActive ? 'Активен' : 'Неактивен'}</span></label></td>
                      <td className="py-2 px-4"><div className="flex gap-1"><button onClick={save} disabled={saving} className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg"><Check className="w-4 h-4" /></button><button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button></div></td>
                    </>
                  ) : (
                    <>
                      <td className={`py-3 px-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.id}</td>
                      <td className={`py-3 px-4 font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{item.name}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{item.isActive ? 'Активен' : 'Неактивен'}</span></td>
                      <td className="py-3 px-4"><div className="flex gap-1"><button onClick={() => startEdit(item)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-teal-400 hover:bg-teal-900/30' : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'}`}><Pencil className="w-4 h-4" /></button><button onClick={() => remove(item.id)} className={`p-2 rounded-lg ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}><Trash2 className="w-4 h-4" /></button></div></td>
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
