'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { BrowserAuthModal } from '@/components/BrowserAuthModal'

interface FormData {
  name: string
  userId: string
  avitoLogin: string
  avitoPassword: string
  cookies: string
  useParser: boolean
  proxyType: string
  proxyHost: string
  proxyPort: number | string
  proxyLogin: string
  proxyPassword: string
  eternalOnlineEnabled: boolean
  onlineKeepAliveInterval: number
}

export default function AddAvitoAccountPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: '',
    userId: '',
    avitoLogin: '',
    avitoPassword: '',
    cookies: '',
    useParser: false,
    proxyType: 'http',
    proxyHost: '',
    proxyPort: '',
    proxyLogin: '',
    proxyPassword: '',
    eternalOnlineEnabled: true,
    onlineKeepAliveInterval: 300
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showBrowserAuth, setShowBrowserAuth] = useState(false)
  const [tempAccountId, setTempAccountId] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Преобразуем данные для API
      const apiData = {
        ...formData,
        proxyPort: formData.proxyPort ? parseInt(formData.proxyPort.toString()) : undefined
      }
      const response = await apiClient.createAvitoAccount(apiData)
      
      if (response.success && response.data?.id) {
        if (formData.useParser) {
          // Если используем парсер - открываем браузер для авторизации
          toast.success('Аккаунт создан! Открываем браузер для авторизации...')
          setTempAccountId(response.data.id)
          setShowBrowserAuth(true)
        } else {
          // Если OAuth - перенаправляем на авторизацию Avito
          toast.success('Аккаунт создан! Перенаправляем на авторизацию Avito...')
          setTimeout(() => {
            // ✅ FIX #173: Исправлена опечатка lead-shem -> lead-schem
            const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
            const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl.replace('/api/v1', '') : baseUrl
            const avitoAuthUrl = `${apiUrl}/api/v1/auth/avito/authorize/${response.data.id}`
            window.location.href = avitoAuthUrl
          }, 1500)
        }
      } else {
        toast.error(response.error || 'Не удалось добавить аккаунт')
      }
    } catch (error) {
      console.error('Error creating Avito account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при добавлении аккаунта'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBrowserAuthSuccess = async (cookies: string) => {
    if (!tempAccountId) return
    
    try {
      // Обновляем аккаунт с полученными cookies
      await apiClient.updateAvitoAccount(tempAccountId.toString(), { cookies })
      toast.success('✅ Аккаунт успешно авторизован!')
      router.push('/avito')
    } catch (error) {
      console.error('Error updating cookies:', error)
      toast.error('Ошибка сохранения cookies')
    }
  }

  return (
    <>
      {showBrowserAuth && tempAccountId && (
        <BrowserAuthModal
          accountId={tempAccountId}
          proxyConfig={{
            protocol: formData.proxyType,
            host: formData.proxyHost,
            port: parseInt(formData.proxyPort.toString()),
            username: formData.proxyLogin,
            password: formData.proxyPassword,
          }}
          onSuccess={handleBrowserAuthSuccess}
          onClose={() => {
            setShowBrowserAuth(false)
            setTempAccountId(null)
          }}
        />
      )}
      
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Добавить аккаунт Авито</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Информация об OAuth */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>OAuth авторизация:</strong> После создания аккаунта вы будете перенаправлены на страницу Avito для авторизации. 
                  Это безопасный способ подключения без необходимости вводить API ключи вручную.
                </p>
              </div>

              {/* Имя аккаунта */}
              <div>
                <Label htmlFor="name" className="text-gray-700">Имя аккаунта *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Например: Avito_Moscow_Main"
                  className="mt-1"
                />
              </div>

              {/* User ID */}
              <div>
                <Label htmlFor="userId" className="text-gray-700">User ID *</Label>
                <Input
                  id="userId"
                  type="text"
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  placeholder="Введите User ID"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">ID пользователя в вашей системе</p>
              </div>

              {/* Использовать парсер */}
              <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <input
                  id="useParser"
                  type="checkbox"
                  checked={formData.useParser}
                  onChange={(e) => setFormData({ ...formData, useParser: e.target.checked })}
                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <Label htmlFor="useParser" className="text-gray-700 cursor-pointer">
                  Использовать парсер (бесплатно, без API Avito)
                </Label>
              </div>

              {/* Поля для парсера */}
              {formData.useParser && (
                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 mb-4">
                    <strong>Парсер:</strong> Работает через браузерную автоматизацию. Капчу решают операторы бесплатно!<br/>
                    После создания аккаунта откроется окно для авторизации в Avito.
                  </p>
                  
                  <div>
                    <Label htmlFor="avitoLogin" className="text-gray-700">Логин Avito (телефон/email)</Label>
                    <Input
                      id="avitoLogin"
                      type="text"
                      value={formData.avitoLogin}
                      onChange={(e) => setFormData({ ...formData, avitoLogin: e.target.value })}
                      placeholder="79001234567 или email@example.com (опционально)"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Необязательно - используется только для справки
                    </p>
                  </div>
                </div>
              )}

              {/* Тип прокси */}
              <div>
                <Label htmlFor="proxyType" className="text-gray-700">Тип прокси *</Label>
                <select
                  id="proxyType"
                  value={formData.proxyType}
                  onChange={(e) => setFormData({ ...formData, proxyType: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                  <option value="socks4">SOCKS4</option>
                  <option value="socks5">SOCKS5</option>
                </select>
              </div>

              {/* IP прокси */}
              <div>
                <Label htmlFor="proxyHost" className="text-gray-700">IP прокси *</Label>
                <Input
                  id="proxyHost"
                  type="text"
                  required
                  value={formData.proxyHost}
                  onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                  placeholder="Например: 192.168.1.1"
                  className="mt-1"
                />
              </div>

              {/* Порт прокси */}
              <div>
                <Label htmlFor="proxyPort" className="text-gray-700">Порт прокси *</Label>
                <Input
                  id="proxyPort"
                  type="text"
                  required
                  value={formData.proxyPort}
                  onChange={(e) => setFormData({ ...formData, proxyPort: e.target.value })}
                  placeholder="Например: 8080"
                  className="mt-1"
                />
              </div>

              {/* Логин прокси */}
              <div>
                <Label htmlFor="proxyLogin" className="text-gray-700">Логин прокси *</Label>
                <Input
                  id="proxyLogin"
                  type="text"
                  required
                  value={formData.proxyLogin}
                  onChange={(e) => setFormData({ ...formData, proxyLogin: e.target.value })}
                  placeholder="Введите логин прокси"
                  className="mt-1"
                />
              </div>

              {/* Пароль прокси */}
              <div>
                <Label htmlFor="proxyPassword" className="text-gray-700">Пароль прокси *</Label>
                <Input
                  id="proxyPassword"
                  type="password"
                  required
                  value={formData.proxyPassword}
                  onChange={(e) => setFormData({ ...formData, proxyPassword: e.target.value })}
                  placeholder="Введите пароль прокси"
                  className="mt-1"
                />
              </div>

              {/* Вечный онлайн */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Настройки "Вечного онлайна"</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      id="eternalOnlineEnabled"
                      type="checkbox"
                      checked={formData.eternalOnlineEnabled}
                      onChange={(e) => setFormData({ ...formData, eternalOnlineEnabled: e.target.checked })}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <Label htmlFor="eternalOnlineEnabled" className="text-gray-700 cursor-pointer">
                      Включить автоматический онлайн-статус
                    </Label>
                  </div>

                  {formData.eternalOnlineEnabled && (
                    <div>
                      <Label htmlFor="onlineKeepAliveInterval" className="text-gray-700">
                        Интервал обновления (секунды)
                      </Label>
                      <Input
                        id="onlineKeepAliveInterval"
                        type="number"
                        min="60"
                        max="3600"
                        value={formData.onlineKeepAliveInterval}
                        onChange={(e) => setFormData({ ...formData, onlineKeepAliveInterval: parseInt(e.target.value) || 300 })}
                        placeholder="300"
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Рекомендуется: 300 секунд (5 минут). Минимум: 60, Максимум: 3600
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-4">
                <Button 
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? 'Создание аккаунта...' : 'Создать и авторизовать через Avito'}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/avito')}
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
    </>
  )
}

