import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type OrderRecord = {
  id: string
  orderCode: string
  status: string
  total: number
  createdAt: string
  recipientName?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  _count?: {
    items?: number
  }
}

const statusMap: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất',
}

const moneyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AdminOrdersPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return

    const controller = new AbortController()
    const loadOrders = async () => {
      setLoadingOrders(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        const payload = await response.json() as { success?: boolean; data?: OrderRecord[]; message?: string; error?: string }
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || payload.error || 'Không thể tải đơn hàng.')
        }

        setOrders(Array.isArray(payload.data) ? payload.data : [])
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError((loadError as Error).message || 'Không thể tải đơn hàng.')
        }
      } finally {
        setLoadingOrders(false)
      }
    }

    void loadOrders()
    return () => controller.abort()
  }, [authenticated, refreshKey, token, user])

  const totalOrders = useMemo(() => orders.length, [orders])

  if (loading) {
    return (
      <AdminLayout title="Đơn hàng" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không có quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để xem đơn hàng.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Đơn hàng" subtitle="Danh sách đơn hàng thực tế của tài khoản đã xác thực.">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Tổng cộng</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{totalOrders}</p>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            Tải lại
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">Không thể tải dữ liệu đơn hàng</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
              Thử lại
            </button>
          </div>
        ) : null}

        {loadingOrders ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-800">Chưa có đơn hàng nào</p>
            <p className="mt-2 text-sm text-slate-500">Danh sách đơn hàng sẽ xuất hiện khi người dùng thực hiện đặt hàng.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-500 md:grid">
              <span>Mã đơn</span>
              <span>Khách hàng</span>
              <span>Tổng tiền</span>
              <span>Trạng thái</span>
              <span>Ngày tạo</span>
            </div>

            <div className="divide-y divide-slate-200">
              {orders.map((order) => (
                <div key={order.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] md:items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-black text-slate-900">{order.orderCode}</p>
                    <p className="text-xs text-slate-500">{order._count?.items ?? 0} sản phẩm</p>
                  </div>

                  <div className="text-sm text-slate-600 md:truncate">
                    <p className="font-semibold text-slate-800">{order.recipientName || '—'}</p>
                    <p className="text-xs text-slate-500">{[order.ward, order.district, order.province].filter(Boolean).join(', ') || '—'}</p>
                  </div>

                  <div className="text-sm font-bold text-slate-900">{moneyFormatter.format(Number(order.total || 0))}</div>

                  <div>
                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                      {statusMap[order.status] || order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:justify-start">
                    <span className="text-sm text-slate-600">{formatDate(order.createdAt)}</span>
                    <Link href={`/admin/orders/${order.id}`} className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-blue-500 hover:text-blue-700">
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
