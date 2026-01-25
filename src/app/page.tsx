'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// Типы отчётов
type ReportType = 'cash' | 'orders'

// Критерии для отчёта по кассе
interface CashCriteria {
  showIncome: boolean
  showExpenses: boolean
  showBalance: boolean
  showTransactions: boolean
}

// Интерфейс данных отчёта
interface ReportData {
  type: ReportType
  generatedAt: string
  period: { from: string; to: string }
  cities: string[]
  data: any
}

export default function ReportsPage() {
  // Состояние выбора
  const [selectedReport, setSelectedReport] = useState<ReportType>('cash')
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  
  // Период
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })
  
  // Критерии для кассы
  const [cashCriteria, setCashCriteria] = useState<CashCriteria>({
    showIncome: true,
    showExpenses: true,
    showBalance: true,
    showTransactions: false
  })
  
  // Состояние UI
  const [isLoadingCities, setIsLoadingCities] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  // Загрузка списка городов
  useEffect(() => {
    const loadCities = async () => {
      setIsLoadingCities(true)
      try {
        const response = await apiClient.getFilterOptions()
        if (response.success && response.data?.cities) {
          setAvailableCities(response.data.cities)
          setSelectedCities(response.data.cities)
        }
      } catch (error) {
        logger.error('Failed to load cities', { error: String(error) })
        toast.error('Не удалось загрузить список городов')
      } finally {
        setIsLoadingCities(false)
      }
    }
    loadCities()
  }, [])
  
  // Обработка выбора города
  const handleCityChange = (city: string) => {
    if (city === 'all') {
      setSelectedCities([...availableCities])
    } else {
      setSelectedCities([city])
    }
  }
  
  // Генерация отчёта
  const generateReport = useCallback(async () => {
    if (selectedCities.length === 0) {
      toast.error('Выберите город')
      return
    }
    
    setIsGenerating(true)
    setReportData(null)
    
    try {
      let data: any = null
      
      switch (selectedReport) {
        case 'cash':
          const cashResults: any[] = []
          for (const city of selectedCities) {
            const response = await apiClient.getCashByCity(city, {
              startDate: dateFrom,
              endDate: dateTo,
              limit: 10000
            })
            if (response.success && response.data) {
              const transactions = response.data.data || response.data
              let income = 0
              let expenses = 0
              
              transactions.forEach((t: any) => {
                const amount = Number(t.amount)
                if (t.name === 'приход') income += amount
                else if (t.name === 'расход') expenses += amount
              })
              
              cashResults.push({
                city,
                income,
                expenses,
                balance: income - expenses,
                transactionsCount: transactions.length
              })
            }
          }
          
          const totals = cashResults.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expenses: acc.expenses + curr.expenses,
            balance: acc.balance + curr.balance,
            transactionsCount: acc.transactionsCount + curr.transactionsCount
          }), { income: 0, expenses: 0, balance: 0, transactionsCount: 0 })
          
          data = { cities: cashResults, totals, criteria: cashCriteria }
          break
          
        case 'orders':
          const ordersResults: any[] = []
          
          for (const city of selectedCities) {
            const response = await apiClient.getOrders({
              city,
              dateFrom,
              dateTo,
              limit: 10000
            })
            
            if (response.success && response.data) {
              const orders = response.data.orders || response.data
              
              const stats = {
                city,
                total: orders.length,
                byStatus: {} as Record<string, number>,
                totalRevenue: 0,
                completed: 0
              }
              
              orders.forEach((order: any) => {
                stats.byStatus[order.statusOrder] = (stats.byStatus[order.statusOrder] || 0) + 1
                if (order.result) stats.totalRevenue += Number(order.result)
                if (order.statusOrder === 'Готово') stats.completed++
              })
              
              ordersResults.push(stats)
            }
          }
          
          const ordersTotals = ordersResults.reduce((acc, curr) => ({
            total: acc.total + curr.total,
            completed: acc.completed + curr.completed,
            totalRevenue: acc.totalRevenue + curr.totalRevenue
          }), { total: 0, completed: 0, totalRevenue: 0 })
          
          data = {
            cities: ordersResults,
            totals: {
              ...ordersTotals,
              avgCheck: ordersTotals.completed > 0 ? ordersTotals.totalRevenue / ordersTotals.completed : 0,
              conversion: ordersTotals.total > 0 ? (ordersTotals.completed / ordersTotals.total * 100).toFixed(1) : 0
            }
          }
          break
      }
      
      setReportData({
        type: selectedReport,
        generatedAt: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
        cities: selectedCities,
        data
      })
      
      toast.success('Отчёт сформирован')
      
    } catch (error) {
      logger.error('Failed to generate report', { error: String(error) })
      toast.error('Ошибка при формировании отчёта')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedReport, selectedCities, dateFrom, dateTo, cashCriteria])
  
  // Форматирование валюты
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(amount)
  }
  
  // Форматирование даты
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#114643' }}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Фильтры */}
        <Card className="border-0 shadow-lg mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              
              {/* Строка 1: Тип отчёта и период */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Отчёт:</span>
                  <Select value={selectedReport} onValueChange={(v) => setSelectedReport(v as ReportType)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">По кассе</SelectItem>
                      <SelectItem value="orders">По заказам</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">от:</span>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-sm text-gray-600">до:</span>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-40"
                  />
                </div>
                
                {/* Быстрые периоды */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                  >
                    Неделя
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                  >
                    Месяц
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                  >
                    Квартал
                  </Button>
                </div>
              </div>
              
              {/* Строка 2: Города и критерии */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600">Город:</span>
                  <Select 
                    value={selectedCities.length === availableCities.length ? 'all' : selectedCities[0] || 'all'}
                    onValueChange={handleCityChange}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Выберите город" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все города</SelectItem>
                      {availableCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Критерии для кассы */}
                {selectedReport === 'cash' && (
                  <div className="flex items-center gap-4 border-l pl-4 ml-2">
                    <span className="text-sm text-gray-500">Показать:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showIncome}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showIncome: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Доходы</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showExpenses}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showExpenses: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Расходы</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showBalance}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showBalance: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Баланс</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showTransactions}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showTransactions: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Транзакции</span>
                    </label>
                  </div>
                )}
                
                {/* Кнопка генерации */}
                <div className="ml-auto">
                  <Button
                    onClick={generateReport}
                    disabled={isGenerating || isLoadingCities}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Формирование...
                      </>
                    ) : (
                      'Сформировать отчёт'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Результат - показываем только после генерации */}
        {reportData && (
          <>
            {/* Статистика */}
            {reportData.type === 'cash' && reportData.data && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {cashCriteria.showIncome && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500">Доходы</div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(reportData.data.totals.income)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {cashCriteria.showExpenses && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500">Расходы</div>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="text-3xl font-bold text-red-600">
                        {formatCurrency(reportData.data.totals.expenses)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                {cashCriteria.showBalance && (
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-teal-700">Баланс</div>
                        <DollarSign className="h-4 w-4 text-teal-700" />
                      </div>
                      <div className="text-3xl font-bold text-teal-700">
                        {formatCurrency(reportData.data.totals.balance)}
                      </div>
                      <p className="text-xs text-teal-600 mt-1">Чистая прибыль</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {reportData.type === 'orders' && reportData.data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card className="border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500 mb-2">Всего заказов</div>
                    <div className="text-3xl font-bold text-gray-800">
                      {reportData.data.totals.total}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500 mb-2">Выполнено</div>
                    <div className="text-3xl font-bold text-green-600">
                      {reportData.data.totals.completed}
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <div className="text-sm text-gray-500 mb-2">Конверсия</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {reportData.data.totals.conversion}%
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
                  <CardContent className="pt-6">
                    <div className="text-sm text-teal-700 mb-2">Средний чек</div>
                    <div className="text-3xl font-bold text-teal-700">
                      {formatCurrency(reportData.data.totals.avgCheck)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {/* Таблица */}
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500">
                    {reportData.cities.length === availableCities.length 
                      ? 'Все города' 
                      : `Город: ${reportData.cities.join(', ')}`
                    }
                    {' | '}
                    {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Download className="h-4 w-4 mr-2" />
                      Экспорт
                    </Button>
                    <Button variant="outline" size="sm" onClick={generateReport}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Обновить
                    </Button>
                  </div>
                </div>
                
                {/* Таблица кассы */}
                {reportData.type === 'cash' && (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Город
                        </TableHead>
                        {cashCriteria.showIncome && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Доходы
                          </TableHead>
                        )}
                        {cashCriteria.showExpenses && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Расходы
                          </TableHead>
                        )}
                        {cashCriteria.showBalance && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Баланс
                          </TableHead>
                        )}
                        {cashCriteria.showTransactions && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Транзакций
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.cities.map((city: any) => (
                        <TableRow key={city.city} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                          {cashCriteria.showIncome && (
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(city.income)}
                            </TableCell>
                          )}
                          {cashCriteria.showExpenses && (
                            <TableCell className="text-right font-medium text-red-600">
                              {formatCurrency(city.expenses)}
                            </TableCell>
                          )}
                          {cashCriteria.showBalance && (
                            <TableCell className="text-right font-bold text-teal-700">
                              {formatCurrency(city.balance)}
                            </TableCell>
                          )}
                          {cashCriteria.showTransactions && (
                            <TableCell className="text-right text-gray-600">
                              {city.transactionsCount}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell className="text-gray-900">ИТОГО</TableCell>
                        {cashCriteria.showIncome && (
                          <TableCell className="text-right text-green-700">
                            {formatCurrency(reportData.data.totals.income)}
                          </TableCell>
                        )}
                        {cashCriteria.showExpenses && (
                          <TableCell className="text-right text-red-700">
                            {formatCurrency(reportData.data.totals.expenses)}
                          </TableCell>
                        )}
                        {cashCriteria.showBalance && (
                          <TableCell className="text-right text-teal-800">
                            {formatCurrency(reportData.data.totals.balance)}
                          </TableCell>
                        )}
                        {cashCriteria.showTransactions && (
                          <TableCell className="text-right text-gray-700">
                            {reportData.data.totals.transactionsCount}
                          </TableCell>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
                
                {/* Таблица заказов */}
                {reportData.type === 'orders' && (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Город
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Всего
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Выполнено
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Выручка
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Конверсия
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.cities.map((city: any) => (
                        <TableRow key={city.city} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                          <TableCell className="text-right text-gray-600">{city.total}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{city.completed}</TableCell>
                          <TableCell className="text-right font-medium text-teal-600">
                            {formatCurrency(city.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-purple-600">
                            {city.total > 0 ? ((city.completed / city.total) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell className="text-gray-900">ИТОГО</TableCell>
                        <TableCell className="text-right text-gray-700">{reportData.data.totals.total}</TableCell>
                        <TableCell className="text-right text-green-700">{reportData.data.totals.completed}</TableCell>
                        <TableCell className="text-right text-teal-700">
                          {formatCurrency(reportData.data.totals.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right text-purple-700">{reportData.data.totals.conversion}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
                
                {reportData.data.cities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Нет данных за выбранный период
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Пустое состояние */}
        {!reportData && !isGenerating && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <p className="text-lg mb-2">Выберите параметры и нажмите &quot;Сформировать отчёт&quot;</p>
                <p className="text-sm">Результат появится здесь</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Загрузка */}
        {isGenerating && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
                <p className="text-gray-600">Формирование отчёта...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
