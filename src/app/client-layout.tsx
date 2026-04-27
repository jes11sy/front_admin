'use client'

import { usePathname } from 'next/navigation'
import { CustomNavigation } from '@/components/custom-navigation'
import AuthGuard from '@/components/auth-guard'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useThemeWithoutFlash } from '@/hooks/use-theme-without-flash'
import React, { useLayoutEffect, useEffect, useMemo, useRef } from 'react'

interface ClientLayoutProps {
  children: React.ReactNode
}

const PUBLIC_ROUTES = new Set(['/login', '/logout'])

const ClientLayout = ({ children }: ClientLayoutProps) => {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)
  const theme = useThemeWithoutFlash()
  const isDark = theme === 'dark'
  
  const isPublicPage = useMemo(() => {
    return PUBLIC_ROUTES.has(pathname)
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

  return (
    <ErrorBoundary>
      <AuthGuard>
        <CustomNavigation />
        <main className="main-content pt-16 pb-28 md:pb-0 md:pt-0 min-h-screen bg-[#f5f5f7] dark:bg-[#111113]">{children}</main>
      </AuthGuard>
    </ErrorBoundary>
  )
}

export default ClientLayout
