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
  const { isAuthenticated, user, setUser } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      // Если на странице логина/логаута - пропускаем проверку
      if (isLoginPage) {
        setIsChecking(false)
        return
      }

      try {
        // Проверяем наличие токенов
        const hasToken = typeof window !== 'undefined' && 
          (localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'))
        
        if (!hasToken) {
          // Нет токена - редирект на логин
          router.push('/login')
          return
        }

        // Проверяем валидность токена через запрос профиля
        const profileResponse = await apiClient.getProfile()
        
        if (profileResponse.success && profileResponse.data) {
          // Обновляем пользователя в store
          setUser({
            id: profileResponse.data.id,
            login: profileResponse.data.login,
            name: profileResponse.data.name,
            role: profileResponse.data.role || 'admin',
          })
          setIsChecking(false)
        } else {
          // Профиль не получен - редирект на логин
          router.push('/login')
        }
      } catch (error) {
        // Ошибка при проверке - редирект на логин
        apiClient.clearToken()
        router.push('/login')
      }
    }

    checkAuth()
  }, [pathname, router, isLoginPage, setUser])

  // Показываем loading во время проверки авторизации
  if (isChecking && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#114643'}}>
        <div className="text-white text-xl">Загрузка...</div>
      </div>
    )
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

