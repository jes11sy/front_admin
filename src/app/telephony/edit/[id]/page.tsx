'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export default function EditPhoneNumberPage() {
  const router = useRouter()
  const params = useParams()
  const phoneId = params.id

  const [formData, setFormData] = useState({
    number: '',
    rk: '',
    city: '',
    avitoName: ''
  })
  const [errors, setErrors] = useState<{ number?: string }>({})
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка данных телефонного номера
  useEffect(() => {
    const loadPhone = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getPhone(phoneId as string)
        if (response.success && response.data) {
          const phone = response.data
          setFormData({
            number: phone.number || '',
            rk: phone.rk || '',
            city: phone.city || '',
            avitoName: phone.avitoName || ''
          })
        } else {
          toast.error('Не удалось загрузить данные телефонного номера')
        }
      } catch (error) {
        console.error('Error loading phone:', error)
        toast.error('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    if (phoneId) {
      loadPhone()
    }
  }, [phoneId])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData({ ...formData, number: value })
    if (errors.number) {
      setErrors({ ...errors, number: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const updateData = {
        number: formData.number,
        rk: formData.rk,
        city: formData.city,
        avitoName: formData.avitoName || null
      }

      const response = await apiClient.updatePhone(phoneId as string, updateData)
      
      if (response.success) {
        toast.success('Телефонный номер успешно обновлен')
        router.push('/telephony')
      } else {
        toast.error('Не удалось обновить телефонный номер')
      }
    } catch (error) {
      console.error('Error updating phone:', error)
      toast.error('Ошибка при обновлении телефонного номера')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Редактировать телефонный номер</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Номер телефона */}
              <div>
                <Label htmlFor="number" className="text-gray-700">Номер телефона *</Label>
                <Input
                  id="number"
                  type="text"
                  required
                  value={formData.number}
                  onChange={handlePhoneChange}
                  placeholder="+79539979880"
                  className={`mt-1 ${errors.number ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Формат: +7... (с плюсом и кодом страны)
                </p>
                {errors.number && (
                  <p className="text-xs text-red-500 mt-1">{errors.number}</p>
                )}
              </div>

              {/* РК */}
              <div>
                <Label htmlFor="rk" className="text-gray-700">РК *</Label>
                <Input
                  id="rk"
                  type="text"
                  required
                  value={formData.rk}
                  onChange={(e) => setFormData({ ...formData, rk: e.target.value })}
                  placeholder="Например: РК_Москва_1"
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              {/* Город */}
              <div>
                <Label htmlFor="city" className="text-gray-700">Город *</Label>
                <Input
                  id="city"
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Введите город"
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              {/* Имя авито */}
              <div>
                <Label htmlFor="avitoName" className="text-gray-700">Имя аккаунта Авито</Label>
                <Input
                  id="avitoName"
                  type="text"
                  value={formData.avitoName}
                  onChange={(e) => setFormData({ ...formData, avitoName: e.target.value })}
                  placeholder="Например: Avito_Moscow_Main"
                  className="mt-1"
                  disabled={isLoading}
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Загрузка...' : 'Сохранить изменения'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/telephony')}
                  className="bg-white"
                  disabled={isLoading}
                >
                  Отмена
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

