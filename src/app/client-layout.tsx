'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/navigation'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login' || pathname === '/logout'

  return (
    <>
      {!isLoginPage && <Navigation />}
      <main className={isLoginPage ? '' : 'lg:ml-64 pt-16 lg:pt-0'}>
        {children}
      </main>
    </>
  )
}

