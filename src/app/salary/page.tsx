'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Download, DollarSign, User } from 'lucide-react'
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
  turnover: number
  salary: number
}

export default function SalaryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

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

        // Загружаем все транзакции кассы
        const allTransactions: any[] = []
        let currentPage = 1
        let hasMore = true
        
        while (hasMore) {
          const cashResponse = await apiClient.getCashTransactions({ 
            page: currentPage, 
            limit: 100 
          })
          if (cashResponse.success && cashResponse.data) {
            const pageData = cashResponse.data.data || cashResponse.data
            allTransactions.push(...pageData)
            
            const pagination = cashResponse.data.pagination
            if (pagination && currentPage < pagination.totalPages) {
              currentPage++
            } else {
              hasMore = false
            }
          } else {
            hasMore = false
          }
        }

        // Группируем транзакции по городам и считаем чистую прибыль
        const cityTurnover = new Map<string, number>()
        
        allTransactions.forEach((transaction: any) => {
          const city = transaction.city || 'Не указан'
          const amount = Number(transaction.amount)
          
          if (!cityTurnover.has(city)) {
            cityTurnover.set(city, 0)
          }
          
          const currentBalance = cityTurnover.get(city)!
          if (transaction.name === 'приход') {
            cityTurnover.set(city, currentBalance + amount)
          } else if (transaction.name === 'расход') {
            cityTurnover.set(city, currentBalance - amount)
          }
        })

        // Создаем записи зарплаты для каждого директора по каждому городу
        const records: SalaryRecord[] = []
        directors.forEach((director) => {
          director.cities.forEach((city) => {
            const turnover = cityTurnover.get(city) || 0
            const salary = turnover * 0.07 // 7% от оборота
            
            records.push({
              id: `${director.id}-${city}`,
              city,
              directorName: director.name,
              turnover,
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
  }, [])


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
    totalTurnover: salaryRecords.reduce((sum, r) => sum + r.turnover, 0),
    totalSalary: salaryRecords.reduce((sum, r) => sum + r.salary, 0),
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Общий оборот</div>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalTurnover)}</div>
              <p className="text-xs text-gray-500 mt-1">По всем городам</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-teal-700">Общая зарплата</div>
                <DollarSign className="h-4 w-4 text-teal-700" />
              </div>
              <div className="text-3xl font-bold text-teal-700">{formatCurrency(stats.totalSalary)}</div>
              <p className="text-xs text-teal-600 mt-1">Всего директорам</p>
            </CardContent>
          </Card>
        </div>

        {/* Таблица зарплаты */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
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
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Оборот</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Зарплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
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
                        {formatCurrency(record.turnover)}
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

