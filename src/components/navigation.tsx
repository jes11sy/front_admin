'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import * as React from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCircle,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Phone,
  Briefcase,
  Wrench,
  Tag,
  PhoneCall,
  MapPin,
  UserCheck,
  ShoppingCart,
  Wallet,
  DollarSign,
  TrendingUp,
  Settings,
  Activity,
  FileCode,
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
  // { name: 'Авито', href: '/avito', icon: Tag }, // Временно скрыто
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
    ]
  },
]

export function Navigation() {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // Автоматически раскрываем dropdown если находимся на дочерней странице
  const checkAndExpandParent = () => {
    navigationItems.forEach(item => {
      if (item.dropdown) {
        const isChildActive = item.dropdown.some(child => pathname === child.href)
        if (isChildActive && expandedItem !== item.name) {
          setExpandedItem(item.name)
        }
      }
    })
  }

  React.useEffect(() => {
    checkAndExpandParent()
  }, [pathname])

  return (
    <>
      {/* Мобильная верхняя панель */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
        <Link href="/" className="text-xl font-bold text-gray-800">
          Новые Схемы
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay для мобильной версии */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Боковая навигация */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 
          transform transition-transform duration-300 ease-in-out z-50
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Логотип */}
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <Link 
              href="/" 
              className="text-lg font-bold text-gray-800 hover:text-teal-600 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              Новые Схемы
            </Link>
          </div>

          {/* Навигация */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = item.href ? pathname === item.href : false
              const hasDropdown = !!item.dropdown
              const isExpanded = expandedItem === item.name
              const isAnyChildActive = item.dropdown?.some(child => pathname === child.href)
              
              return (
                <div key={item.name}>
                  {/* Главный пункт */}
                  {hasDropdown ? (
                    <button
                      onClick={() => setExpandedItem(isExpanded ? null : item.name)}
                      className={`
                        w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${isAnyChildActive 
                          ? 'bg-gray-100 text-teal-600' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-teal-600'
                        }
                      `}
                    >
                      <span>{item.name}</span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  ) : (
                    <Link
                      href={item.href!}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                        transition-all duration-200
                        ${isActive 
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-teal-600'
                        }
                      `}
                    >
                      <span>{item.name}</span>
                    </Link>
                  )}

                  {/* Выпадающий список */}
                  {hasDropdown && isExpanded && (
                    <div className="mt-2 ml-4 space-y-1 animate-slide-down">
                      {item.dropdown!.map((subItem) => {
                        const isSubActive = pathname === subItem.href
                        
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`
                              flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium
                              transition-all duration-200
                              ${isSubActive 
                                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md' 
                                : 'text-gray-600 hover:bg-gray-50 hover:text-teal-600'
                              }
                            `}
                          >
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

          {/* Кнопка выхода */}
          <div className="px-4 pb-4 space-y-2">
            <Link
              href="/logout"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 w-full"
            >
              <LogOut className="h-5 w-5" />
              <span>Выйти</span>
            </Link>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              © 2025 Новые Схемы
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
