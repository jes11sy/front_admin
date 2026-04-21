'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'

const tabs = [
  { name: 'По городам', href: '/cashbox' },
  { name: 'Сдача кассы', href: '/cashbox/submissions' },
]

export default function CashboxLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme } = useDesignStore()
  const isDark = theme === 'dark'
  
  // Не показываем табы на страницах просмотра города (там свой хедер с навигацией назад)
  const isDetailPage = /^\/cashbox\/[^\/]+$/.test(pathname) && pathname !== '/cashbox/submissions'

  if (isDetailPage) {
    return <>{children}</>
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#111113]' : 'bg-[#f5f5f7]'}`}>
      <div className="px-4 py-6">
        <div className="mb-4 animate-slide-in-left">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 w-max">
                {tabs.map((tab) => {
                  const isActive = pathname === tab.href || (tab.href === '/cashbox' && pathname === '/cashbox')
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`inline-flex h-10 items-center justify-center px-4 text-sm font-medium rounded-2xl transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? (isDark ? 'bg-white/[0.08] text-white' : 'bg-[#0a4f42] text-white')
                          : (isDark
                            ? 'text-white/92 hover:bg-white/[0.04] hover:text-white bg-transparent'
                            : 'text-[#3a3a3c] hover:-translate-y-[1px] hover:bg-black/[0.035] hover:text-[#111113] bg-transparent')
                      }`}
                    >
                      {tab.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

        </div>

        {/* Контент */}
        {children}
      </div>
    </div>
  )
}
