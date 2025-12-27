'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  Search,
  RefreshCw,
  User,
  Clock,
  MapPin,
  Shield,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react'

interface Session {
  userId: number
  fullName: string
  role: 'admin' | 'director' | 'callcenter' | 'master'
  device: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  ip: string
  loginDate: string
  lastActivity: string
}

export default function SessionsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  const loadSessions = async () => {
    console.log('[Sessions] Starting to load sessions...')
    setLoading(true)
    try {
      console.log('[Sessions] Calling apiClient.getSessions()...')
      const response = await apiClient.getSessions()
      console.log('[Sessions] Response:', response)
      if (response.success && response.data) {
        console.log('[Sessions] Sessions loaded:', response.data.sessions.length)
        setSessions(response.data.sessions)
      } else {
        console.error('[Sessions] Response not successful:', response)
      }
    } catch (error) {
      console.error('[Sessions] Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('[Sessions] useEffect triggered, calling loadSessions()')
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

  const handleDeauthorize = async (sessionId: string, userName: string, userId: number, role: string) => {
    if (!confirm(`Вы уверены, что хотите деавторизовать ${userName}?`)) {
      return
    }

    try {
      const response = await apiClient.deauthorizeUser(userId, role)
      
      if (response.success) {
        // Удаляем сессию из локального стейта
        setSessions(sessions.filter(s => s.userId !== userId))
        alert('Пользователь успешно деавторизован')
      } else {
        alert('Ошибка при деавторизации пользователя')
      }
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

  const hasActiveFilters = searchQuery || filterRole !== 'all'

  const resetFilters = () => {
    setSearchQuery('')
    setFilterRole('all')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl" style={{borderColor: '#114643'}}>
            
            {/* Фильтры */}
            <div className="mb-6">
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-left cursor-pointer group"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Фильтр
                  </h2>
                  {showFilters ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  )}
                  {hasActiveFilters && (
                    <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                      Активны
                    </span>
                  )}
                </button>
              </div>
              
              {showFilters && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Поиск */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Поиск (ФИО, IP, устройство)
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Введите для поиска..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white border-2 border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 text-sm focus:outline-none focus:border-teal-500 transition-all duration-200 hover:border-gray-300 shadow-sm hover:shadow-md"
                        />
                      </div>
                    </div>

                    {/* Фильтр по роли */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Роль
                      </label>
                      <Select value={filterRole} onValueChange={setFilterRole}>
                        <SelectTrigger className="w-full bg-white border-gray-200 text-gray-800 border-2 hover:border-gray-300 focus:border-teal-500">
                          <SelectValue placeholder="Все роли" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-300">
                          <SelectItem value="all" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Все роли
                          </SelectItem>
                          <SelectItem value="admin" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Администратор
                          </SelectItem>
                          <SelectItem value="director" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Директор
                          </SelectItem>
                          <SelectItem value="callcenter" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Кол-центр
                          </SelectItem>
                          <SelectItem value="master" className="text-gray-800 focus:text-white focus:bg-teal-600 hover:text-white hover:bg-teal-600">
                            Мастер
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Кнопки управления фильтрами */}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                    <button
                      onClick={resetFilters}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all duration-200 hover:shadow-md text-sm font-medium bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                    >
                      <X className="w-4 h-4" />
                      Сбросить
                    </button>
                    <div className="text-sm text-gray-600">
                      Всего сессий: <span className="font-semibold text-teal-600">{filteredSessions.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Состояние загрузки */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Загрузка сессий...</p>
              </div>
            )}

            {/* Таблица */}
            {!loading && filteredSessions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs bg-white rounded-lg shadow-lg">
                  <thead>
                    <tr className="border-b-2 bg-gray-50" style={{borderColor: '#14b8a6'}}>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">ФИО Сотрудника</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Роль</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Устройство</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">IP Адрес</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Дата авторизации</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Последний вход</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {                    filteredSessions.map((session) => (
                      <tr 
                        key={session.userId}
                        onClick={() => router.push(`/admin/sessions/${session.userId}`)}
                        className="border-b border-gray-100 hover:bg-teal-50/50 transition-all duration-200 cursor-pointer group"
                      >
                        <td className="py-3 px-3 font-medium text-gray-800 group-hover:text-teal-700 transition-colors">
                          {session.fullName}
                        </td>
                        <td className="py-3 px-3">
                          {getRoleBadge(session.role)}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {session.device}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-gray-600">{session.ip}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDate(session.loginDate)}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          {formatDate(session.lastActivity)}
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleDeauthorize(session.id, session.fullName, session.userId, session.role)}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 border border-red-200"
                          >
                            Деавторизовать
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Пустое состояние */}
            {!loading && filteredSessions.length === 0 && (
              <div className="text-center py-12">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">Активных сессий не найдено</p>
                <p className="text-gray-400 text-sm mt-2">Попробуйте изменить параметры фильтра</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

