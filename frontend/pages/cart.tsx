import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  API_BASE_URL,
  Cart,
  CartItem,
  cartHeaders,
  getStoredCartIdentity,
  productDiscount,
  productPrice,
} from '../lib/cart'
import { useAuth } from '../lib/auth'

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [identityReady, setIdentityReady] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [retry, setRetry] = useState(0)
  const [busyItems, setBusyItems] = useState<Record<string, boolean>>({})
  const [clearing, setClearing] = useState(false)
  const { user, token, authenticated, loading: authLoading } = useAuth()

  const loadCart = useCallback(async (signal?: AbortSignal) => {
    const userId = user?.id || ''
    setIdentityReady(true)
    if (!userId) {
      setCart(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(userId)}`, {
        signal,
        headers: cartHeaders(token),
      })
      if (!response.ok) throw new Error('Không thể tải giỏ hàng.')
      const payload = await response.json() as { success: boolean; data: Cart | null }
      setCart(payload.data ?? { id: '', items: [] })
    } catch (loadError) {
      if ((loadError as Error).name === 'AbortError') return
      setError('Không thể tải giỏ hàng. Vui lòng thử lại.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [token, user?.id])

  useEffect(() => {
    if (authLoading) return
    const controller = new AbortController()
    if (authenticated) void loadCart(controller.signal)
    else {
      setIdentityReady(true)
      setLoading(false)
    }
    return () => controller.abort()
  }, [authLoading, authenticated, loadCart, retry])

  const items = cart?.items ?? []
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + productPrice(item.product) * item.quantity, 0), [items])
  const originalTotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items])
  const discount = Math.max(0, originalTotal - subtotal)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

  const updateItem = async (item: CartItem, quantity: number) => {
    const boundedQuantity = Math.min(item.product.stock, Math.max(1, Math.floor(quantity) || 1))
    const userId = user?.id || ''
    if (!userId || boundedQuantity === item.quantity) return
    setBusyItems((previous) => ({ ...previous, [item.id]: true }))
    setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(userId)}/items/${encodeURIComponent(item.id)}`, {
        method: 'PUT',
        headers: cartHeaders(token, true),
        body: JSON.stringify({ quantity: boundedQuantity }),
      })
      if (!response.ok) throw new Error('Không thể cập nhật số lượng.')
      window.dispatchEvent(new Event('tk-cart-updated'))
      await loadCart()
    } catch {
      setNotice('Không thể cập nhật số lượng. Vui lòng thử lại.')
    } finally {
      setBusyItems((previous) => ({ ...previous, [item.id]: false }))
    }
  }

  const deleteItem = async (item: CartItem) => {
    const userId = user?.id || ''
    if (!userId) return
    setBusyItems((previous) => ({ ...previous, [item.id]: true }))
    setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(userId)}/items/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
        headers: cartHeaders(token),
      })
      if (!response.ok) throw new Error('Không thể xóa sản phẩm.')
      window.dispatchEvent(new Event('tk-cart-updated'))
      await loadCart()
    } catch {
      setNotice('Không thể xóa sản phẩm khỏi giỏ hàng.')
    } finally {
      setBusyItems((previous) => ({ ...previous, [item.id]: false }))
    }
  }

  const clearCart = async () => {
    const userId = user?.id || ''
    if (!userId || items.length === 0) return
    setClearing(true)
    setNotice('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(userId)}/items`, {
        method: 'DELETE',
        headers: cartHeaders(token),
      })
      if (!response.ok) throw new Error('Không thể xóa giỏ hàng.')
      window.dispatchEvent(new Event('tk-cart-updated'))
      await loadCart()
    } catch {
      setNotice('Không thể xóa giỏ hàng. Vui lòng thử lại.')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:text-blue-500">Trang chủ</Link>
          <span className="mx-2">/</span><span>Giỏ hàng</span>
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">TK Checkout</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Giỏ hàng</h1><p className="mt-2 text-sm text-slate-500">{totalQuantity ? `${totalQuantity} sản phẩm trong giỏ hàng` : 'Kiểm tra lại sản phẩm trước khi thanh toán.'}</p></div>
          {items.length > 0 ? <button type="button" onClick={clearCart} disabled={clearing} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{clearing ? 'Đang xóa...' : 'Xóa toàn bộ'}</button> : null}
        </header>

        {!identityReady || authLoading || loading ? <CartSkeleton /> : !authenticated || !user?.id ? <LoginRequired /> : error ? <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} /> : items.length === 0 ? <EmptyCart /> : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section aria-label="Sản phẩm trong giỏ hàng" className="space-y-3">
              {notice ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{notice}</p> : null}
              {items.map((item) => <CartItemCard key={item.id} item={item} busy={Boolean(busyItems[item.id])} onUpdate={updateItem} onDelete={deleteItem} />)}
            </section>
            <OrderSummary subtotal={subtotal} discount={discount} />
          </div>
        )}
      </div>
    </div>
  )
}

function CartItemCard({ item, busy, onUpdate, onDelete }: { item: CartItem; busy: boolean; onUpdate: (item: CartItem, quantity: number) => void; onDelete: (item: CartItem) => void }) {
  const discount = productDiscount(item.product)
  const image = item.product.images?.[0]
  return <article className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:flex sm:items-center sm:gap-4"><div className="flex gap-4"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-2xl font-black text-blue-200">{image?.url ? <img src={image.url} alt={image.alt || item.product.name} className="h-full w-full object-contain" /> : item.product.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">{item.product.brand?.name || 'TK'}</p><Link href={`/products/${item.product.slug}`} className="mt-1 block line-clamp-2 font-bold text-slate-900 hover:text-blue-700">{item.product.name}</Link><p className="mt-1 text-xs text-slate-500">{item.product.stock > 0 ? `Còn ${item.product.stock}` : 'Hết hàng'}</p></div></div><div className="mt-4 flex items-center justify-between gap-3 sm:mt-0 sm:ml-auto sm:flex-col sm:items-end"><div className="text-right"><p className="font-black text-blue-700">{formatPrice(productPrice(item.product))}</p>{discount ? <p className="text-xs text-slate-400 line-through">{formatPrice(item.product.price)}</p> : null}</div><div className="flex items-center gap-2"><button type="button" disabled={busy || item.quantity <= 1} onClick={() => onUpdate(item, item.quantity - 1)} aria-label={`Giảm ${item.product.name}`} className="h-9 w-9 rounded-lg border border-slate-200 font-bold disabled:opacity-40">−</button><span className="min-w-8 text-center text-sm font-bold">{busy ? '...' : item.quantity}</span><button type="button" disabled={busy || item.quantity >= item.product.stock} onClick={() => onUpdate(item, item.quantity + 1)} aria-label={`Tăng ${item.product.name}`} className="h-9 w-9 rounded-lg border border-slate-200 font-bold disabled:opacity-40">+</button><button type="button" disabled={busy} onClick={() => onDelete(item)} className="ml-2 text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-40">Xóa</button></div><p className="text-sm font-black text-slate-900">Tạm tính: {formatPrice(productPrice(item.product) * item.quantity)}</p></div></article>
}

function OrderSummary({ subtotal, discount }: { subtotal: number; discount: number }) {
  return <aside className="h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-xl font-black">Tóm tắt đơn hàng</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Tạm tính</dt><dd className="font-semibold">{formatPrice(subtotal)}</dd></div>{discount > 0 ? <div className="flex justify-between gap-3 text-emerald-600"><dt>Giảm giá</dt><dd className="font-semibold">-{formatPrice(discount)}</dd></div> : null}<div className="flex justify-between gap-3 border-t border-slate-200 pt-4 text-base"><dt className="font-black">Tổng cộng</dt><dd className="font-black text-blue-700">{formatPrice(subtotal)}</dd></div></dl><p className="mt-4 text-xs leading-5 text-slate-500">Phí vận chuyển và khuyến mãi sẽ được xác nhận ở bước thanh toán.</p>  <Link href="/checkout" className="mt-5 block w-full rounded-xl bg-blue-700 px-4 py-3.5 text-center text-sm font-black text-white hover:bg-blue-800">Tiến hành thanh toán</Link></aside>
}

function CartSkeleton() {
  return <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-3">{[1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div><div className="h-64 animate-pulse rounded-2xl bg-slate-200" /></div>
}

function LoginRequired() {
  return <div className="mt-8 rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true"><CartIcon /></div><h2 className="mt-4 text-xl font-black">Vui lòng đăng nhập để sử dụng giỏ hàng.</h2><p className="mt-2 text-sm text-slate-500">Giỏ hàng sẽ được kết nối khi tài khoản người dùng có sẵn.</p><Link href="/products" className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Tiếp tục mua sắm</Link></div>
}

function EmptyCart() {
  return <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true"><CartIcon /></div><h2 className="mt-4 text-xl font-black">Giỏ hàng của bạn đang trống</h2><p className="mt-2 text-sm text-slate-500">Khám phá các sản phẩm công nghệ phù hợp với bạn.</p><Link href="/products" className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Tiếp tục mua sắm</Link></div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 px-6 py-12 text-center"><h2 className="text-xl font-black text-red-800">Không thể tải giỏ hàng</h2><p className="mt-2 text-sm text-red-600">{message}</p><button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white">Thử lại</button></div>
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><path d="M3 4h2l2 11h10l2-8H6" /><circle cx="9" cy="19" r="1.5" /><circle cx="17" cy="19" r="1.5" /></svg>
}
