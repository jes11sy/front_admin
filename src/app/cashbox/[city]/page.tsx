'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { OptimizedPagination } from '@/components/ui/optimized-pagination'

interface Transaction {
  id: number
  name: string
  amount: number
  city: string
  note?: string
  createdAt: string
  paymentPurpose?: string
}

interface CityStats {
  totalIncome: number
  totalExpenses: number
  balance: number
}

type DateFilter = 'day' | 'week' | 'month' | 'custom' | 'all'

export default function CityTransactionsPage() {
  const router = useRouter()
  const params = useParams()
  const cityName = decodeURIComponent(params.city as string)

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [cityStats, setCityStats] = useState<CityStats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const PAGE_SIZES = [
    { value: '20', label: '20' },
    { value: '50', label: '50' },
    { value: '100', label: '100' },
  ]

  const TRANSACTION_TYPES = [
    { value: 'all', label: 'Все типы' },
    { value: 'приход', label: 'Приход' },
    { value: 'расход', label: 'Расход' },
  ]

  // Функция для получения диапазона дат в зависимости от фильтра
  const getDateRange = () => {
    const now = new Date()
    let start: Date | null = null
    let end: Date = now

    // Форматируем даты с временем для корректной фильтрации
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    switch (dateFilter) {
      case 'day':
        start = new Date(now)
        start.setHours(0, 0, 0, 0)
        end = new Date(now)
        end.setHours(23, 59, 59)
        return {
          startDate: formatDateTime(start),
          endDate: formatDateTime(end)
        }
      case 'week':
        start = new Date(now)
        start.setDate(now.getDate() - 7)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        return {
          startDate: formatDateTime(start),
          endDate: formatDateTime(end)
        }
      case 'month':
        start = new Date(now)
        start.setMonth(now.getMonth() - 1)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59)
        return {
          startDate: formatDateTime(start),
          endDate: formatDateTime(end)
        }
      case 'custom':
        if (startDate && endDate) {
          const customStart = new Date(startDate)
          customStart.setHours(0, 0, 0, 0)
          const customEnd = new Date(endDate)
          customEnd.setHours(23, 59, 59)
          return {
            startDate: formatDateTime(customStart),
            endDate: formatDateTime(customEnd)
          }
        }
        return { startDate, endDate }
      case 'all':
      default:
        return { startDate: '', endDate: '' }
    }
  }

  const handleDateFilterChange = (filter: DateFilter) => {
    setDateFilter(filter)
    if (filter !== 'custom') {
      const range = getDateRange()
      setStartDate(range.startDate)
      setEndDate(range.endDate)
    } else {
      setStartDate('')
      setEndDate('')
    }
    setCurrentPage(1)
  }

  const handleCustomDateApply = () => {
    if (startDate || endDate) {
      setDateFilter('custom')
      setCurrentPage(1)
    }
  }

  const getFilterLabel = () => {
    switch (dateFilter) {
      case 'day': return 'За сегодня'
      case 'week': return 'За неделю'
      case 'month': return 'За месяц'
      case 'custom': return 'За период'
      case 'all': return 'За всё время'
      default: return 'За период'
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const dateRange = getDateRange()
        
        // Загружаем ВСЕ транзакции для правильной пагинации и статистики
        const resp = await apiClient.getCashByCity(cityName, { 
          page: 1, 
          limit: 10000,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          startDate: dateRange.startDate || undefined,
          endDate: dateRange.endDate || undefined
        })
        
        let allTransactions: Transaction[] = []
        if (resp.success && resp.data) {
          allTransactions = resp.data.data || resp.data
        }
        
        // Данные уже отфильтрованы сервером, но для локальной фильтрации оставим код на случай необходимости
        let filteredData = allTransactions
        
        // Применяем пагинацию к отфильтрованным данным
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const paginatedData = filteredData.slice(startIndex, endIndex)
        
        setTransactions(paginatedData)
        setTotalTransactions(filteredData.length)
        setTotalPages(Math.ceil(filteredData.length / itemsPerPage))

        // Рассчитываем статистику по отфильтрованным данным
        const income = filteredData
          .filter(t => t.name === 'приход')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const expenses = filteredData
          .filter(t => t.name === 'расход')
          .reduce((sum, t) => sum + Number(t.amount), 0)
        const balance = income - expenses

        setCityStats({
          totalIncome: income,
          totalExpenses: expenses,
          balance
        })
      } catch (error) {
        console.error('Error loading city transactions:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке транзакций'
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cityName, currentPage, itemsPerPage, typeFilter, dateFilter, startDate, endDate])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">Загрузка...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button 
          variant="outline" 
          className="mb-6 bg-white"
          onClick={() => router.push('/cashbox')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад к списку
        </Button>

        {/* Статистика по городу */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Доходы</div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(cityStats.totalIncome)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getFilterLabel()}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Расходы</div>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency(cityStats.totalExpenses)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{getFilterLabel()}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-teal-700">Баланс</div>
                <DollarSign className="h-4 w-4 text-teal-700" />
              </div>
              <div className="text-3xl font-bold text-teal-700">
                {formatCurrency(cityStats.balance)}
              </div>
              <p className="text-xs text-teal-600 mt-1">Касса</p>
            </CardContent>
          </Card>
        </div>

        {/* Таблица транзакций */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">
              Транзакции по городу: {cityName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {/* Фильтры */}
            <div className="mb-4 space-y-4 pb-4 border-b border-gray-200">
              {/* Быстрые фильтры по периоду */}
              <div className="flex flex-wrap items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-semibold text-gray-700 mr-2">Период:</span>
                <Button
                  variant={dateFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('all')}
                  className={dateFilter === 'all' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Всё время
                </Button>
                <Button
                  variant={dateFilter === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('day')}
                  className={dateFilter === 'day' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  День
                </Button>
                <Button
                  variant={dateFilter === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('week')}
                  className={dateFilter === 'week' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Неделя
                </Button>
                <Button
                  variant={dateFilter === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleDateFilterChange('month')}
                  className={dateFilter === 'month' ? 'bg-teal-600 hover:bg-teal-700' : ''}
                >
                  Месяц
                </Button>
              </div>

              {/* Фильтры типа и пользовательских дат */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-48">
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => {
                      setTypeFilter(value)
                      setCurrentPage(1)
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">От:</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setDateFilter('custom')
                      setCurrentPage(1)
                    }}
                    className="w-40 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-gray-600">До:</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setDateFilter('custom')
                      setCurrentPage(1)
                    }}
                    className="w-40 bg-white"
                  />
                </div>
                {(typeFilter !== 'all' || dateFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTypeFilter('all')
                      setDateFilter('all')
                      setStartDate('')
                      setEndDate('')
                      setCurrentPage(1)
                    }}
                    className="bg-white"
                  >
                    Сбросить фильтры
                  </Button>
                )}
              </div>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Дата</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Тип</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Описание</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Заказ</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Нет транзакций для этого города
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(transaction.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          transaction.name === 'приход' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.name === 'приход' ? 'Приход' : 'Расход'}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-900">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {transaction.note || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {transaction.paymentPurpose ? `${transaction.paymentPurpose}` : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {transaction.city}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.name === 'приход' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {transaction.name === 'приход' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Пагинация */}
            {!loading && transactions.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4 border-t border-gray-200 pt-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Показано {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalTransactions)} из {totalTransactions} транзакций
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="page-size" className="text-sm text-gray-600">
                      На странице:
                    </Label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value))
                        setCurrentPage(1)
                      }}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-20" id="page-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {totalPages > 1 && (
                  <OptimizedPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    showFirstLast={true}
                    showPrevNext={true}
                    maxVisiblePages={5}
                    disabled={loading}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

