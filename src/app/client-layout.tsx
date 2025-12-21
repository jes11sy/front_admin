'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Navigation } from '@/components/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'

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
      try {
        // Проверяем, есть ли сохраненные учетные данные
        const { getSavedCredentials } = await import('@/lib/remember-me')
        const credentials = await getSavedCredentials()

        if (credentials) {
          console.log('[Auth] Found saved credentials, attempting auto-login...')
          
          // Пытаемся авторизоваться с сохраненными данными
          const loginResponse = await apiClient.login(
            credentials.login,
            credentials.password,
            true // rememberMe = true
          )

          if (loginResponse.success && loginResponse.data?.user) {
            // Успешная авторизация
            setUser(loginResponse.data.user)
            setIsAuthChecked(true)
            setIsChecking(false)
            console.log('[Auth] Auto-login successful')
            return
          }
        }

        // Если не удалось авторизоваться автоматически - редирект на логин
        apiClient.clearToken()
        clearAuth()
        router.replace('/login')
      } catch (error) {
        console.error('[Auth] Auto-login failed:', error)
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

