'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Search,
  RefreshCw,
  User,
  Clock,
  MapPin,
  Shield
} from 'lucide-react'

interface Session {
  id: string
  userId: string
  fullName: string
  role: 'admin' | 'director' | 'callcenter' | 'master'
  device: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  ip: string
  loginDate: string
  lastActivity: string
  isActive: boolean
}

// Моковые данные для демонстрации
const mockSessions: Session[] = [
  {
    id: '1',
    userId: '101',
    fullName: 'Иванов Иван Иванович',
    role: 'admin',
    device: 'Windows 10 - Chrome 120',
    deviceType: 'desktop',
    ip: '192.168.1.100',
    loginDate: '2025-12-27T08:30:00',
    lastActivity: '2025-12-27T14:25:00',
    isActive: true
  },
  {
    id: '2',
    userId: '102',
    fullName: 'Петров Петр Петрович',
    role: 'director',
    device: 'iPhone 14 - Safari',
    deviceType: 'mobile',
    ip: '192.168.1.101',
    loginDate: '2025-12-27T09:15:00',
    lastActivity: '2025-12-27T14:20:00',
    isActive: true
  },
  {
    id: '3',
    userId: '103',
    fullName: 'Сидорова Мария Александровна',
    role: 'callcenter',
    device: 'macOS - Safari 17',
    deviceType: 'desktop',
    ip: '192.168.1.102',
    loginDate: '2025-12-27T07:45:00',
    lastActivity: '2025-12-27T14:18:00',
    isActive: true
  },
  {
    id: '4',
    userId: '104',
    fullName: 'Козлов Алексей Викторович',
    role: 'master',
    device: 'Samsung Galaxy S23 - Chrome',
    deviceType: 'mobile',
    ip: '192.168.1.103',
    loginDate: '2025-12-27T10:00:00',
    lastActivity: '2025-12-27T13:45:00',
    isActive: true
  },
  {
    id: '5',
    userId: '105',
    fullName: 'Морозова Елена Сергеевна',
    role: 'callcenter',
    device: 'iPad Pro - Safari',
    deviceType: 'tablet',
    ip: '192.168.1.104',
    loginDate: '2025-12-27T08:00:00',
    lastActivity: '2025-12-27T14:10:00',
    isActive: true
  },
]

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>(mockSessions)
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')

  const loadSessions = async () => {
    setLoading(true)
    // TODO: Здесь будет запрос к API
    // const response = await apiClient.getSessions()
    // setSessions(response.data)
    
    // Симуляция загрузки
    setTimeout(() => {
      setSessions(mockSessions)
      setLoading(false)
    }, 500)
  }

  useEffect(() => {
    loadSessions()
  }, [])

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeauthorize = async (sessionId: string, userName: string) => {
    if (!confirm(`Вы уверены, что хотите деавторизовать ${userName}?`)) {
      return
    }

    try {
      // TODO: Здесь будет запрос к API для деавторизации
      // await apiClient.deauthorizeSession(sessionId)
      
      // Пока просто удаляем из локального стейта
      setSessions(sessions.filter(s => s.id !== sessionId))
      alert('Пользователь успешно деавторизован')
    } catch (error) {
      console.error('Ошибка деавторизации:', error)
      alert('Ошибка при деавторизации пользователя')
    }
  }

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.ip.includes(searchQuery) ||
      session.device.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = filterRole === 'all' || session.role === filterRole

    return matchesSearch && matchesRole
  })

  return (
    <div className="min-h-screen p-4 md:p-8" style={{backgroundColor: '#114643'}}>
      <div className="max-w-7xl mx-auto">
        {/* Фильтры */}
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Поиск по ФИО, IP или устройству..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">Все роли</option>
                <option value="admin">Администратор</option>
                <option value="director">Директор</option>
                <option value="callcenter">Кол-центр</option>
                <option value="master">Мастер</option>
              </select>

              <Button
                onClick={loadSessions}
                disabled={loading}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Таблица сессий */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Список активных сессий ({filteredSessions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">ФИО Сотрудника</TableHead>
                    <TableHead className="font-semibold">Роль</TableHead>
                    <TableHead className="font-semibold">Устройство</TableHead>
                    <TableHead className="font-semibold">IP Адрес</TableHead>
                    <TableHead className="font-semibold">Дата авторизации</TableHead>
                    <TableHead className="font-semibold">Последний вход</TableHead>
                    <TableHead className="font-semibold text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-gray-500">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Загрузка...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <p className="text-gray-500">Активных сессий не найдено</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((session) => (
                      <TableRow 
                        key={session.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/sessions/${session.userId}`)}
                      >
                        <TableCell className="font-medium">
                          {session.fullName}
                        </TableCell>
                        <TableCell>
                          {getRoleBadge(session.role)}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">{session.device}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{session.ip}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(session.loginDate)}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{formatDate(session.lastActivity)}</span>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={() => handleDeauthorize(session.id, session.fullName)}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-300"
                          >
                            Деавторизовать
                          </Button>
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

