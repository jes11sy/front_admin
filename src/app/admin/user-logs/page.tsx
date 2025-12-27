'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, ChevronUp } from 'lucide-react'
import apiClient from '@/lib/api'

interface AuditLog {
  id: number
  timestamp: string
  eventType: string
  userId: number | null
  role: string | null
  login: string | null
  fullName: string
  ip: string
  userAgent: string
  success: boolean
  metadata: any
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  'auth.login.success': 'Вход',
  'auth.login.failed': 'Ошибка входа',
  'auth.logout': 'Выход',
  'auth.token.refresh': 'Обновление токена',
  'auth.profile.access': 'Доступ к профилю',
  'order.create': 'Создание заказа',
  'order.update': 'Изменение заказа',
  'order.close': 'Закрытие заказа',
  'order.status.change': 'Смена статуса заказа',
  'cash.income.create': 'Создание прихода',
  'cash.expense.create': 'Создание расхода',
  'cash.update': 'Изменение транзакции',
  'cash.delete': 'Удаление транзакции',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  director: 'Директор',
  master: 'Мастер',
  operator: 'Оператор',
  callcentre_operator: 'Оператор КЦ',
}

export default function UserLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  // Фильтры
  const [filterFullName, setFilterFullName] = useState('')
  const [filterLogin, setFilterLogin] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  
  // Пагинация
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const limit = 50

  const loadLogs = async () => {
    setLoading(true)
    try {
      const params: any = { page: page.toString(), limit: limit.toString() }
      
      if (filterRole) params.role = filterRole
      if (filterEventType) params.eventType = filterEventType
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString()
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString()
      
      const response = await apiClient.getUserLogs(params)
      
      if (response.success && response.data) {
        let filteredLogs = response.data.logs
        
        // Фильтрация по ФИО и логину на клиенте (т.к. это текстовый поиск)
        if (filterFullName) {
          filteredLogs = filteredLogs.filter((log: AuditLog) =>
            log.fullName.toLowerCase().includes(filterFullName.toLowerCase())
          )
        }
        if (filterLogin) {
          filteredLogs = filteredLogs.filter((log: AuditLog) =>
            log.login?.toLowerCase().includes(filterLogin.toLowerCase())
          )
        }
        
        setLogs(filteredLogs)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('[UserLogs] Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, filterRole, filterEventType, filterStartDate, filterEndDate])

  const handleApplyFilters = () => {
    setPage(1)
    loadLogs()
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('login.success') || eventType.includes('create')) return 'default'
    if (eventType.includes('failed') || eventType.includes('delete')) return 'destructive'
    if (eventType.includes('update') || eventType.includes('change')) return 'secondary'
    return 'outline'
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: '#114643' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Логирование пользователей</h1>

        <Card className="backdrop-blur-lg shadow-2xl rounded-2xl border border-white/20 bg-white/95 hover:bg-white transition-all duration-300">
          <div className="p-6">
            {/* Кнопка фильтров */}
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Фильтры
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>

            {/* Фильтры */}
            {showFilters && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">ФИО</label>
                  <Input
                    placeholder="Поиск по ФИО"
                    value={filterFullName}
                    onChange={(e) => setFilterFullName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Логин</label>
                  <Input
                    placeholder="Поиск по логину"
                    value={filterLogin}
                    onChange={(e) => setFilterLogin(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Должность</label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                      <SelectItem value="director">Директор</SelectItem>
                      <SelectItem value="master">Мастер</SelectItem>
                      <SelectItem value="operator">Оператор</SelectItem>
                      <SelectItem value="callcentre_operator">Оператор КЦ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Тип действия</label>
                  <Select value={filterEventType} onValueChange={setFilterEventType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все</SelectItem>
                      <SelectItem value="auth.login.success">Вход</SelectItem>
                      <SelectItem value="auth.logout">Выход</SelectItem>
                      <SelectItem value="order.create">Создание заказа</SelectItem>
                      <SelectItem value="order.update">Изменение заказа</SelectItem>
                      <SelectItem value="order.close">Закрытие заказа</SelectItem>
                      <SelectItem value="cash.income.create">Создание прихода</SelectItem>
                      <SelectItem value="cash.expense.create">Создание расхода</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Дата с</label>
                  <Input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Дата по</label>
                  <Input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                  />
                </div>
                <div className="col-span-full">
                  <Button onClick={handleApplyFilters} className="w-full md:w-auto">
                    Применить фильтры
                  </Button>
                </div>
              </div>
            )}

            {/* Таблица */}
            {loading ? (
              <div className="text-center py-8">Загрузка...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-teal-500">
                        <TableHead className="font-semibold">Дата/Время</TableHead>
                        <TableHead className="font-semibold">ФИО</TableHead>
                        <TableHead className="font-semibold">Логин</TableHead>
                        <TableHead className="font-semibold">Должность</TableHead>
                        <TableHead className="font-semibold">IP</TableHead>
                        <TableHead className="font-semibold">Действие</TableHead>
                        <TableHead className="font-semibold">Детали</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="hover:bg-teal-50/50 transition-colors"
                        >
                          <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                          <TableCell className="font-medium">{log.fullName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{log.login || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ROLE_LABELS[log.role || ''] || log.role}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">{log.ip}</TableCell>
                          <TableCell>
                            <Badge variant={getEventBadgeColor(log.eventType) as any}>
                              {EVENT_TYPE_LABELS[log.eventType] || log.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500 max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata).substring(0, 100) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Пагинация */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Показано {logs.length} из {total} записей
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Назад
                    </Button>
                    <div className="flex items-center px-4 py-2 bg-gray-100 rounded">
                      Страница {page} из {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Вперёд
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

