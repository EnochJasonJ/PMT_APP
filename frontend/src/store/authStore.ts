import { create } from "zustand"
import { persist } from "zustand/middleware"

interface User {
  id: number
  full_name: string
  email: string
  roles: { id: number; name: string }[]
}

interface AuthState {
  user: User | null
  token: string | null
  hasHydrated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setHasHydrated: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      hasHydrated: false,
      setAuth: (user, token) => {
        localStorage.setItem("token", token)
        set({ user, token })
      },
      logout: () => {
        localStorage.removeItem("token")
        set({ user: null, token: null })
        window.location.href = "/login"
      },
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: "auth-storage",
      // Persist only user + token; never persist the hydration flag.
      partialize: (state) => ({ user: state.user, token: state.token }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)
