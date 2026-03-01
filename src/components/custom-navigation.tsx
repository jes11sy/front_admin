'use client'

import React, { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import {
  Sun, Moon, Bell, User, Menu, X,
  Globe, MessageSquare, BookOpen, Calendar,
  Banknote, Phone, ChevronDown, ChevronRight,
} from 'lucide-react'

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

// Хук для получения темы с поддержкой SSR без мерцания
function useThemeWithoutFlash() {
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
  if (hasHydrated) {
    return storeTheme
  }
  
  // До монтирования - используем light (SSR)
  // После монтирования но до гидратации - используем значение из DOM
  return isMounted ? clientTheme : 'light'
}

type NavItem =
  | { name: string; href: string; icon: string; lucideIcon?: undefined; children?: undefined }
  | { name: string; href?: undefined; icon: string; lucideIcon?: undefined; children: { name: string; href: string }[] }
  | { name: string; href: string; lucideIcon: React.ElementType; icon?: undefined; children?: undefined }

const navigationItems: NavItem[] = [
  { name: 'Дашборд', href: '/', icon: '/navigate/dashboard.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/navigate/employees.svg' },
  { name: 'Расписание', href: '/schedule', lucideIcon: Calendar },
  { name: 'Телефония', href: '/telephony', icon: '/navigate/telephony.svg' },
  { name: 'Заявки с сайта', href: '/site-orders', lucideIcon: Globe },
  { name: 'Заказы', href: '/orders', icon: '/navigate/orders.svg' },
  { name: 'Обращения', href: '/appeals', lucideIcon: MessageSquare },
  {
    name: 'Касса',
    icon: '/navigate/cash.svg',
    children: [
      { name: 'По городам', href: '/cashbox' },
      { name: 'Сдача кассы', href: '/cashbox/submissions' },
    ],
  },
  {
    name: 'Зарплата',
    icon: '/navigate/stats.svg',
    children: [
      { name: 'Директора', href: '/salary' },
      { name: 'Операторы', href: '/salary/operators' },
    ],
  },
  { name: 'Отчеты', href: '/reports', icon: '/navigate/reports.svg' },
  { name: 'Справочники', href: '/references', lucideIcon: BookOpen },
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

const ActiveIndicator = ({ active, isMobile }: { active: boolean; isMobile: boolean }) => (
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
)

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
}: MenuContentProps) {
  const isDark = theme === 'dark'
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/' && pathname.startsWith(href + '/')) return true
    if (href !== '/' && pathname.startsWith(href)) return true
    return false
  }

  const isAnyChildActive = (children: { name: string; href: string }[]) =>
    children.some((c) => isActive(c.href))

  useEffect(() => {
    navigationItems.forEach((item) => {
      if ('children' in item && item.children && isAnyChildActive(item.children)) {
        setExpandedItem(item.name)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  const iconSize = isMobile ? 'w-6 h-6' : 'w-5 h-5'
  const rowPy = isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-2' : 'space-y-1'} overflow-y-auto`}>
        {navigationItems.map((item) => {
          if ('children' in item && item.children) {
            const anyChild = isAnyChildActive(item.children)
            const isOpen = expandedItem === item.name

            return (
              <div key={item.name}>
                <button
                  onClick={() => setExpandedItem(isOpen ? null : item.name)}
                  className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group w-full ${rowPy}`}
                >
                  <ActiveIndicator active={anyChild} isMobile={isMobile} />
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={isMobile ? 24 : 20}
                    height={isMobile ? 24 : 20}
                    className={`nav-icon ${anyChild ? 'nav-icon-active' : ''} ${iconSize}`}
                  />
                  <span className={`flex-1 text-left ${anyChild ? 'text-[#0d5c4b]' : 'text-gray-800 dark:text-gray-200'} group-hover:text-[#0d5c4b]`}>
                    {item.name}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {isOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onCloseMobileMenu}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                            childActive
                              ? 'text-[#0d5c4b] font-medium bg-teal-50 dark:bg-teal-900/20'
                              : 'text-gray-600 dark:text-gray-400 hover:text-[#0d5c4b] hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          }`}
                        >
                          {child.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          if ('lucideIcon' in item && item.lucideIcon) {
            const LucideIcon = item.lucideIcon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${rowPy}`}
                onClick={onCloseMobileMenu}
              >
                <ActiveIndicator active={active} isMobile={isMobile} />
                <LucideIcon
                  className={`${iconSize} flex-shrink-0 ${
                    active ? 'text-[#0d5c4b]' : 'text-gray-500 dark:text-gray-400'
                  } group-hover:text-[#0d5c4b] transition-colors`}
                />
                <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
                  {item.name}
                </span>
              </Link>
            )
          }

          const active = isActive((item as { href: string }).href)
          return (
            <Link
              key={item.name}
              href={(item as { href: string }).href}
              className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${rowPy}`}
              onClick={onCloseMobileMenu}
            >
              <ActiveIndicator active={active} isMobile={isMobile} />
              <Image
                src={(item as { icon: string }).icon}
                alt={item.name}
                width={isMobile ? 24 : 20}
                height={isMobile ? 24 : 20}
                className={`nav-icon ${active ? 'nav-icon-active' : ''} ${iconSize}`}
              />
              <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
                {item.name}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`px-5 pb-6 ${isMobile ? 'space-y-3' : 'space-y-2'}`}>
        {/* Theme Toggle - переключатель должен отражать реальное состояние из theme prop */}
        <div className={`flex items-center gap-3 px-3 ${isMobile ? 'py-3' : 'py-2'}`}>
          <Sun className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${isDark ? 'text-gray-400' : 'text-[#0d5c4b]'}`} />
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
              isDark ? 'bg-[#0d5c4b]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                isDark ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <Moon className={`transition-colors ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${isDark ? 'text-[#0d5c4b]' : 'text-gray-400'}`} />
        </div>

        {/* Notifications */}
        <button
          className={`relative flex items-center gap-3 px-3 w-full group ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          }`}
        >
          <div className="relative">
            <Bell className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} text-gray-600 dark:text-gray-400 group-hover:text-[#0d5c4b] transition-colors`} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
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
              : 'text-gray-600 dark:text-gray-400'
          } group-hover:text-[#0d5c4b] transition-colors`} />
          <span className="text-gray-800 dark:text-gray-200 group-hover:text-[#0d5c4b]">
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
      {/* Mobile Header - используем dark: классы для предотвращения мерцания */}
      <header className={`md:hidden fixed top-0 left-0 w-screen z-[9999] h-16 flex items-center justify-between px-6 transition-all bg-white dark:bg-[#1e2530] ${
        isMobileMenuOpen ? '' : 'border-b border-gray-200 dark:border-gray-700'
      }`}>
        <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
          {/* Показываем оба лого, скрываем неактивное через CSS */}
          <Image 
            src="/logo/logo_light_v2.png" 
            alt="Новые Схемы" 
            width={130} 
            height={36} 
            className="h-9 w-auto dark:hidden" 
            priority
          />
          <Image 
            src="/logo/logo_dark_v2.png" 
            alt="Новые Схемы" 
            width={130} 
            height={36} 
            className="h-9 w-auto hidden dark:block" 
            priority
          />
        </button>
        <div className="flex items-center gap-2">
          {/* Mobile Notifications Bell */}
          <button
            className="p-2 transition-colors relative text-gray-600 dark:text-gray-300 hover:text-[#0d5c4b]"
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
            className="p-2 transition-colors text-gray-600 dark:text-gray-300 hover:text-[#0d5c4b]"
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
        className={`md:hidden fixed top-16 left-0 w-screen h-[calc(100vh-4rem)] z-[9998] transform transition-transform duration-300 ease-in-out flex flex-col bg-white dark:bg-[#1e2530] ${
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

      {/* Desktop Sidebar - используем dark: классы */}
      <aside className="hidden md:flex w-56 h-screen flex-col fixed left-0 top-0 transition-colors duration-300 bg-white dark:bg-[#1e2530] border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="p-6 pb-10">
          <button onClick={handleLogoClick} className="bg-transparent border-none cursor-pointer p-0">
            {/* Показываем оба лого, скрываем неактивное через CSS */}
            <Image 
              src="/logo/logo_light_v2.png" 
              alt="Новые Схемы" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer dark:hidden" 
              priority
            />
            <Image 
              src="/logo/logo_dark_v2.png" 
              alt="Новые Схемы" 
              width={160} 
              height={45} 
              className="h-10 w-auto cursor-pointer hidden dark:block" 
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
