import { useEffect, useState } from 'react'
import { useDesignStore } from '@/store/design.store'

export function getThemeFromDOM(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  if (document.documentElement.classList.contains('dark')) {
    return 'dark'
  }

  try {
    const stored = localStorage.getItem('admin-design-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.theme || 'light'
    }
  } catch {
    return 'light'
  }

  return 'light'
}

export function useThemeWithoutFlash(): 'light' | 'dark' {
  const storeTheme = useDesignStore((state) => state.theme)
  const hasHydrated = useDesignStore((state) => state._hasHydrated)
  const [clientTheme, setClientTheme] = useState<'light' | 'dark'>('light')
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setClientTheme(getThemeFromDOM())
    setIsMounted(true)
  }, [])

  if (hasHydrated) {
    return storeTheme
  }

  return isMounted ? clientTheme : 'light'
}
