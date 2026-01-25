'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Calendar,
  Download,
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

// Все доступные города (хардкод из системы + "Не указан" для транзакций без города)
const ALL_CITIES = ['Саратов', 'Энгельс', 'Ульяновск', 'Пенза', 'Тольятти', 'Омск', 'Ярославль', 'Не указан']

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
  
  // Выпадающий список городов
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false)
  const cityDropdownRef = useRef<HTMLDivElement>(null)
  
  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (purposeDropdownRef.current && !purposeDropdownRef.current.contains(event.target as Node)) {
        setPurposeDropdownOpen(false)
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setCityDropdownOpen(false)
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
    // Используем полный список городов из константы
    setAvailableCities(ALL_CITIES)
    setSelectedCities(ALL_CITIES)
    setIsLoadingCities(false)
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
          if (filterByPurpose) {
            // Детальный отчёт с группировкой по назначениям платежа
            const cashResponse = await apiClient.getCashByPurpose({
              startDate: dateFrom,
              endDate: dateTo,
              city: selectedCities.length === 1 ? selectedCities[0] : undefined,
              purposes: selectedPurposes.length > 0 ? selectedPurposes : undefined
            })
            
            if (cashResponse.success && cashResponse.data) {
              let cashResults = cashResponse.data.cities || []
              let totals = cashResponse.data.totals
              
              // Фильтруем по выбранным городам только если выбраны не все
              if (selectedCities.length < availableCities.length) {
                cashResults = cashResults.filter((c: any) => selectedCities.includes(c.city))
                // Пересчитываем totals для отфильтрованных городов
                totals = cashResults.reduce((acc: any, curr: any) => ({
                  income: acc.income + (curr.totalIncome || 0),
                  expense: acc.expense + (curr.totalExpense || 0),
                  balance: acc.balance + (curr.balance || 0)
                }), { income: 0, expense: 0, balance: 0 })
              }
              
              data = { cities: cashResults, totals, groupByPurpose: true }
            }
          } else {
            // Простой отчёт - итоги по городам (используем тот же API для консистентности)
            const cashResponse = await apiClient.getCashByPurpose({
              startDate: dateFrom,
              endDate: dateTo,
              city: selectedCities.length === 1 ? selectedCities[0] : undefined
            })
            
            if (cashResponse.success && cashResponse.data) {
              let cityStats = cashResponse.data.cities || []
              let totals = cashResponse.data.totals
              
              // Фильтруем по выбранным городам только если выбраны не все
              if (selectedCities.length < availableCities.length) {
                cityStats = cityStats.filter((c: any) => selectedCities.includes(c.city))
                // Пересчитываем totals только для отфильтрованных городов
                totals = cityStats.reduce((acc: any, curr: any) => ({
                  income: acc.income + (curr.totalIncome || 0),
                  expense: acc.expense + (curr.totalExpense || 0),
                  balance: acc.balance + (curr.balance || 0)
                }), { income: 0, expense: 0, balance: 0 })
              }
              
              // Преобразуем в простой формат (без breakdown по назначениям)
              const cashResults = cityStats.map((city: any) => ({
                city: city.city,
                income: city.totalIncome || 0,
                expense: city.totalExpense || 0,
                balance: city.balance || 0
              }))
              
              data = { cities: cashResults, totals, groupByPurpose: false }
            }
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
              totalOrders: city.stats?.totalOrders || 0,
              notOrders: city.stats?.notOrders || 0,
              zeroOrders: city.stats?.zeroOrders || 0,
              completedOrders: city.stats?.completedOrders || 0,
              microUnder1500: city.stats?.microUnder1500 || 0,
              micro1500to10000: city.stats?.micro1500to10000 || 0,
              over10kCount: city.stats?.over10kCount || 0,
              maxCheck: city.stats?.maxCheck || 0,
              turnover: city.stats?.turnover || 0,
              avgCheck: city.stats?.avgCheck || 0
            }))
            
            const totals = ordersResults.reduce((acc: any, curr: any) => ({
              totalOrders: acc.totalOrders + curr.totalOrders,
              notOrders: acc.notOrders + curr.notOrders,
              zeroOrders: acc.zeroOrders + curr.zeroOrders,
              completedOrders: acc.completedOrders + curr.completedOrders,
              microUnder1500: acc.microUnder1500 + curr.microUnder1500,
              micro1500to10000: acc.micro1500to10000 + curr.micro1500to10000,
              over10kCount: acc.over10kCount + curr.over10kCount,
              maxCheck: Math.max(acc.maxCheck, curr.maxCheck),
              turnover: acc.turnover + curr.turnover
            }), { 
              totalOrders: 0, notOrders: 0, zeroOrders: 0, completedOrders: 0, 
              microUnder1500: 0, micro1500to10000: 0, over10kCount: 0, maxCheck: 0, turnover: 0 
            })
            
            data = {
              cities: ordersResults,
              totals: {
                ...totals,
                avgCheck: totals.completedOrders > 0 ? totals.turnover / totals.completedOrders : 0
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
                
                {/* Таблица кассы (простой режим - без группировки по назначению) */}
                {reportData.type === 'cash' && !reportData.data.groupByPurpose && (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Город
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Приход
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Расход
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Касса
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.cities.map((city: any) => (
                        <TableRow key={city.city} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(city.income)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatCurrency(city.expense)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-teal-700">
                            {formatCurrency(city.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-teal-50 font-bold border-t-2 border-teal-500">
                        <TableCell className="text-teal-900">ИТОГО</TableCell>
                        <TableCell className="text-right text-green-700">
                          {formatCurrency(reportData.data.totals.income)}
                        </TableCell>
                        <TableCell className="text-right text-red-700">
                          {formatCurrency(reportData.data.totals.expense)}
                        </TableCell>
                        <TableCell className="text-right text-teal-800">
                          {formatCurrency(reportData.data.totals.balance)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
                
                {/* Таблица кассы с группировкой по назначениям */}
                {reportData.type === 'cash' && reportData.data.groupByPurpose && (
                  <Table>
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Город / Назначение платежа
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Приход
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Расход
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Итого
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.cities.map((city: any) => (
                        <React.Fragment key={city.city}>
                          {/* Строка города */}
                          <TableRow className="bg-gray-50">
                            <TableCell className="font-bold text-gray-900">{city.city}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(city.totalIncome)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-red-600">
                              {formatCurrency(city.totalExpense)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-teal-700">
                              {formatCurrency(city.balance)}
                            </TableCell>
                          </TableRow>
                          
                          {/* Строки назначений платежа */}
                          {city.purposes?.map((purpose: any) => (
                            <TableRow key={`${city.city}-${purpose.purpose}`} className="hover:bg-gray-50">
                              <TableCell className="pl-8 text-gray-700">
                                {purpose.purpose}
                              </TableCell>
                              <TableCell className="text-right text-green-600">
                                {purpose.income > 0 ? formatCurrency(purpose.income) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-red-600">
                                {purpose.expense > 0 ? formatCurrency(purpose.expense) : '-'}
                              </TableCell>
                              <TableCell className="text-right text-gray-700">
                                {formatCurrency(purpose.balance)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </React.Fragment>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-teal-50 font-bold border-t-2 border-teal-500">
                        <TableCell className="text-teal-900">ИТОГО</TableCell>
                        <TableCell className="text-right text-green-700">
                          {formatCurrency(reportData.data.totals.income)}
                        </TableCell>
                        <TableCell className="text-right text-red-700">
                          {formatCurrency(reportData.data.totals.expense)}
                        </TableCell>
                        <TableCell className="text-right text-teal-800">
                          {formatCurrency(reportData.data.totals.balance)}
                        </TableCell>
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
                          Создано
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Незаказы
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Отказы
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          В деньги
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          &lt;1500
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          &lt;10000
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          10000+
                        </TableHead>
                        <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Макс. чек
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.data.cities.map((city: any) => (
                        <TableRow key={city.city} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                          <TableCell className="text-right text-gray-600">{city.totalOrders}</TableCell>
                          <TableCell className="text-right text-gray-500">{city.notOrders}</TableCell>
                          <TableCell className="text-right text-red-600">{city.zeroOrders}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">{city.completedOrders}</TableCell>
                          <TableCell className="text-right text-orange-500">{city.microUnder1500}</TableCell>
                          <TableCell className="text-right text-amber-600">{city.micro1500to10000}</TableCell>
                          <TableCell className="text-right text-teal-600">{city.over10kCount}</TableCell>
                          <TableCell className="text-right font-medium text-purple-600">
                            {formatCurrency(city.maxCheck)}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {/* Итого */}
                      <TableRow className="bg-gray-100 font-bold border-t-2 border-gray-300">
                        <TableCell className="text-gray-900">ИТОГО</TableCell>
                        <TableCell className="text-right text-gray-700">{reportData.data.totals.totalOrders}</TableCell>
                        <TableCell className="text-right text-gray-600">{reportData.data.totals.notOrders}</TableCell>
                        <TableCell className="text-right text-red-700">{reportData.data.totals.zeroOrders}</TableCell>
                        <TableCell className="text-right text-green-700">{reportData.data.totals.completedOrders}</TableCell>
                        <TableCell className="text-right text-orange-600">{reportData.data.totals.microUnder1500}</TableCell>
                        <TableCell className="text-right text-amber-700">{reportData.data.totals.micro1500to10000}</TableCell>
                        <TableCell className="text-right text-teal-700">{reportData.data.totals.over10kCount}</TableCell>
                        <TableCell className="text-right text-purple-700">
                          {formatCurrency(reportData.data.totals.maxCheck)}
                        </TableCell>
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
