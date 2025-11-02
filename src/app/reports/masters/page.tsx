'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface ApiMasterReport {
  masterId: number
  masterName: string
  city: string
  totalOrders: number
  turnover: number
  avgCheck: number
  salary: number
}

interface MasterReport {
  id: number
  name: string
  city: string
  ordersCompleted: number
  revenue: number
  salary: number
}

type DatePeriod = 'day' | 'week' | 'month' | 'custom'

export default function MastersReportPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [mastersData, setMastersData] = useState<MasterReport[]>([])
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
        return { start: startDate, end: endDate }
      default:
        start = now
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const dateRange = getDateRange(period)
        const response = await apiClient.getMastersReport({
          startDate: dateRange.start,
          endDate: dateRange.end
        })
        if (response.success && response.data) {
          // Преобразуем данные из API в формат для отображения
          const mappedData: MasterReport[] = response.data.map((item: ApiMasterReport) => ({
            id: item.masterId,
            name: item.masterName,
            city: item.city,
            ordersCompleted: item.totalOrders,
            revenue: item.turnover,
            salary: item.salary
          }))
          setMastersData(mappedData)
        } else {
          toast.error('Не удалось загрузить отчет по мастерам')
        }
      } catch (error) {
        console.error('Error loading masters report:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [period, startDate, endDate])

  // Фильтруем: убираем мастеров с 0 заказами + поиск
  const filteredMasters = mastersData
    .filter(master => master.ordersCompleted > 0) // Убираем мастеров с 0 заказами
    .filter(master =>
      master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      master.city.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Вычисляем средний чек
  const getAverageCheck = (revenue: number, ordersCompleted: number) => {
    if (ordersCompleted === 0) return 0
    return Math.round(revenue / ordersCompleted)
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
                    className="w-40 bg-white"
                  />
                  <span className="text-gray-500">—</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40 bg-white"
                  />
                </div>
              )}
              {period !== 'custom' && (
                <div className="ml-auto text-sm text-gray-600">
                  {(() => {
                    const range = getDateRange(period)
                    return `${range.start} — ${range.end}`
                  })()}
                </div>
              )}
            </div>

            {/* Поиск */}
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по имени или городу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Мастер</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Всего заказов</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Оборот</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Средний чек</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Зарплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredMasters.map((master) => {
                  const averageCheck = getAverageCheck(master.revenue, master.ordersCompleted)
                  return (
                    <TableRow key={`${master.id}-${master.city}`}>
                      <TableCell className="font-medium text-gray-900">{master.name}</TableCell>
                      <TableCell className="text-gray-600">{master.city}</TableCell>
                      <TableCell className="text-center text-gray-600">{master.ordersCompleted}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(master.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-700">
                        {formatCurrency(averageCheck)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(master.salary)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredMasters.length === 0 && mastersData.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                Мастера не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}

            {mastersData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет данных по мастерам.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

