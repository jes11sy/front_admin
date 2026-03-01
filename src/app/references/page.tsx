'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDesignStore } from '@/store/design.store'
import { MapPin, Tag, Wrench, ShoppingCart, CheckCircle } from 'lucide-react'

const sections = [
  {
    href: '/references/cities',
    icon: MapPin,
    title: 'Города',
    description: 'Управление справочником городов (код, название, активность)',
    color: 'teal',
  },
  {
    href: '/references/rk',
    icon: Tag,
    title: 'Рекламные каналы (РК)',
    description: 'Источники трафика: Авито, Яндекс, сайты и другие РК',
    color: 'blue',
  },
  {
    href: '/references/order-types',
    icon: ShoppingCart,
    title: 'Типы заказов',
    description: 'Классификация заказов (ремонт, монтаж, консультация и т.д.)',
    color: 'purple',
  },
  {
    href: '/references/equipment-types',
    icon: Wrench,
    title: 'Типы оборудования',
    description: 'Виды техники и оборудования из заказов',
    color: 'orange',
  },
  {
    href: '/references/order-statuses',
    icon: CheckCircle,
    title: 'Статусы заказов',
    description: 'Настройка статусов с цветами и порядком сортировки',
    color: 'green',
  },
]

const colorMap: Record<string, string> = {
  teal:   'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
  blue:   'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  purple: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
  orange: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  green:  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100',
}

const colorMapDark: Record<string, string> = {
  teal:   'bg-teal-900/20 border-teal-700/40 text-teal-400 hover:bg-teal-900/30',
  blue:   'bg-blue-900/20 border-blue-700/40 text-blue-400 hover:bg-blue-900/30',
  purple: 'bg-purple-900/20 border-purple-700/40 text-purple-400 hover:bg-purple-900/30',
  orange: 'bg-orange-900/20 border-orange-700/40 text-orange-400 hover:bg-orange-900/30',
  green:  'bg-green-900/20 border-green-700/40 text-green-400 hover:bg-green-900/30',
}

export default function ReferencesPage() {
  const router = useRouter()
  const theme = useDesignStore((state) => state.theme)
  const isDark = theme === 'dark'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#1e2530]' : 'bg-white'}`}>
    <div className="px-6 py-6">
      <div className="mb-6">
        <h1 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Справочники</h1>
        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          Управление базовыми данными системы
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => {
          const Icon = s.icon
          const cls = isDark ? colorMapDark[s.color] : colorMap[s.color]
          return (
            <button
              key={s.href}
              onClick={() => router.push(s.href)}
              className={`text-left p-5 rounded-xl border transition-all duration-200 ${cls}`}
            >
              <Icon className="h-7 w-7 mb-3" />
              <div className="font-semibold text-base mb-1">{s.title}</div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.description}</div>
            </button>
          )
        })}
      </div>
    </div>
    </div>
  )
}
