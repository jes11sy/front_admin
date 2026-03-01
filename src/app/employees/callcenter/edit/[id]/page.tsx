'use client'

import { RefreshCw, Upload, ArrowLeft } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { useDesignStore } from '@/store/design.store'

export default function EditCallCenterEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

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
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка данных сотрудника
  useEffect(() => {
    const loadOperator = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getOperator(employeeId as string, 'operator')
        if (response.success && response.data) {
          const operator = response.data
          setFormData({
            name: operator.name || '',
            login: operator.login || '',
            password: '',
            sipAddress: operator.sipAddress || '',
            note: operator.note || '',
            status: operator.status || 'active'
          })
          setExistingPassport(operator.passport || null)
          setExistingContract(operator.contract || null)
        } else {
          toast.error('Не удалось загрузить данные оператора')
        }
      } catch (error) {
        console.error('Error loading operator:', error)
        toast.error('Ошибка при загрузке данных')
      } finally {
        setIsLoading(false)
      }
    }

    if (employeeId) {
      loadOperator()
    }
  }, [employeeId])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const updateData: any = {
        name: formData.name,
        login: formData.login,
        sipAddress: formData.sipAddress,
        note: formData.note,
        status: formData.status,
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await apiClient.updateOperator(employeeId as string, updateData)
      
      if (response.success) {
        toast.success('Данные оператора успешно обновлены')
        router.push('/employees/callcenter')
      } else {
        toast.error('Не удалось обновить данные оператора')
      }
    } catch (error) {
      console.error('Error updating operator:', error)
      toast.error('Ошибка при обновлении данных')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !formData.name) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>Загрузка...</span>
        </div>
      </div>
    )
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
            Редактировать оператора
          </h1>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
                  Пароль
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Оставьте пустым, чтобы не менять"
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

              {/* SIP адрес */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  SIP адрес <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.sipAddress}
                  onChange={(e) => setFormData({ ...formData, sipAddress: e.target.value })}
                  placeholder="Например: 100"
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'
                  }`}
                />
              </div>

              {/* Статус */}
              <div>
                <label className={`block text-sm mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Статус <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    isDark 
                      ? 'bg-[#1e2530] border border-gray-600 text-gray-100'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <option value="active">Активен</option>
                  <option value="inactive">Неактивен</option>
                </select>
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
                {existingPassport && !passportFile && (
                  <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Файл загружен
                  </p>
                )}
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
                  {passportFile ? passportFile.name : existingPassport ? 'Заменить' : 'Загрузить'}
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
                {existingContract && !contractFile && (
                  <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Файл загружен
                  </p>
                )}
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
                  {contractFile ? contractFile.name : existingContract ? 'Заменить' : 'Загрузить'}
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
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button 
              type="button"
              onClick={() => router.push('/employees/callcenter')}
              disabled={isLoading}
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
