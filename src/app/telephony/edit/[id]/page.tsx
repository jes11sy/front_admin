'use client' 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface PhoneData {
  id: string
  phoneNumber: string
  campaign: string
  city: string
  accountName?: string
}

interface FormData {
  phoneNumber: string
  campaign: string
  city: string
  accountName: string
}

export default function EditPhoneNumberPage() {
  const router = useRouter()
  const params = useParams()
  const phoneId = params.id

  const [formData, setFormData] = useState<FormData>({
    phoneNumber: '',
    campaign: '',
    city: '',
    accountName: ''
  })
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({})
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка данных телефонного номера
  useEffect(() => {
    const loadPhone = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getPhone(phoneId as string)
        if (response.success && response.data) {
          const phone = response.data as PhoneData
          setFormData({
            phoneNumber: phone.phoneNumber || '',
            campaign: phone.campaign || '',
            city: phone.city || '',
            accountName: phone.accountName || ''
          })
        } else {
          toast.error(response.error || 'Не удалось загрузить данные телефонного номера')
        }
      } catch (error) {
        console.error('Error loading phone:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
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
    setFormData({ ...formData, phoneNumber: value })
    if (errors.phoneNumber) {
      setErrors({ ...errors, phoneNumber: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const updateData: Partial<FormData> = {
        phoneNumber: formData.phoneNumber,
        campaign: formData.campaign,
        city: formData.city,
        accountName: formData.accountName || ''
      }

      const response = await apiClient.updatePhone(phoneId as string, updateData)
      
      if (response.success) {
        toast.success('Телефонный номер успешно обновлен')
        router.push('/telephony')
      } else {
        toast.error(response.error || 'Не удалось обновить телефонный номер')
      }
    } catch (error) {
      console.error('Error updating phone:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении телефонного номера'
      toast.error(errorMessage)
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
                <Label htmlFor="phoneNumber" className="text-gray-700">Номер телефона *</Label>
                <Input
                  id="phoneNumber"
                  type="text"
                  required
                  value={formData.phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="79539979880"
                  className={`mt-1 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Формат: 11 цифр без пробелов (например: 79539979880)
                </p>
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>
                )}
              </div>

              {/* РК */}
              <div>
                <Label htmlFor="campaign" className="text-gray-700">РК *</Label>
                <Input
                  id="campaign"
                  type="text"
                  required
                  value={formData.campaign}
                  onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
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
                <Label htmlFor="accountName" className="text-gray-700">Имя аккаунта Авито</Label>
                <Input
                  id="accountName"
                  type="text"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
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

