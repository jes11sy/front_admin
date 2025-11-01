'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Star, Wifi, Shield, Zap, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'

interface AvitoAccount {
  id: number
  accountName: string
  connectionStatus: 'online' | 'offline'
  proxyStatus: 'active' | 'inactive'
  cpa: number
  balance: number
  adsCount: number
  viewsCount: number
  contactsCount: number
}

export default function AvitoPage() {
  // Мок-данные для статистики
  const stats = {
    accountsCount: 12,
    adsCount: 324,
    viewsCount: 15420,
    contactsCount: 892,
    totalBalance: 45600,
    ordersCount: 156,
    orderPrice: 3500,
  }

  // Мок-данные для таблицы
  const [accounts] = useState<AvitoAccount[]>([
    {
      id: 1,
      accountName: 'Avito_Moscow_1',
      connectionStatus: 'online',
      proxyStatus: 'active',
      cpa: 450,
      balance: 5200,
      adsCount: 45,
      viewsCount: 2340,
      contactsCount: 123
    },
    {
      id: 2,
      accountName: 'Avito_SPB_1',
      connectionStatus: 'online',
      proxyStatus: 'active',
      cpa: 380,
      balance: 3800,
      adsCount: 32,
      viewsCount: 1890,
      contactsCount: 98
    },
    {
      id: 3,
      accountName: 'Avito_Kazan_1',
      connectionStatus: 'offline',
      proxyStatus: 'inactive',
      cpa: 420,
      balance: 1200,
      adsCount: 28,
      viewsCount: 1560,
      contactsCount: 87
    },
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Аккаунты</div>
              <div className="text-3xl font-bold text-gray-800">{stats.accountsCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Объявления</div>
              <div className="text-3xl font-bold text-gray-800">{stats.adsCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Просмотры</div>
              <div className="text-3xl font-bold text-gray-800">{formatNumber(stats.viewsCount)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Контакты</div>
              <div className="text-3xl font-bold text-gray-800">{formatNumber(stats.contactsCount)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Общий баланс</div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalBalance)}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Заказы</div>
              <div className="text-3xl font-bold text-gray-800">{stats.ordersCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="pt-6">
              <div className="text-sm text-yellow-700 mb-2">Цена заказа</div>
              <div className="text-3xl font-bold text-yellow-700">{formatCurrency(stats.orderPrice)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Инструменты */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="outline" className="bg-white hover:bg-yellow-50 border-yellow-200">
            <Star className="h-4 w-4 mr-2 text-yellow-600" />
            Отзывы
          </Button>

          <Button variant="outline" className="bg-white hover:bg-green-50 border-green-200">
            <Wifi className="h-4 w-4 mr-2 text-green-600" />
            Вечный онлайн
          </Button>

          <Button variant="outline" className="bg-white hover:bg-blue-50 border-blue-200">
            <Shield className="h-4 w-4 mr-2 text-blue-600" />
            Проверка прокси
          </Button>

          <Button variant="outline" disabled className="bg-gray-50">
            <Zap className="h-4 w-4 mr-2" />
            Топ-робот
          </Button>
        </div>

        {/* Таблица аккаунтов */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-end mb-4">
              <Button 
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                onClick={() => window.location.href = '/avito/add'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить аккаунт
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Аккаунт</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Подключение</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Прокси</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">CPA</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Баланс</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Объявл.</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Просм.</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Контакты</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow 
                    key={account.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => window.location.href = `/avito/edit/${account.id}`}
                  >
                    <TableCell className="text-gray-500">#{account.id}</TableCell>
                    <TableCell className="font-medium text-gray-900">{account.accountName}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex h-2 w-2 rounded-full ${
                        account.connectionStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex h-2 w-2 rounded-full ${
                        account.proxyStatus === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                    </TableCell>
                    <TableCell className="text-right text-gray-900">{formatCurrency(account.cpa)}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">{formatCurrency(account.balance)}</TableCell>
                    <TableCell className="text-center text-gray-600">{account.adsCount}</TableCell>
                    <TableCell className="text-center text-gray-600">{formatNumber(account.viewsCount)}</TableCell>
                    <TableCell className="text-center text-gray-600">{account.contactsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {accounts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Нет аккаунтов
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
