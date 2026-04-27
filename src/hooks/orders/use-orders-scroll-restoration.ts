import { useCallback, useEffect, useRef } from 'react'

export function useOrdersScrollRestoration(storageKey: string) {
  const hasRestoredScroll = useRef(false)
  const isBackNavigation = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const navigationType = navEntries.length > 0 ? navEntries[0].type : 'navigate'

    if (navigationType === 'reload' || navigationType === 'navigate') {
      sessionStorage.removeItem(storageKey)
      isBackNavigation.current = false
      return
    }

    if (navigationType === 'back_forward') {
      isBackNavigation.current = true
    }
  }, [storageKey])

  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(storageKey, window.scrollY.toString())
    }
  }, [storageKey])

  const restoreScrollPosition = useCallback(() => {
    if (typeof window === 'undefined' || hasRestoredScroll.current || !isBackNavigation.current) return

    const savedPosition = sessionStorage.getItem(storageKey)
    if (!savedPosition) return

    setTimeout(() => {
      window.scrollTo(0, parseInt(savedPosition, 10))
      hasRestoredScroll.current = true
      sessionStorage.removeItem(storageKey)
    }, 100)
  }, [storageKey])

  return {
    saveScrollPosition,
    restoreScrollPosition,
  }
}
