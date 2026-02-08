'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { 
  Sun, Moon, Bell, User, Menu, X, ChevronDown,
  LayoutDashboard, Users, Phone, Briefcase, Wrench,
  PhoneCall, ShoppingCart, Wallet, DollarSign, FileText,
  MapPin, UserCheck, TrendingUp, Settings, Activity, 
  FileCode, AlertCircle, LogOut
} from 'lucide-react'

const navigationItems = [
  { name: 'Дашборд', href: '/', icon: LayoutDashboard },
  {
    name: 'Сотрудники',
    icon: Users,
    dropdown: [
      { name: 'Кол-центр', href: '/employees/callcenter', icon: Phone },
      { name: 'Директора', href: '/employees/directors', icon: Briefcase },
      { name: 'Мастера', href: '/employees/masters', icon: Wrench },
    ]
  },
  { name: 'Телефония', href: '/telephony', icon: PhoneCall },
  { name: 'Заказы', href: '/orders', icon: ShoppingCart },
  { name: 'Касса', href: '/cashbox', icon: Wallet },
  { name: 'Зарплата', href: '/salary', icon: DollarSign },
  {
    name: 'Отчеты',
    icon: FileText,
    dropdown: [
      { name: 'Отчет по городам', href: '/reports/cities', icon: MapPin },
      { name: 'Отчет по мастерам', href: '/reports/masters', icon: UserCheck },
      { name: 'Отчет по РК', href: '/reports/campaigns', icon: TrendingUp },
    ]
  },
  {
    name: 'Администрирование',
    icon: Settings,
    dropdown: [
      { name: 'Активные сессии', href: '/admin/sessions', icon: Activity },
      { name: 'Логирование пользователей', href: '/admin/user-logs', icon: FileCode },
      { name: 'Ошибки', href: '/admin/errors', icon: AlertCircle },
    ]
  },
]

interface MenuContentProps {
  isMobile?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
  expandedItem: string | null
  setExpandedItem: (item: string | null) => void
}

const MenuContent = memo(function MenuContent({
  isMobile = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
  expandedItem,
  setExpandedItem,
}: MenuContentProps) {
  const isDark = theme === 'dark'
  
  // Проверка активности с учетом подстраниц
  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href !== '/' && pathname.startsWith(href + '/')) return true
    return false
  }

  const isAnyChildActive = (dropdown: typeof navigationItems[0]['dropdown']) => {
    return dropdown?.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
  }

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-2' : 'space-y-1'} overflow-y-auto`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const hasDropdown = !!item.dropdown
          const isExpanded = expandedItem === item.name
          const childActive = isAnyChildActive(item.dropdown)
          const active = item.href ? isActive(item.href) : childActive
          
          return (
            <div key={item.name}>
              {hasDropdown ? (
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : item.name)}
                  className={`w-full relative flex items-center justify-between gap-3 px-3 font-normal group rounded-lg transition-all duration-200 ${
                    isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
                  } ${
                    childActive
                      ? isDark 
                        ? 'bg-[#2a3441] text-[#0d5c4b]' 
                        : 'bg-[#daece2]/50 text-[#0d5c4b]'
                      : isDark
                        ? 'text-gray-300 hover:bg-[#2a3441] hover:text-white'
                        : 'text-gray-700 hover:bg-[#daece2]/30 hover:text-[#0d5c4b]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Индикатор активной вкладки */}
                    <span 
                      className={`absolute left-0 top-1/2 -translate-y-1/2 w-[6px] ${
                        childActive ? 'opacity-100' : 'opacity-0'
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
                    <Icon className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${childActive ? 'text-[#0d5c4b]' : ''}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <Link
                  href={item.href!}
                  className={`relative flex items-center gap-3 px-3 font-normal group rounded-lg transition-all duration-200 ${
                    isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
                  } ${
                    active
                      ? isDark 
                        ? 'bg-[#2a3441] text-[#0d5c4b]' 
                        : 'bg-[#daece2]/50 text-[#0d5c4b]'
                      : isDark
                        ? 'text-gray-300 hover:bg-[#2a3441] hover:text-white'
                        : 'text-gray-700 hover:bg-[#daece2]/30 hover:text-[#0d5c4b]'
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
                  <Icon className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${active ? 'text-[#0d5c4b]' : ''}`} />
                  <span>{item.name}</span>
                </Link>
              )}

              {/* Выпадающий список */}
              {hasDropdown && isExpanded && (
                <div className={`mt-1 ml-4 space-y-1 ${isDark ? 'border-l-2 border-[#0d5c4b]/30' : 'border-l-2 border-[#0d5c4b]/20'}`}>
                  {item.dropdown!.map((subItem) => {
                    const SubIcon = subItem.icon
                    const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                    
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={onCloseMobileMenu}
                        className={`flex items-center gap-3 px-3 rounded-lg transition-all duration-200 ${
                          isMobile ? 'py-2.5 text-base' : 'py-2 text-sm'
                        } ${
                          isSubActive 
                            ? 'text-white bg-[#0d5c4b] shadow-sm'
                            : isDark
                              ? 'text-gray-400 hover:text-white hover:bg-[#2a3441]'
                              : 'text-gray-600 hover:text-[#0d5c4b] hover:bg-[#daece2]/30'
                        }`}
                      >
                        <SubIcon className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                        <span>{subItem.name}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
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
          className={`relative flex items-center gap-3 px-3 w-full group rounded-lg transition-all duration-200 ${
            isMobile ? 'py-3 text-base' : 'py-2.5 text-sm'
          } ${
            isDark 
              ? 'text-gray-300 hover:bg-[#2a3441] hover:text-white' 
              : 'text-gray-700 hover:bg-[#daece2]/30 hover:text-[#0d5c4b]'
          }`}
        >
          <div className="relative">
            <Bell className={isMobile ? 'h-6 w-6' : 'h-5 w-5'} />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <span>Уведомления</span>
        </button>

        {/* Profile with user name */}
        <Link
          href="/profile"
          className={`relative flex items-center gap-3 px-3 font-normal group rounded-lg transition-all duration-200 ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          } ${
            pathname === '/profile' || pathname.startsWith('/profile/')
              ? isDark 
                ? 'bg-[#2a3441] text-[#0d5c4b]' 
                : 'bg-[#daece2]/50 text-[#0d5c4b]'
              : isDark
                ? 'text-gray-300 hover:bg-[#2a3441] hover:text-white'
                : 'text-gray-700 hover:bg-[#daece2]/30 hover:text-[#0d5c4b]'
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
          <User className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'} ${pathname === '/profile' || pathname.startsWith('/profile/') ? 'text-[#0d5c4b]' : ''}`} />
          <span>{userName || 'Профиль'}</span>
        </Link>

        {/* Logout */}
        <Link
          href="/logout"
          className={`relative flex items-center gap-3 px-3 font-normal group rounded-lg transition-all duration-200 ${
            isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
          } text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}
          onClick={onCloseMobileMenu}
        >
          <LogOut className={`${isMobile ? 'h-6 w-6' : 'h-5 w-5'}`} />
          <span>Выйти</span>
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
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  
  // Тема
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Загружаем тему из localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])
  
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('admin-theme', newTheme)
  }, [theme])
  
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

  // Автоматически раскрываем dropdown если находимся на дочерней странице
  useEffect(() => {
    navigationItems.forEach(item => {
      if (item.dropdown) {
        const isChildActive = item.dropdown.some(child => 
          pathname === child.href || pathname.startsWith(child.href + '/')
        )
        if (isChildActive) {
          setExpandedItem(item.name)
        }
      }
    })
  }, [pathname])

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
            expandedItem={expandedItem}
            setExpandedItem={setExpandedItem}
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
          expandedItem={expandedItem}
          setExpandedItem={setExpandedItem}
        />
      </aside>
    </>
  )
}
