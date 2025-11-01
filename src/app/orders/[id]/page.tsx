'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Phone, Calendar, User, Wrench, DollarSign, FileText, Tag } from 'lucide-react'

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

export default function OrderViewPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Загрузить данные с API
    // Мок-данные для примера
    const mockOrders: { [key: string]: Order } = {
      '1': {
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
      '2': {
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
      '3': {
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
      '4': {
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
    }

    const foundOrder = mockOrders[orderId as string]
    if (foundOrder) {
      setOrder(foundOrder)
    }
    setLoading(false)
  }, [orderId])

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

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Загрузка...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Заказ не найден</p>
              <Button 
                variant="outline" 
                className="mt-4 bg-white"
                onClick={() => router.push('/orders')}
              >
                Вернуться к списку
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="outline" 
          className="mb-6 bg-white"
          onClick={() => router.push('/orders')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>

        <Card className="border-0 shadow-lg mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl text-gray-800">Заказ #{order.id}</CardTitle>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Основная информация */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <User className="h-4 w-4" />
                    Клиент
                  </div>
                  <p className="text-gray-900 font-medium text-lg">{order.client}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Phone className="h-4 w-4" />
                    Телефон
                  </div>
                  <p className="text-gray-900 font-mono">{order.phone}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <MapPin className="h-4 w-4" />
                    Адрес
                  </div>
                  <p className="text-gray-900">{order.address}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Tag className="h-4 w-4" />
                    Тип заказа
                  </div>
                  <p className="text-gray-900 font-medium">{order.orderType}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <FileText className="h-4 w-4" />
                    Тип техники
                  </div>
                  <p className="text-gray-900">{order.techType}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Wrench className="h-4 w-4" />
                    Мастер
                  </div>
                  <p className="text-gray-900 font-medium">{order.master}</p>
                </div>
              </div>
            </div>

            {/* Финансовая информация */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                Сумма заказа
              </div>
              <p className="text-green-600 font-bold text-2xl">{formatCurrency(order.amount)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Детали заказа */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Информация о заказе</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-gray-500 text-sm">РК</p>
                <p className="text-gray-900 font-medium">{order.campaign}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Город</p>
                <p className="text-gray-900 font-medium">{order.city}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Авито аккаунт</p>
                <p className="text-gray-900 font-medium">{order.avitoAccount}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Оператор</p>
                <p className="text-gray-900 font-medium">{order.operator}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg text-gray-800">Даты</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  Дата встречи
                </div>
                <p className="text-gray-900 font-medium">{formatDate(order.meetingDate)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  Дата закрытия
                </div>
                <p className="text-gray-900 font-medium">
                  {order.closingDate ? formatDate(order.closingDate) : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

