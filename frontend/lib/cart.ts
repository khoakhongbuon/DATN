export type CartProduct = {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  stock: number
  brand?: { name: string } | null
  images?: Array<{ url: string; alt?: string | null; sortOrder?: number | null }>
}

export type CartItem = {
  id: string
  quantity: number
  product: CartProduct
}

export type Cart = {
  id: string
  items: CartItem[]
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

export function getStoredCartIdentity() {
  if (typeof window === 'undefined') return { userId: '', token: '' }

  const token = window.localStorage.getItem('tk_auth_token') || ''
  const rawUser = window.localStorage.getItem('tk_auth_user')
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser) as { id?: unknown; userId?: unknown }
      const userId = typeof user.id === 'string' ? user.id : typeof user.userId === 'string' ? user.userId : ''
      return { userId, token }
    } catch {
      return { userId: '', token }
    }
  }

  return { userId: '', token }
}

export function cartHeaders(token: string, includeJson = false): HeadersInit {
  return {
    Accept: 'application/json',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function productPrice(product: CartProduct) {
  return product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price
    ? product.salePrice
    : product.price
}

export function productDiscount(product: CartProduct) {
  const salePrice = productPrice(product)
  if (salePrice >= product.price || product.price <= 0) return null
  return Math.round(((product.price - salePrice) / product.price) * 100)
}
