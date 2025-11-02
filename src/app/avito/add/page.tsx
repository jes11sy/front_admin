'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface FormData {
  accountName: string
  clientId: string
  clientSecret: string
  userId: string
  proxyType: string
  proxyIp: string
  proxyPort: string
  proxyLogin: string
  proxyPassword: string
}

export default function AddAvitoAccountPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
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
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      const response = await apiClient.createAvitoAccount(formData)
      
      if (response.success) {
        toast.success('Аккаунт Avito успешно добавлен')
        router.push('/avito')
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

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-800">Добавить аккаунт Авито</CardTitle>
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
                  disabled={isLoading}
                >
                  {isLoading ? 'Добавление...' : 'Добавить аккаунт'}
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
  )
}

