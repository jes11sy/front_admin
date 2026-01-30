/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone режим для Docker
  output: 'standalone',
  
  // Генерируем уникальный build ID для cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  reactStrictMode: true,
  
  // Отключаем source maps в production для безопасности
  productionBrowserSourceMaps: false,
  
  // Отключаем TypeScript проверки во время сборки для Docker  
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.twcstorage.ru',
      },
    ],
  },
  
  // Оптимизация сборки
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Turbopack конфигурация (пустая, чтобы использовать дефолтные настройки)
  turbopack: {},
  
  // Заголовки безопасности
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      // Scripts: unsafe-eval только для dev (hot reload), unsafe-inline для Next.js
      // TODO: Заменить 'unsafe-inline' на nonce-based CSP для улучшения безопасности
      // См. https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
      isDevelopment 
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" 
        : "script-src 'self' 'unsafe-inline'", // ⚠️ В production без unsafe-eval, но unsafe-inline остается
      // Styles: Tailwind и Next.js используют inline styles
      // TODO: Использовать CSS-in-JS библиотеки с nonce support
      "style-src 'self' 'unsafe-inline'",
      // Images
      "img-src 'self' data: https: blob:",
      // Fonts
      "font-src 'self' data:",
      // Connect (API)
      isDevelopment
        ? "connect-src 'self' https: wss: ws: http://localhost:* ws://localhost:*"
        : "connect-src 'self' https://api.lead-schem.ru wss://api.lead-schem.ru https://api.test-shem.ru wss://api.test-shem.ru https://s3.twcstorage.ru",
      // Media
      "media-src 'self' https://s3.twcstorage.ru https://s3.timeweb.com",
      // Objects: запрещаем
      "object-src 'none'",
      // Base URI
      "base-uri 'self'",
      // Form actions
      "form-action 'self'",
      // Frame ancestors
      "frame-ancestors 'none'",
      // Upgrade insecure requests в production
      isDevelopment ? "" : "upgrade-insecure-requests",
    ].filter(Boolean).join('; ')

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspDirectives
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
          },
        ],
      },
    ]
  },
  
  // Compression
  compress: true,
  
  // Отключаем x-powered-by заголовок
  poweredByHeader: false,
}

module.exports = nextConfig
