'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Loader2,
  ChevronDown
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

// Типы отчётов
type ReportType = 'cash' | 'orders'

// Назначения платежей (хардкоры из фронта директора)
const PAYMENT_PURPOSES = {
  expense: [
    { value: 'Авито', label: 'Авито' },
    { value: 'Офис', label: 'Офис' },
    { value: 'Промоутеры', label: 'Промоутеры' },
    { value: 'Листовки', label: 'Листовки' },
    { value: 'Инкасс', label: 'Инкасс' },
    { value: 'Зарплата директора', label: 'Зарплата директора' },
    { value: 'Иное', label: 'Иное' }
  ],
  income: [
    { value: 'Заказ', label: 'Заказ' },
    { value: 'Депозит', label: 'Депозит' },
    { value: 'Штраф', label: 'Штраф' },
    { value: 'Иное', label: 'Иное' }
  ]
}

// Все назначения платежей
const ALL_PURPOSES = [
  ...PAYMENT_PURPOSES.expense,
  ...PAYMENT_PURPOSES.income.filter(p => !PAYMENT_PURPOSES.expense.find(e => e.value === p.value))
]

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
  purposes?: string[]
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
  
  // Фильтр по назначению платежа
  const [filterByPurpose, setFilterByPurpose] = useState(false)
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([])
  const [purposeDropdownOpen, setPurposeDropdownOpen] = useState(false)
  const purposeDropdownRef = useRef<HTMLDivElement>(null)
  
  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (purposeDropdownRef.current && !purposeDropdownRef.current.contains(event.target as Node)) {
        setPurposeDropdownOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
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
  
  // Обработка выбора назначения платежа
  const handlePurposeToggle = (purpose: string) => {
    setSelectedPurposes(prev => {
      if (prev.includes(purpose)) {
        return prev.filter(p => p !== purpose)
      } else {
        return [...prev, purpose]
      }
    })
  }
  
  // Выбрать все назначения
  const handleSelectAllPurposes = () => {
    if (selectedPurposes.length === ALL_PURPOSES.length) {
      setSelectedPurposes([])
    } else {
      setSelectedPurposes(ALL_PURPOSES.map(p => p.value))
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
          // Используем reports API для получения данных по городам
          const cityReportResponse = await apiClient.getCitiesReport({
            startDate: dateFrom,
            endDate: dateTo,
            city: selectedCities.length === 1 ? selectedCities[0] : undefined
          })
          
          if (cityReportResponse.success && cityReportResponse.data) {
            const cityStats = cityReportResponse.data
            
            // Фильтруем по выбранным городам
            const filteredStats = selectedCities.length === availableCities.length 
              ? cityStats 
              : cityStats.filter((c: any) => selectedCities.includes(c.city))
            
            const cashResults = filteredStats.map((city: any) => ({
              city: city.city,
              income: city.cash?.totalAmount > 0 ? city.cash.totalAmount : 0,
              expenses: city.cash?.totalAmount < 0 ? Math.abs(city.cash.totalAmount) : 0,
              balance: city.cash?.totalAmount || 0,
              turnover: city.stats?.turnover || 0,
              profit: city.stats?.profit || 0,
              transactionsCount: city.stats?.totalOrders || 0
            }))
            
            const totals = cashResults.reduce((acc: any, curr: any) => ({
              income: acc.income + curr.income,
              expenses: acc.expenses + curr.expenses,
              balance: acc.balance + curr.balance,
              turnover: acc.turnover + curr.turnover,
              profit: acc.profit + curr.profit,
              transactionsCount: acc.transactionsCount + curr.transactionsCount
            }), { income: 0, expenses: 0, balance: 0, turnover: 0, profit: 0, transactionsCount: 0 })
            
            data = { cities: cashResults, totals, criteria: cashCriteria }
          }
          break
          
        case 'orders':
          // Используем reports API для получения статистики заказов
          const ordersReportResponse = await apiClient.getCitiesReport({
            startDate: dateFrom,
            endDate: dateTo,
            city: selectedCities.length === 1 ? selectedCities[0] : undefined
          })
          
          if (ordersReportResponse.success && ordersReportResponse.data) {
            const cityStats = ordersReportResponse.data
            
            // Фильтруем по выбранным городам
            const filteredStats = selectedCities.length === availableCities.length 
              ? cityStats 
              : cityStats.filter((c: any) => selectedCities.includes(c.city))
            
            const ordersResults = filteredStats.map((city: any) => ({
              city: city.city,
              total: city.stats?.totalOrders || 0,
              completed: city.stats?.completedOrders || 0,
              zeroOrders: city.stats?.zeroOrders || 0,
              notOrders: city.stats?.notOrders || 0,
              totalRevenue: city.stats?.turnover || 0,
              avgCheck: city.stats?.avgCheck || 0,
              completedPercent: city.stats?.completedPercent || 0
            }))
            
            const totals = ordersResults.reduce((acc: any, curr: any) => ({
              total: acc.total + curr.total,
              completed: acc.completed + curr.completed,
              zeroOrders: acc.zeroOrders + curr.zeroOrders,
              notOrders: acc.notOrders + curr.notOrders,
              totalRevenue: acc.totalRevenue + curr.totalRevenue
            }), { total: 0, completed: 0, zeroOrders: 0, notOrders: 0, totalRevenue: 0 })
            
            data = {
              cities: ordersResults,
              totals: {
                ...totals,
                avgCheck: totals.completed > 0 ? totals.totalRevenue / totals.completed : 0,
                conversion: totals.total > 0 ? (totals.completed / totals.total * 100).toFixed(1) : 0
              }
            }
          }
          break
      }
      
      setReportData({
        type: selectedReport,
        generatedAt: new Date().toISOString(),
        period: { from: dateFrom, to: dateTo },
        cities: selectedCities,
        data,
        purposes: filterByPurpose && selectedPurposes.length > 0 ? selectedPurposes : undefined
      } as ReportData)
      
      toast.success('Отчёт сформирован')
      
    } catch (error) {
      logger.error('Failed to generate report', { error: String(error) })
      toast.error('Ошибка при формировании отчёта')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedReport, selectedCities, dateFrom, dateTo, cashCriteria, availableCities.length, filterByPurpose, selectedPurposes])
  
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
                
                {/* Быстрые периоды: День, Неделя, Месяц */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0]
                      setDateFrom(today)
                      setDateTo(today)
                    }}
                  >
                    День
                  </Button>
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
                      <span className="text-sm text-gray-600">Оборот</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showExpenses}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showExpenses: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Прибыль</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showBalance}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showBalance: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Касса</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showTransactions}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showTransactions: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-sm text-gray-600">Заказов</span>
                    </label>
                    
                    {/* Фильтр по назначению платежа */}
                    <div className="flex items-center gap-2 border-l pl-4 ml-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterByPurpose}
                          onChange={(e) => {
                            setFilterByPurpose(e.target.checked)
                            if (!e.target.checked) {
                              setSelectedPurposes([])
                              setPurposeDropdownOpen(false)
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600"
                        />
                        <span className="text-sm text-gray-600">Назначение:</span>
                      </label>
                      
                      {filterByPurpose && (
                        <div className="relative" ref={purposeDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setPurposeDropdownOpen(!purposeDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
                          >
                            <span className="text-gray-700">
                              {selectedPurposes.length === 0 
                                ? 'Выбрать' 
                                : selectedPurposes.length === ALL_PURPOSES.length 
                                  ? 'Все' 
                                  : `Выбрано: ${selectedPurposes.length}`
                              }
                            </span>
                            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${purposeDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {purposeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48">
                              <div className="p-2 border-b border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
                                  <input
                                    type="checkbox"
                                    checked={selectedPurposes.length === ALL_PURPOSES.length}
                                    onChange={handleSelectAllPurposes}
                                    className="h-4 w-4 rounded border-gray-300 text-teal-600"
                                  />
                                  <span className="text-sm font-medium text-gray-700">Выбрать все</span>
                                </label>
                              </div>
                              <div className="p-2 max-h-48 overflow-y-auto">
                                {ALL_PURPOSES.map(purpose => (
                                  <label 
                                    key={purpose.value} 
                                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedPurposes.includes(purpose.value)}
                                      onChange={() => handlePurposeToggle(purpose.value)}
                                      className="h-4 w-4 rounded border-gray-300 text-teal-600"
                                    />
                                    <span className="text-sm text-gray-700">{purpose.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
            {/* Статистика для кассы */}
            {reportData.type === 'cash' && reportData.data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {cashCriteria.showIncome && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500">Оборот</div>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        {formatCurrency(reportData.data.totals.turnover)}
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
                        <div className="text-sm text-gray-500">Прибыль</div>
                        <TrendingDown className="h-4 w-4 text-teal-600" />
                      </div>
                      <div className="text-3xl font-bold text-teal-600">
                        {formatCurrency(reportData.data.totals.profit)}
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
                        <div className="text-sm text-teal-700">Касса</div>
                        <DollarSign className="h-4 w-4 text-teal-700" />
                      </div>
                      <div className="text-3xl font-bold text-teal-700">
                        {formatCurrency(reportData.data.totals.balance)}
                      </div>
                      <p className="text-xs text-teal-600 mt-1">Баланс</p>
                    </CardContent>
                  </Card>
                )}
                
                {cashCriteria.showTransactions && (
                  <Card className="border-0 shadow-lg">
                    <CardContent className="pt-6">
                      <div className="text-sm text-gray-500 mb-2">Заказов</div>
                      <div className="text-3xl font-bold text-gray-800">
                        {reportData.data.totals.transactionsCount}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">за период</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Статистика для заказов */}
            {reportData.type === 'orders' && reportData.data && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
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
                    <div className="text-sm text-gray-500 mb-2">Отказы</div>
                    <div className="text-3xl font-bold text-red-600">
                      {reportData.data.totals.zeroOrders}
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
                    {reportData.purposes && reportData.purposes.length > 0 && (
                      <> | Назначение: {reportData.purposes.length === ALL_PURPOSES.length ? 'Все' : reportData.purposes.join(', ')}</>
                    )}
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
                            Оборот
                          </TableHead>
                        )}
                        {cashCriteria.showExpenses && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Прибыль
                          </TableHead>
                        )}
                        {cashCriteria.showBalance && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Касса
                          </TableHead>
                        )}
                        {cashCriteria.showTransactions && (
                          <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Заказов
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
                              {formatCurrency(city.turnover)}
                            </TableCell>
                          )}
                          {cashCriteria.showExpenses && (
                            <TableCell className="text-right font-medium text-teal-600">
                              {formatCurrency(city.profit)}
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
                            {formatCurrency(reportData.data.totals.turnover)}
                          </TableCell>
                        )}
                        {cashCriteria.showExpenses && (
                          <TableCell className="text-right text-teal-700">
                            {formatCurrency(reportData.data.totals.profit)}
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
                          Отказы
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Незаказы
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Ср. чек
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
                          <TableCell className="text-right font-medium text-red-600">{city.zeroOrders}</TableCell>
                          <TableCell className="text-right text-gray-500">{city.notOrders}</TableCell>
                          <TableCell className="text-right font-medium text-teal-600">
                            {formatCurrency(city.avgCheck)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-purple-600">
                            {city.completedPercent.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-gray-100 font-bold">
                        <TableCell className="text-gray-900">ИТОГО</TableCell>
                        <TableCell className="text-right text-gray-700">{reportData.data.totals.total}</TableCell>
                        <TableCell className="text-right text-green-700">{reportData.data.totals.completed}</TableCell>
                        <TableCell className="text-right text-red-700">{reportData.data.totals.zeroOrders}</TableCell>
                        <TableCell className="text-right text-gray-600">{reportData.data.totals.notOrders}</TableCell>
                        <TableCell className="text-right text-teal-700">
                          {formatCurrency(reportData.data.totals.avgCheck)}
                        </TableCell>
                        <TableCell className="text-right text-purple-700">{reportData.data.totals.conversion}%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
                
                {reportData.data?.cities?.length === 0 && (
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
