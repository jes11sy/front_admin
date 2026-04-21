'use client'

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useDesignStore } from '@/store/design.store'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import {
  SunMedium, MoonStar, Bell, User, Menu, X,
  Globe, MessageSquare, BookOpen, Calendar, ChartColumnBig, ClipboardList, Wallet,
  Search, FileText, Info, LayoutGrid, Settings, LogOut, ChevronRight, ChevronLeft, GripHorizontal,
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
  | { name: string; href: string; icon: string; lucideIcon?: undefined }
  | { name: string; href: string; lucideIcon: React.ElementType; icon?: undefined }

const navigationItems: NavItem[] = [
  { name: 'Дашборд', href: '/', icon: '/navigate/dashboard.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/navigate/employees.svg' },
  { name: 'Расписание', href: '/schedule', lucideIcon: Calendar },
  { name: 'Телефония', href: '/telephony', icon: '/navigate/telephony.svg' },
  { name: 'Заявки с сайта', href: '/site-orders', lucideIcon: Globe },
  { name: 'Заказы', href: '/orders', icon: '/navigate/orders.svg' },
  { name: 'Обращения', href: '/appeals', lucideIcon: MessageSquare },
  { name: 'Касса', href: '/cashbox', icon: '/navigate/cash.svg' },
  { name: 'Зарплата', href: '/salary', icon: '/navigate/stats.svg' },
  { name: 'Отчеты', href: '/reports', icon: '/navigate/reports.svg' },
  { name: 'Справочники', href: '/references', lucideIcon: BookOpen },
  { name: 'Администрирование', href: '/admin', icon: '/navigate/admin.svg' },

]

const mobileBottomTabs = [
  { name: 'Отчеты', href: '/reports', icon: ChartColumnBig },
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Касса', href: '/cashbox', icon: Wallet },
] as const

const mobileQuickAccessHrefs = new Set(['/orders', '/cashbox', '/reports', '/profile'])

function isMobileDockRouteActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/orders' && pathname.startsWith('/orders')) return true
  if (href === '/cashbox' && pathname.startsWith('/cashbox')) return true
  if (href === '/reports' && (pathname.startsWith('/reports') || pathname.startsWith('/salary'))) return true
  return false
}

const NOTIFICATIONS_POSITION_KEY = 'notifications-panel-position-admin'
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed-admin'
const DEFAULT_POSITION = { x: 240, y: 100 }

interface MenuContentProps {
  isMobile?: boolean
  isCollapsed?: boolean
  pathname: string
  theme: string
  toggleTheme: () => void
  userName: string | undefined
  onCloseMobileMenu: () => void
  onToggleCollapse?: () => void
  onToggleNotifications: () => void
  isNotificationsOpen: boolean
  unreadCount: number
  notificationsButtonRef?: React.RefObject<HTMLDivElement | null>
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
  isCollapsed = false,
  pathname,
  theme,
  toggleTheme,
  userName,
  onCloseMobileMenu,
  onToggleNotifications,
  isNotificationsOpen,
  unreadCount,
  notificationsButtonRef,
}: MenuContentProps) {
  const isDark = theme === 'dark'


  const isActive = (href: string) => {
    if (pathname === href) return true
    if (href === '/reports' && pathname.startsWith('/salary')) return true
    if (href !== '/orders' && pathname.startsWith(href + '/')) return true
    return false
  }

  const iconSize = isMobile ? 'w-6 h-6' : 'w-5 h-5'
  const rowPy = isMobile ? 'py-3.5 text-base' : 'py-2.5 text-sm'
  const isProfileActive = pathname === '/profile'
  const itemBaseClass = isMobile
    ? 'w-full rounded-[20px] px-4 py-3.5'
    : 'w-full rounded-[20px] px-4 py-3'
  const itemThemeClass = (active: boolean) =>
    active
      ? theme === 'dark'
        ? 'bg-white text-[#111113] shadow-[0_12px_30px_rgba(255,255,255,0.12)]'
        : 'bg-[#0a4f42] text-white shadow-[0_12px_30px_rgba(10,79,66,0.22)]'
      : theme === 'dark'
        ? 'text-white/78 hover:bg-white/[0.06] hover:text-white'
        : 'text-[#6e6e73] hover:bg-black/[0.04] hover:text-[#111113]'

  return (
    <>
      {/* Navigation */}
      <nav className={`flex-1 px-5 ${isMobile ? 'space-y-2' : 'space-y-1'} overflow-y-auto`}>

        {navigationItems.map((item) => {
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

          const active = isActive(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`nav-icon-hover relative flex items-center gap-3 px-3 font-normal group ${rowPy}`}
              onClick={onCloseMobileMenu}
            >
              <ActiveIndicator active={active} isMobile={isMobile} />
              <Image
                src={item.icon}
                alt={item.name}
                width={isMobile ? 24 : 20}
                height={isMobile ? 24 : 20}
                className={`nav-icon ${active ? 'nav-icon-active' : ''} ${iconSize}`}

              />
              {(!isCollapsed || isMobile) && (
                <span className="truncate text-base font-medium tracking-[-0.01em]">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className={`px-4 pb-6 ${isMobile ? 'space-y-2' : 'space-y-1'}`}>
        <div className="mb-3 border-t border-black/[0.06] pt-3 dark:border-white/10">
          <div className="relative" ref={notificationsButtonRef}>
          <button
            onClick={onToggleNotifications}
            className={`group relative flex w-full items-center gap-3 transition-all duration-200 ${itemBaseClass} ${itemThemeClass(false)} ${!isMobile && isCollapsed ? 'mx-auto w-14 justify-center px-0' : ''}`}
            title={isCollapsed ? 'Уведомления' : undefined}
          >
            <div className="relative">
              <Bell className={`${isMobile ? 'h-5 w-5' : 'h-5 w-5'} text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white`} />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#b3261e] px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {(!isCollapsed || isMobile) && (
              <span className="text-base font-medium tracking-[-0.01em]">Уведомления</span>
            )}
          </button>
          </div>

          <Link
            href="/profile"
            className={`group relative flex items-center gap-3 transition-all duration-200 ${itemBaseClass} ${itemThemeClass(isProfileActive)} ${!isMobile && isCollapsed ? 'mx-auto w-14 justify-center px-0' : ''}`}
            onClick={onCloseMobileMenu}
          >
            <User className={`${isMobile ? 'h-5 w-5' : isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} transition-colors ${
              isProfileActive
                ? (isCollapsed && !isMobile ? 'text-[#0a4f42] dark:text-white' : 'text-white')
                : 'text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white'
            }`}
              style={isProfileActive && isCollapsed && !isMobile
                ? (theme === 'dark'
                    ? { filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.75))' }
                    : { filter: 'drop-shadow(0 0 6px rgba(10,79,66,0.55)) drop-shadow(0 0 14px rgba(10,79,66,0.45))' })
                : undefined}
            />
            {(!isCollapsed || isMobile) && (
              <span className="truncate text-base font-medium tracking-[-0.01em]">{userName || 'Профиль'}</span>
            )}
          </Link>
        </div>

        <button
          onClick={toggleTheme}
          className={`group relative flex w-full items-center gap-3 transition-all duration-200 ${itemBaseClass} ${itemThemeClass(false)} ${!isMobile && isCollapsed ? 'mx-auto w-14 justify-center px-0' : ''}`}
          aria-label="Переключить тему"
        >
          {theme === 'dark' ? (
            <SunMedium className={`${isMobile ? 'h-5 w-5' : isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white`} />
          ) : (
            <MoonStar className={`${isMobile ? 'h-5 w-5' : isCollapsed ? 'h-6 w-6' : 'h-5 w-5'} text-[#6e6e73] group-hover:text-[#111113] dark:text-white/78 dark:group-hover:text-white`} />
          )}
          {(!isCollapsed || isMobile) && (
            <span className="text-base font-medium tracking-[-0.01em]">
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </span>
          )}
        </button>
      </div>
    </>
  )
})

function MobileBottomNav({ pathname }: { pathname: string }) {
  const dockCardClass =
    'border border-black/[0.08] bg-[#f5f5f7]/96 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#111113]/96 dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]'

  const tabPressGlass =
    'before:absolute before:inset-0 before:z-[2] before:rounded-[20px] before:content-[\'\'] before:pointer-events-none before:opacity-0 before:transition-[opacity,transform] before:duration-200 active:before:opacity-100 motion-safe:active:scale-[0.96] before:bg-black/[0.1] before:shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] dark:before:bg-white/[0.14] dark:before:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'

  const trackRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const indicatorFirstLayout = useRef(true)
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
    transition: 'none' as string,
  })

  const updateSlidingIndicator = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const idx = mobileBottomTabs.findIndex((item) => isMobileDockRouteActive(pathname, item.href))
    if (idx < 0) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0, transition: 'opacity 200ms ease-out' }))
      return
    }

    const tab = tabRefs.current[idx]
    if (!tab) return

    const tr = track.getBoundingClientRect()
    const r = tab.getBoundingClientRect()
    const smooth =
      'left 320ms cubic-bezier(0.4, 0, 0.2, 1), top 320ms cubic-bezier(0.4, 0, 0.2, 1), width 320ms cubic-bezier(0.4, 0, 0.2, 1), height 320ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease-out'

    setIndicatorStyle({
      left: r.left - tr.left,
      top: r.top - tr.top,
      width: r.width,
      height: r.height,
      opacity: 1,
      transition: indicatorFirstLayout.current ? 'none' : smooth,
    })
    indicatorFirstLayout.current = false
  }, [pathname])

  useEffect(() => {
    updateSlidingIndicator()
  }, [updateSlidingIndicator])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const ro = new ResizeObserver(() => updateSlidingIndicator())
    ro.observe(track)
    window.addEventListener('orientationchange', updateSlidingIndicator)

    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', updateSlidingIndicator)
    }
  }, [updateSlidingIndicator])

  const tabClass = (active: boolean) =>
    cn(
      'relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-[20px] px-1.5 py-2 text-[13px] font-medium tracking-[-0.02em] touch-manipulation [-webkit-tap-highlight-color:transparent]',
      tabPressGlass,
      active ? 'text-[#0a4f42] dark:text-white' : 'text-[#6e6e73] dark:text-white/55'
    )

  return (
    <nav
      className="mobile-bottom-dock pointer-events-none md:hidden fixed bottom-0 left-0 right-0 z-[9990] bg-transparent shadow-none"
      aria-label="Основная навигация"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-screen-sm items-end justify-center gap-2 px-4 pb-[max(16px,calc(12px+env(safe-area-inset-bottom,0px)))] pt-2.5 shadow-none">
        <div
          ref={trackRef}
          className={cn(
            'relative isolate flex min-h-[68px] min-w-0 flex-1 items-stretch gap-1 rounded-[34px] p-1.5',
            dockCardClass
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute z-0 rounded-[20px] !bg-gray-400/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ring-1 ring-black/[0.07] dark:!bg-white/[0.12] dark:ring-white/18 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            style={{
              left: indicatorStyle.left,
              top: indicatorStyle.top,
              width: indicatorStyle.width,
              height: indicatorStyle.height,
              opacity: indicatorStyle.opacity,
              transition: indicatorStyle.transition,
            }}
          />
          {mobileBottomTabs.map((item, i) => {
            const Icon = item.icon
            const active = isMobileDockRouteActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={tabClass(active)}
              >
                <span className="relative z-[3] flex flex-col items-center gap-1">
                  <Icon className={cn('h-6 w-6 shrink-0', active && 'text-[#0a4f42] dark:text-white')} />
                  <span className="leading-tight">{item.name}</span>
                </span>
              </Link>
            )
          })}
        </div>

        <Link
          href="/orders?filters=1"
          className={cn(
            'relative z-[1] flex h-[68px] min-h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[34px] text-[#6e6e73] transition-colors dark:text-white/55',
            tabPressGlass,
            dockCardClass,
            'hover:text-[#0a4f42] dark:hover:text-white'
          )}
          aria-label="Поиск и фильтры заказов"
          title="Поиск и фильтры"
        >
          <Search className="h-7 w-7 shrink-0" strokeWidth={2} />
        </Link>
      </div>
    </nav>
  )
}

export function CustomNavigation() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useDesignStore()
  const pathname = usePathname()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  const notificationsRef = useRef<HTMLDivElement>(null)
  const notificationsPanelRef = useRef<HTMLDivElement>(null)
  const mobileNotificationsPanelRef = useRef<HTMLDivElement>(null)
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileSectionsPanelOpen, setIsMobileSectionsPanelOpen] = useState(false)
  const [mobileSectionsPanelEntered, setMobileSectionsPanelEntered] = useState(false)
  const [isMobileProfilePanelOpen, setIsMobileProfilePanelOpen] = useState(false)
  const [mobileProfilePanelEntered, setMobileProfilePanelEntered] = useState(false)
  const [isMobileSettingsPanelOpen, setIsMobileSettingsPanelOpen] = useState(false)
  const [mobileSettingsPanelEntered, setMobileSettingsPanelEntered] = useState(false)
  const [isMobileLogoutLoading, setIsMobileLogoutLoading] = useState(false)
  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
  } = useNotifications()
  
  const [panelPosition, setPanelPosition] = useState(DEFAULT_POSITION)
  const [isDragging, setIsDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  
  useEffect(() => {
    const saved = localStorage.getItem(NOTIFICATIONS_POSITION_KEY)
    if (saved) {
      try {
        setPanelPosition(JSON.parse(saved))
      } catch {
        // ignore invalid storage
      }
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    if (saved === 'true') setIsSidebarCollapsed(true)
  }, [])

  useEffect(() => {
    const html = document.documentElement
    html.classList.toggle('sidebar-collapsed', isSidebarCollapsed)
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed))
    return () => {
      html.classList.remove('sidebar-collapsed')
    }
  }, [isSidebarCollapsed])

  const closeMobileMenu = useCallback(() => {}, [])
  const toggleSidebarCollapse = useCallback(() => setIsSidebarCollapsed((prev) => !prev), [])

  useEffect(() => {
    setIsDropdownOpen(false)
    setIsMobileSectionsPanelOpen(false)
    setMobileSectionsPanelEntered(false)
    setIsMobileProfilePanelOpen(false)
    setMobileProfilePanelEntered(false)
    setIsMobileSettingsPanelOpen(false)
    setMobileSettingsPanelEntered(false)
  }, [pathname])

  useEffect(() => {
    if (isDropdownOpen || isMobileSectionsPanelOpen || isMobileProfilePanelOpen || isMobileSettingsPanelOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDropdownOpen, isMobileSectionsPanelOpen, isMobileProfilePanelOpen, isMobileSettingsPanelOpen])

  const handleLogoClick = () => {
    setIsDropdownOpen(false)
    setIsMobileSectionsPanelOpen(false)
    setMobileSectionsPanelEntered(false)
    setIsMobileProfilePanelOpen(false)
    setMobileProfilePanelEntered(false)
    setIsMobileSettingsPanelOpen(false)
    setMobileSettingsPanelEntered(false)
    router.push('/orders')
  }

  const userName = user?.name || user?.login

  const savePosition = useCallback((pos: { x: number; y: number }) => {
    localStorage.setItem(NOTIFICATIONS_POSITION_KEY, JSON.stringify(pos))
  }, [])

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    const panel = notificationsPanelRef.current
    if (panel) {
      const rect = panel.getBoundingClientRect()
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
  }, [])

  useEffect(() => {
    if (!isDragging) return
    let lastPos = panelPosition

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(-300, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y))
      lastPos = { x: newX, y: newY }
      setPanelPosition(lastPos)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      savePosition(lastPos)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, panelPosition, savePosition])

  const toggleDropdown = useCallback(() => setIsDropdownOpen((prev) => !prev), [])

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false)
  }, [])

  const closeMobileProfilePanel = useCallback(() => setMobileProfilePanelEntered(false), [])
  const closeMobileSettingsPanel = useCallback(() => setMobileSettingsPanelEntered(false), [])
  const closeMobileSectionsPanel = useCallback(() => setMobileSectionsPanelEntered(false), [])

  const handleMobileSectionsPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
      if (!mobileSectionsPanelEntered) {
        setIsMobileSectionsPanelOpen(false)
      }
    },
    [mobileSectionsPanelEntered]
  )

  const handleMobileProfilePanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
      if (!mobileProfilePanelEntered) {
        setIsMobileProfilePanelOpen(false)
      }
    },
    [mobileProfilePanelEntered]
  )

  const handleMobileSettingsPanelTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.propertyName !== 'transform') return
      if (!mobileSettingsPanelEntered) {
        setIsMobileSettingsPanelOpen(false)
      }
    },
    [mobileSettingsPanelEntered]
  )

  useEffect(() => {
    if (!isMobileSectionsPanelOpen) {
      setMobileSectionsPanelEntered(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileSectionsPanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isMobileSectionsPanelOpen])

  useEffect(() => {
    if (!isMobileProfilePanelOpen) {
      setMobileProfilePanelEntered(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileProfilePanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isMobileProfilePanelOpen])

  useEffect(() => {
    if (!isMobileSettingsPanelOpen) {
      setMobileSettingsPanelEntered(false)
      return
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMobileSettingsPanelEntered(true))
    })
    return () => cancelAnimationFrame(id)
  }, [isMobileSettingsPanelOpen])

  useEffect(() => {
    if (isDropdownOpen) {
      setIsMobileSectionsPanelOpen(false)
      setMobileSectionsPanelEntered(false)
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      setIsMobileSettingsPanelOpen(false)
      setMobileSettingsPanelEntered(false)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    if (isMobileSectionsPanelOpen) {
      setIsDropdownOpen(false)
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      setIsMobileSettingsPanelOpen(false)
      setMobileSettingsPanelEntered(false)
    }
  }, [isMobileSectionsPanelOpen])

  const handleMobileLogout = useCallback(async () => {
    setIsMobileLogoutLoading(true)
    try {
      setIsMobileProfilePanelOpen(false)
      setMobileProfilePanelEntered(false)
      await logout()
      router.push('/login')
    } finally {
      setIsMobileLogoutLoading(false)
    }
  }, [logout, router])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (isDragging || !isDropdownOpen) return
      const target = event.target as Node
      const isInsideButton = notificationsRef.current?.contains(target)
      const isInsideDesktopPanel = notificationsPanelRef.current?.contains(target)
      const isInsideMobilePanel = mobileNotificationsPanelRef.current?.contains(target)
      if (!isInsideButton && !isInsideDesktopPanel && !isInsideMobilePanel) {
        closeDropdown()
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', onClickOutside)
    }
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [isDropdownOpen, closeDropdown, isDragging])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'только что'
    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    return `${diffDays} дн назад`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order_created':
      case 'order_edited':
        return FileText
      default:
        return Info
    }
  }

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id)
    }
    if (notification.orderId) {
      router.push(`/orders/${notification.orderId}`)
      closeDropdown()
    }
  }

  const markAllAsRead = () => {
    markAllNotificationsAsRead()
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="md:hidden fixed inset-x-0 top-0 z-[9999] border-b border-black/[0.06] bg-white/95 px-0 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-white/90 dark:border-white/10 dark:bg-[#111113]/95 dark:supports-[backdrop-filter]:bg-[#111113]/90">
        <div className="mx-auto flex h-16 w-full max-w-screen-sm items-center justify-between gap-2 px-3 sm:px-4">
        <button
          type="button"
          onClick={handleLogoClick}
          className="min-w-0 shrink border-0 bg-transparent p-0"
        >
          <Image 
            src="/logo/logo_light_v2.png" 
            alt="Новые Схемы" 
            width={148} 
            height={36} 
            className="h-8 max-w-[min(100%,9rem)] w-auto dark:hidden" 
            priority
          />
          <Image 
            src="/logo/logo_dark_v2.png" 
            alt="Новые Схемы" 
            width={148} 
            height={36} 
            className="hidden h-8 max-w-[min(100%,9rem)] w-auto dark:block" 
            priority
          />
        </button>
        <div className="flex items-center gap-1">
          {/* Mobile Notifications Bell */}
          <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={toggleDropdown}
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
            aria-label="Уведомления"
          >
            <Bell className={`h-6 w-6 transition-colors duration-200 ${
              isDropdownOpen
                ? 'text-[#111113] dark:text-white'
                : theme === 'dark' ? 'text-white/72 hover:text-white' : 'text-[#6e6e73] hover:text-[#111113]'
            }`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          </div>
          <button
            type="button"
            onClick={() => {
              closeDropdown()
              setIsMobileSectionsPanelOpen(true)
              setIsMobileProfilePanelOpen(false)
              setIsMobileSettingsPanelOpen(false)
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              isMobileSectionsPanelOpen
                ? 'text-[#0a4f42] dark:text-white'
                : theme === 'dark'
                  ? 'text-white/72 hover:text-white'
                  : 'text-[#6e6e73] hover:text-[#111113]'
            )}
            aria-label="Все разделы"
            title="Все разделы"
          >
            <LayoutGrid className="h-6 w-6 transition-colors duration-200" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              closeDropdown()
              setIsMobileSettingsPanelOpen(false)
              setIsMobileProfilePanelOpen(true)
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              pathname.startsWith('/profile')
                ? 'text-[#0a4f42] dark:text-white'
                : theme === 'dark'
                  ? 'text-white/72 hover:text-white'
                  : 'text-[#6e6e73] hover:text-[#111113]'
            )}
            aria-label="Профиль"
            title="Профиль"
          >
            <User className="h-6 w-6 transition-colors duration-200" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => {
              closeDropdown()
              setIsMobileProfilePanelOpen(false)
              setIsMobileSettingsPanelOpen(true)
            }}
            className={cn(
              'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]',
              isMobileSettingsPanelOpen
                ? 'text-[#0a4f42] dark:text-white'
                : theme === 'dark'
                  ? 'text-white/72 hover:text-white'
                  : 'text-[#6e6e73] hover:text-[#111113]'
            )}
            aria-label="Настройки"
            title="Настройки"
          >
            <Settings className="h-6 w-6 transition-colors duration-200" strokeWidth={2} />
          </button>
        </div>
        </div>
      </header>

      {isDropdownOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть уведомления"
            onClick={closeDropdown}
          />
          <div
            ref={mobileNotificationsPanelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-notifications-title"
            className="fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden pt-[env(safe-area-inset-top,0px)]"
          >
            <div className="relative flex min-h-[52px] shrink-0 items-center justify-center border-b border-black/[0.06] px-4 py-2 dark:border-white/10">
              <h3
                id="mobile-notifications-title"
                className="text-center text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Уведомления
              </h3>
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 sm:right-3 sm:gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-[#0a4f42] hover:underline dark:text-white/80 dark:hover:text-white"
                  >
                    <Check className="h-3 w-3" />
                    Прочитать все
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDropdown}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.06] hover:text-[#111113] dark:text-white/70 dark:hover:bg-white/[0.08] dark:hover:text-white"
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-white pb-[env(safe-area-inset-bottom,0px)] dark:bg-[#111113]">
              {notificationsLoading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-white/55">Загрузка...</div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`px-4 py-3 border-b border-gray-100 dark:border-white/10 last:border-0 cursor-pointer ${
                        !notification.read
                          ? 'bg-[#0a4f42]/8 hover:bg-[#0a4f42]/14 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-gray-400 dark:text-gray-500"><Icon className="h-5 w-5" /></div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>{notification.title}</p>
                          <p className="text-xs text-gray-500 dark:text-white/55 mt-0.5 truncate">{notification.message}</p>
                          <p className="text-xs text-gray-400 dark:text-white/40 mt-1">{formatTime(notification.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="px-4 py-10 text-center text-gray-500 dark:text-white/55">Нет уведомлений</div>
              )}
            </div>
          </div>
        </>
      )}

      {isMobileSectionsPanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть список разделов"
            onClick={closeMobileSectionsPanel}
          />
          <div
            onTransitionEnd={handleMobileSectionsPanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-out',
              mobileSectionsPanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-[52px] min-h-[52px] shrink-0 items-center border-b border-black/[0.06] px-2 dark:border-white/10 sm:px-3">
              <div className="w-11 shrink-0" aria-hidden />
              <h2 className="m-0 min-w-0 flex-1 truncate text-center text-lg font-semibold leading-6 text-[#111113] dark:text-white">
                Все разделы
              </h2>
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={closeMobileSectionsPanel}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#111113]'
                  )}
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-6">
              <div className="grid grid-cols-1 gap-3">
                {navigationItems
                  .filter((item) => !mobileQuickAccessHrefs.has(item.href))
                  .map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileSectionsPanel}
                      className={cn(
                        'flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-base font-medium transition-colors active:scale-[0.99]',
                        'border-black/[0.08] bg-[#f5f5f7]/90 text-[#111113] dark:border-white/10 dark:bg-white/[0.06] dark:text-white',
                        active && 'ring-2 ring-[#0a4f42]/30 dark:ring-white/20'
                      )}
                    >
                      <Icon className={cn('h-5 w-5 shrink-0', theme === 'dark' ? 'text-white/90' : 'text-[#0a4f42]')} />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {isMobileProfilePanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть меню профиля"
            onClick={closeMobileProfilePanel}
          />
          <div
            onTransitionEnd={handleMobileProfilePanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-out',
              mobileProfilePanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-[52px] min-h-[52px] shrink-0 items-center border-b border-black/[0.06] px-2 dark:border-white/10 sm:px-3">
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={() => void handleMobileLogout()}
                  disabled={isMobileLogoutLoading}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50',
                    theme === 'dark'
                      ? 'text-white/85 hover:bg-white/10 hover:text-red-300'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#b3261e]'
                  )}
                  aria-label="Выйти из аккаунта"
                  title="Выйти"
                >
                  {isMobileLogoutLoading ? (
                    <span className="text-sm">...</span>
                  ) : (
                    <LogOut className="h-6 w-6" />
                  )}
                </button>
              </div>
              <h2 className="m-0 min-w-0 flex-1 truncate text-center text-base font-semibold leading-6 text-[#111113] dark:text-white">
                {userName || 'Профиль'}
              </h2>
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={closeMobileProfilePanel}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#111113]'
                  )}
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-6">
              <Link
                href="/profile"
                onClick={closeMobileProfilePanel}
                className="flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-base font-medium transition-colors active:scale-[0.99] border-black/[0.08] bg-[#f5f5f7]/90 text-[#111113] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
              >
                <User className={cn('h-5 w-5 shrink-0', theme === 'dark' ? 'text-white/90' : 'text-[#0a4f42]')} />
                Мой профиль
              </Link>
            </div>
          </div>
        </>
      )}

      {isMobileSettingsPanelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[10048] bg-black/45 dark:bg-black/55 md:hidden"
            aria-label="Закрыть настройки"
            onClick={closeMobileSettingsPanel}
          />
          <div
            onTransitionEnd={handleMobileSettingsPanelTransitionEnd}
            className={cn(
              'fixed inset-0 z-[10050] flex flex-col overflow-hidden bg-white dark:bg-[#111113] md:hidden',
              'pt-[env(safe-area-inset-top,0px)] transition-transform duration-300 ease-out',
              mobileSettingsPanelEntered ? 'translate-x-0' : 'translate-x-full'
            )}
          >
            <div className="flex h-[52px] min-h-[52px] shrink-0 items-center border-b border-black/[0.06] px-2 dark:border-white/10 sm:px-3">
              <div className="w-11 shrink-0" aria-hidden />
              <h2 className="m-0 min-w-0 flex-1 truncate text-center text-lg font-semibold leading-6 text-[#111113] dark:text-white">
                Настройки
              </h2>
              <div className="flex w-11 shrink-0 items-center justify-center">
                <button
                  type="button"
                  onClick={closeMobileSettingsPanel}
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    theme === 'dark'
                      ? 'text-white/90 hover:bg-white/10 hover:text-white'
                      : 'text-[#6e6e73] hover:bg-black/[0.06] hover:text-[#111113]'
                  )}
                  aria-label="Закрыть"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-6">
              <div className="rounded-2xl border border-black/[0.08] bg-[#f5f5f7]/90 p-4 dark:border-white/10 dark:bg-white/[0.06]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {theme === 'dark' ? (
                      <MoonStar className="h-5 w-5 shrink-0 text-white/85" />
                    ) : (
                      <SunMedium className="h-5 w-5 shrink-0 text-[#0a4f42]" />
                    )}
                    <span className="min-w-0 truncate text-base font-medium leading-snug text-[#111113] dark:text-white">
                      {theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={theme === 'dark'}
                    onClick={() => toggleTheme()}
                    className={cn(
                      'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200',
                      theme === 'dark' ? 'bg-[#3a3a3c] dark:bg-white/22' : 'bg-gray-300 dark:bg-gray-600'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200',
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto ml-4 mt-4 flex h-[calc(100vh-2rem)] flex-col rounded-[30px] border p-3 transition-all duration-300',
            theme === 'dark'
              ? 'border-white/10 bg-[#111113]/92 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl'
              : 'border-black/[0.08] bg-[#f5f5f7] shadow-none backdrop-blur-none',
            isSidebarCollapsed ? 'w-[120px]' : 'w-[272px]'
          )}
        >
          <div className={cn(
            'pb-8 pt-3',
            isSidebarCollapsed
              ? 'grid w-full grid-cols-[28px_1fr_28px] items-center px-0'
              : 'flex items-center justify-between px-3'
          )}>
            {isSidebarCollapsed && <span aria-hidden="true" className="block h-7 w-7" />}
            <button
              onClick={handleLogoClick}
              className={cn(
                'bg-transparent border-none cursor-pointer p-0',
                isSidebarCollapsed && 'justify-self-center shrink-0'
              )}
            >
              {isSidebarCollapsed ? (
                <Image
                  src={theme === 'dark' ? '/logo/favicon.png' : '/logo/pwa_dark.png'}
                  alt="Новые Схемы"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              ) : (
                <>
                  <Image
                    src="/logo/logo_light_v2.png"
                    alt="Новые Схемы"
                    width={164}
                    height={42}
                    className="h-10 w-auto object-contain dark:hidden"
                    priority
                  />
                  <Image
                    src="/logo/logo_dark_v2.png"
                    alt="Новые Схемы"
                    width={164}
                    height={42}
                    className="hidden h-10 w-auto object-contain dark:block"
                    priority
                  />
                </>
              )}
            </button>
            {isSidebarCollapsed ? (
              <button
                onClick={toggleSidebarCollapse}
                className="flex h-7 w-7 items-center justify-center justify-self-end rounded-full text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Развернуть меню"
                title="Развернуть меню"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={toggleSidebarCollapse}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6e6e73] transition-colors hover:bg-black/[0.04] hover:text-[#111113] dark:text-white/60 dark:hover:bg-white/[0.05] dark:hover:text-white"
                aria-label="Свернуть меню"
                title="Свернуть меню"
              >
                <ChevronLeft className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>

          <MenuContent
            isMobile={false}
            isCollapsed={isSidebarCollapsed}
            pathname={pathname}
            theme={theme}
            toggleTheme={toggleTheme}
            userName={userName}
            onCloseMobileMenu={closeMobileMenu}
            onToggleCollapse={toggleSidebarCollapse}
            onToggleNotifications={toggleDropdown}
            isNotificationsOpen={isDropdownOpen}
            unreadCount={unreadCount}
            notificationsButtonRef={notificationsRef}
          />
        </div>
      </aside>

      {/* Desktop Notifications Panel */}
      {isDropdownOpen && (
        <div 
          ref={notificationsPanelRef}
          className="hidden md:flex fixed w-[380px] max-h-[460px] rounded-[20px] shadow-2xl border border-black/[0.06] dark:border-white/10 overflow-hidden z-[9999] flex-col bg-white dark:bg-[#111113]"
          style={{ left: panelPosition.x, top: panelPosition.y }}
        >
          <div 
            className="px-4 py-3 border-b border-gray-200 dark:border-white/10 flex items-center justify-between flex-shrink-0 cursor-move select-none bg-black/[0.02] dark:bg-white/[0.03]"
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4 text-gray-400 dark:text-white/40" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Уведомления</h3>
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); markAllAsRead() }}
                  className="text-xs text-[#0a4f42] hover:underline flex items-center gap-1 dark:text-white/80 dark:hover:text-white"
                >
                  <Check className="h-3 w-3" />
                  Прочитать все
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-[#111113]">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b border-gray-100 dark:border-white/10 last:border-0 cursor-pointer ${
                      !notification.read 
                        ? 'bg-[#0a4f42]/8 hover:bg-[#0a4f42]/14 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]' 
                        : 'bg-white dark:bg-[#111113] hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-gray-400 dark:text-white/45">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${notification.read ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-gray-100 font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-white/55 mt-0.5 truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/40 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-[#0d5c4b] rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="px-4 py-12 text-center text-gray-500 dark:text-white/55">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-black/[0.04] dark:bg-white/[0.06]">
                  <Bell className="h-7 w-7 opacity-70" />
                </div>
                <p className="text-sm">Нет уведомлений</p>
              </div>
            )}
          </div>

        </div>
      )}

      <MobileBottomNav pathname={pathname} />
    </>
  )
}
