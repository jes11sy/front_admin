'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { saveSettings, getSettings } from '@/lib/settings-storage'

export type ThemeMode = 'light' | 'dark'

interface DesignState {
  theme: ThemeMode
  _hasHydrated: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setHasHydrated: (state: boolean) => void
  restoreFromIndexedDB: () => Promise<void>
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      _hasHydrated: false,

      setTheme: (theme) => {
        set({ theme })
        // Дублируем в IndexedDB для PWA
        saveSettings({ theme }).catch(() => {})
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: newTheme })
        saveSettings({ theme: newTheme }).catch(() => {})
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state })
      },

      /**
       * Восстановление настроек из IndexedDB (для PWA когда localStorage очищен)
       */
      restoreFromIndexedDB: async () => {
        try {
          const settings = await getSettings()
          const currentState = get()
          
          // Если localStorage был очищен (дефолтные значения), восстанавливаем из IndexedDB
          if (currentState.theme === 'light') {
            if (settings.theme !== 'light') {
              set({
                theme: settings.theme,
              })
            }
          }
        } catch (error) {
          console.warn('[DesignStore] Failed to restore from IndexedDB:', error)
        }
      },
    }),
    {
      name: 'admin-design-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // После гидратации из localStorage, пробуем восстановить из IndexedDB
        if (state) {
          state.setHasHydrated(true)
          state.restoreFromIndexedDB()
        }
      },
    }
  )
)
