import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { API_BASE_URL, apiFetch, cartHeaders } from '../../lib/cart'

type OrderSummary = {
  id: string
  orderCode: string
  status: string
  total: number
  createdAt: string
  _count?: { items?: number }
}

type ApiPayload<T> = { data?: T; message?: string; error?: string }

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

const statusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPING: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

function statusLabel(status: string) {
  return statusLabels[status] || status
}

function statusClass(status: string) {
  return statusStyles[status] || 'bg-slate-100 text-slate-700'
}

function apiMessage(payload: ApiPayload<unknown>, fallback: string) {
  return payload.message || payload.error || fallback
}

export default function OrdersPage() {
  const router = useRouter()
  const { authenticated, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  const loadOrders = useCallback(async (signal: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/orders`, {
        signal,
        headers: cartHeaders(),
      })
      const payload = await response.json() as ApiPayload<OrderSummary[]>
      if (response.status === 401) {
        void router.replace('/login?returnUrl=/orders')
        return
      }
      if (!response.ok) throw new Error(apiMessage(payload, 'Không thể tải danh sách đơn hàng.'))
      if (!signal.aborted) setOrders(payload.data || [])
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Không thể tải danh sách đơn hàng.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authLoading) return
    if (!authenticated) {
      void router.replace('/login?returnUrl=/orders')
      return
    }
    const controller = new AbortController()
    void loadOrders(controller.signal)
    return () => controller.abort()
  }, [authLoading, authenticated, loadOrders, retry, router])

  if (authLoading || loading) return <OrdersSkeleton />
  if (error) return <OrdersError message={error} onRetry={() => setRetry((value) => value + 1)} />

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="font-bold text-blue-700">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span>Đơn hàng của tôi</span>
        </nav>
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Account</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Đơn hàng của tôi</h1>
        </div>

        {orders.length === 0 ? (
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="text-5xl">📦</div>
            <h2 className="mt-5 text-2xl font-black">Bạn chưa có đơn hàng nào</h2>
            <p className="mx-auto mt-3 max-w-md text-slate-500">Khám phá các sản phẩm công nghệ và bắt đầu đơn hàng đầu tiên của bạn.</p>
            <Link href="/products" className="mt-7 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Tiếp tục mua sắm</Link>
          </section>
        ) : (
          <section className="mt-8 space-y-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Mã đơn hàng</p>
                    <h2 className="mt-1 text-lg font-black">{order.orderCode}</h2>
                    <p className="mt-1 text-sm text-slate-500">{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                  <span className={`self-start rounded-full px-3 py-1 text-xs font-black ${statusClass(order.status)}`}>{statusLabel(order.status)}</span>
                </div>
                <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    <span>{order._count?.items ?? 0} sản phẩm</span>
                    <strong className="text-lg text-blue-700">{formatPrice(order.total)}</strong>
                  </div>
                  <Link href={`/orders/${order.id}`} className="inline-flex justify-center rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-50">Xem chi tiết</Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

function OrdersSkeleton() {
  return <main className="min-h-screen bg-[#f4f7fb] px-4 py-8"><div className="mx-auto max-w-6xl animate-pulse"><div className="h-4 w-40 rounded bg-slate-200" /><div className="mt-8 h-10 w-72 rounded bg-slate-200" /><div className="mt-8 space-y-4">{[1, 2, 3].map((item) => <div key={item} className="h-36 rounded-2xl bg-white shadow-sm" />)}</div></div></main>
}

function OrdersError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="min-h-screen bg-[#f4f7fb] px-4 py-16"><div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black">Không thể tải đơn hàng</h1><p role="alert" className="mt-3 text-red-700">{message}</p><button type="button" onClick={onRetry} className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Thử lại</button></div></main>
}
