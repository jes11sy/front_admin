'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { apiClient } from '@/lib/api'
import { User, Edit2, LogOut, Eye, EyeOff, Save, X, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
  })
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await apiClient.logout()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
  }

  const handleEdit = () => {
    setFormData({
      name: user?.name || '',
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({
      name: user?.name || '',
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // TODO: Implement profile update API
      // await apiClient.updateProfile(formData)
      setIsEditing(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Пароль должен содержать минимум 6 символов')
      return
    }
    
    setIsSaving(true)
    try {
      // TODO: Implement password change API
      // await apiClient.changePassword(passwordData)
      setIsChangingPassword(false)
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      console.error('Password change error:', error)
      setPasswordError('Ошибка смены пароля')
    } finally {
      setIsSaving(false)
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className={`flex items-start justify-between rounded-[20px] border px-5 py-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-medium ${isDark ? 'bg-white/[0.12]' : 'bg-[#0a4f42]'}`}>
                {user?.name ? getInitials(user.name) : <User className="w-8 h-8" />}
              </div>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`text-xl bg-transparent border-b focus:outline-none ${isDark ? 'focus:border-gray-600 text-gray-100 border-gray-600' : 'focus:border-teal-500 text-gray-900 border-gray-300'}`}
                  />
                ) : (
                  <h2 className={`text-[20px] font-semibold tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{user?.name || user?.login || 'Пользователь'}</h2>
                )}
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>{user?.login}</p>
                {user?.role && (
                  <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${isDark ? 'bg-white/[0.1] text-gray-200' : 'bg-[#0a4f42]/10 text-[#0a4f42]'}`}>
                    {user.role === 'admin' ? 'Администратор' : user.role}
                  </span>
                )}
              </div>
            </div>
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 active:text-gray-200' : 'text-gray-400 hover:text-gray-600 active:text-gray-700'}`}
              >
                <Edit2 className="h-5 w-5" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className={`transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`transition-colors disabled:opacity-50 ${isDark ? 'text-gray-300 hover:text-white active:text-gray-200' : 'text-gray-700 hover:text-gray-900 active:text-black'}`}
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              <div className={`rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <p className={`mb-3 text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>Контакт и профиль</p>
                <div className={`flex justify-between items-center py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Логин</span>
                  <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>{user?.login || 'Не указан'}</span>
                </div>
                <div className={`flex justify-between items-center py-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Роль</span>
                  <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>
                    {user?.role === 'admin' ? 'Администратор' : user?.role || 'Не указана'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className={`space-y-4 rounded-[20px] border p-4 shadow-sm ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <p className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-[#111113]'}`}>Настройки</p>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className={`w-full rounded-xl px-4 py-2 text-sm transition-colors text-left ${isDark ? 'bg-white/[0.06] text-gray-200 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}
                >
                  Сменить пароль
                </button>
              </div>

              <div className={`rounded-[20px] border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-black/10'}`}>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 transition-colors disabled:opacity-50 ${
                    isDark ? 'bg-white/[0.04] text-red-300 hover:bg-white/[0.08]' : 'bg-white text-red-600 hover:bg-red-50 border border-red-100'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Выход...' : 'Выйти'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isChangingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`w-full max-w-md rounded-2xl border p-5 ${isDark ? 'bg-[#111113] border-white/10' : 'bg-white border-black/10'}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-[#111113]'}`}>Смена пароля</h3>
              <button
                onClick={() => {
                  setIsChangingPassword(false)
                  setPasswordError(null)
                }}
                className={`rounded-full p-1 transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  isDark
                    ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                    : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                }`}>
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Текущий пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showCurrentPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <div className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  isDark
                    ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                    : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                }`}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="Новый пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showNewPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                <div className={`group relative overflow-hidden rounded-2xl border transition-all ${
                  isDark
                    ? 'border-white/10 bg-[#1c1c1e] focus-within:border-white/30 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.07)]'
                    : 'border-[#d2d2d7] bg-white/95 focus-within:border-[#0a4f42]/50 focus-within:shadow-[0_0_0_3px_rgba(10,79,66,0.12)]'
                }`}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Подтвердите пароль"
                    className={`h-[52px] w-full border-0 bg-transparent px-4 pr-12 text-[15px] outline-none ring-0 focus:outline-none focus:ring-0 ${
                      isDark ? 'text-white placeholder:text-white/28' : 'text-[#1d1d1f] placeholder:text-[#8e8e93]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
                      isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/75' : 'text-[#8e8e93] hover:bg-black/[0.03] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-500'}`}>{passwordError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    setIsChangingPassword(false)
                    setPasswordError(null)
                  }}
                  className={`flex-1 rounded-full py-2.5 text-sm transition-colors ${isDark ? 'bg-white/[0.06] text-gray-300 hover:bg-white/[0.1]' : 'bg-black/[0.04] text-gray-700 hover:bg-black/[0.08]'}`}
                >
                  Отмена
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving}
                  className={`flex-1 rounded-full py-2.5 text-sm transition-colors disabled:opacity-50 ${isDark ? 'bg-white text-[#111113] hover:bg-gray-200' : 'bg-[#0a4f42] text-white hover:bg-[#083f35]'}`}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
