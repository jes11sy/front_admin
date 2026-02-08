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
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Фильтры
  const [filterFullName, setFilterFullName] = useState('')
  const [filterLogin, setFilterLogin] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterEventType, setFilterEventType] = useState('all')
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
      
      if (filterRole && filterRole !== 'all') params.role = filterRole
      if (filterEventType && filterEventType !== 'all') params.eventType = filterEventType
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
        
        // 🔥 Скрываем мусорные события по умолчанию
        filteredLogs = filteredLogs.filter((log: AuditLog) => 
          log.eventType !== 'auth.profile.access' && 
          log.eventType !== 'auth.token.refresh'
        )
        
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

  const formatMetadata = (metadata: any, eventType: string) => {
    if (!metadata) return '-'
    
    // 🎯 Заказы
    if (eventType === 'order.create') {
      return `Заказ #${metadata.orderId || '?'} создан (${metadata.clientName || 'без имени'})`
    }
    
    if (eventType === 'order.status.change') {
      return `Заказ #${metadata.orderId || '?'}: статус изменен с "${metadata.oldStatus}" на "${metadata.newStatus}"`
    }
    
    if (eventType === 'order.close') {
      const result = metadata.result ? `${metadata.result}₽` : '0₽'
      const clean = metadata.clean ? `, чистая: ${metadata.clean}₽` : ''
      return `Заказ #${metadata.orderId || '?'} закрыт. Результат: ${result}${clean}`
    }
    
    if (eventType === 'order.update') {
      const changes = metadata.changes || {}
      const keys = Object.keys(changes)
      if (keys.length === 0) return `Заказ #${metadata.orderId || '?'} изменен`
      
      // Показываем изменения в формате "поле: старое → новое"
      const changesList = []
      
      if (changes.statusOrder) {
        changesList.push(`статус: "${changes.statusOrder.old}" → "${changes.statusOrder.new}"`)
      }
      if (changes.masterId) {
        changesList.push(`мастер: #${changes.masterId.old || 'нет'} → #${changes.masterId.new}`)
      }
      if (changes.address) {
        changesList.push(`адрес изменен`)
      }
      if (changes.phone) {
        changesList.push(`телефон: ${changes.phone.old} → ${changes.phone.new}`)
      }
      if (changes.clientName) {
        changesList.push(`клиент: "${changes.clientName.old}" → "${changes.clientName.new}"`)
      }
      if (changes.dateMeeting) {
        const oldDate = new Date(changes.dateMeeting.old).toLocaleString('ru-RU')
        const newDate = new Date(changes.dateMeeting.new).toLocaleString('ru-RU')
        changesList.push(`дата встречи: ${oldDate} → ${newDate}`)
      }
      if (changes.problem) {
        changesList.push(`проблема изменена`)
      }
      
      // Показываем остальные изменения
      const otherKeys = Object.keys(changes).filter(k => 
        !['statusOrder', 'masterId', 'address', 'phone', 'clientName', 'dateMeeting', 'problem'].includes(k)
      )
      if (otherKeys.length > 0) {
        changesList.push(`+${otherKeys.length} других полей`)
      }
      
      return `Заказ #${metadata.orderId || '?'}: ${changesList.join(', ')}`
    }
    
    // 💰 Касса
    if (eventType === 'cash.income.create') {
      return `Приход #${metadata.cashId || '?'}: ${metadata.amount}₽ (${metadata.city})`
    }
    
    if (eventType === 'cash.expense.create') {
      return `Расход #${metadata.cashId || '?'}: ${metadata.amount}₽ (${metadata.city})`
    }
    
    if (eventType === 'cash.update') {
      return `Касса #${metadata.cashId || '?'} изменена`
    }
    
    if (eventType === 'cash.delete') {
      return `Касса #${metadata.cashId || '?'} удалена`
    }
    
    // 🔐 Авторизация
    if (eventType === 'auth.login.success') {
      return 'Успешный вход в систему'
    }
    
    if (eventType === 'auth.logout') {
      return 'Выход из системы'
    }
    
    if (eventType === 'auth.force_logout') {
      return `Принудительный выход (админ #${metadata.adminId})`
    }
    
    // Остальное - JSON
    return JSON.stringify(metadata).substring(0, 150)
  }

  const getEventBadgeColor = (eventType: string) => {
    if (eventType.includes('login.success') || eventType.includes('create')) return 'default'
    if (eventType.includes('failed') || eventType.includes('delete')) return 'destructive'
    if (eventType.includes('update') || eventType.includes('change')) return 'secondary'
    return 'outline'
  }

  return (
    <div>
      <div className="max-w-[1400px] mx-auto">
        <Card className="backdrop-blur-lg shadow-2xl rounded-2xl border border-white/20 bg-white/95 hover:bg-white transition-all duration-300">
          <div className="p-6">
            {/* Кнопка фильтров */}
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
              </button>
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
                      <SelectItem value="all">Все</SelectItem>
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
                      <SelectItem value="all">Все</SelectItem>
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
                          className="hover:bg-teal-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            console.log('[UserLogs] Row clicked!', log)
                            setSelectedLog(log)
                            setShowModal(true)
                          }}
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
                          <TableCell className="text-xs text-gray-500 max-w-md">
                            {formatMetadata(log.metadata, log.eventType)}
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

      {/* Модальное окно с полными данными */}
      {showModal && selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-teal-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <h2 className="text-xl font-bold">Детали события</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Дата и время</div>
                  <div className="text-base">{formatDate(selectedLog.timestamp)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">ID события</div>
                  <div className="text-base">#{selectedLog.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Пользователь</div>
                  <div className="text-base font-semibold">{selectedLog.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Логин</div>
                  <div className="text-base">{selectedLog.login || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Должность</div>
                  <div>
                    <Badge variant="outline">{ROLE_LABELS[selectedLog.role || ''] || selectedLog.role}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">IP адрес</div>
                  <div className="text-base font-mono">{selectedLog.ip}</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 font-medium mb-1">Тип действия</div>
                <div>
                  <Badge variant={getEventBadgeColor(selectedLog.eventType) as any} className="text-base py-1 px-3">
                    {EVENT_TYPE_LABELS[selectedLog.eventType] || selectedLog.eventType}
                  </Badge>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">User-Agent</div>
                <div className="text-xs bg-gray-50 p-3 rounded-lg font-mono break-all">
                  {selectedLog.userAgent}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Метаданные</div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex justify-end">
              <Button onClick={() => setShowModal(false)}>
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

