'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, User, Phone, MapPin, Calendar, Wrench, Tag, FileText, DollarSign, Package, ChevronDown, ChevronUp } from 'lucide-react'
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
  const [showFinancial, setShowFinancial] = useState(false)
  const [showDocuments, setShowDocuments] = useState(false)

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
    switch (status) {
      case 'Готово': return '#059669'
      case 'В работе': return '#3b82f6'
      case 'Ожидает': return '#f59e0b'
      case 'Отказ': return '#ef4444'
      case 'Принял': return '#10b981'
      case 'В пути': return '#8b5cf6'
      case 'Модерн': return '#f97316'
      case 'Незаказ': return '#6b7280'
      default: return '#6b7280'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Впервые': return '#10b981'
      case 'Повтор': return '#f59e0b'
      case 'Гарантия': return '#ef4444'
      default: return '#6b7280'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border bg-white/95" style={{borderColor: '#114643'}}>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Загрузка...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-8 border bg-white/95" style={{borderColor: '#114643'}}>
            <p className="text-gray-600 text-center">Заказ не найден</p>
            <div className="text-center mt-4">
              <Button 
                onClick={() => router.push('/orders')}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад к списку
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-8 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl" style={{borderColor: '#114643'}}>
            
            {/* Кнопка назад */}
            <div className="mb-6">
              <Button 
                onClick={() => router.push('/orders')}
                variant="outline"
                className="border-2 border-gray-200 hover:border-gray-300"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад к списку
              </Button>
            </div>

            {/* Заголовок */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-1">Заказ №{order.id}</h1>
                  <p className="text-sm text-gray-500">Создан: {formatDate(order.createDate)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-white shadow-sm" style={{backgroundColor: getTypeColor(order.typeOrder)}}>
                    {order.typeOrder}
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm font-medium text-white shadow-sm" style={{backgroundColor: getStatusColor(order.statusOrder)}}>
                    {order.statusOrder}
                  </span>
                </div>
              </div>
            </div>

            {/* Основная информация */}
            <div className="space-y-6">
              {/* Информация о клиенте и заказе */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Клиент</span>
                  </div>
                  <p className="text-gray-800 font-semibold text-lg">{order.clientName}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Phone className="h-4 w-4" />
                    <span className="font-medium">Телефон</span>
                  </div>
                  <p className="text-gray-800 font-mono font-semibold">{order.phone}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Город</span>
                  </div>
                  <p className="text-gray-800 font-semibold">{order.city}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md md:col-span-2 lg:col-span-3">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Адрес</span>
                  </div>
                  <p className="text-gray-800">{order.address}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Wrench className="h-4 w-4" />
                    <span className="font-medium">Мастер</span>
                  </div>
                  <p className="text-gray-800 font-semibold">{order.master?.name || '-'}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <User className="h-4 w-4" />
                    <span className="font-medium">Оператор</span>
                  </div>
                  <p className="text-gray-800">{order.operator?.name || order.operator?.login || '-'}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="font-medium">Итог</span>
                  </div>
                  <p className="text-green-600 font-bold text-xl">
                    {order.result ? formatCurrency(Number(order.result)) : '-'}
                  </p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Дата встречи</span>
                  </div>
                  <p className="text-gray-800 font-semibold">{formatDate(order.dateMeeting)}</p>
                </div>

                {order.closingData && (
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Дата закрытия</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{formatDate(order.closingData)}</p>
                  </div>
                )}

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">Направление</span>
                  </div>
                  <p className="text-gray-800">{order.typeEquipment}</p>
                </div>

                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">РК</span>
                  </div>
                  <p className="text-gray-800">{order.rk}</p>
                </div>

                {order.avitoName && (
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Авито аккаунт</span>
                    </div>
                    <p className="text-gray-800">{order.avitoName}</p>
                  </div>
                )}

                {order.problem && (
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-all duration-200 hover:shadow-md md:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Проблема</span>
                    </div>
                    <p className="text-gray-800">{order.problem}</p>
                  </div>
                )}

                {order.comment && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg md:col-span-2 lg:col-span-3">
                    <div className="flex items-center gap-2 text-yellow-700 text-xs mb-2">
                      <FileText className="h-4 w-4" />
                      <span className="font-medium">Комментарий</span>
                    </div>
                    <p className="text-gray-800">{order.comment}</p>
                  </div>
                )}
              </div>

              {/* Финансовая информация */}
              <div className="border-t-2 border-gray-200 pt-4">
                <button
                  onClick={() => setShowFinancial(!showFinancial)}
                  className="flex items-center gap-2 text-left cursor-pointer group mb-4"
                >
                  <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                    Финансы
                  </h2>
                  {showFinancial ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                  )}
                </button>

                {showFinancial && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">Итог</p>
                      <p className="text-xl font-bold text-blue-800">
                        {order.result ? formatCurrency(Number(order.result)) : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <p className="text-xs text-red-600 font-medium mb-1">Расход</p>
                      <p className="text-xl font-bold text-red-800">
                        {order.expenditure ? formatCurrency(Number(order.expenditure)) : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                      <p className="text-xs text-green-600 font-medium mb-1">Чистыми</p>
                      <p className="text-xl font-bold text-green-800">
                        {order.clean ? formatCurrency(Number(order.clean)) : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                      <p className="text-xs text-purple-600 font-medium mb-1">Сдача мастера</p>
                      <p className="text-xl font-bold text-purple-800">
                        {order.masterChange ? formatCurrency(Number(order.masterChange)) : '-'}
                      </p>
                    </div>
                    {order.prepayment && (
                      <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700 font-medium mb-1">Предоплата</p>
                        <p className="text-lg font-bold text-yellow-800">
                          {formatCurrency(Number(order.prepayment))}
                        </p>
                      </div>
                    )}
                    {order.partner && (
                      <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
                        <p className="text-xs text-indigo-700 font-medium mb-1">Партнер</p>
                        <p className="text-sm text-indigo-800">
                          {order.partnerPercent && `${order.partnerPercent}%`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Документы */}
              {(order.bsoDoc || order.expenditureDoc || order.avitoChatId) && (
                <div className="border-t-2 border-gray-200 pt-4">
                  <button
                    onClick={() => setShowDocuments(!showDocuments)}
                    className="flex items-center gap-2 text-left cursor-pointer group mb-4"
                  >
                    <h2 className="text-lg font-semibold text-gray-700 group-hover:text-teal-600 transition-colors duration-200">
                      Документы
                    </h2>
                    {showDocuments ? (
                      <ChevronUp className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600 group-hover:text-teal-600 transition-all duration-200" />
                    )}
                  </button>

                  {showDocuments && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                      {order.bsoDoc && (
                        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium mb-2">Документ (БСО)</p>
                          <Button 
                            onClick={() => window.open(order.bsoDoc!, '_blank')}
                            variant="outline"
                            className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50"
                          >
                            Открыть
                          </Button>
                        </div>
                      )}
                      {order.expenditureDoc && (
                        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 font-medium mb-2">Чек расхода</p>
                          <Button 
                            onClick={() => window.open(order.expenditureDoc!, '_blank')}
                            variant="outline"
                            className="w-full border-2 border-teal-600 text-teal-600 hover:bg-teal-50"
                          >
                            Открыть
                          </Button>
                        </div>
                      )}
                      {order.avitoChatId && (
                        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg sm:col-span-2">
                          <p className="text-xs text-gray-600 font-medium mb-1">Чат Avito</p>
                          <p className="font-mono text-gray-800 text-sm">{order.avitoChatId}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
