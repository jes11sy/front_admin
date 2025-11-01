'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, Wrench, ShoppingCart, TrendingUp, DollarSign, TrendingDown, Tag } from 'lucide-react'

export default function HomePage() {
  // Мок-данные для тестирования визуала
  const stats = {
    callCenterEmployees: 12,
    directors: 8,
    masters: 45,
    orders: 324,
    revenue: 1250000,
    profit: 450000,
    expenses: 800000,
    avitoOrderPrice: 3500,
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        {/* Сотрудники */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Сотрудники</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Кол-центр */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Кол-центр
                </CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{stats.callCenterEmployees}</div>
                <p className="text-xs text-gray-500 mt-1">сотрудников</p>
              </CardContent>
            </Card>

            {/* Директора */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Директора
                </CardTitle>
                <UserCheck className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{stats.directors}</div>
                <p className="text-xs text-gray-500 mt-1">директоров</p>
              </CardContent>
            </Card>

            {/* Мастера */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Мастера
                </CardTitle>
                <Wrench className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.masters}</div>
                <p className="text-xs text-gray-500 mt-1">мастеров</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Финансы и заказы */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Финансы и заказы</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Количество заказов */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Заказы
                </CardTitle>
                <ShoppingCart className="h-5 w-5 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-indigo-600">{stats.orders}</div>
                <p className="text-xs text-gray-500 mt-1">всего заказов</p>
              </CardContent>
            </Card>

            {/* Оборот */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Оборот
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">{formatCurrency(stats.revenue)}</div>
                <p className="text-xs text-gray-500 mt-1">общий оборот</p>
              </CardContent>
            </Card>

            {/* Чистая прибыль */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Прибыль
                </CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.profit)}</div>
                <p className="text-xs text-gray-500 mt-1">чистая прибыль</p>
              </CardContent>
            </Card>

            {/* Расходы */}
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Расходы
                </CardTitle>
                <TrendingDown className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.expenses)}</div>
                <p className="text-xs text-gray-500 mt-1">общие расходы</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Авито */}
        <div className="mt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Авито</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Цена заказа Авито
                </CardTitle>
                <Tag className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.avitoOrderPrice)}</div>
                <p className="text-xs text-gray-500 mt-1">текущая цена</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
