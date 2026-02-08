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
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
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
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Script id="error-handler" strategy="beforeInteractive">
          {`
            // Глобальная обработка необработанных ошибок
            window.addEventListener('error', function(event) {
              console.error('Global error caught:', event.error);
              // Предотвращаем падение приложения
              event.preventDefault();
            });
            
            // Обработка необработанных промисов
            window.addEventListener('unhandledrejection', function(event) {
              console.error('Unhandled promise rejection:', event.reason);
              // Предотвращаем падение приложения
              event.preventDefault();
            });
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ToastProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </ToastProvider>
      </body>
    </html>
  )
}

