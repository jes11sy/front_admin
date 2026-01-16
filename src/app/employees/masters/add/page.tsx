'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AddMasterPage() {
  const router = useRouter()
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

  const availableCities = ['Саратов', 'Энгельс', 'Ульяновск', 'Пенза', 'Тольятти']

  const filteredCities = availableCities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase()) &&
    !formData.cities.includes(city)
  )

  const generateLogin = () => {
    if (!formData.name) {
      return
    }

    // Транслитерация русских букв в латинские
    const translitMap: { [key: string]: string } = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }

    // Берем первое слово из имени (обычно фамилия)
    const firstName = formData.name.split(' ')[0].toLowerCase()
    
    // Транслитерируем
    let translitName = ''
    for (let i = 0; i < firstName.length; i++) {
      const char = firstName[i]
      translitName += translitMap[char] || char
    }

    // Генерируем случайные цифры
    const randomNumbers = Math.floor(1000 + Math.random() * 9000) // 4 цифры от 1000 до 9999
    
    const login = `${translitName}_${randomNumbers}`
    setFormData({ ...formData, login })
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData({ ...formData, password })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.cities.length === 0) {
      setErrors({ cities: 'Выберите хотя бы один город' })
      return
    }
    
    setErrors({})
    
    // TODO: Отправить данные на API
    console.log('Form data:', formData)
    console.log('Passport file:', passportFile)
    console.log('Contract file:', contractFile)
    
    // Вернуться к списку
    router.push('/employees/masters')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}} onClick={() => setShowCityDropdown(false)}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Добавить мастера</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Город */}
              <div>
                <Label htmlFor="cityInput" className="text-gray-700">Город *</Label>
                <div className="relative mt-1">
                  <Input
                    id="cityInput"
                    type="text"
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value)
                      setShowCityDropdown(true)
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="Начните вводить название города..."
                    className={`${errors.cities ? 'border-red-500' : ''}`}
                  />
                  
                  {showCityDropdown && citySearch && filteredCities.length > 0 && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {filteredCities.map((city) => (
                        <div
                          key={city}
                          onClick={() => {
                            setFormData({ ...formData, cities: [...formData.cities, city] })
                            setCitySearch('')
                            setShowCityDropdown(false)
                            if (errors.cities) {
                              setErrors({ ...errors, cities: undefined })
                            }
                          }}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        >
                          {city}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {citySearch && filteredCities.length === 0 && formData.cities.length < availableCities.length && (
                    <div 
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="px-4 py-2 text-gray-500 text-sm">
                        Город не найден
                      </div>
                    </div>
                  )}
                </div>
                
                {errors.cities && (
                  <p className="text-xs text-red-500 mt-1">{errors.cities}</p>
                )}
                
                {formData.cities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.cities.map((city) => (
                      <span
                        key={city}
                        className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-medium flex items-center gap-2"
                      >
                        {city}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, cities: formData.cities.filter(c => c !== city) })
                          }}
                          className="hover:text-teal-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Имя */}
              <div>
                <Label htmlFor="name" className="text-gray-700">Имя *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите полное имя"
                  className="mt-1"
                />
              </div>

              {/* Логин */}
              <div>
                <Label htmlFor="login" className="text-gray-700">Логин *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="login"
                    type="text"
                    required
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    placeholder="Введите логин или сгенерируйте"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={generateLogin}
                    className="bg-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                </div>
              </div>

              {/* Пароль с генерацией */}
              <div>
                <Label htmlFor="password" className="text-gray-700">Пароль *</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="password"
                    type="text"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Введите пароль или сгенерируйте"
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={generatePassword}
                    className="bg-white"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Генерировать
                  </Button>
                </div>
              </div>

              {/* TG_ID */}
              <div>
                <Label htmlFor="tgId" className="text-gray-700">TG_ID *</Label>
                <Input
                  id="tgId"
                  type="text"
                  required
                  value={formData.tgId}
                  onChange={(e) => setFormData({ ...formData, tgId: e.target.value })}
                  placeholder="Например: @username или 123456789"
                  className="mt-1"
                />
              </div>

              {/* CHAT_ID */}
              <div>
                <Label htmlFor="chatId" className="text-gray-700">CHAT_ID *</Label>
                <Input
                  id="chatId"
                  type="text"
                  required
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="Введите CHAT_ID"
                  className="mt-1"
                />
              </div>

              {/* Паспорт */}
              <div>
                <Label htmlFor="passport" className="text-gray-700">Паспорт</Label>
                <div className="mt-1">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      onClick={() => document.getElementById('passport')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить файл
                    </Button>
                    {passportFile && (
                      <span className="text-sm text-gray-600">{passportFile.name}</span>
                    )}
                  </div>
                  <input
                    id="passport"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setPassportFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {/* Договор */}
              <div>
                <Label htmlFor="contract" className="text-gray-700">Договор</Label>
                <div className="mt-1">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      onClick={() => document.getElementById('contract')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Загрузить файл
                    </Button>
                    {contractFile && (
                      <span className="text-sm text-gray-600">{contractFile.name}</span>
                    )}
                  </div>
                  <input
                    id="contract"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              {/* Заметка */}
              <div>
                <Label htmlFor="note" className="text-gray-700">Заметка</Label>
                <textarea
                  id="note"
                  rows={4}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Дополнительная информация о мастере"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  Добавить мастера
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/employees/masters')}
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

