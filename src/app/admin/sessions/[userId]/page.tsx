'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  id: string
  timestamp: string
  ip: string
  device: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  status: 'success' | 'failed'
  reason?: string
}

interface UserSession {
  userId: string
  fullName: string
  role: 'admin' | 'director' | 'callcenter' | 'master'
  currentSession: {
    device: string
    deviceType: 'desktop' | 'mobile' | 'tablet'
    ip: string
    loginDate: string
    lastActivity: string
  }
  loginHistory: LoginAttempt[]
}

// Моковые данные
const mockUserSession: UserSession = {
  userId: '101',
  fullName: 'Иванов Иван Иванович',
  role: 'admin',
  currentSession: {
    device: 'Windows 10 - Chrome 120',
    deviceType: 'desktop',
    ip: '192.168.1.100',
    loginDate: '2025-12-27T08:30:00',
    lastActivity: '2025-12-27T14:25:00'
  },
  loginHistory: [
    {
      id: '1',
      timestamp: '2025-12-27T08:30:00',
      ip: '192.168.1.100',
      device: 'Windows 10 - Chrome 120',
      deviceType: 'desktop',
      status: 'success'
    },
    {
      id: '2',
      timestamp: '2025-12-26T18:45:00',
      ip: '192.168.1.100',
      device: 'Windows 10 - Chrome 120',
      deviceType: 'desktop',
      status: 'success'
    },
    {
      id: '3',
      timestamp: '2025-12-26T15:20:00',
      ip: '192.168.1.105',
      device: 'iPhone 14 - Safari',
      deviceType: 'mobile',
      status: 'failed',
      reason: 'Неверный пароль'
    },
    {
      id: '4',
      timestamp: '2025-12-25T09:15:00',
      ip: '192.168.1.100',
      device: 'Windows 10 - Chrome 120',
      deviceType: 'desktop',
      status: 'success'
    },
    {
      id: '5',
      timestamp: '2025-12-24T11:30:00',
      ip: '10.0.0.50',
      device: 'macOS - Safari 17',
      deviceType: 'desktop',
      status: 'failed',
      reason: 'Подозрительная активность'
    },
  ]
}

export default function UserSessionDetailPage({ params }: { params: { userId: string } }) {
  const router = useRouter()
  const [userSession, setUserSession] = useState<UserSession | null>(mockUserSession)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadUserSession()
  }, [params.userId])

  const loadUserSession = async () => {
    setLoading(true)
    // TODO: Здесь будет запрос к API
    // const response = await apiClient.getUserSession(params.userId)
    // setUserSession(response.data)
    
    setTimeout(() => {
      setUserSession(mockUserSession)
      setLoading(false)
    }, 500)
  }

  const handleDeauthorize = async () => {
    if (!userSession) return
    
    if (!confirm(`Вы уверены, что хотите деавторизовать ${userSession.fullName}?`)) {
      return
    }

    try {
      // TODO: Здесь будет запрос к API
      // await apiClient.deauthorizeUser(params.userId)
      
      alert('Пользователь успешно деавторизован')
      router.push('/admin/sessions')
    } catch (error) {
      console.error('Ошибка деавторизации:', error)
      alert('Ошибка при деавторизации пользователя')
    }
  }

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 border-purple-300',
      director: 'bg-blue-100 text-blue-700 border-blue-300',
      callcenter: 'bg-green-100 text-green-700 border-green-300',
      master: 'bg-orange-100 text-orange-700 border-orange-300',
    }

    const labels: Record<string, string> = {
      admin: 'Администратор',
      director: 'Директор',
      callcenter: 'Кол-центр',
      master: 'Мастер',
    }

    return (
      <Badge className={`${colors[role]} border`}>
        {labels[role]}
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

  if (!userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-xl">Пользователь не найден</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#114643'}}>
      <div className="max-w-7xl mx-auto">
        {/* Кнопка назад */}
        <Button
          onClick={() => router.push('/admin/sessions')}
          variant="outline"
          className="mb-6 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку сессий
        </Button>

        {/* Информация о пользователе */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <User className="h-6 w-6" />
                <span>{userSession.fullName}</span>
              </div>
              <Button
                onClick={handleDeauthorize}
                variant="outline"
                className="bg-red-600 text-white hover:bg-red-700 border-red-700"
              >
                Деавторизовать
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Роль</p>
                <div>{getRoleBadge(userSession.role)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">ID пользователя</p>
                <p className="font-mono text-sm">{userSession.userId}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Текущая сессия */}
        <Card className="border-0 shadow-lg mb-6">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Текущая активная сессия
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Устройство</p>
                <p className="text-sm font-medium">{userSession.currentSession.device}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">IP Адрес</p>
                <p className="font-mono text-sm font-medium">{userSession.currentSession.ip}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Дата авторизации</p>
                <p className="text-sm font-medium">{formatDate(userSession.currentSession.loginDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Последняя активность</p>
                <p className="text-sm font-medium">{formatDate(userSession.currentSession.lastActivity)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* История авторизаций */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              История авторизаций ({userSession.loginHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Дата и время</TableHead>
                    <TableHead className="font-semibold">IP Адрес</TableHead>
                    <TableHead className="font-semibold">Устройство</TableHead>
                    <TableHead className="font-semibold">Статус</TableHead>
                    <TableHead className="font-semibold">Причина</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userSession.loginHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <p className="text-gray-500">История авторизаций отсутствует</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    userSession.loginHistory.map((attempt) => (
                      <TableRow key={attempt.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="text-sm">{formatDate(attempt.timestamp)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{attempt.ip}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{attempt.device}</span>
                        </TableCell>
                        <TableCell>
                          {attempt.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-300">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Успешно
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border border-red-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              Ошибка
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {attempt.reason || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

