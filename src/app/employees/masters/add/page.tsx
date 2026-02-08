'use client'

import { RefreshCw, Upload, X, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'

export default function AddMasterPage() {
  const router = useRouter()
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  const [formData, setFormData] = useState({
    cities: [] as string[],
    name: '',
    login: '',
    password: '',
    tgId: '',
    chatId: '',
    note: ''
  })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ cities?: string }>({})
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableCities = ['Саратов', 'Энгельс', 'Ульяновск', 'Пенза', 'Тольятти', 'Омск', 'Ярославль']

  const filteredCities = availableCities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase()) &&
    !formData.cities.includes(city)
  )

  const generateLogin = () => {
    if (!formData.name) return

    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }

    const firstName = formData.name.split(' ')[0].toLowerCase()
    let translitName = ''
    for (let i = 0; i < firstName.length; i++) {
      const char = firstName[i]
      translitName += translitMap[char] || char
    }

    const randomNumbers = Math.floor(1000 + Math.random() * 9000)
    setFormData({ ...formData, login: `${translitName}_${randomNumbers}` })
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
  }

  const addCity = (city: string) => {
    if (!formData.cities.includes(city)) {
      setFormData({ ...formData, cities: [...formData.cities, city] })
      setErrors({ ...errors, cities: undefined })
    }
    setCitySearch('')
    setShowCityDropdown(false)
  }

  const removeCity = (cityToRemove: string) => {
    setFormData({
      ...formData,
      cities: formData.cities.filter(city => city !== cityToRemove)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.cities.length === 0) {
      setErrors({ cities: 'Выберите хотя бы один город' })
      return
    }
    
    setErrors({})
    setIsSubmitting(true)
    
    try {
      let passportDocUrl: string | undefined
      let contractDocUrl: string | undefined

      if (passportFile) {
        const passportFormData = new FormData()
        passportFormData.append('file', passportFile)
        
        const passportResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload?folder=masters/passports`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await apiClient.getAccessToken()}`
          },
          body: passportFormData
        })
        
        if (passportResponse.ok) {
          const passportData = await passportResponse.json()
          passportDocUrl = passportData.data?.key
        }
      }

      if (contractFile) {
        const contractFormData = new FormData()
        contractFormData.append('file', contractFile)
        
        const contractResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload?folder=masters/contracts`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await apiClient.getAccessToken()}`
          },
          body: contractFormData
        })
        
        if (contractResponse.ok) {
          const contractData = await contractResponse.json()
          contractDocUrl = contractData.data?.key
        }
      }

      const response = await apiClient.createMaster({
        name: formData.name,
        login: formData.login,
        password: formData.password,
        cities: formData.cities,
        tgId: formData.tgId || undefined,
        chatId: formData.chatId || undefined,
        passportDoc: passportDocUrl,
        contractDoc: contractDocUrl,
        note: formData.note || undefined
      })

      if (response.success) {
        toast.success('Мастер успешно добавлен!')
        router.push('/employees/masters')
      } else {
        toast.error(response.error || 'Ошибка при добавлении мастера')
      }
    } catch (error: any) {
      console.error('Error creating master:', error)
      toast.error(error.message || 'Произошла ошибка при добавлении мастера')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Шапка */}
        <div className="mb-6">
          <button 
            onClick={() => router.back()}
            className={`flex items-center gap-2 mb-4 text-sm transition-colors ${
              isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
          <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
            Добавить мастера
          </h1>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Города */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Города <span className="text-red-500">*</span>
            </h2>
            
            {/* Выбранные города */}
            {formData.cities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.cities.map((city) => (
                  <div
                    key={city}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm ${
                      isDark ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span>{city}</span>
                    <button
                      type="button"
                      onClick={() => removeCity(city)}
                      className={`p-0.5 rounded transition-colors ${
                        isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-300'
                      }`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Поиск городов */}
            <div className="relative">
              <input
                type="text"
                value={citySearch}
                onChange={(e) => {
                  setCitySearch(e.target.value)
                  setShowCityDropdown(true)
                }}
                onFocus={() => setShowCityDropdown(true)}
                placeholder="Начните вводить название города..."
                className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  isDark 
                    ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
              
              {showCityDropdown && filteredCities.length > 0 && (
                <div className={`absolute z-10 w-full mt-1 rounded-lg shadow-lg max-h-48 overflow-auto ${
                  isDark ? 'bg-[#2a3441] border border-gray-600' : 'bg-white border border-gray-200'
                }`}>
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => addCity(city)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        isDark 
                          ? 'text-gray-200 hover:bg-[#3a4451]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.cities && (
              <p className="text-sm text-red-500 mt-2">{errors.cities}</p>
            )}
          </div>

          {/* Основная информация */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Основная информация
            </h2>
            
            <div className="space-y-4">
              {/* Имя */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Имя <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите полное имя"
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Логин */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Логин <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    placeholder="Введите логин"
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark 
                        ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                        : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                    }`}
                  />
                  <button 
                    type="button" 
                    onClick={generateLogin}
                    className={`px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                      isDark 
                        ? 'bg-[#1e2530] border border-gray-600 text-gray-300 hover:bg-[#3a4451]'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Пароль */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Пароль <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Введите пароль"
                    className={`flex-1 px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                      isDark 
                        ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                        : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                    }`}
                  />
                  <button 
                    type="button" 
                    onClick={generatePassword}
                    className={`px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                      isDark 
                        ? 'bg-[#1e2530] border border-gray-600 text-gray-300 hover:bg-[#3a4451]'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Telegram
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TG ID */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  TG ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.tgId}
                  onChange={(e) => setFormData({ ...formData, tgId: e.target.value })}
                  placeholder="@username или ID"
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Chat ID */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Chat ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="Введите Chat ID"
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Документы */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Документы
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Паспорт */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Фото паспорта
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('passport')?.click()}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-300 hover:bg-[#3a4451]'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {passportFile ? passportFile.name : 'Загрузить'}
                </button>
                <input
                  id="passport"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                />
              </div>

              {/* Договор */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Фото договора
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('contract')?.click()}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-300 hover:bg-[#3a4451]'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Upload className="h-4 w-4" />
                  {contractFile ? contractFile.name : 'Загрузить'}
                </button>
                <input
                  id="contract"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          {/* Заметка */}
          <div className={`rounded-xl p-5 ${isDark ? 'bg-[#2a3441]' : 'bg-gray-50 border border-gray-200'}`}>
            <h2 className={`text-sm font-medium mb-4 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Дополнительно
            </h2>
            
            <div>
              <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Заметка
              </label>
              <textarea
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Дополнительная информация"
                className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none ${
                  isDark 
                    ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                }`}
              />
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Добавление...' : 'Добавить'}
            </button>
            <button 
              type="button"
              onClick={() => router.push('/employees/masters')}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isDark 
                  ? 'bg-[#2a3441] text-gray-300 hover:bg-[#3a4451]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
