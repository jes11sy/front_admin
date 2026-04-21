'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { useDesignStore } from '@/store/design.store'
import { toast } from '@/components/ui/toast'
import { dashboardStyles } from '@/lib/dashboard-ui'

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
  role: 'admin' | 'director' | 'operator' | 'master'
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
  const ds = dashboardStyles(isDark)

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
    } catch {
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
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
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
      <div className={`${ds.pageRoot} flex items-center justify-center`}>
        <div className="text-center px-4">
          <div className={`mx-auto ${ds.spinner}`} />
          <div className={`text-base mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Загрузка...</div>
        </div>
      </div>
    )
  }

  if (error || !userSession) {
    return (
      <div className={`${ds.pageRoot} flex items-center justify-center`}>
        <div className={`${ds.panelPadded} max-w-md text-center`}>
          <div className={`text-lg mb-4 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{error || 'Пользователь не найден'}</div>
          <button type="button" onClick={() => router.push('/admin/sessions')} className={ds.primaryBtn}>
            Вернуться к списку сессий
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={ds.pageRoot}>
      <div className={ds.content}>
        <button
          type="button"
          onClick={() => router.push('/admin/sessions')}
          className={`${ds.secondaryBtn} mb-6`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку сессий
        </button>

        <div className={`${ds.panelPadded} mb-6`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#111113]'}`}>{userSession.fullName}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>ID: {userSession.userId}</span>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>•</span>
                {getRoleBadge(userSession.role)}
              </div>
            </div>
            <button type="button" onClick={handleDeauthorize} className={ds.destructiveBtn}>
              Деавторизовать пользователя
            </button>
          </div>
        </div>

        {userSession.currentSession && (
          <div className={`${ds.panelPadded} mb-6`}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${ds.sectionLabel}`}>
              Текущая активная сессия
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Устройство', value: userSession.currentSession.device },
                { label: 'IP адрес', value: userSession.currentSession.ip, mono: true },
                { label: 'Дата авторизации', value: formatDate(userSession.currentSession.loginDate) },
                { label: 'Последняя активность', value: formatDate(userSession.currentSession.lastActivity) },
              ].map((field) => (
                <div key={field.label} className={ds.innerWell}>
                  <div className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{field.label}</div>
                  <div className={`text-sm font-medium ${field.mono ? 'font-mono' : ''} ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{field.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={ds.panelPadded}>
          <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${ds.sectionLabel}`}>
            История авторизаций ({userSession.loginHistory.length})
          </h2>

          {userSession.loginHistory.length === 0 ? (
            <div className={`${ds.innerWell} text-center py-10`}>
              <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>История авторизаций отсутствует</p>
            </div>
          ) : (
            <div className={ds.tableScroll}>
              <div className={ds.tableWrap}>
                <table className="w-full border-collapse text-sm min-w-[640px]">
                  <thead>
                    <tr className={ds.theadRow}>
                      {['Дата и время', 'IP', 'Устройство', 'Статус', 'Причина'].map((h) => (
                        <th key={h} className={ds.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userSession.loginHistory.map((attempt) => (
                      <tr key={attempt.id} className={ds.tr}>
                        <td className={`${ds.td} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(attempt.timestamp)}</td>
                        <td className={`${ds.td} font-mono ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{attempt.ip}</td>
                        <td className={`${ds.td} ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{attempt.device}</td>
                        <td className={ds.td}>
                          {attempt.status === 'success' ? (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-950/50 text-emerald-300' : 'bg-emerald-50 text-emerald-800'}`}>
                              Успешно
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-red-950/50 text-red-300' : 'bg-red-50 text-red-700'}`}>
                              Ошибка
                            </span>
                          )}
                        </td>
                        <td className={`${ds.td} ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{attempt.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
