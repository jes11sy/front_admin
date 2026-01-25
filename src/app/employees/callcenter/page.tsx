'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface Operator {
  id: number
  name: string
  login: string
  statusWork: string
  dateCreate: string
  sipAddress?: string
  note?: string
}

interface Admin {
  id: number
  login: string
  note?: string
}

interface OperatorsResponse {
  admins: Admin[]
  operators: Operator[]
}

export default function CallCenterPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [operators, setOperators] = useState<Operator[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Загрузка сотрудников при монтировании компонента
  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.getOperators({ type: 'operator' })
      if (response.success && response.data) {
        setOperators(response.data)
      } else {
        toast.error('Не удалось загрузить список операторов')
      }
    } catch (error) {
      logger.error('Error loading operators', { error: String(error) })
      toast.error('Ошибка при загрузке операторов')
    } finally {
      setIsLoading(false)
    }
  }

  // Фильтрация операторов по имени и логину
  const filteredEmployees = operators.filter(operator =>
    operator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    operator.login.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого сотрудника?')) {
      return
    }

    try {
      const response = await apiClient.deleteOperator(id.toString())
      if (response.success) {
        toast.success('Сотрудник успешно удалён')
        loadEmployees()
      } else {
        toast.error('Не удалось удалить сотрудника')
      }
    } catch (error) {
      logger.error('Error deleting employee', { error: String(error) })
      toast.error('Ошибка при удалении сотрудника')
    }
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
                onClick={() => router.push('/employees/callcenter/add')}
                disabled={isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить сотрудника
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <span className="ml-3 text-gray-600">Загрузка сотрудников...</span>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Имя</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Логин</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Статус работы</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">SIP адрес</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Дата создания</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.map((operator) => (
                        <tr key={operator.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-600">#{operator.id}</td>
                          <td className="py-3 px-4 text-gray-800 font-medium">{operator.name}</td>
                          <td className="py-3 px-4 text-gray-600">{operator.login}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              operator.statusWork === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {operator.statusWork === 'active' ? 'Активен' : operator.statusWork}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600 font-mono">{operator.sipAddress || '-'}</td>
                          <td className="py-3 px-4 text-gray-600">{formatDate(operator.dateCreate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={() => router.push(`/employees/callcenter/edit/${operator.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(operator.id)}
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

                {filteredEmployees.length === 0 && operators.length > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Операторы не найдены. Попробуйте изменить поисковый запрос.
                  </div>
                )}

                {operators.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-gray-500">
                    Нет операторов. Добавьте первого оператора.
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
