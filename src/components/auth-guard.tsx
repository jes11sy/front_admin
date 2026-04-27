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

      try {
        const profileResponse = await apiClient.getProfile()
        if (profileResponse.success && profileResponse.data) {
          useAuthStore.setState({
            user: {
              id: profileResponse.data.id,
              login: profileResponse.data.login,
              name: profileResponse.data.name || profileResponse.data.login,
              role: profileResponse.data.role || 'admin',
            },
            isAuthenticated: true,
          })
          setReady(true)
          return
        }

        logger.debug('[AuthGuard] Profile not available, attempting token refresh')
        const refreshResult = await apiClient.refreshAuthToken()
        if (refreshResult.success) {
          const retryProfileResponse = await apiClient.getProfile()
          if (retryProfileResponse.success && retryProfileResponse.data) {
            useAuthStore.setState({
              user: {
                id: retryProfileResponse.data.id,
                login: retryProfileResponse.data.login,
                name: retryProfileResponse.data.name || retryProfileResponse.data.login,
                role: retryProfileResponse.data.role || 'admin',
              },
              isAuthenticated: true,
            })
            setReady(true)
            return
          }
        }

        logger.debug('[AuthGuard] Trying IndexedDB session restoration')
        const restored = await apiClient.restoreSessionFromIndexedDB()
        if (restored) {
          const recoveredProfileResponse = await apiClient.getProfile()
          if (recoveredProfileResponse.success && recoveredProfileResponse.data) {
            useAuthStore.setState({
              user: {
                id: recoveredProfileResponse.data.id,
                login: recoveredProfileResponse.data.login,
                name: recoveredProfileResponse.data.name || recoveredProfileResponse.data.login,
                role: recoveredProfileResponse.data.role || 'admin',
              },
              isAuthenticated: true,
            })
            setReady(true)
            return
          }
        }

        router.push('/login')
      } catch (error) {
        logger.debug('[AuthGuard] Auth check failed', { error: String(error) })
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
