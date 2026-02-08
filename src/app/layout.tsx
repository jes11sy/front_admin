import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navigation } from '@/components/navigation'
import ClientLayout from './client-layout'
import { ToastProvider } from '@/components/ui/toast'
import Script from 'next/script'

const inter = Inter({ 
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Новые Схемы Рук',
  description: 'Панель управления учредителя',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo/favicon.png',
    shortcut: '/logo/favicon.png',
    apple: '/logo/pwa_light.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'НС Админ',
  },
  themeColor: '#0d5c4b',
}

// Скрипт для предотвращения мерцания темы
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('admin-design-storage');
    if (stored) {
      var parsed = JSON.parse(stored);
      var theme = parsed.state && parsed.state.theme;
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.backgroundColor = '#1e2530';
        document.documentElement.style.colorScheme = 'dark';
        document.body && (document.body.style.backgroundColor = '#1e2530');
      }
    }
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            html.dark, html.dark body { background-color: #1e2530 !important; }
            html:not(.dark), html:not(.dark) body { background-color: #fff; }
          `
        }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            window.addEventListener('error', function(event) {
              console.error('Global error caught:', event.error);
              event.preventDefault();
            });
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              event.preventDefault();
            });
          `}
        </Script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}

