'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface CampaignReport {
  rk: string
  avitoName: string | null
  ordersCount: number
  revenue: number // Оборот (сумма чистыми - clean)
  profit: number // Выручка (сдача мастера - masterChange)
}

interface CityReport {
  city: string
  campaigns: CampaignReport[]
}

type DatePeriod = 'day' | 'week' | 'month' | 'custom'

export default function CampaignsReportPage() {
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
        
        // Используем новый API endpoint для отчета по кампаниям
        const response = await apiClient.getCampaignsReport({
          startDate: dateRange.start,
          endDate: dateRange.end
        })
        
        if (response.success && response.data) {
          setCitiesData(response.data)
        } else {
          toast.error('Не удалось загрузить отчет по РК')
        }
      } catch (error) {
        console.error('Error loading campaigns report:', error)
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

            {/* Таблицы по городам */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Загрузка...
              </div>
            ) : citiesData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Нет данных для отображения
              </div>
            ) : (
              <div className="space-y-8">
                {citiesData.map((cityData) => (
                  <div key={cityData.city} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Заголовок города */}
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4">
                      <h2 className="text-xl font-bold text-white">{cityData.city}</h2>
                    </div>

                    {/* Таблица кампаний города */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gray-50/50">
                          <TableRow>
                            <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">РК</TableHead>
                            <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Имя мастера</TableHead>
                            <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Кол-во заказов</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Оборот</TableHead>
                            <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Выручка</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cityData.campaigns.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Нет данных по кампаниям
                              </TableCell>
                            </TableRow>
                          ) : (
                            cityData.campaigns.map((campaign, index) => (
                              <TableRow key={`${cityData.city}-${campaign.rk}-${campaign.avitoName}-${index}`}>
                                <TableCell className="font-medium text-gray-900">{campaign.rk}</TableCell>
                                <TableCell className="text-gray-700">
                                  {campaign.avitoName || <span className="text-gray-400 italic">Не указано</span>}
                                </TableCell>
                                <TableCell className="text-center text-gray-600">{campaign.ordersCount}</TableCell>
                                <TableCell className="text-right font-medium text-green-600">
                                  {formatCurrency(campaign.revenue)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-blue-600">
                                  {formatCurrency(campaign.profit)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Итоги по городу */}
                    {cityData.campaigns.length > 0 && (
                      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Всего заказов:</span>
                            <span className="ml-2 font-bold text-gray-800">
                              {cityData.campaigns.reduce((sum, item) => sum + item.ordersCount, 0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Общий оборот:</span>
                            <span className="ml-2 font-bold text-green-600">
                              {formatCurrency(cityData.campaigns.reduce((sum, item) => sum + item.revenue, 0))}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Общая выручка:</span>
                            <span className="ml-2 font-bold text-blue-600">
                              {formatCurrency(cityData.campaigns.reduce((sum, item) => sum + item.profit, 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

