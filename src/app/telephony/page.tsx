'use client'

import { Card, CardContent } from '@/components/ui/card'
import { PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, Plus, Edit, Trash2, Search } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface PhoneNumber {
  id: number
  number: string
  rk: string
  city: string
  avitoName: string | null
  createdAt: string
}

export default function TelephonyPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Мок-данные для статистики (пока оставляем, так как нет эндпоинта для статистики)
  const stats = {
    totalCalls: 1245,
    incomingCalls: 856,
    missedCalls: 389,
    avgCallDuration: '4:32',
  }

  useEffect(() => {
    loadPhones()
  }, [])

  const loadPhones = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getPhones({ search: searchQuery })
      if (response.success && response.data) {
        setPhoneNumbers(response.data)
      } else {
        toast.error('Не удалось загрузить список телефонных номеров')
      }
    } catch (error) {
      console.error('Error loading phones:', error)
      toast.error('Ошибка при загрузке телефонных номеров')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот номер?')) {
      return
    }

    try {
      const response = await apiClient.deletePhone(id.toString())
      if (response.success) {
        toast.success('Номер успешно удален')
        loadPhones()
      } else {
        toast.error('Не удалось удалить номер')
      }
    } catch (error) {
      console.error('Error deleting phone:', error)
      toast.error('Ошибка при удалении номера')
    }
  }

  // Фильтрация локальная (можно убрать если делать поиск на сервере)
  const filteredPhoneNumbers = phoneNumbers

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
        {/* Статистика звонков */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Всего звонков</div>
                <PhoneCall className="h-4 w-4 text-teal-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{stats.totalCalls}</div>
              <p className="text-xs text-gray-500 mt-1">За месяц</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Входящие</div>
                <PhoneIncoming className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{stats.incomingCalls}</div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((stats.incomingCalls / stats.totalCalls) * 100)}% от общего
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-500">Пропущенные</div>
                <PhoneOutgoing className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-3xl font-bold text-gray-800">{stats.missedCalls}</div>
              <p className="text-xs text-gray-500 mt-1">
                {Math.round((stats.missedCalls / stats.totalCalls) * 100)}% от общего
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Таблица телефонных номеров */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по номеру или аккаунту..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                onClick={() => router.push('/telephony/add')}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить номер
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Номер телефона</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">РК</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Город</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Название аккаунта</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Звонки</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Дата создания</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Загрузка...
                    </TableCell>
                  </TableRow>
                ) : filteredPhoneNumbers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Телефонные номера не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPhoneNumbers.map((phone) => (
                    <TableRow key={phone.id}>
                      <TableCell className="font-mono text-gray-900">{phone.number}</TableCell>
                      <TableCell className="text-gray-600">{phone.rk}</TableCell>
                      <TableCell className="text-gray-600">{phone.city}</TableCell>
                      <TableCell className="font-medium text-gray-900">{phone.avitoName || '-'}</TableCell>
                      <TableCell className="text-center">
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
                          -
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-600">{formatDate(phone.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-teal-600 hover:bg-teal-50"
                            onClick={() => router.push(`/telephony/edit/${phone.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(phone.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {filteredPhoneNumbers.length === 0 && phoneNumbers.length > 0 && (
              <div className="text-center py-8 text-gray-500">
                Номера не найдены. Попробуйте изменить поисковый запрос.
              </div>
            )}

            {phoneNumbers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет телефонных номеров. Добавьте первый номер.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

