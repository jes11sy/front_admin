'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Upload, X } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export default function EditMasterPage() {
  const router = useRouter()
  const params = useParams()
  const masterId = params.id

  const [formData, setFormData] = useState({
    cities: [] as string[],
    name: '',
    login: '',
    password: '',
    tgId: '',
    chatId: '',
    note: '',
    status: 'active'
  })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<{ cities?: string }>({})
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [existingPassport, setExistingPassport] = useState<string | null>(null)
  const [existingContract, setExistingContract] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const availableCities = ['Саратов', 'Энгельс', 'Ульяновск']

  const filteredCities = availableCities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase()) &&
    !formData.cities.includes(city)
  )

  // Загрузка данных мастера
  useEffect(() => {
    const loadMaster = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.request<any>(`/masters/${masterId}`)
        if (response.success && response.data) {
          const master = response.data
          setFormData({
            cities: master.cities || [],
            name: master.name || '',
            login: master.login || '',
            password: '',
            tgId: master.tgId || '',
            chatId: master.chatId || '',
            note: master.note || '',
            status: master.statusWork || 'active'
          })
          setExistingPassport(master.passportDoc || null)
          setExistingContract(master.contractDoc || null)
        } else {
          toast.error('Не удалось загрузить данные мастера')
        }
      } catch (error) {
        console.error('Error loading master:', error)
        toast.error('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    if (masterId) {
      loadMaster()
    }
  }, [masterId])

  const generateLogin = () => {
    if (!formData.name) {
      return
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
    const newErrors: { cities?: string } = {}
    if (formData.cities.length === 0) {
      newErrors.cities = 'Выберите хотя бы один город'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsLoading(true)
    
    try {
      const updateData: any = {
        cities: formData.cities,
        name: formData.name,
        login: formData.login || null,
        tgId: formData.tgId,
        chatId: formData.chatId,
        note: formData.note,
        statusWork: formData.status,
      }

      // Добавляем пароль только если он был изменен
      if (formData.password) {
        updateData.password = formData.password
      }

      // TODO: Загрузка файлов паспорта и договора через files-service
      if (passportFile) {
        console.log('Passport file to upload:', passportFile)
      }
      if (contractFile) {
        console.log('Contract file to upload:', contractFile)
      }

      const response = await apiClient.updateMaster(masterId as string, updateData)
      
      if (response.success) {
        toast.success('Данные мастера успешно обновлены')
        router.push('/employees/masters')
      } else {
        toast.error('Не удалось обновить данные мастера')
      }
    } catch (error) {
      console.error('Error updating master:', error)
      toast.error('Ошибка при обновлении данных')
    } finally {
      setIsLoading(false)
    }
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

  if (isLoading && !formData.name) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Редактировать мастера</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Города */}
              <div>
                <Label htmlFor="cities" className="text-gray-700">Города *</Label>
                
                {/* Выбранные города */}
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                  {formData.cities.map((city) => (
                    <div
                      key={city}
                      className="flex items-center gap-2 bg-teal-100 text-teal-800 px-3 py-1 rounded-full"
                    >
                      <span>{city}</span>
                      <button
                        type="button"
                        onClick={() => removeCity(city)}
                        className="hover:bg-teal-200 rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Поле поиска городов */}
                <div className="relative">
                  <Input
                    id="cities"
                    type="text"
                    value={citySearch}
                    onChange={(e) => {
                      setCitySearch(e.target.value)
                      setShowCityDropdown(true)
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    placeholder="Начните вводить название города..."
                    className="mt-1"
                  />
                  
                  {/* Dropdown со списком городов */}
                  {showCityDropdown && filteredCities.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => addCity(city)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.cities && (
                  <p className="text-sm text-red-600 mt-1">{errors.cities}</p>
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
                <Label htmlFor="login" className="text-gray-700">Логин</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="login"
                    type="text"
                    value={formData.login}
                    onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                    placeholder="Введите логин или сгенерируйте (необязательно)"
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

              {/* Пароль */}
              <div>
                <Label htmlFor="password" className="text-gray-700">Пароль</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="password"
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Оставьте пустым, чтобы не менять пароль"
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

              {/* Telegram ID */}
              <div>
                <Label htmlFor="tgId" className="text-gray-700">Telegram ID</Label>
                <Input
                  id="tgId"
                  type="text"
                  value={formData.tgId}
                  onChange={(e) => setFormData({ ...formData, tgId: e.target.value })}
                  placeholder="@username или ID"
                  className="mt-1"
                />
              </div>

              {/* Chat ID */}
              <div>
                <Label htmlFor="chatId" className="text-gray-700">Chat ID</Label>
                <Input
                  id="chatId"
                  type="text"
                  value={formData.chatId}
                  onChange={(e) => setFormData({ ...formData, chatId: e.target.value })}
                  placeholder="ID чата Telegram"
                  className="mt-1"
                />
              </div>

              {/* Статус */}
              <div>
                <Label htmlFor="status" className="text-gray-700">Статус *</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                </select>
              </div>

              {/* Фото паспорта */}
              <div>
                <Label htmlFor="passport" className="text-gray-700">Фото паспорта</Label>
                {existingPassport && !passportFile && (
                  <p className="text-sm text-gray-500 mt-1 mb-2">Текущий файл: {existingPassport}</p>
                )}
                <div className="mt-1">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      onClick={() => document.getElementById('passport')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {existingPassport ? 'Заменить файл' : 'Загрузить файл'}
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

              {/* Фото договора */}
              <div>
                <Label htmlFor="contract" className="text-gray-700">Фото договора</Label>
                {existingContract && !contractFile && (
                  <p className="text-sm text-gray-500 mt-1 mb-2">Текущий файл: {existingContract}</p>
                )}
                <div className="mt-1">
                  <div className="flex items-center gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-white"
                      onClick={() => document.getElementById('contract')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {existingContract ? 'Заменить файл' : 'Загрузить файл'}
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
                  disabled={isLoading}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/employees/masters')}
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
