'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'
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

type DatePeriod = 'day' | 'week' | 'month' | 'custom'

export default function CitiesReportPage() {
  const [citiesData, setCitiesData] = useState<CityReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState<DatePeriod>('day')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Функция для получения дат периода
  const getDateRange = (selectedPeriod: DatePeriod) => {
    const now = new Date()
    let start: Date
    let end: Date = now

    switch (selectedPeriod) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        break
      case 'week':
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
        start.setHours(0, 0, 0, 0)
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'custom':
        // Для пользовательских дат добавляем время
        const customStart = startDate ? `${startDate} 00:00:00` : ''
        const customEnd = endDate ? `${endDate} 23:59:59` : ''
        return { start: customStart, end: customEnd }
      default:
        start = now
    }

    // Форматируем дату с учетом времени для корректной фильтрации
    const formatLocalDateTime = (date: Date, isEndOfDay: boolean = false) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      
      // Для конца дня всегда используем 23:59:59
      if (isEndOfDay) {
        return `${year}-${month}-${day} 23:59:59`
      }
      
      // Для начала дня используем 00:00:00
      return `${year}-${month}-${day} 00:00:00`
    }

    return {
      start: formatLocalDateTime(start, false),
      end: formatLocalDateTime(end, true)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const dateRange = getDateRange(period)
        const response = await apiClient.getCitiesReport({
          startDate: dateRange.start,
          endDate: dateRange.end
        })
        if (response.success && response.data) {
          // Преобразуем данные из API в формат для отображения
          const mappedData: CityReport[] = response.data.map((item: ApiCityReport) => ({
            city: item.city,
            completedOrders: item.orders.closedOrders,
            revenue: item.orders.totalClean, // Оборот = сумма чистыми
            companyIncome: item.orders.totalMasterChange, // Доход компании = сумма сдачи мастера
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
  }, [period, startDate, endDate])


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
            {/* Фильтры по датам */}
            <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Период:</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={period === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod('day')}
                  className={period === 'day' ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-white'}
                >
                  День
                </Button>
                <Button
                  variant={period === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod('week')}
                  className={period === 'week' ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-white'}
                >
                  Неделя
                </Button>
                <Button
                  variant={period === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod('month')}
                  className={period === 'month' ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-white'}
                >
                  Месяц
                </Button>
                <Button
                  variant={period === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod('custom')}
                  className={period === 'custom' ? 'bg-gradient-to-r from-teal-600 to-emerald-600' : 'bg-white'}
                >
                  Выбрать даты
                </Button>
              </div>
              {period === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-gray-500">—</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              )}
              {period !== 'custom' && (
                <div className="ml-auto text-sm text-gray-600">
                  {(() => {
                    const range = getDateRange(period)
                    // Показываем только дату без времени для удобства
                    const startDisplay = range.start.split(' ')[0]
                    const endDisplay = range.end.split(' ')[0]
                    return `${startDisplay} — ${endDisplay}`
                  })()}
                </div>
              )}
            </div>

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

