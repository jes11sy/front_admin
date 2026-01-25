'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'

interface BrowserAuthModalProps {
  accountId: number
  proxyConfig?: any
  onSuccess: (cookies: string) => void
  onClose: () => void
}

export function BrowserAuthModal({ accountId, proxyConfig, onSuccess, onClose }: BrowserAuthModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [wsUrl, setWsUrl] = useState<string>('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Очистка интервала при размонтировании
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
        checkIntervalRef.current = null
      }
    }
  }, [])

  // Запуск браузера при монтировании
  useEffect(() => {
    startBrowser()
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
      
      logger.info('Browser start response', { success: data.success })
      
      if (data.success && data.data.publicWsUrl) {
        setWsUrl(data.data.publicWsUrl)
        
        // Начинаем проверять статус авторизации
        checkIntervalRef.current = setInterval(() => checkAuthStatus(), 2000)
        
        toast.success('Браузер запущен! Войдите в аккаунт Avito')
      } else {
        toast.error(data.error || 'Не удалось запустить браузер')
        onClose()
      }
    } catch (error) {
      logger.error('Start browser error', { error: String(error) })
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
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current)
          checkIntervalRef.current = null
        }
      }
    } catch (error) {
      logger.error('Check status error', { error: String(error) })
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
      logger.error('Get cookies error', { error: String(error) })
      toast.error('Ошибка получения cookies')
    }
  }

  const handleCancel = async () => {
    // Очищаем интервал перед закрытием
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current)
      checkIntervalRef.current = null
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.lead-schem.ru/api/v1'
      const API_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`
      await fetch(`${API_URL}/browser/${accountId}`, { method: 'DELETE' })
    } catch (error) {
      logger.error('Close browser error', { error: String(error) })
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
            <iframe
              ref={iframeRef}
              src={wsUrl}
              className="w-full h-full border-0"
              title="Remote Browser (VNC)"
              allow="fullscreen"
            />
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

