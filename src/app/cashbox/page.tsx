'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface CashTransaction {
  id: number
  name: string
  amount: number
  city: string
  note?: string
  createdAt: string
}

interface CityBalance {
  city: string
  income: number
  expenses: number
  balance: number
}

interface Stats {
  totalIncome: number
  totalExpenses: number
  balance: number
}

export default function CashboxPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [cityBalances, setCityBalances] = useState<CityBalance[]>([])
  const [stats, setStats] = useState<Stats>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const itemsPerPage = 50

  // Загрузка данных из API
  useEffect(() => {
    const loadData = async () => {
      // Проверяем наличие токена
      const token = typeof window !== 'undefined' ? 
        (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')) : null
      
      if (!token) {
        setIsLoading(false)
        return
      }
      
      setIsLoading(true)
      try {
        // Загружаем все транзакции для статистики (можно оптимизировать через отдельный endpoint статистики)
        const response = await apiClient.getCashTransactions({ page: currentPage, limit: itemsPerPage })
        if (response.success && response.data) {
          const transactions: CashTransaction[] = response.data.data || response.data
          const pagination = response.data.pagination
          
          if (pagination) {
            setHasMore(pagination.page < pagination.totalPages)
          }
          
          // Группируем по городам
          const cityMap = new Map<string, CityBalance>()
          let totalInc = 0
          let totalExp = 0
          
          transactions.forEach((t: CashTransaction) => {
            const city = t.city || 'Не указан'
            if (!cityMap.has(city)) {
              cityMap.set(city, { city, income: 0, expenses: 0, balance: 0 })
            }
            
            const cityData = cityMap.get(city)!
            const amount = Number(t.amount)
            
            if (t.name === 'приход') {
              cityData.income += amount
              totalInc += amount
            } else if (t.name === 'расход') {
              cityData.expenses += amount
              totalExp += amount
            }
            
            cityData.balance = cityData.income - cityData.expenses
          })
          
          const citiesData = Array.from(cityMap.values())
          setCityBalances(citiesData)
          setStats({
            totalIncome: totalInc,
            totalExpenses: totalExp,
            balance: totalInc - totalExp
          })
        }
      } catch (error) {
        console.error('Error loading cash data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [currentPage])

  const filteredCities = cityBalances.filter(city =>
    city.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Доходы</div>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</div>
              <p className="text-xs text-gray-500 mt-1">За месяц</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Расходы</div>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</div>
              <p className="text-xs text-gray-500 mt-1">За месяц</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-teal-700">Баланс</div>
                <DollarSign className="h-4 w-4 text-teal-700" />
              </div>
              <div className="text-3xl font-bold text-teal-700">{formatCurrency(stats.balance)}</div>
              <p className="text-xs text-teal-600 mt-1">Чистая прибыль</p>
            </CardContent>
          </Card>
        </div>

        {/* Таблица по городам */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по городу..."
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
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Сумма приходов</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Сумма расходов</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Касса</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredCities.map((city, index) => (
                  <TableRow 
                    key={index}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => router.push(`/cashbox/${encodeURIComponent(city.city)}`)}
                  >
                    <TableCell className="font-medium text-gray-900">{city.city}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(city.income)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {formatCurrency(city.expenses)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-teal-700">
                      {formatCurrency(city.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {!isLoading && filteredCities.length === 0 && cityBalances.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                Города не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}

            {!isLoading && cityBalances.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет данных по городам.
              </div>
            )}

            {/* Пагинация */}
            {!isLoading && hasMore && (
              <div className="mt-6 flex items-center justify-center border-t border-gray-200 pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-white"
                  >
                    Назад
                  </Button>
                  <div className="px-4 py-2 text-sm text-gray-600">
                    Страница {currentPage}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!hasMore || isLoading}
                    className="bg-white"
                  >
                    Вперед
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

