'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useState } from 'react'

interface MasterReport {
  id: number
  name: string
  city: string
  ordersCompleted: number
  revenue: number
  salary: number
}

export default function MastersReportPage() {
  const [searchQuery, setSearchQuery] = useState('')

  // Мок-данные для отчета по мастерам
  const [mastersData] = useState<MasterReport[]>([
    {
      id: 1,
      name: 'Иванов Сергей',
      city: 'Москва',
      ordersCompleted: 45,
      revenue: 135000,
      salary: 67500
    },
    {
      id: 2,
      name: 'Петрова Ольга',
      city: 'Санкт-Петербург',
      ordersCompleted: 38,
      revenue: 114000,
      salary: 57000
    },
    {
      id: 3,
      name: 'Сидоров Алексей',
      city: 'Казань',
      ordersCompleted: 32,
      revenue: 96000,
      salary: 48000
    },
    {
      id: 4,
      name: 'Кузнецова Дарья',
      city: 'Москва',
      ordersCompleted: 41,
      revenue: 123000,
      salary: 61500
    },
    {
      id: 5,
      name: 'Морозов Игорь',
      city: 'Новосибирск',
      ordersCompleted: 28,
      revenue: 84000,
      salary: 42000
    },
  ])

  const filteredMasters = mastersData.filter(master =>
    master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    master.city.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Вычисляем средний чек
  const getAverageCheck = (revenue: number, ordersCompleted: number) => {
    if (ordersCompleted === 0) return 0
    return Math.round(revenue / ordersCompleted)
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по имени или городу..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Мастер</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Всего заказов</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Оборот</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Средний чек</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Зарплата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMasters.map((master) => {
                  const averageCheck = getAverageCheck(master.revenue, master.ordersCompleted)
                  return (
                    <TableRow key={master.id}>
                      <TableCell className="font-medium text-gray-900">{master.name}</TableCell>
                      <TableCell className="text-gray-600">{master.city}</TableCell>
                      <TableCell className="text-center text-gray-600">{master.ordersCompleted}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(master.revenue)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-700">
                        {formatCurrency(averageCheck)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-blue-600">
                        {formatCurrency(master.salary)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredMasters.length === 0 && mastersData.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                Мастера не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}

            {mastersData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет данных по мастерам.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

