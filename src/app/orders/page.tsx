'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ShoppingCart } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface Order {
  id: number
  rk: string
  city: string
  avitoName: string
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  closingData: string | null
  typeEquipment: string
  statusOrder: string
  masterId: number
  result: number
  operatorNameId: number
  master?: { name: string }
  operator?: { login: string }
}

interface OrderStats {
  totalOrders: number
  newOrders: number
  inProgress: number
  completed: number
  cancelled: number
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    newOrders: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const ordersPerPage = 50

  // Загрузка заказов из API
  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getOrders({ 
          page: currentPage, 
          limit: ordersPerPage,
          search: searchQuery || undefined
        })
        if (response.success && response.data) {
          const ordersData = response.data.orders || response.data
          const total = response.data.total || ordersData.length
          const pages = response.data.totalPages || Math.ceil(total / ordersPerPage)
          
          setOrders(ordersData)
          setTotalOrders(total)
          setTotalPages(pages)
          
          // Вычисляем статистику
          const calculatedStats = {
            totalOrders: total,
            newOrders: ordersData.filter((o: Order) => o.statusOrder === 'Ожидает' || o.statusOrder === 'Принял').length,
            inProgress: ordersData.filter((o: Order) => o.statusOrder === 'В пути' || o.statusOrder === 'В работе').length,
            completed: ordersData.filter((o: Order) => o.statusOrder === 'Готово').length,
            cancelled: ordersData.filter((o: Order) => o.statusOrder === 'Отказ' || o.statusOrder === 'Незаказ').length,
          }
          setStats(calculatedStats)
        }
      } catch (error) {
        console.error('Error loading orders:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке заказов'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()
  }, [currentPage, searchQuery])

  // Поиск теперь делается на сервере, используем orders напрямую
  const filteredOrders = orders

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1) // Сброс на первую страницу при поиске
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Ожидает': 'bg-blue-100 text-blue-800',
      'Принял': 'bg-cyan-100 text-cyan-800',
      'В пути': 'bg-purple-100 text-purple-800',
      'В работе': 'bg-yellow-100 text-yellow-800',
      'Готово': 'bg-green-100 text-green-800',
      'Отказ': 'bg-red-100 text-red-800',
      'Модерн': 'bg-orange-100 text-orange-800',
      'Незаказ': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Статистика заказов */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Всего заказов</div>
              <div className="text-3xl font-bold text-gray-800">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Новые</div>
              <div className="text-3xl font-bold text-blue-600">{stats.newOrders}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">В работе</div>
              <div className="text-3xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Завершено</div>
              <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Отменено</div>
              <div className="text-3xl font-bold text-red-600">{stats.cancelled}</div>
            </CardContent>
          </Card>
        </div>

        {/* Таблица заказов */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по ID, клиенту, телефону или адресу..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-gray-600">
                Всего заказов: <span className="font-semibold">{totalOrders}</span>
              </div>
            </div>

            <div className="text-xs">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">ID</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">РК</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Город</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Аккаунт</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Тел.</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Тип</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Клиент</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Адрес</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Встреча</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Закрытие</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Техника</TableHead>
                    <TableHead className="text-center text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Статус</TableHead>
                    <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Мастер</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Итог</TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-600 uppercase px-2 py-2">Опер.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => window.location.href = `/orders/${order.id}`}
                  >
                      <TableCell className="text-gray-500 px-2 py-2 text-[11px]">#{order.id}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.rk}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.city}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] max-w-[90px] truncate">{order.avitoName || '-'}</TableCell>
                      <TableCell className="font-mono text-gray-600 px-2 py-2 text-[10px]">{order.phone}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.typeOrder}</TableCell>
                      <TableCell className="font-medium text-gray-900 px-2 py-2 text-[11px]">{order.clientName}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] max-w-[100px] truncate" title={order.address}>{order.address}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] whitespace-nowrap">{formatDate(order.dateMeeting)}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] whitespace-nowrap">
                        {order.closingData ? formatDate(order.closingData) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.typeEquipment}</TableCell>
                      <TableCell className="text-center px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.statusOrder)}`}>
                          {order.statusOrder}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.master?.name || '-'}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 px-2 py-2 text-[11px] whitespace-nowrap">
                        {order.result ? formatCurrency(Number(order.result)) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.operator?.login || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredOrders.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'Заказы не найдены. Попробуйте изменить поисковый запрос.' : 'Нет заказов.'}
              </div>
            )}

            {/* Пагинация */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  Страница {currentPage} из {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-white"
                  >
                    Первая
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-white"
                  >
                    Назад
                  </Button>
                  
                  {/* Номера страниц */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={isLoading}
                          className={currentPage === pageNum 
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white" 
                            : "bg-white"}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isLoading}
                    className="bg-white"
                  >
                    Вперед
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || isLoading}
                    className="bg-white"
                  >
                    Последняя
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

