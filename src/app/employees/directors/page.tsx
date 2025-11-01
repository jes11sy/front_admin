'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface Director {
  id: number
  cities: string[]
  name: string
  login: string
  dateCreate: string
  note?: string
  contractDoc?: string
  passportDoc?: string
}

export default function DirectorsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [directors, setDirectors] = useState<Director[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Загрузка директоров при монтировании компонента
  useEffect(() => {
    loadDirectors()
  }, [])

  const loadDirectors = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getDirectors()
      if (response.success && response.data) {
        setDirectors(response.data)
      } else {
        toast.error('Не удалось загрузить список директоров')
      }
    } catch (error) {
      console.error('Error loading directors:', error)
      toast.error('Ошибка при загрузке директоров')
    } finally {
      setIsLoading(false)
    }
  }

  // Фильтрация директоров по имени и логину
  const filteredDirectors = directors.filter(director =>
    director.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    director.login.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8">
        <Card className="hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Поиск по имени или логину..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                />
              </div>
              <Button 
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                onClick={() => window.location.href = '/employees/directors/add'}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить директора
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-3 text-gray-600">Загрузка директоров...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Города</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Имя</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Логин</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата создания</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDirectors.map((director) => (
                        <tr key={director.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-600">#{director.id}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {director.cities.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {director.cities.map((city, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-teal-100 text-teal-800">
                                    {city}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-800 font-medium">{director.name}</td>
                          <td className="py-3 px-4 text-gray-600">{director.login}</td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(director.dateCreate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={() => window.location.href = `/employees/directors/edit/${director.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  if (confirm('Вы уверены, что хотите удалить этого директора?')) {
                                    toast.error('Удаление директоров пока не реализовано')
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredDirectors.length === 0 && directors.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Директора не найдены. Попробуйте изменить поисковый запрос.
                  </div>
                )}

                {directors.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Нет директоров. Добавьте первого директора.
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
