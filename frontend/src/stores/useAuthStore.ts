import { create } from 'zustand'
import { apiRequest } from '../lib/api-client'

export interface UserAddressItem {
  id: string
  label: string
  recipientName: string
  phone: string
  streetLine1: string
  streetLine2?: string | null
  ward?: string | null
  district: string
  city: string
  postalCode?: string | null
  isDefault: boolean
}

export interface AuthUserProfile {
  id: string
  email: string
  username?: string | null
  full_name: string
  phone?: string | null
  avatar_url?: string | null
  bio?: string | null
  roles: string[]
  permissions: string[]
  addresses?: UserAddressItem[]
}

interface AuthState {
  user: AuthUserProfile | null
  isAuthenticated: boolean
  isAuthModalOpen: boolean
  isAccountModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
  setAccountModalOpen: (open: boolean) => void
  setSession: (accessToken: string, refreshToken: string, user: AuthUserProfile) => void
  clearSession: () => void
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: Boolean(localStorage.getItem('techcart_access_token')),
  isAuthModalOpen: false,
  isAccountModalOpen: false,
  setAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setAccountModalOpen: (open) => set({ isAccountModalOpen: open }),
  setSession: (accessToken, refreshToken, user) => {
    localStorage.setItem('techcart_access_token', accessToken)
    localStorage.setItem('techcart_refresh_token', refreshToken)
    set({ user, isAuthenticated: true, isAuthModalOpen: false })
  },
  clearSession: () => {
    localStorage.removeItem('techcart_access_token')
    localStorage.removeItem('techcart_refresh_token')
    set({ user: null, isAuthenticated: false, isAccountModalOpen: false })
  },
  fetchProfile: async () => {
    const token = localStorage.getItem('techcart_access_token')
    if (!token) return
    try {
      const res = await apiRequest<AuthUserProfile>('/users/me')
      set({ user: res.data, isAuthenticated: true })
    } catch {
      localStorage.removeItem('techcart_access_token')
      set({ user: null, isAuthenticated: false })
    }
  }
}))

