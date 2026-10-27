export type CartProduct = {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  stock: number
  brand?: { name: string } | null
  category?: { name?: string; slug?: string } | null
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

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  return fetch(input, { ...init, credentials: 'include' })
}

export function cartHeaders(includeJson = false): HeadersInit {
  return {
    Accept: 'application/json',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
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
