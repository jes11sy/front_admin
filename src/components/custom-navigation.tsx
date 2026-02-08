'use client'

import { useState, useEffect, useCallback, memo, useSyncExternalStore } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { Sun, Moon, Bell, User, Menu, X } from 'lucide-react'

// Функция для синхронного получения темы из localStorage (для SSR)
function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark' // SSR - возвращаем dark по умолчанию
  try {
    const stored = localStorage.getItem('admin-design-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.theme || 'dark'
    }
  } catch {}
  return 'dark'
}

// Хук для получения темы с поддержкой SSR без мерцания
function useThemeWithoutFlash() {
  const storeTheme = useDesignStore((state) => state.theme)
  const hasHydrated = useDesignStore((state) => state._hasHydrated)
  
  // До гидратации используем значение из localStorage напрямую
  const [initialTheme] = useState(getInitialTheme)
  
  return hasHydrated ? storeTheme : initialTheme
}

const navigationItems = [
  { name: 'Дашборд', href: '/', icon: '/navigate/dashboard.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/navigate/employees.svg' },
  { name: 'Телефония', href: '/telephony', icon: '/navigate/telephony.svg' },
  { name: 'Заказы', href: '/orders', icon: '/navigate/orders.svg' },
  { name: 'Касса', href: '/cashbox', icon: '/navigate/cash.svg' },
  { name: 'Зарплата', href: '/salary', icon: '/navigate/stats.svg' },
  { name: 'Отчеты', href: '/reports', icon: '/navigate/reports.svg' },
  { name: 'Администрирование', href: '/admin', icon: '/navigate/admin.svg' },
]

interface MenuContentProps {
  isMobile?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
}

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
}: MenuContentProps) {
  const isDark = theme === 'dark'
  
  // Проверка активности с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/' && pathname.startsWith(href + '/')) return true
    if (href !== '/' && pathname.startsWith(href)) return true
    return false
  }

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-2' : 'space-y-1'} overflow-y-auto`}>
        {navigationItems.map((item) => {
          const active = isActive(item.href)
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
                isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
              }`}
              onClick={onCloseMobileMenu}
            >
              {/* Индикатор активной вкладки */}
              <span 
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
                  active ? 'opacity-100' : 'opacity-0'
                } ${isMobile ? 'h-12' : 'h-10'}`}
              >
                <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
                  <path 
                    d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                    stroke="#0d5c4b" 
                    strokeWidth="1.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>
              <Image 
                src={item.icon} 
                alt={item.name} 
                width={isMobile ? 24 : 20} 
                height={isMobile ? 24 : 20} 
                className={`nav-icon ${active ? 'nav-icon-active' : ''} ${isMobile ? 'w-6 h-6' : 'w-5 h-5'}`}
              />
              <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'} group-hover:text-[#0d5c4b]`}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 pb-6 ${isMobile ? 'space-y-3' : 'space-y-2'}`}>
        {/* Theme Toggle */}
        <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
          <Sun className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'light' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              theme === 'dark' ? 'bg-[#0d5c4b]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <Moon className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${theme === 'dark' ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
        </div>

        {/* Notifications */}
        <button
          className={`relative flex items-center gap-3 px-3 w-full group ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          }`}
        >
          <div className="relative">
            <Bell className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${isDark ? 'text-gray-400' : 'text-gray-600'} group-hover:text-[#0d5c4b] transition-colors`} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'} group-hover:text-[#0d5c4b]`}>
            Уведомления
          </span>
        </button>

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          }`}
          onClick={onCloseMobileMenu}
        >
          <span 
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
              pathname === '/profile' || pathname.startsWith('/profile/') ? 'opacity-100' : 'opacity-0'
            } ${isMobile ? 'h-12' : 'h-10'}`}
          >
            <svg viewBox="0 0 6 40" fill="none" className="w-full h-full">
              <path 
                d="M5 1C2.5 1 1 4.5 1 10v20c0 5.5 1.5 9 4 9" 
                stroke="#0d5c4b" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          <User className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${
            pathname === '/profile' || pathname.startsWith('/profile/') 
              ? 'text-[#0d5c4b]' 
              : isDark ? 'text-gray-400' : 'text-gray-600'
          } group-hover:text-[#0d5c4b] transition-colors`} />
          <span className={`${isDark ? 'text-gray-200' : 'text-gray-800'} group-hover:text-[#0d5c4b]`}>
            {userName || 'Профиль'}
          </span>
        </Link>

      </div>
    </>
  )
})

export function CustomNavigation() {
  const { user } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Тема - используем хук без мерцания
  const theme = useThemeWithoutFlash()
  const toggleTheme = useDesignStore((state) => state.toggleTheme)
  
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

  // Стабильная ссылка на колбэк закрытия мобильного меню
  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), [])

  // Закрываем меню при смене маршрута
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Блокируем скролл body при открытом меню
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Переход на главную страницу
  const handleLogoClick = () => {
    setIsMobileMenuOpen(false)
    router.push('/')
  }

  const userName = user?.name || user?.login
  const isDark = theme === 'dark'

  return (
    <>
      {/* Mobile Header */}
      <header className={`md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 flex items-center justify-between px-6 transition-all ${
        isDark ? 'bg-[#1e2530]' : 'bg-white'
      } ${
        isMobileMenuOpen ? '' : isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'
      }`}>
        <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
          <Image 
            src={isDark ? "/logo/logo_dark_v2.png" : "/logo/logo_light_v2.png"} 
            alt="Новые Схемы" 
            width={130} 
            height={36} 
            className="h-9 w-auto" 
            priority
          />
        </button>
        <div className="flex items-center gap-2">
          {/* Mobile Notifications Bell */}
          <button
            className={`p-2 transition-colors relative ${
              isDark ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
            }`}
            aria-label="Уведомления"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`p-2 transition-colors ${
              isDark ? 'text-gray-300 hover:text-[#0d5c4b]' : 'text-gray-600 hover:text-[#0d5c4b]'
            }`}
            aria-label="Открыть меню"
          >
            {isMobileMenuOpen ? (
              <X className="h-7 w-7" />
            ) : (
              <Menu className="h-7 w-7" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Full-screen Menu */}
      <aside 
        className={`md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-[9998] transform transition-transform duration-300 ease-in-out flex flex-col ${
          isDark ? 'bg-[#1e2530]' : 'bg-white'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="pt-6 flex flex-col h-full overflow-y-auto">
          <MenuContent
            isMobile={true}
            pathname={pathname}
            theme={theme}
            toggleTheme={toggleTheme}
            userName={userName}
            onCloseMobileMenu={closeMobileMenu}
          />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex w-56 h-screen flex-col fixed left-0 top-0 transition-colors duration-300 ${
        isDark 
          ? 'bg-[#1e2530] border-r border-gray-700' 
          : 'bg-white border-r border-gray-200'
      }`}>
        {/* Logo */}
        <div className="p-6 pb-10">
          <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
            <Image 
              src={isDark ? "/logo/logo_dark_v2.png" : "/logo/logo_light_v2.png"} 
              alt="Новые Схемы" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer" 
              priority
            />
          </button>
        </div>

        <MenuContent
          isMobile={false}
          pathname={pathname}
          theme={theme}
          toggleTheme={toggleTheme}
          userName={userName}
          onCloseMobileMenu={closeMobileMenu}
        />
      </aside>
    </>
  )
}
