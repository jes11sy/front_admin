'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

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
  const itemsPerPage = 50

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const response = await apiClient.getCashByCity(cityName, { page: currentPage, limit: itemsPerPage })
        if (response.success && response.data) {
          const transactionsData: Transaction[] = response.data.data || response.data
          const pagination = response.data.pagination
          
          if (pagination) {
            setTotalPages(pagination.totalPages || 1)
          }
          
          setTransactions(transactionsData)

          // Рассчитываем статистику
          const income = transactionsData
            .filter(t => t.name === 'приход')
            .reduce((sum, t) => sum + Number(t.amount), 0)
          const expenses = transactionsData
            .filter(t => t.name === 'расход')
            .reduce((sum, t) => sum + Number(t.amount), 0)
          const balance = income - expenses

          setCityStats({
            totalIncome: income,
            totalExpenses: expenses,
            balance
          })
        }
      } catch (error) {
        console.error('Error loading city transactions:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке транзакций'
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [cityName, currentPage])

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
              <p className="text-xs text-gray-500 mt-1">За период</p>
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
              <p className="text-xs text-gray-500 mt-1">За период</p>
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
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Дата</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Тип</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Описание</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Заказ</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Категория</TableHead>
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
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  Страница {currentPage} из {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1 || loading}
                    className="bg-white"
                  >
                    Первая
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className="bg-white"
                  >
                    Назад
                  </Button>
                  
                  {/* Номера страниц */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          disabled={loading}
                          className={currentPage === pageNum 
                            ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white" 
                            : "bg-white"}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className="bg-white"
                  >
                    Вперед
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages || loading}
                    className="bg-white"
                  >
                    Последняя
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

