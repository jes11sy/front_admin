'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { apiClient } from '@/lib/api'

export default function LogoutPage() {
  const router = useRouter()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const logoutStartedRef = useRef(false)

  useEffect(() => {
    if (logoutStartedRef.current) return
    logoutStartedRef.current = true
    
    const performLogout = async () => {
      // Выполняем выход и ждём очистки cookies на сервере
      await apiClient.logout()
      clearAuth()
      
      // Перенаправляем на страницу логина
      router.push('/login')
    }
    
    performLogout()
  }, [router, clearAuth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900">
      <div className="text-white text-xl">
        Выход из системы...
      </div>
    </div>
  )
}
