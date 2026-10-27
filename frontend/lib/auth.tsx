import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { API_BASE_URL, apiFetch } from './cart'

export type AuthUser = {
  id: string
  name: string | null
  email: string
  phone?: string | null
  role?: string
  googleLinked?: boolean
}

type AuthContextValue = {
  user: AuthUser | null
  loading: boolean
  authenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  googleLogin: (credential: string) => Promise<void>
  linkGoogle: (credential: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function responseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: unknown; error?: unknown }
    if (typeof value.message === 'string') return value.message
    if (typeof value.error === 'string') return value.error
  }
  return fallback
}

async function readPayload(response: Response) {
  return await response.json() as {
    success?: boolean
    data?: AuthUser | { user?: AuthUser }
    message?: string
    error?: string
  }
}

function payloadUser(data: AuthUser | { user?: AuthUser } | undefined) {
  if (!data) return undefined
  return 'id' in data ? data : data.user
}

export function safeReturnUrl(value: unknown) {
  if (
    typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
  ) {
    return value
  }
  return '/'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiFetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        const payload = await readPayload(response)
        const authenticatedUser = payloadUser(payload.data)
        if (!response.ok || !authenticatedUser) {
          if (response.status !== 401) {
            throw new Error(responseMessage(payload, 'Không thể kiểm tra phiên đăng nhập.'))
          }
          return
        }
        if (active) setUser(authenticatedUser)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const authenticate = useCallback(async (path: string, body: Record<string, string>) => {
    const response = await apiFetch(`${API_BASE_URL}/api/auth/${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await readPayload(response)
    const authenticatedUser = payloadUser(payload.data)
    if (!response.ok || !authenticatedUser) {
      throw new Error(responseMessage(payload, 'Không thể xác thực tài khoản.'))
    }
    setUser(authenticatedUser)
  }, [])

  const logout = useCallback(async () => {
    const response = await apiFetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      throw new Error(responseMessage(payload, 'Không thể đăng xuất. Vui lòng thử lại.'))
    }
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    authenticated: Boolean(user),
    login: (email, password) => authenticate('login', { email, password }),
    register: (name, email, password) => authenticate('register', { name, email, password }),
    googleLogin: (credential) => authenticate('google', { credential }),
    linkGoogle: async (credential) => {
      await authenticate('google/link', { credential })
    },
    logout,
  }), [authenticate, loading, logout, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
