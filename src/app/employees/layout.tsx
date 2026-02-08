'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'

const tabs = [
  { name: 'Кол-центр', href: '/employees/callcenter' },
  { name: 'Директора', href: '/employees/directors' },
  { name: 'Мастера', href: '/employees/masters' },
]

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Тема
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'
  
  // На главной странице /employees и на страницах добавления/редактирования не показываем табы
  if (pathname === '/employees' || 
      pathname.includes('/add') || 
      pathname.includes('/edit')) {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Табы */}
        <div className={`border-b mb-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#0d5c4b] text-[#0d5c4b]'
                      : isDark
                        ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.name}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Контент */}
        {children}
      </div>
    </div>
  )
}
