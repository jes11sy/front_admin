'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
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
  bsoDoc?: string[] | null
  expenditureDoc?: string[] | null
  partner?: boolean
  partnerPercent?: number | null
  avitoChatId?: string | null
  callId?: string | null
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('main')

  const tabs = [
    { id: 'main', label: 'Информация по заказу' },
    { id: 'result', label: 'Мастер' },
    { id: 'chat', label: 'Запись/Чат авито' }
  ]

  useEffect(() => {
    const loadOrder = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.getOrder(params.id as string)
        if (response.success && response.data) {
          setOrder(response.data)
        } else {
          setError('Заказ не найден')
          toast.error('Заказ не найден')
        }
      } catch (err) {
        console.error('Error loading order:', err)
        const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке заказа'
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      loadOrder()
    }
  }, [params.id])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadgeClass = (status: string) => {
    const statusColors: Record<string, string> = {
      'Ожидает': 'bg-blue-500',
      'Принял': 'bg-cyan-500',
      'В пути': 'bg-purple-500',
      'В работе': 'bg-yellow-500',
      'Готово': 'bg-green-500',
      'Отказ': 'bg-red-500',
      'Модерн': 'bg-orange-500',
      'Незаказ': 'bg-gray-500'
    }
    return statusColors[status] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="text-center py-8 animate-fade-in">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">Загрузка данных заказа...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-2 sm:px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-in-left">
            <p className="text-red-600">{error || 'Заказ не найден'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-2 sm:px-4 py-8">
        <div className="max-w-none mx-auto">
          <div className="backdrop-blur-lg shadow-2xl rounded-2xl p-6 md:p-16 border bg-white/95 hover:bg-white transition-all duration-500 hover:shadow-3xl transform hover:scale-[1.01] animate-fade-in" style={{borderColor: '#114643'}}>
            
            {/* Заголовок */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800 animate-slide-down">Заказ №{params.id}</h1>
                  <div className={`px-4 py-2 rounded-lg text-white font-medium ${getStatusBadgeClass(order.statusOrder)}`}>
                    {order.statusOrder}
                  </div>
                </div>
              </div>
            </div>

            {/* Вкладки */}
            <div className="border-b border-gray-200 mb-6 animate-fade-in">
              <nav className="flex space-x-8">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'text-teal-600 border-teal-600'
                        : 'border-transparent text-gray-600 hover:text-teal-600 hover:border-teal-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Содержимое вкладок */}
            <div className="min-h-[400px]">
              {activeTab === 'main' && (
                <div className="space-y-6">
                  {/* Информация о клиенте */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Информация о клиенте</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Имя клиента</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.clientName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Телефон</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.phone}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Адрес</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Информация о заказе */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Детали заказа</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">РК</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.rk}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Город</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.city}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Тип заказа</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.typeOrder}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Направление</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.typeEquipment}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Дата встречи</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{formatDate(order.dateMeeting)}</p>
                      </div>
                      {order.closingData && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Дата закрытия</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{formatDate(order.closingData)}</p>
                        </div>
                      )}
                      {order.avitoName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Avito аккаунт</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.avitoName}</p>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Оператор</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.operator?.name || order.operator?.login || '-'}</p>
                      </div>
                      {order.problem && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Проблема</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.problem}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'result' && (
                <div className="space-y-6">
                  {/* Мастер */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Мастер</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Мастер</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.master?.name || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Финансовая информация */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Финансы</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Итог</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 font-semibold">
                          {order.result ? formatCurrency(Number(order.result)) : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Расход</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                          {order.expenditure ? formatCurrency(Number(order.expenditure)) : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Чистыми</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                          {order.clean ? formatCurrency(Number(order.clean)) : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Сдача мастера</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                          {order.masterChange ? formatCurrency(Number(order.masterChange)) : '-'}
                        </p>
                      </div>
                      {order.prepayment && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Предоплата</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                            {formatCurrency(Number(order.prepayment))}
                          </p>
                        </div>
                      )}
                      {order.dateClosmod && (
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Дата модерна</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                            {new Date(order.dateClosmod).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      )}
                      {order.comment && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Комментарий</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">{order.comment}</p>
                        </div>
                      )}
                      {order.partner && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-600 mb-1">Партнер</label>
                          <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                            Да {order.partnerPercent ? `(${order.partnerPercent}%)` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Документы */}
                  {((order.bsoDoc && order.bsoDoc.length > 0) || (order.expenditureDoc && order.expenditureDoc.length > 0)) && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Документы</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.bsoDoc && order.bsoDoc.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Документ (БСО) ({order.bsoDoc.length})</label>
                            <div className="space-y-2">
                              {order.bsoDoc.map((doc, index) => (
                                <button
                                  key={index}
                                  onClick={() => window.open(doc, '_blank')}
                                  className="w-full text-left text-teal-600 hover:text-teal-700 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 hover:border-teal-300 transition-all"
                                >
                                  Открыть документ {order.bsoDoc!.length > 1 ? `#${index + 1}` : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {order.expenditureDoc && order.expenditureDoc.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Чек расхода ({order.expenditureDoc.length})</label>
                            <div className="space-y-2">
                              {order.expenditureDoc.map((doc, index) => (
                                <button
                                  key={index}
                                  onClick={() => window.open(doc, '_blank')}
                                  className="w-full text-left text-teal-600 hover:text-teal-700 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 hover:border-teal-300 transition-all"
                                >
                                  Открыть чек {order.expenditureDoc!.length > 1 ? `#${index + 1}` : ''}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <div className="space-y-6">
                  {order.avitoChatId ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Чат Avito</h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">ID чата</label>
                        <p className="text-gray-900 bg-gray-50 rounded-lg px-4 py-2 border border-gray-200 font-mono">{order.avitoChatId}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Нет данных о чате Avito</p>
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
