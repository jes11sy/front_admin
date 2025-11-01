'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EditAvitoAccountPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id

  const [formData, setFormData] = useState({
    accountName: '',
    clientId: '',
    clientSecret: '',
    userId: '',
    proxyType: 'http',
    proxyIp: '',
    proxyPort: '',
    proxyLogin: '',
    proxyPassword: ''
  })

  // Загрузка данных аккаунта
  useEffect(() => {
    // TODO: Загрузить данные с API
    // Мок-данные для примера
    const mockAccounts: { [key: string]: any } = {
      '1': {
        accountName: 'Account_Moscow_1',
        clientId: 'client_12345',
        clientSecret: 'secret_abc123',
        userId: 'user_001',
        proxyType: 'http',
        proxyIp: '192.168.1.100',
        proxyPort: '8080',
        proxyLogin: 'proxy_user',
        proxyPassword: 'proxy_pass'
      },
      '2': {
        accountName: 'Account_SPB_2',
        clientId: 'client_67890',
        clientSecret: 'secret_def456',
        userId: 'user_002',
        proxyType: 'socks5',
        proxyIp: '192.168.1.101',
        proxyPort: '1080',
        proxyLogin: 'proxy_user2',
        proxyPassword: 'proxy_pass2'
      },
      '3': {
        accountName: 'Account_Kazan_3',
        clientId: 'client_11111',
        clientSecret: 'secret_ghi789',
        userId: 'user_003',
        proxyType: 'https',
        proxyIp: '192.168.1.102',
        proxyPort: '443',
        proxyLogin: 'proxy_user3',
        proxyPassword: 'proxy_pass3'
      },
      '4': {
        accountName: 'Account_Moscow_4',
        clientId: 'client_22222',
        clientSecret: 'secret_jkl012',
        userId: 'user_004',
        proxyType: 'http',
        proxyIp: '192.168.1.103',
        proxyPort: '8080',
        proxyLogin: 'proxy_user4',
        proxyPassword: 'proxy_pass4'
      },
    }

    const account = mockAccounts[accountId as string]
    if (account) {
      setFormData({
        accountName: account.accountName,
        clientId: account.clientId,
        clientSecret: account.clientSecret,
        userId: account.userId,
        proxyType: account.proxyType,
        proxyIp: account.proxyIp,
        proxyPort: account.proxyPort,
        proxyLogin: account.proxyLogin,
        proxyPassword: account.proxyPassword
      })
    }
  }, [accountId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Отправить данные на API
    console.log('Updated form data:', formData)
    
    // Вернуться к списку
    router.push('/avito')
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Редактировать аккаунт Авито</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Имя аккаунта */}
              <div>
                <Label htmlFor="accountName" className="text-gray-700">Имя аккаунта *</Label>
                <Input
                  id="accountName"
                  type="text"
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  placeholder="Например: Avito_Moscow_Main"
                  className="mt-1"
                />
              </div>

              {/* Client ID */}
              <div>
                <Label htmlFor="clientId" className="text-gray-700">Client ID *</Label>
                <Input
                  id="clientId"
                  type="text"
                  required
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  placeholder="Введите Client ID"
                  className="mt-1"
                />
              </div>

              {/* Client Secret */}
              <div>
                <Label htmlFor="clientSecret" className="text-gray-700">Client Secret *</Label>
                <Input
                  id="clientSecret"
                  type="text"
                  required
                  value={formData.clientSecret}
                  onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                  placeholder="Введите Client Secret"
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
              </div>

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
                <Label htmlFor="proxyIp" className="text-gray-700">IP прокси *</Label>
                <Input
                  id="proxyIp"
                  type="text"
                  required
                  value={formData.proxyIp}
                  onChange={(e) => setFormData({ ...formData, proxyIp: e.target.value })}
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
                  onClick={() => router.push('/avito')}
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

