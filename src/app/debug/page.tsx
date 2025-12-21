'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [lastAttempt, setLastAttempt] = useState<string>('')
  const [lastSuccess, setLastSuccess] = useState<string>('')
  const [authCheckStart, setAuthCheckStart] = useState<string>('')
  const [authCheckResult, setAuthCheckResult] = useState<string>('')
  const [indexedDBSupport, setIndexedDBSupport] = useState<string>('')
  const [hasSavedData, setHasSavedData] = useState<string>('')

  useEffect(() => {
    // Получаем отладочную информацию из localStorage (более устойчив на iOS)
    const info = localStorage.getItem('auto_login_debug') || 'Нет данных'
    setDebugInfo(info)
    
    const attempt = localStorage.getItem('auto_login_last_attempt')
    setLastAttempt(attempt ? new Date(attempt).toLocaleString('ru-RU') : 'Никогда')
    
    const success = localStorage.getItem('auto_login_last_success')
    setLastSuccess(success ? new Date(success).toLocaleString('ru-RU') : 'Никогда')
    
    const checkStart = localStorage.getItem('auth_check_start')
    setAuthCheckStart(checkStart ? new Date(checkStart).toLocaleString('ru-RU') : 'Никогда')
    
    const checkResult = localStorage.getItem('auth_check_result')
    setAuthCheckResult(checkResult || 'Нет данных')

    // Проверяем поддержку IndexedDB
    if (typeof window !== 'undefined') {
      setIndexedDBSupport(window.indexedDB ? '✅ Поддерживается' : '❌ Не поддерживается')
    }

    // Проверяем наличие сохраненных данных
    checkSavedData()
  }, [])

  const checkSavedData = async () => {
    try {
      const { hasSavedCredentials } = await import('@/lib/remember-me')
      const has = await hasSavedCredentials()
      setHasSavedData(has ? '✅ Есть сохраненные данные' : '❌ Нет сохраненных данных')
    } catch (error) {
      setHasSavedData('❌ Ошибка проверки: ' + String(error))
    }
  }

  const clearDebugInfo = () => {
    localStorage.removeItem('auto_login_debug')
    localStorage.removeItem('auto_login_last_attempt')
    localStorage.removeItem('auto_login_last_success')
    localStorage.removeItem('auth_check_start')
    localStorage.removeItem('auth_check_result')
    setDebugInfo('Очищено')
    setLastAttempt('Очищено')
    setLastSuccess('Очищено')
    setAuthCheckStart('Очищено')
    setAuthCheckResult('Очищено')
  }

  const clearSavedData = async () => {
    try {
      const { clearSavedCredentials } = await import('@/lib/remember-me')
      await clearSavedCredentials()
      alert('Сохраненные данные очищены')
      checkSavedData()
    } catch (error) {
      alert('Ошибка: ' + String(error))
    }
  }

  return (
    <div className="min-h-screen p-4" style={{backgroundColor: '#114643'}}>
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>🔍 Отладочная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold mb-2">Статус автовхода:</h3>
              <p className="bg-gray-100 p-3 rounded mb-2 text-sm">{debugInfo}</p>
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">🔍 Проверка авторизации: {authCheckStart}</p>
                <p className="text-gray-600">📊 Результат проверки: {authCheckResult}</p>
                <p className="text-gray-600">🔄 Попытка автовхода: {lastAttempt}</p>
                <p className="text-gray-600">✅ Успешный автовход: {lastSuccess}</p>
              </div>
              <Button onClick={clearDebugInfo} className="mt-2" variant="outline">
                Очистить
              </Button>
            </div>

            <div>
              <h3 className="font-bold mb-2">Поддержка IndexedDB:</h3>
              <p className="bg-gray-100 p-3 rounded">{indexedDBSupport}</p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Сохраненные данные:</h3>
              <p className="bg-gray-100 p-3 rounded">{hasSavedData}</p>
              <Button onClick={checkSavedData} className="mt-2 mr-2" variant="outline">
                Обновить
              </Button>
              <Button onClick={clearSavedData} className="mt-2" variant="destructive">
                Удалить сохраненные данные
              </Button>
            </div>

            <div>
              <h3 className="font-bold mb-2">Информация о браузере:</h3>
              <p className="bg-gray-100 p-3 rounded text-xs break-all">
                {typeof window !== 'undefined' ? navigator.userAgent : 'N/A'}
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-2">Standalone режим (PWA):</h3>
              <p className="bg-gray-100 p-3 rounded">
                {typeof window !== 'undefined' && 'standalone' in navigator
                  ? (navigator as any).standalone
                    ? '✅ Да (iOS PWA)'
                    : '❌ Нет'
                  : window.matchMedia('(display-mode: standalone)').matches
                  ? '✅ Да (Android PWA)'
                  : '❌ Нет'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={() => window.location.href = '/'} className="w-full">
          Вернуться на главную
        </Button>
      </div>
    </div>
  )
}

