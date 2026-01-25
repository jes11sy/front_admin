'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Navigation } from '@/components/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { logger } from '@/lib/logger'

// Таймаут для проверки авторизации (в мс)
const AUTH_CHECK_TIMEOUT = 10000

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login' || pathname === '/logout'
  const { setUser, clearAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(!isLoginPage)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const authCheckStarted = useRef(false)

  useEffect(() => {
    // Предотвращаем повторный запуск проверки
    if (authCheckStarted.current && !isLoginPage) {
      return
    }

    const checkAuth = async () => {
      // Если на странице логина/логаута - пропускаем проверку
      if (isLoginPage) {
        setIsChecking(false)
        setIsAuthChecked(true)
        return
      }

      authCheckStarted.current = true

      // Таймаут безопасности - если проверка зависла, редиректим на логин
      const timeoutId = setTimeout(() => {
        logger.warn('[Auth] Auth check timeout - redirecting to login')
        if (typeof window !== 'undefined') {
          localStorage.setItem('auto_login_debug', 'Таймаут проверки авторизации')
        }
        setIsChecking(false)
        setIsAuthChecked(false)
        apiClient.clearToken()
        clearAuth()
        router.replace('/login')
      }, AUTH_CHECK_TIMEOUT)

      try {
        // Проверяем валидность токена через запрос профиля
        const profileResponse = await apiClient.getProfile()
        
        if (profileResponse.success && profileResponse.data) {
          clearTimeout(timeoutId)
          setUser({
            id: profileResponse.data.id,
            login: profileResponse.data.login,
            name: profileResponse.data.name || profileResponse.data.login,
            role: profileResponse.data.role || 'admin',
          })
          setIsAuthChecked(true)
          setIsChecking(false)
          
          if (typeof window !== 'undefined') {
            localStorage.setItem('auto_login_debug', 'Профиль получен через cookies')
          }
        } else {
          // Профиль не получен - пробуем автовход
          await tryAutoLogin(timeoutId)
        }
      } catch (error) {
        // Ошибка - пробуем автовход
        logger.error('[Auth] Profile check failed', { error: String(error) })
        await tryAutoLogin(timeoutId)
      }
    }

    const tryAutoLogin = async (timeoutId: NodeJS.Timeout) => {
      logger.info('[Auth] Starting auto-login attempt...')
      
      try {
        const { getSavedCredentials } = await import('@/lib/remember-me')
        const credentials = await getSavedCredentials()

        if (credentials) {
          logger.info('[Auth] Found saved credentials', { login: credentials.login })
          
          try {
            const loginResponse = await apiClient.login(
              credentials.login,
              credentials.password,
              true
            )

            if (loginResponse.success && loginResponse.data?.user) {
              clearTimeout(timeoutId)
              setUser(loginResponse.data.user)
              setIsAuthChecked(true)
              setIsChecking(false)
              logger.info('[Auth] Auto-login successful')
              if (typeof window !== 'undefined') {
                localStorage.setItem('auto_login_debug', 'Автовход успешен!')
              }
              return
            }
          } catch (loginError) {
            logger.error('[Auth] Login request failed', { error: String(loginError) })
          }
          
          // Логин не удался - очищаем сохранённые данные
          logger.warn('[Auth] Auto-login failed, clearing credentials')
          try {
            const { clearSavedCredentials } = await import('@/lib/remember-me')
            await clearSavedCredentials()
          } catch (e) {
            // Игнорируем ошибку очистки
          }
        } else {
          logger.info('[Auth] No saved credentials found')
        }

        // Нет учётных данных или логин не удался - редирект на логин
        clearTimeout(timeoutId)
        redirectToLogin()
        
      } catch (error) {
        logger.error('[Auth] Auto-login error', { error: String(error) })
        clearTimeout(timeoutId)
        redirectToLogin()
      }
    }

    const redirectToLogin = () => {
      logger.info('[Auth] Redirecting to login page')
      if (typeof window !== 'undefined') {
        localStorage.setItem('auto_login_debug', 'Редирект на страницу входа')
      }
      // ВАЖНО: Сбрасываем состояние ПЕРЕД редиректом
      setIsChecking(false)
      setIsAuthChecked(false)
      apiClient.clearToken()
      clearAuth()
      router.replace('/login')
    }

    checkAuth()
  }, [pathname, router, isLoginPage, setUser, clearAuth])

  // Показываем loading во время проверки авторизации (для защищенных страниц)
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
  }

  // Не показываем контент до завершения проверки авторизации
  if (!isLoginPage && !isAuthChecked) {
    return null
  }

  return (
    <ErrorBoundary>
      {!isLoginPage && <Navigation />}
      <main className={isLoginPage ? '' : 'lg:ml-64 pt-16 lg:pt-0'}>
        {children}
      </main>
    </ErrorBoundary>
  )
}

