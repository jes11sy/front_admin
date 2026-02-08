/**
 * Zustand store для управления состоянием аутентификации
 * Централизованное хранилище для данных пользователя
 * 
 * ВАЖНО: Токены хранятся в httpOnly cookies на сервере
 * Store используется только для кеширования данных пользователя на клиенте
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

interface User {
  id: number
  name?: string
  login: string
  role: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  clearAuth: () => void
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  checkAuth: () => Promise<boolean>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true, // true по умолчанию, чтобы AuthGuard показывал loading до проверки

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        })
        if (user) {
          logger.debug('User set in store')
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      clearAuth: () => {
        set({ user: null, isAuthenticated: false })
      },

      logout: async () => {
        set({
          user: null,
          isAuthenticated: false,
        })
        await apiClient.logout()
        logger.debug('User logged out')
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData },
          })
        }
      },

      checkAuth: async (): Promise<boolean> => {
        set({ isLoading: true })
        try {
          const response = await apiClient.getProfile()
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.id,
                login: response.data.login,
                name: response.data.name || response.data.login,
                role: response.data.role || 'admin',
              },
              isAuthenticated: true,
              isLoading: false,
            })
            return true
          }
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return false
        } catch (error) {
          logger.error('Auth check failed', { error: String(error) })
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
          return false
        }
      },

      refreshUser: async () => {
        try {
          const response = await apiClient.getProfile()
          if (response.success && response.data) {
            set({
              user: {
                id: response.data.id,
                login: response.data.login,
                name: response.data.name || response.data.login,
                role: response.data.role || 'admin',
              },
            })
          }
        } catch (error) {
          logger.error('Failed to refresh user', { error: String(error) })
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
