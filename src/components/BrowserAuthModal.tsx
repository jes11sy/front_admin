'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BrowserAuthModalProps {
  accountId: number
  proxyConfig?: any
  onSuccess: (cookies: string) => void
  onClose: () => void
}

export function BrowserAuthModal({ accountId, proxyConfig, onSuccess, onClose }: BrowserAuthModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [wsUrl, setWsUrl] = useState<string>('')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [checkInterval, setCheckInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startBrowser()
    return () => {
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [])

  const startBrowser = async () => {
    try {
      setIsLoading(true)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
      // Убираем /api/v1 если он уже есть
      const API_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`
      
      const response = await fetch(`${API_URL}/browser/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, proxyConfig }),
      })

      const data = await response.json()
      
      console.log('Browser start response:', data)
      
      if (data.success && data.data.publicWsUrl) {
        setWsUrl(data.data.publicWsUrl)
        
        // Начинаем проверять статус авторизации
        const interval = setInterval(() => checkAuthStatus(), 2000)
        setCheckInterval(interval)
        
        toast.success('Браузер запущен! Войдите в аккаунт Avito')
      } else {
        toast.error(data.error || 'Не удалось запустить браузер')
        onClose()
      }
    } catch (error) {
      console.error('Start browser error:', error)
      toast.error('Ошибка запуска браузера')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const checkAuthStatus = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
      const API_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`
      const response = await fetch(`${API_URL}/browser/${accountId}/status`)
      const data = await response.json()

      if (data.success && data.data.isAuthorized) {
        setIsAuthorized(true)
        if (checkInterval) {
          clearInterval(checkInterval)
        }
      }
    } catch (error) {
      console.error('Check status error:', error)
    }
  }

  const handleComplete = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
      const API_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`
      
      // Получаем cookies
      const response = await fetch(`${API_URL}/browser/${accountId}/cookies`)
      const data = await response.json()

      if (data.success && data.data.cookies) {
        toast.success('✅ Cookies получены!')
        onSuccess(data.data.cookies)
        
        // Закрываем браузер
        await fetch(`${API_URL}/browser/${accountId}`, { method: 'DELETE' })
        
        onClose()
      } else {
        toast.error(data.error || 'Не удалось получить cookies')
      }
    } catch (error) {
      console.error('Get cookies error:', error)
      toast.error('Ошибка получения cookies')
    }
  }

  const handleCancel = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
      const API_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`
      await fetch(`${API_URL}/browser/${accountId}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Close browser error:', error)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Авторизация Avito</h2>
            <p className="text-sm text-gray-600">Войдите в аккаунт и введите SMS код</p>
          </div>
          {isAuthorized && (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold">Авторизован!</span>
            </div>
          )}
        </div>

        {/* Browser iframe */}
        <div className="flex-1 relative bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Запуск браузера...</p>
              </div>
            </div>
          )}
          
          {wsUrl && (
            <div className="w-full h-full p-4">
              <div className="bg-white rounded border-2 border-gray-300 h-full flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="mb-4">
                    <svg className="w-16 h-16 mx-auto text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Браузер запущен на сервере</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Откройте Avito в отдельной вкладке и авторизуйтесь там.<br/>
                    После успешной авторизации нажмите "Завершить".
                  </p>
                  <a 
                    href="https://www.avito.ru/profile/login" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    Открыть Avito →
                  </a>
                  <p className="text-xs text-gray-500 mt-4">
                    WebSocket: {wsUrl}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isAuthorized ? (
              <span className="text-green-600 font-semibold">✓ Готово! Нажмите "Завершить"</span>
            ) : (
              <span>Войдите в аккаунт Avito в открывшейся вкладке</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="bg-white"
            >
              Отмена
            </Button>
            <Button
              type="button"
              onClick={handleComplete}
              disabled={!isAuthorized}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white disabled:opacity-50"
            >
              Завершить
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

