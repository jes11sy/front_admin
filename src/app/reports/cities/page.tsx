'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState } from 'react'

export default function CitiesReportPage() {
  // Мок-данные для отчета по городам
  const [citiesData] = useState([
    {
      id: 1,
      city: 'Москва',
      completedOrders: 78,
      revenue: 450000,
      companyIncome: 315000,
      balance: 270000
    },
    {
      id: 2,
      city: 'Санкт-Петербург',
      completedOrders: 68,
      revenue: 380000,
      companyIncome: 266000,
      balance: 228000
    },
    {
      id: 3,
      city: 'Казань',
      completedOrders: 40,
      revenue: 220000,
      companyIncome: 154000,
      balance: 132000
    },
    {
      id: 4,
      city: 'Новосибирск',
      completedOrders: 34,
      revenue: 180000,
      companyIncome: 126000,
      balance: 108000
    },
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Вычисляем средний чек
  const getAverageCheck = (revenue: number, completedOrders: number) => {
    if (completedOrders === 0) return 0
    return Math.round(revenue / completedOrders)
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Закрытых заказов</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Средний чек</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Оборот</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Доход компании</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Касса</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {citiesData.map((city) => {
                  const averageCheck = getAverageCheck(city.revenue, city.completedOrders)
                  return (
                    <TableRow key={city.id}>
                      <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                      <TableCell className="text-center text-gray-600">{city.completedOrders}</TableCell>
                      <TableCell className="text-right font-medium text-gray-700">
                        {formatCurrency(averageCheck)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(city.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(city.companyIncome)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-teal-700">
                        {formatCurrency(city.balance)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

