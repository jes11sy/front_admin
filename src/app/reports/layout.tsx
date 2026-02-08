'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'

const tabs = [
  { name: 'По городам', href: '/reports/cities' },
  { name: 'По мастерам', href: '/reports/masters' },
  { name: 'По РК', href: '/reports/campaigns' },
]

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // На главной странице /reports показываем page.tsx без layout-оборачивания
  if (pathname === '/reports') {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Табы */}
        <div className={`border-b mb-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-teal-500 text-teal-500'
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
