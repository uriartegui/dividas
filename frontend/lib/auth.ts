import { create } from 'zustand'
import api from './api'

interface User {
  userId: string
  tenantId: string
  role: string
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string, tenantSlug: string) => Promise<void>
  logout: () => Promise<void>
  init: () => void
}

function parseJwt(token: string): User | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  init: () => {
    const token = localStorage.getItem('accessToken')
    const user = token ? parseJwt(token) : null
    set({ user, loading: false })
  },

  login: async (email, password, tenantSlug) => {
    const { data } = await api.post('/auth/login', { email, password, tenantSlug })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    const user = parseJwt(data.accessToken)
    set({ user })
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) await api.post('/auth/logout', { refreshToken }).catch(() => {})
    localStorage.clear()
    set({ user: null })
    window.location.href = '/login'
  },
}))
