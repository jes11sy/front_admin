'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

interface Order {
  id: number
  campaign: string
  city: string
  avitoAccount: string
  phone: string
  orderType: string
  client: string
  address: string
  meetingDate: string
  closingDate: string | null
  techType: string
  status: 'new' | 'in_progress' | 'completed' | 'cancelled'
  master: string
  amount: number
  operator: string
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Мок-данные для статистики
  const stats = {
    totalOrders: 324,
    newOrders: 45,
    inProgress: 128,
    completed: 142,
    cancelled: 9,
  }

  // Мок-данные для таблицы заказов
  const [orders] = useState<Order[]>([
    {
      id: 1,
      campaign: 'РК_Москва_1',
      city: 'Москва',
      avitoAccount: 'Avito_Moscow_Main',
      phone: '+7 (495) 123-45-67',
      orderType: 'Ремонт',
      client: 'Иванов Петр',
      address: 'ул. Ленина, д. 10, кв. 5',
      meetingDate: '2024-11-02',
      closingDate: '2024-11-03',
      techType: 'Стиральная машина',
      status: 'completed',
      master: 'Сергеев С.',
      amount: 5500,
      operator: 'Козлова А.'
    },
    {
      id: 2,
      campaign: 'РК_СПб_2',
      city: 'Санкт-Петербург',
      avitoAccount: 'Avito_SPB_Premium',
      phone: '+7 (812) 987-65-43',
      orderType: 'Диагностика',
      client: 'Петрова Анна',
      address: 'Невский пр., д. 45, кв. 12',
      meetingDate: '2024-11-03',
      closingDate: null,
      techType: 'Холодильник',
      status: 'in_progress',
      master: 'Козлов А.',
      amount: 4200,
      operator: 'Иванова М.'
    },
    {
      id: 3,
      campaign: 'РК_Казань_1',
      city: 'Казань',
      avitoAccount: 'Avito_Kazan_Base',
      phone: '+7 (843) 456-78-90',
      orderType: 'Ремонт',
      client: 'Сидоров Игорь',
      address: 'ул. Баумана, д. 20, кв. 8',
      meetingDate: '2024-11-04',
      closingDate: null,
      techType: 'Посудомоечная машина',
      status: 'new',
      master: 'Морозов И.',
      amount: 3800,
      operator: 'Петрова О.'
    },
    {
      id: 4,
      campaign: 'РК_Москва_2',
      city: 'Москва',
      avitoAccount: 'Avito_Moscow_Extra',
      phone: '+7 (495) 234-56-78',
      orderType: 'Установка',
      client: 'Кузнецова Мария',
      address: 'ул. Пушкина, д. 15, кв. 22',
      meetingDate: '2024-11-05',
      closingDate: null,
      techType: 'Варочная панель',
      status: 'in_progress',
      master: 'Иванов С.',
      amount: 6200,
      operator: 'Козлова А.'
    },
  ])

  const filteredOrders = orders.filter(order =>
    order.id.toString().includes(searchQuery) ||
    order.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.phone.includes(searchQuery) ||
    order.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  const getStatusLabel = (status: Order['status']) => {
    const labels = {
      new: 'Новый',
      in_progress: 'В работе',
      completed: 'Завершен',
      cancelled: 'Отменен'
    }
    return labels[status]
  }

  const getStatusColor = (status: Order['status']) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status]
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
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по ID, клиенту, телефону или адресу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
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
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => window.location.href = `/orders/${order.id}`}
                  >
                      <TableCell className="text-gray-500 px-2 py-2 text-[11px]">#{order.id}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.campaign}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.city}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] max-w-[90px] truncate">{order.avitoAccount}</TableCell>
                      <TableCell className="font-mono text-gray-600 px-2 py-2 text-[10px]">{order.phone}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.orderType}</TableCell>
                      <TableCell className="font-medium text-gray-900 px-2 py-2 text-[11px]">{order.client}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] max-w-[100px] truncate" title={order.address}>{order.address}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] whitespace-nowrap">{formatDate(order.meetingDate)}</TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px] whitespace-nowrap">
                        {order.closingDate ? formatDate(order.closingDate) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.techType}</TableCell>
                      <TableCell className="text-center px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.master}</TableCell>
                      <TableCell className="text-right font-medium text-green-600 px-2 py-2 text-[11px] whitespace-nowrap">
                        {formatCurrency(order.amount)}
                      </TableCell>
                      <TableCell className="text-gray-600 px-2 py-2 text-[11px]">{order.operator}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredOrders.length === 0 && orders.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                Заказы не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}

            {orders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет заказов.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

