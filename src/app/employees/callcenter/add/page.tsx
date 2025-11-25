'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export default function AddCallCenterEmployeePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    sipAddress: '',
    note: ''
  })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsSubmitting(true)
    
    try {
      let passportDocUrl: string | undefined
      let contractDocUrl: string | undefined

      // Загрузка паспорта
      if (passportFile) {
        const passportFormData = new FormData()
        passportFormData.append('file', passportFile)
        
        const passportResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload?folder=callcenter/passports`, {
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

      // Загрузка договора
      if (contractFile) {
        const contractFormData = new FormData()
        contractFormData.append('file', contractFile)
        
        const contractResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/upload?folder=callcenter/contracts`, {
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

      // Создание оператора
      const response = await apiClient.createOperator({
        name: formData.name,
        login: formData.login,
        password: formData.password,
        type: 'operator',
        sipAddress: formData.sipAddress || undefined,
        passport: passportDocUrl,
        contract: contractDocUrl,
        note: formData.note || undefined
      })

      if (response.success) {
        toast.success('Сотрудник кол-центра успешно добавлен!')
        router.push('/employees/callcenter')
      } else {
        toast.error(response.error || 'Ошибка при добавлении сотрудника')
      }
    } catch (error: any) {
      console.error('Error creating operator:', error)
      toast.error(error.message || 'Произошла ошибка при добавлении сотрудника')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Добавить сотрудника кол-центра</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* SIP адрес */}
              <div>
                <Label htmlFor="sipAddress" className="text-gray-700">SIP адрес *</Label>
                <Input
                  id="sipAddress"
                  type="text"
                  required
                  value={formData.sipAddress}
                  onChange={(e) => setFormData({ ...formData, sipAddress: e.target.value })}
                  placeholder="Например: 100"
                  className="mt-1"
                />
              </div>

              {/* Фото паспорта */}
              <div>
                <Label htmlFor="passport" className="text-gray-700">Фото паспорта</Label>
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

              {/* Фото договора */}
              <div>
                <Label htmlFor="contract" className="text-gray-700">Фото договора</Label>
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
                  placeholder="Дополнительная информация о сотруднике"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Добавление...' : 'Добавить сотрудника'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/employees/callcenter')}
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

