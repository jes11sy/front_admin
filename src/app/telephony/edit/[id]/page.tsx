'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EditPhoneNumberPage() {
  const router = useRouter()
  const params = useParams()
  const phoneId = params.id

  const [formData, setFormData] = useState({
    phoneNumber: '',
    campaign: '',
    city: '',
    avitoAccount: ''
  })
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({})

  // Загрузка данных телефонного номера
  useEffect(() => {
    // TODO: Загрузить данные с API
    // Мок-данные для примера
    const mockPhones: { [key: string]: any } = {
      '1': {
        phoneNumber: '79531234567',
        campaign: 'РК_Москва_1',
        city: 'Москва',
        avitoAccount: 'Avito_Moscow_Main'
      },
      '2': {
        phoneNumber: '78129876543',
        campaign: 'РК_СПб_2',
        city: 'Санкт-Петербург',
        avitoAccount: 'Avito_SPB_Premium'
      },
      '3': {
        phoneNumber: '78434567890',
        campaign: 'РК_Казань_1',
        city: 'Казань',
        avitoAccount: 'Avito_Kazan_Base'
      },
      '4': {
        phoneNumber: '79532345678',
        campaign: 'РК_Москва_2',
        city: 'Москва',
        avitoAccount: 'Avito_Moscow_Extra'
      },
    }

    const phone = mockPhones[phoneId as string]
    if (phone) {
      setFormData({
        phoneNumber: phone.phoneNumber,
        campaign: phone.campaign,
        city: phone.city,
        avitoAccount: phone.avitoAccount
      })
    }
  }, [phoneId])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Убираем все нецифровые символы
    const value = e.target.value.replace(/\D/g, '')
    // Ограничиваем до 11 цифр (7 + 10 цифр)
    const formatted = value.slice(0, 11)
    setFormData({ ...formData, phoneNumber: formatted })
    if (errors.phoneNumber) {
      setErrors({ ...errors, phoneNumber: undefined })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.phoneNumber.length !== 11) {
      setErrors({ phoneNumber: 'Номер телефона должен содержать 11 цифр' })
      return
    }
    
    setErrors({})
    
    // TODO: Отправить данные на API
    console.log('Updated form data:', formData)
    
    // Вернуться к списку
    router.push('/telephony')
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
                  placeholder="79539979880 (11 цифр)"
                  className={`mt-1 ${errors.phoneNumber ? 'border-red-500' : ''}`}
                  maxLength={11}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Формат: 11 цифр без пробелов и скобок (например: 79539979880)
                </p>
                {errors.phoneNumber && (
                  <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>
                )}
                {formData.phoneNumber && formData.phoneNumber.length !== 11 && !errors.phoneNumber && (
                  <p className="text-xs text-gray-500 mt-1">
                    Введено: {formData.phoneNumber.length} из 11 цифр
                  </p>
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
                />
              </div>

              {/* Имя авито */}
              <div>
                <Label htmlFor="avitoAccount" className="text-gray-700">Имя аккаунта Авито *</Label>
                <Input
                  id="avitoAccount"
                  type="text"
                  required
                  value={formData.avitoAccount}
                  onChange={(e) => setFormData({ ...formData, avitoAccount: e.target.value })}
                  placeholder="Например: Avito_Moscow_Main"
                  className="mt-1"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  Сохранить изменения
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/telephony')}
                  className="bg-white"
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

