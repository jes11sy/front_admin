'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Phone, Calendar, User, Wrench, DollarSign, FileText, Tag } from 'lucide-react'
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
  problem?: string
  comment?: string
}

export default function OrderViewPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true)
      try {
        const response = await apiClient.getOrder(orderId as string)
        if (response.success && response.data) {
          setOrder(response.data)
        } else {
          toast.error('Заказ не найден')
        }
      } catch (error) {
        console.error('Error loading order:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке заказа'
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      loadOrder()
    }
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
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.statusOrder)}`}>
                {order.statusOrder}
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
                  <p className="text-gray-900 font-medium text-lg">{order.clientName}</p>
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
                  <p className="text-gray-900 font-medium">{order.typeOrder}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <FileText className="h-4 w-4" />
                    Тип техники
                  </div>
                  <p className="text-gray-900">{order.typeEquipment}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                    <Wrench className="h-4 w-4" />
                    Мастер
                  </div>
                  <p className="text-gray-900 font-medium">{order.master?.name || '-'}</p>
                </div>
              </div>
            </div>

            {/* Финансовая информация */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <DollarSign className="h-4 w-4" />
                Сумма заказа
              </div>
              <p className="text-green-600 font-bold text-2xl">
                {order.result ? formatCurrency(Number(order.result)) : '-'}
              </p>
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
                <p className="text-gray-900 font-medium">{order.rk}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Город</p>
                <p className="text-gray-900 font-medium">{order.city}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Авито аккаунт</p>
                <p className="text-gray-900 font-medium">{order.avitoName || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Оператор</p>
                <p className="text-gray-900 font-medium">{order.operator?.login || '-'}</p>
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
                <p className="text-gray-900 font-medium">{formatDate(order.dateMeeting)}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Calendar className="h-4 w-4" />
                  Дата закрытия
                </div>
                <p className="text-gray-900 font-medium">
                  {order.closingData ? formatDate(order.closingData) : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

