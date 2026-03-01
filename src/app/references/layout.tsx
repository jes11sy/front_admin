'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'

const tabs = [
  { name: 'Города', href: '/references/cities' },
  { name: 'Рекламные каналы', href: '/references/rk' },
  { name: 'Типы заказов', href: '/references/order-types' },
  { name: 'Типы оборудования', href: '/references/equipment-types' },
  { name: 'Статусы заказов', href: '/references/order-statuses' },
]

export default function ReferencesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
      <div className="px-6 py-6">
        <div className={`border-b mb-6 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`whitespace-nowrap pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
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
        {children}
      </div>
    </div>
  )
}
