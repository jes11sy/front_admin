'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Wallet, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Check,
  X,
  Building2,
  Filter,
  BarChart3,
  PieChart,
  Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'

// Типы отчётов
type ReportType = 'cash' | 'orders' | 'masters' | 'campaigns'

interface ReportConfig {
  id: ReportType
  name: string
  description: string
  icon: React.ReactNode
  color: string
}

const REPORT_TYPES: ReportConfig[] = [
  {
    id: 'cash',
    name: 'Отчёт по кассе',
    description: 'Доходы, расходы и баланс по городам',
    icon: <Wallet className="h-6 w-6" />,
    color: 'from-green-500 to-emerald-600'
  },
  {
    id: 'orders',
    name: 'Отчёт по заказам',
    description: 'Статистика заказов, конверсия, статусы',
    icon: <ShoppingCart className="h-6 w-6" />,
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'masters',
    name: 'Отчёт по мастерам',
    description: 'Эффективность, выручка, средний чек',
    icon: <Users className="h-6 w-6" />,
    color: 'from-orange-500 to-amber-600'
  },
  {
    id: 'campaigns',
    name: 'Отчёт по РК',
    description: 'Рекламные кампании, источники, CPA',
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'from-purple-500 to-violet-600'
  }
]

// Критерии для отчёта по кассе
interface CashCriteria {
  showIncome: boolean
  showExpenses: boolean
  showBalance: boolean
  showTransactions: boolean
  groupByDay: boolean
  groupByWeek: boolean
  groupByMonth: boolean
}

// Критерии для отчёта по заказам
interface OrdersCriteria {
  showTotal: boolean
  showByStatus: boolean
  showConversion: boolean
  showAvgCheck: boolean
  showByType: boolean
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
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null)
  const [availableCities, setAvailableCities] = useState<string[]>([])
  const [selectedCities, setSelectedCities] = useState<string[]>([])
  const [selectAllCities, setSelectAllCities] = useState(true)
  
  // Период
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date()
    date.setDate(1) // Первый день месяца
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
    showTransactions: false,
    groupByDay: false,
    groupByWeek: false,
    groupByMonth: true
  })
  
  // Критерии для заказов
  const [ordersCriteria, setOrdersCriteria] = useState<OrdersCriteria>({
    showTotal: true,
    showByStatus: true,
    showConversion: true,
    showAvgCheck: true,
    showByType: true
  })
  
  // Состояние UI
  const [isLoadingCities, setIsLoadingCities] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showCriteria, setShowCriteria] = useState(true)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  
  // Загрузка списка городов
  useEffect(() => {
    const loadCities = async () => {
      setIsLoadingCities(true)
      try {
        const response = await apiClient.getFilterOptions()
        if (response.success && response.data?.cities) {
          setAvailableCities(response.data.cities)
          setSelectedCities(response.data.cities) // По умолчанию все выбраны
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
  
  // Обработка выбора всех городов
  const handleSelectAllCities = (checked: boolean) => {
    setSelectAllCities(checked)
    if (checked) {
      setSelectedCities([...availableCities])
    } else {
      setSelectedCities([])
    }
  }
  
  // Обработка выбора одного города
  const handleCityToggle = (city: string) => {
    setSelectedCities(prev => {
      if (prev.includes(city)) {
        const newSelection = prev.filter(c => c !== city)
        setSelectAllCities(false)
        return newSelection
      } else {
        const newSelection = [...prev, city]
        if (newSelection.length === availableCities.length) {
          setSelectAllCities(true)
        }
        return newSelection
      }
    })
  }
  
  // Генерация отчёта
  const generateReport = useCallback(async () => {
    if (!selectedReport) {
      toast.error('Выберите тип отчёта')
      return
    }
    
    if (selectedCities.length === 0) {
      toast.error('Выберите хотя бы один город')
      return
    }
    
    setIsGenerating(true)
    setReportData(null)
    
    try {
      let data: any = null
      
      switch (selectedReport) {
        case 'cash':
          // Загружаем данные по кассе для каждого города
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
          
          // Итоги
          const totals = cashResults.reduce((acc, curr) => ({
            income: acc.income + curr.income,
            expenses: acc.expenses + curr.expenses,
            balance: acc.balance + curr.balance,
            transactionsCount: acc.transactionsCount + curr.transactionsCount
          }), { income: 0, expenses: 0, balance: 0, transactionsCount: 0 })
          
          data = {
            cities: cashResults,
            totals,
            criteria: cashCriteria
          }
          break
          
        case 'orders':
          // Загружаем данные по заказам
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
              
              // Подсчёт статистики
              const stats = {
                city,
                total: orders.length,
                byStatus: {} as Record<string, number>,
                byType: {} as Record<string, number>,
                totalRevenue: 0,
                completed: 0
              }
              
              orders.forEach((order: any) => {
                // По статусу
                stats.byStatus[order.statusOrder] = (stats.byStatus[order.statusOrder] || 0) + 1
                // По типу
                stats.byType[order.typeOrder] = (stats.byType[order.typeOrder] || 0) + 1
                // Выручка
                if (order.result) stats.totalRevenue += Number(order.result)
                // Завершённые
                if (order.statusOrder === 'Готово') stats.completed++
              })
              
              ordersResults.push(stats)
            }
          }
          
          // Общие итоги
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
            },
            criteria: ordersCriteria
          }
          break
          
        case 'masters':
          const mastersResponse = await apiClient.getMastersReport({
            startDate: dateFrom,
            endDate: dateTo
          })
          
          if (mastersResponse.success && mastersResponse.data) {
            // Фильтруем по выбранным городам
            const filteredMasters = mastersResponse.data.filter((m: any) => 
              m.cities?.some((c: string) => selectedCities.includes(c)) || selectedCities.length === availableCities.length
            )
            data = { masters: filteredMasters }
          }
          break
          
        case 'campaigns':
          const campaignsResponse = await apiClient.getCampaignsReport({
            startDate: dateFrom,
            endDate: dateTo
          })
          
          if (campaignsResponse.success && campaignsResponse.data) {
            // Фильтруем по выбранным городам
            const filteredCampaigns = campaignsResponse.data.filter((c: any) => 
              selectedCities.includes(c.city)
            )
            data = { campaigns: filteredCampaigns }
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
      
      toast.success('Отчёт сформирован!')
      
    } catch (error) {
      logger.error('Failed to generate report', { error: String(error) })
      toast.error('Ошибка при формировании отчёта')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedReport, selectedCities, dateFrom, dateTo, cashCriteria, ordersCriteria, availableCities.length])
  
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
        
        {/* Заголовок */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Генератор отчётов</h1>
          <p className="text-white/70">Выберите тип отчёта, города и критерии для формирования</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Левая панель: Настройки */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Выбор типа отчёта */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  Тип отчёта
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {REPORT_TYPES.map(report => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                      selectedReport === report.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${report.color} text-white`}>
                        {report.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">{report.name}</div>
                        <div className="text-xs text-gray-500">{report.description}</div>
                      </div>
                      {selectedReport === report.id && (
                        <Check className="h-5 w-5 text-teal-600 ml-auto" />
                      )}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
            
            {/* Период */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-teal-600" />
                  Период
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">С даты</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">По дату</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-500"
                  />
                </div>
                
                {/* Быстрые периоды */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                  >
                    Неделя
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                  >
                    Месяц
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date()
                      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0])
                      setDateTo(new Date().toISOString().split('T')[0])
                    }}
                    className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
                  >
                    Квартал
                  </button>
                </div>
              </CardContent>
            </Card>
            
            {/* Выбор городов */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  Города
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {selectedCities.length} из {availableCities.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingCities ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Выбрать все */}
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                      <input
                        type="checkbox"
                        checked={selectAllCities}
                        onChange={(e) => handleSelectAllCities(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="font-medium text-gray-800">Выбрать все</span>
                    </label>
                    
                    {/* Список городов */}
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {availableCities.map(city => (
                        <label
                          key={city}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCities.includes(city)}
                            onChange={() => handleCityToggle(city)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-gray-700">{city}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Критерии (для кассы) */}
            {selectedReport === 'cash' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setShowCriteria(!showCriteria)}
                    className="flex items-center gap-2 w-full"
                  >
                    <Filter className="h-5 w-5 text-teal-600" />
                    <CardTitle className="text-lg">Критерии отчёта</CardTitle>
                    {showCriteria ? (
                      <ChevronUp className="h-4 w-4 ml-auto text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto text-gray-500" />
                    )}
                  </button>
                </CardHeader>
                {showCriteria && (
                  <CardContent className="space-y-2">
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showIncome}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showIncome: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Показать доходы</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showExpenses}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showExpenses: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Показать расходы</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showBalance}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showBalance: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Показать баланс</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cashCriteria.showTransactions}
                        onChange={(e) => setCashCriteria(prev => ({ ...prev, showTransactions: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Показать кол-во транзакций</span>
                    </label>
                  </CardContent>
                )}
              </Card>
            )}
            
            {/* Критерии (для заказов) */}
            {selectedReport === 'orders' && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setShowCriteria(!showCriteria)}
                    className="flex items-center gap-2 w-full"
                  >
                    <Filter className="h-5 w-5 text-teal-600" />
                    <CardTitle className="text-lg">Критерии отчёта</CardTitle>
                    {showCriteria ? (
                      <ChevronUp className="h-4 w-4 ml-auto text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-auto text-gray-500" />
                    )}
                  </button>
                </CardHeader>
                {showCriteria && (
                  <CardContent className="space-y-2">
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ordersCriteria.showTotal}
                        onChange={(e) => setOrdersCriteria(prev => ({ ...prev, showTotal: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Общее количество</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ordersCriteria.showByStatus}
                        onChange={(e) => setOrdersCriteria(prev => ({ ...prev, showByStatus: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Разбивка по статусам</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ordersCriteria.showConversion}
                        onChange={(e) => setOrdersCriteria(prev => ({ ...prev, showConversion: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Конверсия</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ordersCriteria.showAvgCheck}
                        onChange={(e) => setOrdersCriteria(prev => ({ ...prev, showAvgCheck: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600"
                      />
                      <span className="text-gray-700">Средний чек</span>
                    </label>
                  </CardContent>
                )}
              </Card>
            )}
            
            {/* Кнопка генерации */}
            <Button
              onClick={generateReport}
              disabled={!selectedReport || selectedCities.length === 0 || isGenerating}
              className="w-full py-6 text-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Формирование...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Сформировать отчёт
                </>
              )}
            </Button>
          </div>
          
          {/* Правая панель: Результат */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg min-h-[600px]">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <PieChart className="h-6 w-6 text-teal-600" />
                    Результат отчёта
                  </CardTitle>
                  {reportData && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Download className="h-4 w-4 mr-1" />
                        Экспорт
                      </Button>
                      <Button variant="outline" size="sm" onClick={generateReport}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Обновить
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!reportData && !isGenerating && (
                  <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <FileText className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-lg">Выберите параметры и сформируйте отчёт</p>
                    <p className="text-sm mt-2">Результат появится здесь</p>
                  </div>
                )}
                
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center h-96">
                    <Loader2 className="h-12 w-12 animate-spin text-teal-600 mb-4" />
                    <p className="text-gray-600">Формирование отчёта...</p>
                  </div>
                )}
                
                {/* Отчёт по кассе */}
                {reportData && reportData.type === 'cash' && reportData.data && (
                  <div className="space-y-6">
                    {/* Заголовок */}
                    <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-teal-800">Отчёт по кассе</h3>
                      <p className="text-sm text-teal-600">
                        Период: {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                      <p className="text-sm text-teal-600">
                        Города: {reportData.cities.length === availableCities.length ? 'Все' : reportData.cities.join(', ')}
                      </p>
                    </div>
                    
                    {/* Итоги */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {cashCriteria.showIncome && (
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                          <div className="text-sm text-green-600 font-medium">Доходы</div>
                          <div className="text-2xl font-bold text-green-700">
                            {formatCurrency(reportData.data.totals.income)}
                          </div>
                        </div>
                      )}
                      {cashCriteria.showExpenses && (
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                          <div className="text-sm text-red-600 font-medium">Расходы</div>
                          <div className="text-2xl font-bold text-red-700">
                            {formatCurrency(reportData.data.totals.expenses)}
                          </div>
                        </div>
                      )}
                      {cashCriteria.showBalance && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                          <div className="text-sm text-blue-600 font-medium">Баланс</div>
                          <div className="text-2xl font-bold text-blue-700">
                            {formatCurrency(reportData.data.totals.balance)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Таблица по городам */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-teal-500">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Город</th>
                            {cashCriteria.showIncome && (
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Доходы</th>
                            )}
                            {cashCriteria.showExpenses && (
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Расходы</th>
                            )}
                            {cashCriteria.showBalance && (
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Баланс</th>
                            )}
                            {cashCriteria.showTransactions && (
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Транзакций</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.data.cities.map((city: any) => (
                            <tr key={city.city} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{city.city}</td>
                              {cashCriteria.showIncome && (
                                <td className="py-3 px-4 text-right text-green-600 font-medium">
                                  {formatCurrency(city.income)}
                                </td>
                              )}
                              {cashCriteria.showExpenses && (
                                <td className="py-3 px-4 text-right text-red-600 font-medium">
                                  {formatCurrency(city.expenses)}
                                </td>
                              )}
                              {cashCriteria.showBalance && (
                                <td className="py-3 px-4 text-right text-blue-600 font-bold">
                                  {formatCurrency(city.balance)}
                                </td>
                              )}
                              {cashCriteria.showTransactions && (
                                <td className="py-3 px-4 text-right text-gray-600">
                                  {city.transactionsCount}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-bold">
                            <td className="py-3 px-4 text-gray-800">ИТОГО</td>
                            {cashCriteria.showIncome && (
                              <td className="py-3 px-4 text-right text-green-700">
                                {formatCurrency(reportData.data.totals.income)}
                              </td>
                            )}
                            {cashCriteria.showExpenses && (
                              <td className="py-3 px-4 text-right text-red-700">
                                {formatCurrency(reportData.data.totals.expenses)}
                              </td>
                            )}
                            {cashCriteria.showBalance && (
                              <td className="py-3 px-4 text-right text-blue-700">
                                {formatCurrency(reportData.data.totals.balance)}
                              </td>
                            )}
                            {cashCriteria.showTransactions && (
                              <td className="py-3 px-4 text-right text-gray-700">
                                {reportData.data.totals.transactionsCount}
                              </td>
                            )}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Отчёт по заказам */}
                {reportData && reportData.type === 'orders' && reportData.data && (
                  <div className="space-y-6">
                    {/* Заголовок */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-800">Отчёт по заказам</h3>
                      <p className="text-sm text-blue-600">
                        Период: {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                      <p className="text-sm text-blue-600">
                        Города: {reportData.cities.length === availableCities.length ? 'Все' : reportData.cities.join(', ')}
                      </p>
                    </div>
                    
                    {/* Итоги */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {ordersCriteria.showTotal && (
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                          <div className="text-sm text-indigo-600 font-medium">Всего заказов</div>
                          <div className="text-2xl font-bold text-indigo-700">
                            {reportData.data.totals.total}
                          </div>
                        </div>
                      )}
                      <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                        <div className="text-sm text-green-600 font-medium">Выполнено</div>
                        <div className="text-2xl font-bold text-green-700">
                          {reportData.data.totals.completed}
                        </div>
                      </div>
                      {ordersCriteria.showConversion && (
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                          <div className="text-sm text-purple-600 font-medium">Конверсия</div>
                          <div className="text-2xl font-bold text-purple-700">
                            {reportData.data.totals.conversion}%
                          </div>
                        </div>
                      )}
                      {ordersCriteria.showAvgCheck && (
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                          <div className="text-sm text-amber-600 font-medium">Средний чек</div>
                          <div className="text-2xl font-bold text-amber-700">
                            {formatCurrency(reportData.data.totals.avgCheck)}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Таблица по городам */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-blue-500">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Город</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Всего</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Выполнено</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Выручка</th>
                            <th className="text-right py-3 px-4 font-semibold text-gray-700">Конверсия</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.data.cities.map((city: any) => (
                            <tr key={city.city} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4 font-medium text-gray-800">{city.city}</td>
                              <td className="py-3 px-4 text-right text-gray-600">{city.total}</td>
                              <td className="py-3 px-4 text-right text-green-600 font-medium">{city.completed}</td>
                              <td className="py-3 px-4 text-right text-teal-600 font-medium">
                                {formatCurrency(city.totalRevenue)}
                              </td>
                              <td className="py-3 px-4 text-right text-purple-600 font-medium">
                                {city.total > 0 ? ((city.completed / city.total) * 100).toFixed(1) : 0}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 font-bold">
                            <td className="py-3 px-4 text-gray-800">ИТОГО</td>
                            <td className="py-3 px-4 text-right text-gray-700">{reportData.data.totals.total}</td>
                            <td className="py-3 px-4 text-right text-green-700">{reportData.data.totals.completed}</td>
                            <td className="py-3 px-4 text-right text-teal-700">
                              {formatCurrency(reportData.data.totals.totalRevenue)}
                            </td>
                            <td className="py-3 px-4 text-right text-purple-700">{reportData.data.totals.conversion}%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Отчёт по мастерам */}
                {reportData && reportData.type === 'masters' && reportData.data && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-orange-800">Отчёт по мастерам</h3>
                      <p className="text-sm text-orange-600">
                        Период: {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                    </div>
                    
                    {reportData.data.masters && reportData.data.masters.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-orange-500">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Мастер</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Заказов</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Выручка</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Ср. чек</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.data.masters.map((master: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-800">{master.masterName || master.name}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{master.ordersCount || 0}</td>
                                <td className="py-3 px-4 text-right text-green-600 font-medium">
                                  {formatCurrency(master.totalRevenue || 0)}
                                </td>
                                <td className="py-3 px-4 text-right text-blue-600 font-medium">
                                  {formatCurrency(master.avgCheck || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">Нет данных по мастерам</div>
                    )}
                  </div>
                )}
                
                {/* Отчёт по РК */}
                {reportData && reportData.type === 'campaigns' && reportData.data && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-purple-800">Отчёт по рекламным кампаниям</h3>
                      <p className="text-sm text-purple-600">
                        Период: {formatDate(reportData.period.from)} — {formatDate(reportData.period.to)}
                      </p>
                    </div>
                    
                    {reportData.data.campaigns && reportData.data.campaigns.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b-2 border-purple-500">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">РК</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Город</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">Заказы</th>
                              <th className="text-right py-3 px-4 font-semibold text-gray-700">CPA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.data.campaigns.map((campaign: any, idx: number) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium text-gray-800">{campaign.rk || campaign.name}</td>
                                <td className="py-3 px-4 text-gray-600">{campaign.city}</td>
                                <td className="py-3 px-4 text-right text-gray-600">{campaign.ordersCount || 0}</td>
                                <td className="py-3 px-4 text-right text-purple-600 font-medium">
                                  {formatCurrency(campaign.cpa || 0)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">Нет данных по РК</div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
