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

/**
 * AuthGuard - компонент защиты маршрутов
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const initRef = useRef(false)
  const [isChecking, setIsChecking] = useState(true)
  
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  // Устанавливаем колбэк для обработки ошибок авторизации
  useEffect(() => {
    apiClient.setAuthErrorCallback(() => {
      logger.debug('Auth error callback triggered')
      useAuthStore.setState({ user: null, isAuthenticated: false })
      router.push('/login')
    })
    
    return () => {
      apiClient.setAuthErrorCallback(() => {})
    }
  }, [router])

  // Проверка авторизации при монтировании
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    
    const checkAuth = async () => {
      // Даём время для hydration persist store
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const store = useAuthStore.getState()
      
      // Если пользователь уже есть в store — всё ок
      if (store.user) {
        logger.debug('User found in store')
        setIsChecking(false)
        return
      }
      
      // Нет пользователя — проверяем сессию
      try {
        const isValid = await apiClient.isAuthenticated()
        
        if (!isValid) {
          logger.debug('Session invalid, redirecting to login')
          router.push('/login')
          return
        }
        
        // Сессия валидна — получаем профиль
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000)
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/auth/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Use-Cookies': 'true',
          },
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
            setIsChecking(false)
            return
          }
        }
        
        // Не удалось получить профиль
        router.push('/login')
        
      } catch (error) {
        logger.error('Auth check error:', { error: String(error) })
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  // Показываем loading пока проверяем и нет пользователя
  if (isChecking && !user) {
    return <LoadingScreen />
  }

  // Есть пользователь — показываем контент
  if (user) {
    return <>{children}</>
  }

  // Нет пользователя — ничего (идёт редирект)
  return null
}
