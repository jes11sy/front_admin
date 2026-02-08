'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const tabs = [
  { name: 'По городам', href: '/reports/cities' },
  { name: 'По мастерам', href: '/reports/masters' },
  { name: 'По РК', href: '/reports/campaigns' },
]

export default function ReportsPage() {
  const pathname = usePathname()
  
  // Тема
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  useEffect(() => {
    const savedTheme = localStorage.getItem('admin-theme') as 'light' | 'dark' | null
    if (savedTheme) {
      setTheme(savedTheme)
    }
  }, [])
  
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        {/* Табы */}
        <div className={`border-b mb-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex gap-8">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
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

        {/* Контент - подсказка выбрать раздел */}
        <div className={`text-center py-16 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          <p>Выберите тип отчета</p>
        </div>
      </div>
    </div>
  )
}
