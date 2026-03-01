'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Shield } from 'lucide-react'

interface Admin {
  id: number
  name: string
  login: string
  role: string
  status: string
  note: string | null
  createdAt: string
}

interface FormState {
  name: string
  login: string
  password: string
  status: string
  note: string
}

const emptyForm: FormState = { name: '', login: '', password: '', status: 'active', note: '' }

export default function AdminsPage() {
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [items, setItems] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    try {
      const res = await apiClient.getAdmins()
      if (res.success) setItems(Array.isArray(res.data) ? res.data : [])
    } catch { toast.error('Не удалось загрузить администраторов') }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const startEdit = (item: Admin) => {
    setEditingId(item.id)
    setForm({ name: item.name, login: item.login, password: '', status: item.status, note: item.note || '' })
    setShowAdd(false)
  }
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm) }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    setForm({ ...form, password: pwd })
  }

  const save = async () => {
    if (!form.name.trim() || !form.login.trim()) { toast.error('Заполните имя и логин'); return }
    if (!editingId && !form.password.trim()) { toast.error('Укажите пароль'); return }
    setSaving(true)
    try {
      if (editingId) {
        const data: any = { name: form.name, login: form.login, status: form.status, note: form.note || undefined }
        if (form.password) data.password = form.password
        await apiClient.updateAdmin(editingId, data)
        toast.success('Администратор обновлён')
      } else {
        await apiClient.createAdmin({ name: form.name, login: form.login, password: form.password, note: form.note || undefined })
        toast.success('Администратор создан')
      }
      setEditingId(null); setShowAdd(false); setForm(emptyForm); await load()
    } catch (e: any) { toast.error(e.message || 'Ошибка сохранения') }
    finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Удалить администратора? Это действие необратимо.')) return
    try { await apiClient.deleteAdmin(id); toast.success('Удалено'); setItems(items.filter(i => i.id !== id)) }
    catch (e: any) { toast.error(e.message || 'Ошибка удаления') }
  }

  const inputCls = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400'}`

  const FormFields = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Имя *</label>
        <input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Полное имя" />
      </div>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Логин *</label>
        <input className={inputCls} value={form.login} onChange={e => setForm({...form, login: e.target.value})} placeholder="Логин для входа" />
      </div>
      <div>
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{editingId ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'Пароль *'}</label>
        <div className="flex gap-2">
          <input className={inputCls} type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder={editingId ? 'Введите новый пароль...' : 'Пароль'} />
          <button type="button" onClick={generatePassword} className={`px-3 py-2 rounded-lg border text-sm ${isDark ? 'bg-[#1e2530] border-gray-600 text-gray-300 hover:bg-[#3a4451]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
      {editingId && (
        <div>
          <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Статус</label>
          <select className={inputCls} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="active">Активен</option>
            <option value="inactive">Неактивен</option>
          </select>
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={`block text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Заметка</label>
        <input className={inputCls} value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder="Необязательная заметка" />
      </div>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
    <div className="px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-semibold flex items-center gap-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            <Shield className="w-5 h-5 text-teal-600" />
            Администраторы
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Управление учётными записями администраторов системы</p>
        </div>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm) }} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      {showAdd && (
        <div className={`mb-6 p-5 rounded-lg border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`font-medium text-sm mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>Новый администратор</div>
          <FormFields />
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Создание...' : 'Создать'}</button>
            <button onClick={() => { setShowAdd(false); setForm(emptyForm) }} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm ${isDark ? 'bg-[#1e2530] text-gray-300' : 'bg-gray-200 text-gray-700'}`}><X className="w-4 h-4" />Отмена</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`w-full border-collapse text-[11px] rounded-lg shadow-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
            <thead>
              <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{ borderColor: '#0d5c4b' }}>
                {['ID', 'Имя', 'Логин', 'Роль', 'Статус', 'Создан', 'Заметка', 'Действия'].map(h => (
                  <th key={h} className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={8} className={`py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Нет данных</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}>
                  {editingId === item.id ? (
                    <td colSpan={8} className="py-4 px-3">
                      <FormFields />
                      <div className="flex gap-2 mt-4">
                        <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"><Check className="w-4 h-4" />{saving ? 'Сохранение...' : 'Сохранить'}</button>
                        <button onClick={cancelEdit} className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}><X className="w-4 h-4" />Отмена</button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.id}</td>
                      <td className={`py-3 px-3 font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{item.name}</td>
                      <td className={`py-3 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.login}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-700'}`}>{item.role || 'admin'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.status === 'active'
                            ? isDark ? 'bg-green-900/40 text-green-300' : 'bg-green-100 text-green-700'
                            : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.status === 'active' ? 'Активен' : 'Неактивен'}
                        </span>
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{new Date(item.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className={`py-3 px-3 max-w-[150px] truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`} title={item.note || ''}>{item.note || '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(item)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-teal-400 hover:bg-teal-900/30' : 'text-gray-500 hover:text-teal-600 hover:bg-teal-50'}`}><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => remove(item.id)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-500 hover:text-red-600 hover:bg-red-50'}`}><Trash2 className="w-4 h-4" /></button>
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
