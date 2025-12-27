'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Filter, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import apiClient from '@/lib/api'

interface ErrorLog {
  id: number
  timestamp: string
  service: string
  errorType: string
  errorMessage: string
  stackTrace: string | null
  userId: number | null
  userRole: string | null
  requestUrl: string | null
  requestMethod: string | null
  ip: string | null
  userAgent: string | null
  metadata: any
}

const SERVICE_LABELS: Record<string, string> = {
  'auth-service': 'Auth Service',
  'orders-service': 'Orders Service',
  'cash-service': 'Cash Service',
  'users-service': 'Users Service',
  'files-service': 'Files Service',
}

export default function ErrorLogsPage() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null)
  const [showModal, setShowModal] = useState(false)
  
  // Фильтры
  const [filterService, setFilterService] = useState('all')
  const [filterErrorType, setFilterErrorType] = useState('')
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
      
      if (filterService && filterService !== 'all') params.service = filterService
      if (filterErrorType) params.errorType = filterErrorType
      if (filterStartDate) params.startDate = new Date(filterStartDate).toISOString()
      if (filterEndDate) params.endDate = new Date(filterEndDate).toISOString()
      
      const response = await apiClient.getErrorLogs(params)
      
      if (response.success && response.data) {
        setLogs(response.data.logs)
        setTotal(response.data.pagination.total)
        setTotalPages(response.data.pagination.totalPages)
      }
    } catch (error) {
      console.error('[ErrorLogs] Error loading logs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [page, filterService, filterStartDate, filterEndDate])

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

  const getServiceBadge = (service: string) => {
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700">
        {SERVICE_LABELS[service] || service}
      </Badge>
    )
  }

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: '#114643' }}
    >
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold text-white">Логи ошибок</h1>
        </div>

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
              <div className="mb-6 p-4 bg-gray-50 rounded-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Сервис</label>
                  <Select value={filterService} onValueChange={setFilterService}>
                    <SelectTrigger>
                      <SelectValue placeholder="Все сервисы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все</SelectItem>
                      <SelectItem value="auth-service">Auth Service</SelectItem>
                      <SelectItem value="orders-service">Orders Service</SelectItem>
                      <SelectItem value="cash-service">Cash Service</SelectItem>
                      <SelectItem value="files-service">Files Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Тип ошибки</label>
                  <Input
                    placeholder="Например: ValidationError"
                    value={filterErrorType}
                    onChange={(e) => setFilterErrorType(e.target.value)}
                  />
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
                      <TableRow className="border-b-2 border-red-500">
                        <TableHead className="font-semibold">Дата/Время</TableHead>
                        <TableHead className="font-semibold">Сервис</TableHead>
                        <TableHead className="font-semibold">Тип ошибки</TableHead>
                        <TableHead className="font-semibold">Сообщение</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="hover:bg-red-50/50 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedLog(log)
                            setShowModal(true)
                          }}
                        >
                          <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                          <TableCell>{getServiceBadge(log.service)}</TableCell>
                          <TableCell className="font-mono text-sm text-red-600">{log.errorType}</TableCell>
                          <TableCell className="text-sm text-gray-600 max-w-md truncate">
                            {log.errorMessage}
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

      {/* Модальное окно с полной ошибкой */}
      {showModal && selectedLog && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-red-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Детали ошибки</h2>
              </div>
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
                  <div className="text-sm text-gray-500 font-medium mb-1">ID ошибки</div>
                  <div className="text-base">#{selectedLog.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Сервис</div>
                  <div>{getServiceBadge(selectedLog.service)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-1">Тип ошибки</div>
                  <div className="font-mono text-red-600">{selectedLog.errorType}</div>
                </div>
                {selectedLog.requestUrl && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500 font-medium mb-1">URL запроса</div>
                    <div className="font-mono text-sm bg-gray-50 p-2 rounded">
                      {selectedLog.requestMethod} {selectedLog.requestUrl}
                    </div>
                  </div>
                )}
                {selectedLog.ip && (
                  <div>
                    <div className="text-sm text-gray-500 font-medium mb-1">IP адрес</div>
                    <div className="font-mono">{selectedLog.ip}</div>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <div className="text-sm text-gray-500 font-medium mb-1">User ID</div>
                    <div>#{selectedLog.userId} ({selectedLog.userRole})</div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-500 font-medium mb-2">Сообщение ошибки</div>
                <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
                  {selectedLog.errorMessage}
                </div>
              </div>
              
              {selectedLog.stackTrace && (
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-2">Stack Trace</div>
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                </div>
              )}
              
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 font-medium mb-2">Дополнительные данные</div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
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

