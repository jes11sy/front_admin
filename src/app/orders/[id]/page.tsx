'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  ArrowLeft, MapPin, Phone, Calendar, User, Wrench, DollarSign, 
  FileText, Tag, Package, Clock, CheckCircle, XCircle, AlertCircle,
  Image as ImageIcon, Receipt, MessageSquare
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface Order {
  id: number
  rk: string
  city: string
  avitoName: string | null
  phone: string
  typeOrder: string
  clientName: string
  address: string
  dateMeeting: string
  closingData: string | null
  createDate: string
  typeEquipment: string
  statusOrder: string
  masterId: number | null
  result: number | null
  expenditure: number | null
  clean: number | null
  masterChange: number | null
  prepayment: number | null
  dateClosmod: string | null
  operatorNameId: number
  master?: { id: number; name: string }
  operator?: { id: number; name: string; login: string }
  problem?: string
  comment?: string
  bsoDoc?: string | null
  expenditureDoc?: string | null
  partner?: boolean
  partnerPercent?: number | null
  avitoChatId?: string | null
  callId?: string | null
}

export default function OrderViewPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Ожидает': 'bg-blue-100 text-blue-800 border-blue-200',
      'Принял': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'В пути': 'bg-purple-100 text-purple-800 border-purple-200',
      'В работе': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Готово': 'bg-green-100 text-green-800 border-green-200',
      'Отказ': 'bg-red-100 text-red-800 border-red-200',
      'Модерн': 'bg-orange-100 text-orange-800 border-orange-200',
      'Незаказ': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      'Ожидает': <Clock className="h-4 w-4" />,
      'Принял': <CheckCircle className="h-4 w-4" />,
      'В пути': <Package className="h-4 w-4" />,
      'В работе': <Wrench className="h-4 w-4" />,
      'Готово': <CheckCircle className="h-4 w-4" />,
      'Отказ': <XCircle className="h-4 w-4" />,
      'Модерн': <AlertCircle className="h-4 w-4" />,
      'Незаказ': <XCircle className="h-4 w-4" />
    }
    return icons[status] || <AlertCircle className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка данных заказа...</p>
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
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Заказ не найден</p>
              <Button 
                variant="outline" 
                className="bg-white"
                onClick={() => router.push('/orders')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
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
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Хедер с кнопкой назад */}
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            className="bg-white"
            onClick={() => router.push('/orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Button>
        </div>

        {/* Карточка с основной информацией */}
        <Card className="border-0 shadow-xl mb-6">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold mb-2">Заказ #{order.id}</CardTitle>
                <p className="text-teal-100 text-sm">Создан: {formatDate(order.createDate)}</p>
              </div>
              <div className={`px-6 py-3 rounded-xl text-sm font-semibold border-2 flex items-center gap-2 ${getStatusColor(order.statusOrder)} bg-white/90`}>
                {getStatusIcon(order.statusOrder)}
                {order.statusOrder}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Быстрая информация */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-600 font-medium">Клиент</p>
                    <p className="text-lg font-bold text-blue-900">{order.clientName}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-purple-600 p-2 rounded-lg">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-purple-600 font-medium">Мастер</p>
                    <p className="text-lg font-bold text-purple-900">{order.master?.name || 'Не назначен'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-green-600 font-medium">Сумма заказа</p>
                    <p className="text-lg font-bold text-green-900">
                      {order.result ? formatCurrency(Number(order.result)) : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Вкладки */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="info">Информация</TabsTrigger>
                <TabsTrigger value="financial">Финансы</TabsTrigger>
                <TabsTrigger value="documents">Документы</TabsTrigger>
              </TabsList>

              {/* Вкладка: Информация */}
              <TabsContent value="info" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Левая колонка */}
                  <div className="space-y-4">
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Контактная информация</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Phone className="h-3 w-3" />
                            Телефон
                          </div>
                          <p className="text-gray-900 font-mono text-lg font-semibold">{order.phone}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <MapPin className="h-3 w-3" />
                            Адрес
                          </div>
                          <p className="text-gray-900">{order.address}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <MapPin className="h-3 w-3" />
                            Город
                          </div>
                          <p className="text-gray-900 font-medium">{order.city}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Даты</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Calendar className="h-3 w-3" />
                            Дата встречи
                          </div>
                          <p className="text-gray-900 font-medium text-lg">{formatDate(order.dateMeeting)}</p>
                        </div>
                        {order.closingData && (
                          <div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <CheckCircle className="h-3 w-3" />
                              Дата закрытия
                            </div>
                            <p className="text-gray-900 font-medium">{formatDate(order.closingData)}</p>
                          </div>
                        )}
                        {order.dateClosmod && (
                          <div>
                            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                              <AlertCircle className="h-3 w-3" />
                              Дата модерна
                            </div>
                            <p className="text-gray-900 font-medium">{formatDateShort(order.dateClosmod)}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Правая колонка */}
                  <div className="space-y-4">
                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Детали заказа</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Tag className="h-3 w-3" />
                            Тип заказа
                          </div>
                          <p className="text-gray-900 font-medium">{order.typeOrder}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Package className="h-3 w-3" />
                            Тип оборудования
                          </div>
                          <p className="text-gray-900 font-medium">{order.typeEquipment}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                            <Wrench className="h-3 w-3" />
                            Проблема
                          </div>
                          <p className="text-gray-900">{order.problem || '—'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border border-gray-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-500">Источник и операторы</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">РК (Рекламная кампания)</p>
                          <p className="text-gray-900 font-medium">{order.rk}</p>
                        </div>
                        {order.avitoName && (
                          <div>
                            <p className="text-gray-500 text-xs mb-1">Авито аккаунт</p>
                            <p className="text-gray-900 font-medium">{order.avitoName}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Оператор</p>
                          <p className="text-gray-900 font-medium">{order.operator?.name || order.operator?.login || '—'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {order.comment && (
                      <Card className="border border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-yellow-800">Комментарий</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-900">{order.comment}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Вкладка: Финансы */}
              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="text-lg">Итоги заказа</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Итог:</span>
                        <span className="text-xl font-bold text-blue-600">
                          {order.result ? formatCurrency(Number(order.result)) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-gray-700">Расход:</span>
                        <span className="text-xl font-bold text-red-600">
                          {order.expenditure ? formatCurrency(Number(order.expenditure)) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-gray-700">Чистыми:</span>
                        <span className="text-xl font-bold text-green-600">
                          {order.clean ? formatCurrency(Number(order.clean)) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-gray-700">Сдача мастера:</span>
                        <span className="text-xl font-bold text-purple-600">
                          {order.masterChange ? formatCurrency(Number(order.masterChange)) : '—'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-gray-200">
                    <CardHeader className="bg-gray-50">
                      <CardTitle className="text-lg">Дополнительная информация</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                      {order.prepayment && (
                        <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                          <span className="text-gray-700">Предоплата:</span>
                          <span className="text-lg font-bold text-yellow-600">
                            {formatCurrency(Number(order.prepayment))}
                          </span>
                        </div>
                      )}
                      
                      {order.partner && (
                        <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2 w-2 bg-indigo-600 rounded-full"></div>
                            <span className="font-semibold text-indigo-900">Партнер</span>
                          </div>
                          {order.partnerPercent && (
                            <p className="text-sm text-indigo-700">
                              Процент партнера: <span className="font-bold">{order.partnerPercent}%</span>
                            </p>
                          )}
                        </div>
                      )}

                      {!order.result && !order.prepayment && !order.partner && (
                        <div className="text-center py-8 text-gray-400">
                          <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Финансовые данные не заполнены</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Вкладка: Документы */}
              <TabsContent value="documents" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Документ БСО */}
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Документ (БСО)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.bsoDoc ? (
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 text-center">Документ загружен</p>
                          </div>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => window.open(order.bsoDoc!, '_blank')}
                          >
                            Открыть документ
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Документ не загружен</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Чек расхода */}
                  <Card className="border border-gray-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Чек расхода
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {order.expenditureDoc ? (
                        <div className="space-y-3">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 text-center">Чек загружен</p>
                          </div>
                          <Button 
                            className="w-full" 
                            variant="outline"
                            onClick={() => window.open(order.expenditureDoc!, '_blank')}
                          >
                            Открыть чек
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-400">
                          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>Чек не загружен</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Чат Avito */}
                {order.avitoChatId && (
                  <Card className="border border-gray-200 mt-6">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Чат Avito
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <p className="text-sm text-blue-700 mb-2">ID чата:</p>
                        <p className="font-mono text-blue-900 font-bold">{order.avitoChatId}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
