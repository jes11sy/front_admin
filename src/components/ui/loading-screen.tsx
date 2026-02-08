'use client'

import { useDesignStore } from '@/store/design.store'
import { useState, useEffect } from 'react'

interface LoadingScreenProps {
  /** Текст под спиннером */
  message?: string
  /** Полноэкранный режим */
  fullScreen?: boolean
  /** Дополнительные классы */
  className?: string
}

/**
 * Хук для определения темы без мелькания
 * Сначала проверяет CSS класс dark на html, потом синхронизируется со store
 */
function useThemeWithoutFlash() {
  const { theme } = useDesignStore()
  const [isDark, setIsDark] = useState(() => {
    // На сервере или при первом рендере проверяем CSS класс
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark')
    }
    return false
  })

  useEffect(() => {
    // После гидратации синхронизируемся со store
    setIsDark(theme === 'dark')
  }, [theme])

  return isDark
}

/**
 * Единый компонент загрузки для всего приложения
 * Используется на:
 * - AuthGuard (проверка сессии)
 * - Suspense fallback
 * - Любые полноэкранные загрузки
 */
export function LoadingScreen({ 
  message,
  fullScreen = true,
  className = ''
}: LoadingScreenProps) {
  const isDark = useThemeWithoutFlash()

  const content = (
    <div className="flex flex-col items-center justify-center px-4">
      {/* Спиннер */}
      <div className="relative w-12 h-12 mb-4">
        <div className={`w-full h-full rounded-full border-4 ${isDark ? 'border-teal-600/30' : 'border-teal-600/20'}`} />
        <div className={`absolute inset-0 rounded-full border-4 border-transparent border-t-teal-600 animate-spin`} />
      </div>
      {message && (
        <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{message}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#1e2530]' : 'bg-white'} ${className}`}>
        {content}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center py-12 ${isDark ? 'bg-[#1e2530]' : 'bg-white'} ${className}`}>
      {content}
    </div>
  )
}

/**
 * Минимальный спиннер для использования внутри компонентов
 */
export function LoadingSpinner({ 
  size = 'md', 
  className = '' 
}: { 
  size?: 'sm' | 'md' | 'lg'
  className?: string 
}) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-2 border-teal-600/20`} />
      <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-2 border-transparent border-t-teal-600 animate-spin`} />
    </div>
  )
}

/**
 * Состояние загрузки для контента (таблицы, списки и т.д.)
 */
export function LoadingState({ 
  message = 'Загрузка...', 
  size = 'md',
  className = ''
}: { 
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 space-y-3 ${className}`}>
      <LoadingSpinner size={size} />
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  )
}
