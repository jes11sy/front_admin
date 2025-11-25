'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { BrowserAuthModal } from '@/components/BrowserAuthModal'

interface AvitoAccountData {
  id: string
  name: string
  clientId: string | null
  clientSecret: string | null
  userId: string
  avitoLogin?: string
  avitoPassword?: string
  useParser?: boolean
  cookies?: string
  proxyType: string
  proxyHost: string
  proxyPort: number
  proxyLogin: string
  proxyPassword: string
  connectionStatus?: string
  eternalOnlineEnabled?: boolean
  onlineKeepAliveInterval?: number
}

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

export default function EditAvitoAccountPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id

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
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [showBrowserAuth, setShowBrowserAuth] = useState(false)

  // Проверка OAuth результата
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthStatus = urlParams.get('oauth')
    
    if (oauthStatus === 'success') {
      toast.success('✅ Аккаунт успешно авторизован через Avito!')
      // Очищаем параметр из URL
      window.history.replaceState({}, '', window.location.pathname)
    } else if (oauthStatus === 'error') {
      const message = urlParams.get('message') || 'Неизвестная ошибка'
      toast.error(`❌ Ошибка авторизации: ${message}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Загрузка данных аккаунта
  useEffect(() => {
    const loadAccount = async () => {
      setIsLoading(true)
      try {
        const response = await apiClient.getAvitoAccount(accountId as string)
        if (response.success && response.data) {
          const account = response.data as AvitoAccountData
          setFormData({
            name: account.name || '',
            userId: account.userId || '',
            avitoLogin: account.avitoLogin || '',
            avitoPassword: '', // Не показываем пароль
            cookies: '', // Не показываем cookies
            useParser: account.useParser ?? false,
            proxyType: account.proxyType || 'http',
            proxyHost: account.proxyHost || '',
            proxyPort: account.proxyPort || '',
            proxyLogin: account.proxyLogin || '',
            proxyPassword: account.proxyPassword || '',
            eternalOnlineEnabled: account.eternalOnlineEnabled ?? true,
            onlineKeepAliveInterval: account.onlineKeepAliveInterval || 300
          })
          // Проверяем авторизован ли аккаунт (OAuth токены или cookies для парсера)
          const hasOAuthTokens = !!(account.clientId && account.clientSecret)
          const hasParserCookies = !!(account.useParser && account.cookies)
          setIsAuthorized(hasOAuthTokens || hasParserCookies)
        } else {
          toast.error(response.error || 'Не удалось загрузить данные аккаунта')
        }
      } catch (error) {
        console.error('Error loading account:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    if (accountId) {
      loadAccount()
    }
  }, [accountId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // Преобразуем данные для API
      const apiData = {
        ...formData,
        proxyPort: formData.proxyPort ? parseInt(formData.proxyPort.toString()) : undefined
      }
      const response = await apiClient.updateAvitoAccount(accountId as string, apiData)
      
      if (response.success) {
        toast.success('Аккаунт Avito успешно обновлен')
        router.push('/avito')
      } else {
        toast.error(response.error || 'Не удалось обновить аккаунт')
      }
    } catch (error) {
      console.error('Error updating account:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка при обновлении аккаунта'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthAuthorize = () => {
    if (formData.useParser) {
      // Если используем парсер - открываем браузер
      setShowBrowserAuth(true)
    } else {
      // Если OAuth - перенаправляем
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-shem.ru/api/v1'
      const apiUrl = baseUrl.endsWith('/api/v1') ? baseUrl.replace('/api/v1', '') : baseUrl
      const avitoAuthUrl = `${apiUrl}/api/v1/auth/avito/authorize/${accountId}`
      window.location.href = avitoAuthUrl
    }
  }

  const handleBrowserAuthSuccess = async (cookies: string) => {
    try {
      // Обновляем аккаунт с полученными cookies
      await apiClient.updateAvitoAccount(accountId as string, { cookies })
      toast.success('✅ Аккаунт успешно авторизован!')
      setShowBrowserAuth(false)
      // Перезагружаем данные аккаунта
      window.location.reload()
    } catch (error) {
      console.error('Error updating cookies:', error)
      toast.error('Ошибка сохранения cookies')
    }
  }

  return (
    <>
      {showBrowserAuth && (
        <BrowserAuthModal
          accountId={parseInt(accountId as string)}
          proxyConfig={{
            protocol: formData.proxyType,
            host: formData.proxyHost,
            port: parseInt(formData.proxyPort.toString()),
            username: formData.proxyLogin,
            password: formData.proxyPassword,
          }}
          onSuccess={handleBrowserAuthSuccess}
          onClose={() => setShowBrowserAuth(false)}
        />
      )}
      
      <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Редактировать аккаунт Авито</CardTitle>
          </CardHeader>
          <CardContent>
            {/* OAuth статус */}
            <div className={`mb-6 p-4 rounded-lg border ${
              isAuthorized 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {isAuthorized ? '✅ Аккаунт авторизован' : '⚠️ Требуется авторизация'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {isAuthorized 
                      ? (formData.useParser 
                          ? 'Аккаунт авторизован через парсер. Cookies обновляются автоматически.' 
                          : 'Аккаунт подключен через OAuth. Токены обновляются автоматически.')
                      : (formData.useParser
                          ? 'Для работы парсера необходимо авторизоваться в Avito.'
                          : 'Для работы с API Avito необходимо пройти OAuth авторизацию.')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleOAuthAuthorize}
                  className={`${
                    isAuthorized
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-orange-600 hover:bg-orange-700'
                  } text-white`}
                >
                  {isAuthorized ? 'Переавторизовать' : 'Авторизовать через Avito'}
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                    Для переавторизации нажмите кнопку "Авторизовать через Avito" выше.
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
                  {isLoading ? 'Загрузка...' : 'Сохранить изменения'}
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

