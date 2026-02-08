'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import { CustomNavigation } from '@/components/custom-navigation'
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
  
  // Тема
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Загружаем тему из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])
  
  // Синхронизируем тему с документом
  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.classList.add('dark')
      html.style.backgroundColor = '#1e2530'
      html.style.colorScheme = 'dark'
    } else {
      html.classList.remove('dark')
      html.style.backgroundColor = ''
      html.style.colorScheme = ''
    }
  }, [theme])
  
  // Слушаем изменения темы из localStorage (для синхронизации между компонентами)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin-theme' && e.newValue) {
        setTheme(e.newValue as 'light' | 'dark')
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Скроллим в начало при смене страницы
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

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
      // ВАЖНО: Сбрасываем состояние ПЕРЕД редиректом
      setIsChecking(false)
      setIsAuthChecked(false)
      apiClient.clearToken()
      clearAuth()
      router.replace('/login')
    }

    checkAuth()
  }, [pathname, router, isLoginPage, setUser, clearAuth])

  const isDark = theme === 'dark'

  // Показываем loading во время проверки авторизации (для защищенных страниц)
  if (isChecking) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDark ? 'bg-[#1e2530]' : 'bg-[#daece2]'
      }`}>
        <div className="text-center">
          <svg className={`animate-spin h-12 w-12 mx-auto mb-4 ${
            isDark ? 'text-white' : 'text-[#0d5c4b]'
          }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className={`text-lg ${isDark ? 'text-white' : 'text-[#0d5c4b]'}`}>
            Загрузка...
          </p>
        </div>
      </div>
    )
  }

  // Не показываем контент до завершения проверки авторизации
  if (!isLoginPage && !isAuthChecked) {
    return null
  }

  return (
    <ErrorBoundary>
      {!isLoginPage && <CustomNavigation />}
      <main className={`${isLoginPage ? '' : 'pt-16 md:pt-0 md:ml-56'} min-h-screen transition-colors duration-300 ${
        isDark ? 'bg-[#1e2530]' : 'bg-white'
      }`}>
        {children}
      </main>
    </ErrorBoundary>
  )
}
