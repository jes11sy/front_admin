'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from '@/components/ui/toast'

interface LoginAttempt {
  id: number
  timestamp: string
  ip: string
  device: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  status: 'success' | 'failed'
  reason?: string
}

interface UserSession {
  userId: number
  fullName: string
  role: 'admin' | 'director' | 'callcenter' | 'master'
  currentSession: {
    device: string
    deviceType: 'desktop' | 'mobile' | 'tablet'
    ip: string
    loginDate: string
    lastActivity: string
  } | null
  loginHistory: LoginAttempt[]
}

export default function UserSessionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (params.userId) {
      loadUserSession()
    }
  }, [params.userId])

  const loadUserSession = async () => {
    if (!params.userId) {
      setError('ID пользователя не указан')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const userId = parseInt(String(params.userId), 10)
      if (isNaN(userId)) {
        setError('Неверный ID пользователя')
        setLoading(false)
        return
      }

      const response = await apiClient.getUserSession(userId)
      if (response.success && response.data) {
        setUserSession(response.data)
      } else {
        const errorMsg = response.error || response.message || 'Не удалось загрузить данные пользователя'
        setError(errorMsg)
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Ошибка при загрузке данных пользователя'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleDeauthorize = async () => {
    if (!userSession) return
    
    if (!confirm(`Вы уверены, что хотите деавторизовать ${userSession.fullName}?`)) {
      return
    }

    try {
      const response = await apiClient.deauthorizeUser(userSession.userId, userSession.role)
      
      if (response.success) {
        toast.success('Пользователь успешно деавторизован')
        router.push('/admin/sessions')
      } else {
        toast.error('Ошибка при деавторизации пользователя')
      }
    } catch (error) {
      toast.error('Ошибка при деавторизации пользователя')
    }
  }

  const getRoleBadge = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Администратор',
      director: 'Директор',
      operator: 'Оператор',
      callcenter: 'Кол-центр',
      master: 'Мастер',
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
        {labels[role] || role}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <div className={`text-lg mt-4 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Загрузка...</div>
        </div>
      </div>
    )
  }

  if (error || !userSession) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="text-center">
          <div className={`text-xl mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{error || 'Пользователь не найден'}</div>
          <button
            onClick={() => router.push('/admin/sessions')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            Вернуться к списку сессий
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Кнопка назад */}
        <button
          onClick={() => router.push('/admin/sessions')}
          className={`mb-6 flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${isDark ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку сессий
        </button>

        {/* Шапка */}
        <div className={`rounded-lg p-6 border mb-6 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{userSession.fullName}</h1>
              <div className="flex items-center gap-3">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {userSession.userId}</span>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
                {getRoleBadge(userSession.role)}
              </div>
            </div>
            <button
              onClick={handleDeauthorize}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-700' : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'}`}
            >
              Деавторизовать пользователя
            </button>
          </div>
        </div>

        {/* Текущая сессия */}
        {userSession.currentSession && (
          <div className={`rounded-lg p-6 border mb-6 ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
              Текущая активная сессия
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Устройство</div>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{userSession.currentSession.device}</div>
              </div>
              <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>IP Адрес</div>
                <div className={`text-sm font-medium font-mono ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{userSession.currentSession.ip}</div>
              </div>
              <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Дата авторизации</div>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatDate(userSession.currentSession.loginDate)}</div>
              </div>
              <div className={`rounded-lg p-4 border ${isDark ? 'bg-[#3a4451] border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Последняя активность</div>
                <div className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{formatDate(userSession.currentSession.lastActivity)}</div>
              </div>
            </div>
          </div>
        )}

        {/* История авторизаций */}
        <div className={`rounded-lg p-6 border ${isDark ? 'bg-[#2a3441] border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            История авторизаций ({userSession.loginHistory.length})
          </h2>
          
          {userSession.loginHistory.length === 0 ? (
            <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`}>
              <p className={`text-lg mb-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                История авторизаций отсутствует
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-[11px] min-w-[600px] rounded-lg ${isDark ? 'bg-[#2a3441]' : 'bg-white'}`}>
                <thead>
                  <tr className={`border-b-2 ${isDark ? 'bg-[#3a4451]' : 'bg-gray-50'}`} style={{borderColor: '#0d5c4b'}}>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Дата и время</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>IP Адрес</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Устройство</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Статус</th>
                    <th className={`text-left py-3 px-3 font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {userSession.loginHistory.map((attempt) => (
                    <tr 
                      key={attempt.id} 
                      className={`border-b transition-colors ${isDark ? 'hover:bg-[#3a4451] border-gray-700' : 'hover:bg-teal-50 border-gray-200'}`}
                    >
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatDate(attempt.timestamp)}
                      </td>
                      <td className={`py-3 px-3 font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {attempt.ip}
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {attempt.device}
                      </td>
                      <td className="py-3 px-3">
                        {attempt.status === 'success' ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'}`}>
                            Успешно
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'}`}>
                            Ошибка
                          </span>
                        )}
                      </td>
                      <td className={`py-3 px-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {attempt.reason || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
