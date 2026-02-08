'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { useAuthStore } from '@/store/auth.store'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const initRef = useRef(false)
  const [ready, setReady] = useState(false)
  
  const user = useAuthStore((state) => state.user)

  // Колбэк для ошибок авторизации
  useEffect(() => {
    apiClient.setAuthErrorCallback(() => {
      useAuthStore.setState({ user: null, isAuthenticated: false })
      router.push('/login')
    })
    return () => apiClient.setAuthErrorCallback(() => {})
  }, [router])

  // Проверка при монтировании
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    
    const check = async () => {
      // Если user уже есть — готово
      const store = useAuthStore.getState()
      if (store.user) {
        setReady(true)
        return
      }
      
      // Нет user — быстрая проверка сессии (2 сек таймаут)
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/auth/profile`, {
          method: 'GET',
          headers: { 'X-Use-Cookies': 'true' },
          credentials: 'include',
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            useAuthStore.setState({
              user: {
                id: data.data.id,
                login: data.data.login,
                name: data.data.name || data.data.login,
                role: data.data.role || 'admin',
              },
              isAuthenticated: true,
            })
            setReady(true)
            return
          }
        }
        
        // 401 или ошибка — на логин
        router.push('/login')
      } catch {
        // Таймаут или ошибка сети — на логин
        router.push('/login')
      }
    }
    
    check()
  }, [router])

  // Есть user — показываем контент
  if (user) {
    return <>{children}</>
  }
  
  // Готово но нет user — ничего (идёт редирект)
  if (ready) {
    return null
  }

  // Проверяем — показываем loading
  return <LoadingScreen />
}
