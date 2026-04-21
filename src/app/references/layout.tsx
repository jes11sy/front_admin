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
    <div className={`transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="mb-4">
          <nav className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`min-h-[40px] whitespace-nowrap rounded-2xl px-4 inline-flex items-center text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? isDark
                        ? 'bg-white/[0.08] text-white'
                        : 'bg-[#0a4f42] text-white'
                      : isDark
                        ? 'bg-transparent text-white/92 hover:bg-white/[0.04] hover:text-white'
                        : 'bg-transparent text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113]'
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
