import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  name?: string  // Может отсутствовать для callcentre_admin (таблица callcentre_admin не имеет поля name)
  login: string
  role: string   // 'admin' для пользователей из таблицы callcentre_admin
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

