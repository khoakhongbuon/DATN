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

export function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const base = API_BASE_URL.replace(/\/+$/, '')
    return `${base}${input}`
  }
  return input
}

export function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = resolveApiUrl(input)
  return fetch(url, { ...init, credentials: 'include' })
}

export async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text().catch(() => '')
    if (response.status === 404) {
      throw new Error('Dữ liệu không tồn tại (404 Not Found).')
    }
    if (response.status === 403) {
      throw new Error('Bạn không có quyền truy cập chức năng này (403 Forbidden).')
    }
    if (response.status === 401) {
      throw new Error('Phiên đăng nhập đã hết hạn (401 Unauthorized).')
    }
    const snippet = text.slice(0, 120).trim()
    throw new Error(
      snippet
        ? `Lỗi máy chủ (${response.status} ${response.statusText}): ${snippet}`
        : `${fallbackError} (${response.status})`
    )
  }
  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${fallbackError}: Phản hồi JSON không hợp lệ.`)
  }
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
