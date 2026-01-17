'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  User,
  Shield,
  Clock,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

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
        console.error('API response error:', response)
      }
    } catch (error: any) {
      console.error('Error loading user session:', error)
      // Извлекаем сообщение об ошибке из разных форматов ответа
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Ошибка при загрузке данных пользователя. Возможно, пользователь не найден.'
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
        alert('Пользователь успешно деавторизован')
        router.push('/admin/sessions')
      } else {
        alert('Ошибка при деавторизации пользователя')
      }
    } catch (error) {
      console.error('Ошибка деавторизации:', error)
      alert('Ошибка при деавторизации пользователя')
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 border-purple-300',
      director: 'bg-blue-100 text-blue-700 border-blue-300',
      operator: 'bg-green-100 text-green-700 border-green-300',
      callcenter: 'bg-green-100 text-green-700 border-green-300',
      master: 'bg-orange-100 text-orange-700 border-orange-300',
    }

    const labels: Record<string, string> = {
      admin: 'Администратор',
      director: 'Директор',
      operator: 'Оператор',
      callcenter: 'Кол-центр',
      master: 'Мастер',
    }

    return (
      <Badge className={`${colors[role] || 'bg-gray-100 text-gray-700'} border`}>
        {labels[role] || role}
      </Badge>
    )
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'tablet':
        return <Tablet className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
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
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="flex items-center gap-2 text-white">
          <RefreshCw className="h-6 w-6 animate-spin" />
          Загрузка...
        </div>
      </div>
    )
  }

  if (error || !userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-center">
          <div className="text-white text-xl mb-4">{error || 'Пользователь не найден'}</div>
          <button
            onClick={() => router.push('/admin/sessions')}
            className="px-4 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            Вернуться к списку сессий
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          {/* Кнопка назад */}
          <button
            onClick={() => router.push('/admin/sessions')}
            className="mb-6 flex items-center gap-2 px-4 py-2 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 text-sm font-medium backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку сессий
          </button>

          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl" style={{borderColor: '#114643'}}>
            
            {/* Шапка с информацией о пользователе */}
            <div className="mb-6 pb-6 border-b-2" style={{borderColor: '#14b8a6'}}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">{userSession.fullName}</h1>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">ID: {userSession.userId}</span>
                    <span className="text-gray-300">•</span>
                    {getRoleBadge(userSession.role)}
                  </div>
                </div>
                <button
                  onClick={handleDeauthorize}
                  className="px-4 py-2 text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                >
                  Деавторизовать пользователя
                </button>
              </div>
            </div>

            {/* Текущая сессия */}
            {userSession.currentSession && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Текущая активная сессия
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Устройство</p>
                    <p className="text-sm font-medium text-gray-800">{userSession.currentSession.device}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">IP Адрес</p>
                    <p className="font-mono text-sm font-medium text-gray-800">{userSession.currentSession.ip}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Дата авторизации</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(userSession.currentSession.loginDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Последняя активность</p>
                    <p className="text-sm font-medium text-gray-800">{formatDate(userSession.currentSession.lastActivity)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* История авторизаций */}
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600" />
                История авторизаций ({userSession.loginHistory.length})
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Дата и время</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">IP Адрес</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Устройство</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Статус</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Причина</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSession.loginHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-lg font-medium">История авторизаций отсутствует</p>
                        </td>
                      </tr>
                    ) : (
                      userSession.loginHistory.map((attempt) => (
                        <tr key={attempt.id} className="border-b border-gray-100 hover:bg-teal-50/50 transition-all duration-200">
                          <td className="py-3 px-3 text-gray-800">
                            {formatDate(attempt.timestamp)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-gray-600">{attempt.ip}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {attempt.device}
                          </td>
                          <td className="py-3 px-3">
                            {attempt.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                <CheckCircle className="h-3 w-3" />
                                Успешно
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                                <XCircle className="h-3 w-3" />
                                Ошибка
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-gray-600">
                            {attempt.reason || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

