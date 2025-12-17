'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Star, Wifi, Shield, Zap, Plus, Clock, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface AvitoAccount {
  id: number
  name: string
  connectionStatus?: 'online' | 'offline'
  proxyStatus?: 'active' | 'inactive'
  cpa?: number
  adsCount?: number
  viewsCount?: number
  contactsCount?: number
  viewsToday?: number
  contactsToday?: number
  lastSyncAt?: string
  createdAt?: string
}

interface AvitoStats {
  accountsCount: number
  adsCount: number
  viewsCount: number
  contactsCount: number
  viewsToday: number
  contactsToday: number
  totalCPA: number
}

export default function AvitoPage() {
  const [stats, setStats] = useState<AvitoStats>({
    accountsCount: 0,
    adsCount: 0,
    viewsCount: 0,
    contactsCount: 0,
    viewsToday: 0,
    contactsToday: 0,
    totalCPA: 0,
  })

  const [accounts, setAccounts] = useState<AvitoAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCheckingConnections, setIsCheckingConnections] = useState(false)
  const [, setCurrentTime] = useState(Date.now())

  // Константа для интервала проверки1 (12 часов в миллисекундах)
  const CHECK_INTERVAL = 12 * 60 * 60 * 1000

  // Функция для проверки всех подключений и прокси
  const checkAllConnectionsAndProxies = useCallback(async () => {
    if (isCheckingConnections) return
    
    setIsCheckingConnections(true)
    try {
      // Запускаем проверки последовательно с обработкой ошибок
      const results = await Promise.allSettled([
        apiClient.checkAllAvitoConnections(),
        apiClient.checkAllAvitoProxies()
      ])
      
      const connectionResult = results[0]
      const proxyResult = results[1]
      
      let successMessage = ''
      let hasErrors = false
      
      if (connectionResult.status === 'fulfilled') {
        successMessage += 'Подключения проверены. '
      } else {
        hasErrors = true
        console.error('Connection check failed:', connectionResult.reason)
      }
      
      if (proxyResult.status === 'fulfilled') {
        successMessage += 'Прокси проверены.'
      } else {
        hasErrors = true
        console.error('Proxy check failed:', proxyResult.reason)
      }
      
      // Обновляем список аккаунтов после проверки
      try {
        const accountsResponse = await apiClient.getAvitoAccounts()
        if (accountsResponse.success && accountsResponse.data) {
          setAccounts(accountsResponse.data)
          
          // Пересчитываем статистику
          const accountsData = accountsResponse.data
          const calculatedStats = {
            accountsCount: accountsData.length,
            adsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.adsCount || 0), 0),
            viewsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsCount || 0), 0),
            contactsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsCount || 0), 0),
            viewsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsToday || 0), 0),
            contactsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsToday || 0), 0),
            totalCPA: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.cpa || 0), 0),
          }
          setStats(calculatedStats)
        }
      } catch (error) {
        console.error('Failed to reload accounts:', error)
      }
      
      // Сохраняем время последней проверки
      localStorage.setItem('lastAvitoCheck', Date.now().toString())
      setCurrentTime(Date.now()) // Обновляем UI
      
      if (hasErrors) {
        toast.warning('Проверка завершена с ошибками')
      } else {
        toast.success(successMessage)
      }
    } catch (error) {
      console.error('Error checking connections:', error)
      toast.error('Ошибка при проверке подключений')
    } finally {
      setIsCheckingConnections(false)
    }
  }, [isCheckingConnections])

  // Проверка необходимости автоматической проверки
  const shouldRunAutoCheck = () => {
    const lastCheck = localStorage.getItem('lastAvitoCheck')
    if (!lastCheck) return true
    
    const timeSinceLastCheck = Date.now() - parseInt(lastCheck)
    return timeSinceLastCheck >= CHECK_INTERVAL
  }

  // Автоматическая проверка каждые 12 часов (отключена, только по кнопке)
  useEffect(() => {
    // Устанавливаем интервал для регулярной проверки
    const intervalId = setInterval(() => {
      if (shouldRunAutoCheck()) {
        checkAllConnectionsAndProxies()
      }
    }, CHECK_INTERVAL)

    return () => clearInterval(intervalId)
  }, [checkAllConnectionsAndProxies, CHECK_INTERVAL])

  // Обновление времени для отображения каждую минуту
  useEffect(() => {
    const timeUpdateInterval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 60000) // Обновляем каждую минуту

    return () => clearInterval(timeUpdateInterval)
  }, [])

  // Проверка OAuth результата
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const oauthStatus = urlParams.get('oauth')
    
    if (oauthStatus === 'error') {
      const message = urlParams.get('message') || 'Неизвестная ошибка'
      toast.error(`❌ Ошибка авторизации: ${message}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Загрузка данных с API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Загружаем аккаунты
        const accountsResponse = await apiClient.getAvitoAccounts()
        if (accountsResponse.success && accountsResponse.data) {
          const accountsData = accountsResponse.data
          setAccounts(accountsData)
          
          // Вычисляем статистику из данных аккаунтов
          const calculatedStats = {
            accountsCount: accountsData.length,
            adsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.adsCount || 0), 0),
            viewsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsCount || 0), 0),
            contactsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsCount || 0), 0),
            viewsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsToday || 0), 0),
            contactsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsToday || 0), 0),
            totalCPA: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.cpa || 0), 0),
          }
          setStats(calculatedStats)
        } else {
          toast.error(accountsResponse.error || 'Не удалось загрузить данные')
        }
      } catch (error) {
        console.error('Error loading Avito data:', error)
        const errorMessage = error instanceof Error ? error.message : 'Ошибка при загрузке данных'
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ru-RU').format(num)
  }

  const getLastCheckTime = () => {
    const lastCheck = localStorage.getItem('lastAvitoCheck')
    if (!lastCheck) return 'Никогда'
    
    const date = new Date(parseInt(lastCheck))
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNextCheckTime = () => {
    const lastCheck = localStorage.getItem('lastAvitoCheck')
    if (!lastCheck) return 'Скоро'
    
    const nextCheck = parseInt(lastCheck) + CHECK_INTERVAL
    const date = new Date(nextCheck)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#114643'}}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        
        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Аккаунты</div>
              <div className="text-3xl font-bold text-gray-800">{stats.accountsCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Объявления</div>
              <div className="text-3xl font-bold text-gray-800">{stats.adsCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Просмотры</div>
              <div className="text-3xl font-bold text-gray-800">
                {formatNumber(stats.viewsCount)}
                {stats.viewsToday > 0 && (
                  <span className="text-lg text-green-600 ml-2">(+{formatNumber(stats.viewsToday)})</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Контакты</div>
              <div className="text-3xl font-bold text-gray-800">
                {formatNumber(stats.contactsCount)}
                {stats.contactsToday > 0 && (
                  <span className="text-lg text-green-600 ml-2">(+{stats.contactsToday})</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6">
              <div className="text-sm text-gray-500 mb-2">Общий CPA</div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalCPA / 100)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Инструменты */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button variant="outline" className="bg-white hover:bg-yellow-50 border-yellow-200">
            <Star className="h-4 w-4 mr-2 text-yellow-600" />
            Отзывы
          </Button>

          <Button variant="outline" className="bg-white hover:bg-green-50 border-green-200">
            <Wifi className="h-4 w-4 mr-2 text-green-600" />
            Вечный онлайн
          </Button>

          <Button 
            variant="outline" 
            className="bg-white hover:bg-blue-50 border-blue-200"
            onClick={checkAllConnectionsAndProxies}
            disabled={isCheckingConnections}
          >
            <Shield className="h-4 w-4 mr-2 text-blue-600" />
            {isCheckingConnections ? 'Проверка...' : 'Проверить подключения и прокси'}
          </Button>

          <Button 
            variant="outline" 
            className="bg-white hover:bg-purple-50 border-purple-200"
            onClick={async () => {
              try {
                toast.info('Синхронизация статистики...')
                const response = await apiClient.syncAllAvitoStats()
                if (response.success) {
                  toast.success('Статистика синхронизирована!')
                  // Перезагружаем аккаунты
                  const accountsResponse = await apiClient.getAvitoAccounts()
                  if (accountsResponse.success && accountsResponse.data) {
                    setAccounts(accountsResponse.data)
                    const accountsData = accountsResponse.data
                    const calculatedStats = {
                      accountsCount: accountsData.length,
                      adsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.adsCount || 0), 0),
                      viewsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsCount || 0), 0),
                      contactsCount: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsCount || 0), 0),
                      viewsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.viewsToday || 0), 0),
                      contactsToday: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.contactsToday || 0), 0),
                      totalCPA: accountsData.reduce((sum: number, acc: AvitoAccount) => sum + (acc.cpa || 0), 0),
                    }
                    setStats(calculatedStats)
                  }
                } else {
                  toast.error('Ошибка синхронизации')
                }
              } catch (error) {
                console.error('Sync error:', error)
                toast.error('Ошибка синхронизации статистики')
              }
            }}
          >
            <Download className="h-4 w-4 mr-2 text-purple-600" />
            Синхронизировать статистику
          </Button>

          <Button variant="outline" disabled className="bg-gray-50">
            <Zap className="h-4 w-4 mr-2" />
            Топ-робот
          </Button>
        </div>

        {/* Таблица аккаунтов */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Последняя проверка: <strong>{getLastCheckTime()}</strong></span>
                </div>
                <div className="text-xs text-gray-500 ml-6">
                  Следующая проверка: {getNextCheckTime()}
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white"
                onClick={() => window.location.href = '/avito/add'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить аккаунт
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Аккаунт</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Подключение</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Прокси</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">CPA</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Объявл.</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Просм.</TableHead>
                  <TableHead className="text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Контакты</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow 
                    key={account.id}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => window.location.href = `/avito/edit/${account.id}`}
                  >
                    <TableCell className="text-gray-500">#{account.id}</TableCell>
                    <TableCell className="font-medium text-gray-900">{account.name}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex h-2 w-2 rounded-full ${
                        account.connectionStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex h-2 w-2 rounded-full ${
                        account.proxyStatus === 'active' ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                    </TableCell>
                    <TableCell className="text-right text-gray-900">{account.cpa ? formatCurrency(account.cpa / 100) : '-'}</TableCell>
                    <TableCell className="text-center text-gray-600">{account.adsCount || 0}</TableCell>
                    <TableCell className="text-center text-gray-600">
                      {account.viewsCount ? formatNumber(account.viewsCount) : 0}
                      {account.viewsToday ? (
                        <span className="text-green-600 ml-1">(+{formatNumber(account.viewsToday)})</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">
                      {account.contactsCount || 0}
                      {account.contactsToday ? (
                        <span className="text-green-600 ml-1">(+{account.contactsToday})</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {isLoading && (
              <div className="text-center py-12 text-gray-500">
                Загрузка...
              </div>
            )}

            {!isLoading && accounts.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                Нет аккаунтов
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
