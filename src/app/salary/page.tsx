'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, DollarSign, User, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface Director {
  id: number
  name: string
  cities: string[]
}

interface SalaryRecord {
  id: string
  city: string
  directorName: string
  turnoverOur: number
  turnoverPartner: number
  salary: number
}

type DatePeriod = 'day' | 'week' | 'month' | 'custom'

export default function SalaryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
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
        // Находим понедельник текущей недели
        const dayOfWeek = now.getDay()
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday)
        start.setHours(0, 0, 0, 0)
        // Воскресенье
        end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59)
        break
      case 'month':
        // С 1 числа по последний день месяца
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
        // Загружаем директоров
        const directorsResponse = await apiClient.getDirectors()
        if (!directorsResponse.success || !directorsResponse.data) {
          toast.error('Не удалось загрузить данных директоров')
          return
        }

        const directors: Director[] = directorsResponse.data

        // Получаем диапазон дат
        const dateRange = getDateRange(period)

        // Загружаем отчет по городам (там уже есть правильный расчет оборота из orders.clean)
        const citiesReportResponse = await apiClient.getCitiesReport({
          startDate: dateRange.start,
          endDate: dateRange.end
        })

        if (!citiesReportResponse.success || !citiesReportResponse.data) {
          toast.error('Не удалось загрузить отчет по городам')
          return
        }

        // Создаем Map для быстрого поиска оборота по городу
        const cityTurnoverOur = new Map<string, number>()
        const cityTurnoverPartner = new Map<string, number>()
        
        citiesReportResponse.data.forEach((cityData: any) => {
          // Оборот Наш = сумма чистыми где partner = false
          cityTurnoverOur.set(cityData.city, cityData.orders.totalCleanOur || 0)
          // Оборот Партнер = сумма чистыми где partner = true
          cityTurnoverPartner.set(cityData.city, cityData.orders.totalCleanPartner || 0)
        })

        // Создаем записи зарплаты для каждого директора по каждому городу
        const records: SalaryRecord[] = []
        directors.forEach((director) => {
          director.cities.forEach((city) => {
            const turnoverOur = cityTurnoverOur.get(city) || 0
            const turnoverPartner = cityTurnoverPartner.get(city) || 0
            const salary = turnoverOur * 0.07 // 7% от оборота нашего
            
            records.push({
              id: `${director.id}-${city}`,
              city,
              directorName: director.name,
              turnoverOur,
              turnoverPartner,
              salary
            })
          })
        })

        setSalaryRecords(records)
      } catch (error) {
        console.error('Error loading salary data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [period, startDate, endDate])


  const filteredRecords = salaryRecords.filter(record =>
    record.directorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Статистика
  const stats = {
    totalTurnoverOur: salaryRecords.reduce((sum, r) => sum + r.turnoverOur, 0),
    totalTurnoverPartner: salaryRecords.reduce((sum, r) => sum + r.turnoverPartner, 0),
    totalSalary: salaryRecords.reduce((sum, r) => sum + r.salary, 0),
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Оборот Наш</div>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalTurnoverOur)}</div>
              <p className="text-xs text-gray-500 mt-1">Партнер: нет</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-purple-700">Оборот Партнер</div>
                <DollarSign className="h-4 w-4 text-purple-700" />
              </div>
              <div className="text-3xl font-bold text-purple-700">{formatCurrency(stats.totalTurnoverPartner)}</div>
              <p className="text-xs text-purple-600 mt-1">Партнер: да</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-teal-700">Общая зарплата</div>
                <DollarSign className="h-4 w-4 text-teal-700" />
              </div>
              <div className="text-3xl font-bold text-teal-700">{formatCurrency(stats.totalSalary)}</div>
              <p className="text-xs text-teal-600 mt-1">7% от Оборота Нашего</p>
            </CardContent>
          </Card>
        </div>

        {/* Таблица зарплаты */}
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

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по городу или директору..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="bg-white">
                <Download className="h-4 w-4 mr-2" />
                Экспорт
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Имя директора</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-blue-600 uppercase tracking-wider">Оборот Наш</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-purple-600 uppercase tracking-wider">Оборот Партнер</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-teal-600 uppercase tracking-wider">Зарплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      {searchQuery ? 'Записи не найдены. Попробуйте изменить поисковый запрос.' : 'Нет данных.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium text-gray-900">
                        {record.city}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          {record.directorName}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(record.turnoverOur)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-purple-600">
                        {formatCurrency(record.turnoverPartner)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-teal-700">
                        {formatCurrency(record.salary)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

