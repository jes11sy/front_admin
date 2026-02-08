'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ALL_CITIES = ['Саратов', 'Энгельс', 'Ульяновск', 'Пенза', 'Тольятти', 'Омск', 'Ярославль']

export default function AddPhoneNumberPage() {
  const router = useRouter()
  
  // Тема
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])
  
  const isDark = theme === 'dark'
  
  const [formData, setFormData] = useState({
    phoneNumber: '',
    campaign: '',
    city: '',
    accountName: ''
  })
  const [errors, setErrors] = useState<{ phoneNumber?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    const formatted = value.slice(0, 11)
    setFormData({ ...formData, phoneNumber: formatted })
    if (errors.phoneNumber) {
      setErrors({ ...errors, phoneNumber: undefined })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.phoneNumber.length !== 11) {
      setErrors({ phoneNumber: 'Номер телефона должен содержать 11 цифр' })
      return
    }
    
    setErrors({})
    setIsSubmitting(true)
    
    try {
      const response = await apiClient.createPhone({
        phoneNumber: formData.phoneNumber,
        campaign: formData.campaign,
        city: formData.city,
        accountName: formData.accountName
      })
      
      if (response.success) {
        toast.success('Номер успешно добавлен')
        router.push('/telephony')
      } else {
        toast.error(response.error || 'Не удалось добавить номер')
      }
    } catch (error) {
      console.error('Error creating phone:', error)
      toast.error('Ошибка при добавлении номера')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-4 py-6 max-w-2xl mx-auto">
        
        {/* Заголовок */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/telephony')}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-[#2a3441] text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Добавить номер
          </h1>
        </div>

        {/* Форма */}
        <div className={`rounded-xl p-6 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50'}`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Номер телефона */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Номер телефона <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.phoneNumber}
                onChange={handlePhoneChange}
                placeholder="79539979880"
                maxLength={11}
                className={`w-full px-4 py-3 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                } ${errors.phoneNumber ? 'border-red-500' : ''}`}
              />
              <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                11 цифр без пробелов и скобок
                {formData.phoneNumber && formData.phoneNumber.length !== 11 && (
                  <span className="ml-2">({formData.phoneNumber.length}/11)</span>
                )}
              </p>
              {errors.phoneNumber && (
                <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>
              )}
            </div>

            {/* РК */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                РК <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.campaign}
                onChange={(e) => setFormData({ ...formData, campaign: e.target.value })}
                placeholder="РК_Саратов_1"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Город */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Город <span className="text-red-500">*</span>
              </label>
              <Select value={formData.city} onValueChange={(v) => setFormData({ ...formData, city: v })}>
                <SelectTrigger className={`w-full h-12 ${isDark ? 'bg-[#3a4451] border-gray-600 text-gray-100' : 'bg-white border-gray-200 text-gray-800'}`}>
                  <SelectValue placeholder="Выберите город" />
                </SelectTrigger>
                <SelectContent className={isDark ? 'bg-[#2a3441] border-gray-600' : 'bg-white border-gray-200'}>
                  {ALL_CITIES.map(city => (
                    <SelectItem key={city} value={city} className={isDark ? 'text-gray-100' : 'text-gray-800'}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Имя аккаунта */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Имя аккаунта Авито <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.accountName}
                onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                placeholder="Avito_Saratov_Main"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                  isDark 
                    ? 'bg-[#3a4451] border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Кнопки */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {isSubmitting ? 'Добавление...' : 'Добавить номер'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/telephony')}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                  isDark 
                    ? 'bg-[#3a4451] hover:bg-[#4a5461] text-gray-300'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
