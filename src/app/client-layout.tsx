'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'
import { toast } from '@/components/ui/toast'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoginPage = pathname === '/login' || pathname === '/logout'
  const { isAuthenticated, user, setUser, clearAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(!isLoginPage) // Сразу начинаем с true для защищенных страниц
  const [isAuthChecked, setIsAuthChecked] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Если на странице логина/логаута - пропускаем проверку
      if (isLoginPage) {
        setIsChecking(false)
        setIsAuthChecked(true)
        return
      }

      try {
        // ✅ Проверяем валидность токена через запрос профиля
        // Токен автоматически отправляется в httpOnly cookie
        const profileResponse = await apiClient.getProfile()
        
        if (profileResponse.success && profileResponse.data) {
          // Обновляем пользователя в store
          setUser({
            id: profileResponse.data.id,
            login: profileResponse.data.login,
            name: profileResponse.data.name || profileResponse.data.login, // Для админа name может отсутствовать
            role: profileResponse.data.role || 'admin',
          })
          setIsAuthChecked(true)
          setIsChecking(false)
        } else {
          // Профиль не получен - пробуем автоматическую авторизацию через IndexedDB
          await tryAutoLogin()
        }
      } catch (error) {
        // Ошибка при проверке - пробуем автоматическую авторизацию через IndexedDB
        await tryAutoLogin()
      }
    }

    const tryAutoLogin = async () => {
      console.log('[Auth] Starting auto-login attempt...')
      try {
        // Проверяем, есть ли сохраненные учетные данные
        const { getSavedCredentials } = await import('@/lib/remember-me')
        console.log('[Auth] Checking for saved credentials...')
        const credentials = await getSavedCredentials()

        if (credentials) {
          console.log('[Auth] Found saved credentials for user:', credentials.login)
          // DEBUG: показываем что нашли данные
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auto_login_debug', 'Найдены данные для: ' + credentials.login)
          }
          
          // Пытаемся авторизоваться с сохраненными данными
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true // rememberMe = true
          )

          console.log('[Auth] Login response:', loginResponse.success)

          if (loginResponse.success && loginResponse.data?.user) {
            // Успешная авторизация
            setUser(loginResponse.data.user)
            setIsAuthChecked(true)
            setIsChecking(false)
            console.log('[Auth] Auto-login successful')
            // DEBUG: показываем успех
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('auto_login_debug', 'Автовход успешен!')
            }
            toast.success('Автоматический вход выполнен')
            return
          } else {
            console.warn('[Auth] Login response was not successful')
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('auto_login_debug', 'Ошибка: неверный ответ сервера')
            }
          }
        } else {
          console.log('[Auth] No saved credentials found')
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auto_login_debug', 'Сохраненные данные не найдены')
          }
        }

        // Если не удалось авторизоваться автоматически - редирект на логин
        console.log('[Auth] Redirecting to login page')
        apiClient.clearToken()
        clearAuth()
        router.replace('/login')
      } catch (error) {
        console.error('[Auth] Auto-login failed:', error)
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auto_login_debug', 'Ошибка: ' + String(error))
        }
        // Очищаем невалидные данные и редирект на логин
        try {
          const { clearSavedCredentials } = await import('@/lib/remember-me')
          await clearSavedCredentials()
        } catch (e) {
          console.error('[Auth] Failed to clear credentials:', e)
        }
        apiClient.clearToken()
        clearAuth()
        router.replace('/login')
      }
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
    <>
      {!isLoginPage && <Navigation />}
      <main className={isLoginPage ? '' : 'lg:ml-64 pt-16 lg:pt-0'}>
        {children}
      </main>
    </>
  )
}

