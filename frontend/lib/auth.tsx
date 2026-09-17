import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type AuthUser = {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
}

type AuthContextValue = {
  user: AuthUser | null
  token: string
  loading: boolean
  authenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
const TOKEN_KEY = 'tk_auth_token'
const USER_KEY = 'tk_auth_user'
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredSession() {
  if (typeof window === 'undefined') return { token: '', user: null as AuthUser | null }
  const token = window.localStorage.getItem(TOKEN_KEY) || ''
  const rawUser = window.localStorage.getItem(USER_KEY)
  if (!token || !rawUser) return { token, user: null }
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser }
  } catch {
    return { token, user: null }
  }
}

function responseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: unknown; error?: unknown }
    if (typeof value.message === 'string') return value.message
    if (typeof value.error === 'string') return value.error
  }
  return fallback
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY)
    window.localStorage.removeItem(USER_KEY)
    setToken('')
    setUser(null)
  }, [])

  useEffect(() => {
    const session = readStoredSession()
    if (!session.token) {
      setLoading(false)
      return
    }
    let active = true
    fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}` },
    })
      .then(async (response) => {
        const payload = await response.json() as { success?: boolean; data?: AuthUser; message?: string }
        if (!response.ok || !payload.data) throw new Error(responseMessage(payload, 'Phiên đăng nhập đã hết hạn.'))
        if (!active) return
        setToken(session.token)
        setUser(payload.data)
        window.localStorage.setItem(USER_KEY, JSON.stringify(payload.data))
      })
      .catch(() => {
        if (active) clearSession()
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [clearSession])

  const authenticate = useCallback(async (path: string, body: Record<string, string>) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json() as { data?: { token?: string; user?: AuthUser }; message?: string; error?: string }
    if (!response.ok || !payload.data?.token || !payload.data.user) {
      throw new Error(responseMessage(payload, 'Không thể xác thực tài khoản.'))
    }
    window.localStorage.setItem(TOKEN_KEY, payload.data.token)
    window.localStorage.setItem(USER_KEY, JSON.stringify(payload.data.user))
    setToken(payload.data.token)
    setUser(payload.data.user)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    authenticated: Boolean(user && token),
    login: (email, password) => authenticate('login', { email, password }),
    register: (name, email, password) => authenticate('register', { name, email, password }),
    logout: clearSession,
  }), [authenticate, clearSession, loading, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export const authStorageKeys = { token: TOKEN_KEY, user: USER_KEY }
