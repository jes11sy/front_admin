import type { ElementType } from 'react'
import {
  BookOpen,
  Calendar,
  ChartColumnBig,
  ClipboardList,
  Globe,
  MessageSquare,
  Wallet,
} from 'lucide-react'

export type NavItem =
  | { name: string; href: string; icon: string; lucideIcon?: undefined }
  | { name: string; href: string; lucideIcon: ElementType; icon?: undefined }

export const navigationItems: NavItem[] = [
  { name: 'Дашборд', href: '/', icon: '/navigate/dashboard.svg' },
  { name: 'Сотрудники', href: '/employees', icon: '/navigate/employees.svg' },
  { name: 'Расписание', href: '/schedule', lucideIcon: Calendar },
  { name: 'Телефония', href: '/telephony', icon: '/navigate/telephony.svg' },
  { name: 'Заявки с сайта', href: '/site-orders', lucideIcon: Globe },
  { name: 'Заказы', href: '/orders', icon: '/navigate/orders.svg' },
  { name: 'Обращения', href: '/appeals', lucideIcon: MessageSquare },
  { name: 'Касса', href: '/cashbox', icon: '/navigate/cash.svg' },
  { name: 'Отчеты', href: '/reports', icon: '/navigate/reports.svg' },
  { name: 'Справочники', href: '/references', lucideIcon: BookOpen },
  { name: 'Администрирование', href: '/admin', icon: '/navigate/admin.svg' },
]

export const mobileBottomTabs = [
  { name: 'Отчеты', href: '/reports', icon: ChartColumnBig },
  { name: 'Заказы', href: '/orders', icon: ClipboardList },
  { name: 'Касса', href: '/cashbox', icon: Wallet },
] as const

export const mobileQuickAccessHrefs = new Set(['/orders', '/cashbox', '/reports', '/profile'])
