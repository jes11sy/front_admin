'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Upload } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EditCallCenterEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id

  const [formData, setFormData] = useState({
    name: '',
    login: '',
    password: '',
    sipAddress: '',
    note: '',
    status: 'active'
  })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [contractFile, setContractFile] = useState<File | null>(null)
  const [existingPassport, setExistingPassport] = useState<string | null>(null)
  const [existingContract, setExistingContract] = useState<string | null>(null)

  // Загрузка данных сотрудника
  useEffect(() => {
    // TODO: Загрузить данные с API
    // Мок-данные для примера
    const mockEmployees: { [key: string]: any } = {
      '1': {
        name: 'Иванов Иван',
        login: 'ivanov',
        password: 'password123',
        sipAddress: '100',
        note: 'Опытный сотрудник',
        status: 'active',
        passport: 'passport_1.jpg',
        contract: 'contract_1.pdf'
      },
      '2': {
        name: 'Петрова Мария',
        login: 'petrova',
        password: 'password456',
        sipAddress: '101',
        note: '',
        status: 'active',
        passport: 'passport_2.jpg',
        contract: 'contract_2.pdf'
      },
      '3': {
        name: 'Сидоров Петр',
        login: 'sidorov',
        password: 'password789',
        sipAddress: '102',
        note: 'В отпуске до 15.11',
        status: 'inactive',
        passport: null,
        contract: null
      },
      '4': {
        name: 'Кузнецова Анна',
        login: 'kuznetsova',
        password: 'passwordabc',
        sipAddress: '103',
        note: '',
        status: 'active',
        passport: 'passport_4.jpg',
        contract: 'contract_4.pdf'
      }
    }

    const employee = mockEmployees[employeeId as string]
    if (employee) {
      setFormData({
        name: employee.name,
        login: employee.login,
        password: employee.password,
        sipAddress: employee.sipAddress,
        note: employee.note,
        status: employee.status
      })
      setExistingPassport(employee.passport)
      setExistingContract(employee.contract)
    }
  }, [employeeId])

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Отправить данные на API
    console.log('Updated form data:', formData)
    console.log('Passport file:', passportFile)
    console.log('Contract file:', contractFile)
    
    // Вернуться к списку
    router.push('/employees/callcenter')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Редактировать сотрудника кол-центра</CardTitle>
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
                  placeholder="Дополнительная информация о сотруднике"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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

