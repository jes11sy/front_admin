'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface ApiCityReport {
  city: string
  orders: {
    closedOrders: number
    refusals: number
    notOrders: number
    totalClean: number
    totalMasterChange: number
    avgCheck: number
  }
  cash: {
    totalAmount: number
  }
}

interface CityReport {
  city: string
  completedOrders: number
  revenue: number
  companyIncome: number
  balance: number
}

export default function CitiesReportPage() {
  const [citiesData, setCitiesData] = useState<CityReport[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getCitiesReport()
        if (response.success && response.data) {
          // Преобразуем данные из API в формат для отображения
          const mappedData: CityReport[] = response.data.map((item: ApiCityReport) => ({
            city: item.city,
            completedOrders: item.orders.closedOrders,
            revenue: item.orders.totalClean, // Оборот = сумма чистыми
            companyIncome: item.orders.totalClean - item.orders.totalMasterChange, // Доход компании = чистыми - сдача мастера
            balance: item.cash.totalAmount // Касса
          }))
          setCitiesData(mappedData)
        } else {
          toast.error('Не удалось загрузить отчет по городам')
        }
      } catch (error) {
        console.error('Error loading cities report:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])


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
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : citiesData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Нет данных для отображения
                    </TableCell>
                  </TableRow>
                ) : (
                  citiesData.map((city) => {
                    const averageCheck = getAverageCheck(city.revenue, city.completedOrders)
                    return (
                      <TableRow key={city.city}>
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
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

