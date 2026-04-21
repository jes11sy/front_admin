'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useDesignStore } from '@/store/design.store'
import React, { useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react'

// Функция для синхронного получения темы из DOM/localStorage
function getThemeFromDOM(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light' // SSR
  
  // Проверяем класс dark на html (установлен синхронным скриптом в layout.tsx)
  if (document.documentElement.classList.contains('dark')) {
    return 'dark'
  }
  
  // Fallback на localStorage
  try {
    const stored = localStorage.getItem('admin-design-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.theme || 'light'
    }
  } catch {}
  return 'light'
}

interface ClientLayoutProps {
  children: React.ReactNode
}

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  
  const storeTheme = useDesignStore((state) => state.theme)
  const hasHydrated = useDesignStore((state) => state._hasHydrated)
  
  // ✅ FIX: Используем useEffect для получения темы на клиенте после монтирования
  const [clientTheme, setClientTheme] = useState<'light' | 'dark'>('light')
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setClientTheme(getThemeFromDOM())
    setIsMounted(true)
  }, [])
  
  // После гидратации store - используем store
  // До монтирования - используем light (SSR)
  // После монтирования но до гидратации - используем значение из DOM
  const theme = hasHydrated ? storeTheme : (isMounted ? clientTheme : 'light')
  const isDark = theme === 'dark'
  
  const isPublicPage = useMemo(() => {
    return pathname === '/login' || pathname === '/logout'
  }, [pathname])

  // Синхронизируем класс dark на html элементе при изменении темы
  useEffect(() => {
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
      html.style.backgroundColor = '#111113'
      html.style.colorScheme = 'dark'
    } else {
      html.classList.remove('dark')
      html.style.backgroundColor = '#f5f5f7'
      html.style.colorScheme = ''
    }
  }, [isDark])

  // Скроллим в начало при смене страницы
  useLayoutEffect(() => {
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'
    
    const isBackForward = navigationType === 'back_forward'
    const isOrdersPage = pathname === '/orders' || pathname.startsWith('/orders?')
    
    if (!isBackForward || !isOrdersPage) {
      window.scrollTo(0, 0)
    }
    
    prevPathname.current = pathname
  }, [pathname])

  // Публичные страницы (login, logout) - без AuthGuard и навигации
  if (isPublicPage) {
    return (
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    )
  }

  // Временный bypass авторизации для всех непубличных страниц
  // (доступ ко всем страницам без логина)
  return (
    <ErrorBoundary>
      <CustomNavigation />
      <main className="main-content pt-16 pb-28 md:pb-0 md:pt-0 min-h-screen bg-[#f5f5f7] dark:bg-[#111113]">{children}</main>
    </ErrorBoundary>
  )
}

export default ClientLayout
