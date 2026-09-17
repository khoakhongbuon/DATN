import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type OrderItem = {
  id: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  product?: {
    id?: string
    name?: string
    slug?: string
    images?: Array<{ url?: string | null; alt?: string | null }>
  } | null
}

type Order = {
  id: string
  orderCode: string
  status: string
  subtotal: number
  discount?: number | null
  shippingFee?: number | null
  total: number
  createdAt: string
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  address: string
  items: OrderItem[]
  user?: {
    id?: string
    name?: string
    email?: string
  }
}

type PaymentMethod = 'COD' | 'VNPAY' | 'MOMO'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'

type Payment = {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  transactionId?: string | null
  paidAt?: string | null
  createdAt: string
  updatedAt: string
}

type ApiPayload<T> = { data?: T; message?: string; error?: string }

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

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

const orderStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
}

const orderStatusStyles: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
  REFUNDED: 'Đã hoàn tiền',
}

const paymentStatusStyles: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-slate-100 text-slate-700',
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng',
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
}

const apiMessage = (payload: ApiPayload<unknown>, fallback: string) => payload.message || payload.error || fallback

export default function AdminOrderDetailPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()
  const orderId = typeof router.query.id === 'string' ? router.query.id : ''
  const [order, setOrder] = useState<Order | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loadingOrder, setLoadingOrder] = useState(true)
  const [loadingPayment, setLoadingPayment] = useState(true)
  const [error, setError] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [cancellingOrder, setCancellingOrder] = useState(false)
  const [cancellingPayment, setCancellingPayment] = useState(false)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return
    if (!orderId || !router.isReady) return

    const controller = new AbortController()

    const loadData = async () => {
      setLoadingOrder(true)
      setLoadingPayment(true)
      setError('')
      setPaymentError('')
      setNotFound(false)

      try {
        const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}`, {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const orderPayload = await orderResponse.json() as ApiPayload<Order>
        if (orderResponse.status === 401) {
          void router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
          return
        }
        if (orderResponse.status === 404) {
          setNotFound(true)
          return
        }
        if (!orderResponse.ok || !orderPayload.data) {
          throw new Error(apiMessage(orderPayload, 'Không thể tải chi tiết đơn hàng.'))
        }

        setOrder(orderPayload.data)

        try {
          const paymentResponse = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderPayload.data.id)}/payment`, {
            signal: controller.signal,
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          })

          const paymentPayload = await paymentResponse.json() as ApiPayload<Payment>
          if (paymentResponse.status === 401) {
            void router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
            return
          }
          if (paymentResponse.status === 404) {
            setPayment(null)
          } else if (!paymentResponse.ok || !paymentPayload.data) {
            setPaymentError(apiMessage(paymentPayload, 'Không thể tải trạng thái thanh toán.'))
            setPayment(null)
          } else {
            setPayment(paymentPayload.data)
          }
        } catch (paymentLoadError) {
          if ((paymentLoadError as Error).name !== 'AbortError') {
            setPaymentError((paymentLoadError as Error).message || 'Không thể tải trạng thái thanh toán.')
          }
        }
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError((loadError as Error).message || 'Không thể tải chi tiết đơn hàng.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingOrder(false)
          setLoadingPayment(false)
        }
      }
    }

    void loadData()
    return () => controller.abort()
  }, [authenticated, router, token, retryKey, user])

  const handleCancelOrder = async () => {
    if (!order || !['PENDING', 'CONFIRMED'].includes(order.status)) return
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) return

    setCancellingOrder(true)
    setError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json() as ApiPayload<Order>
      if (response.status === 401) {
        void router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
        return
      }
      if (!response.ok || !payload.data) {
        throw new Error(apiMessage(payload, 'Không thể hủy đơn hàng.'))
      }
      setOrder(payload.data)
    } catch (cancelError) {
      setError((cancelError as Error).message || 'Không thể hủy đơn hàng.')
    } finally {
      setCancellingOrder(false)
    }
  }

  const handleCancelPayment = async () => {
    if (!order || !payment || payment.status !== 'PENDING') return
    if (!window.confirm('Bạn có chắc muốn hủy thanh toán cho đơn hàng này?')) return

    setCancellingPayment(true)
    setPaymentError('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/payment/cancel`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
      const payload = await response.json() as ApiPayload<Payment>
      if (response.status === 401) {
        void router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
        return
      }
      if (!response.ok || !payload.data) {
        throw new Error(apiMessage(payload, 'Không thể hủy thanh toán.'))
      }
      setPayment(payload.data)
    } catch (cancelPaymentError) {
      setPaymentError((cancelPaymentError as Error).message || 'Không thể hủy thanh toán.')
    } finally {
      setCancellingPayment(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Chi tiết đơn hàng" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
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
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để xem chi tiết đơn hàng.</p>
        </div>
      </AdminLayout>
    )
  }

  if (notFound) {
    return (
      <AdminLayout title="Không tìm thấy" subtitle="Đơn hàng không tồn tại hoặc không thuộc quyền truy cập.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">404 — Không tìm thấy đơn hàng</p>
          <p className="mt-2 text-sm">Đơn hàng này không tồn tại hoặc đã bị xóa.</p>
          <Link href="/admin/orders" className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Quay lại danh sách</Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Chi tiết đơn hàng" subtitle="Thông tin đơn hàng, thanh toán và giao hàng thực tế từ backend.">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link href="/admin/orders" className="font-semibold text-blue-600 hover:text-blue-700">Đơn hàng</Link>
            <span>›</span>
            <span className="font-semibold text-slate-700">{order?.orderCode || 'Đang tải...'}</span>
          </div>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:border-blue-500 hover:text-blue-700">
            Tải lại
          </button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">Không thể tải chi tiết đơn hàng</p>
            <p className="mt-1">{error}</p>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white">
              Thử lại
            </button>
          </div>
        ) : null}

        {loadingOrder ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Mã đơn</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{order.orderCode}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${orderStatusStyles[order.status] || 'bg-slate-100 text-slate-700'}`}>
                    {orderStatusLabels[order.status] || order.status}
                  </span>
                  {payment ? (
                    <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${paymentStatusStyles[payment.status] || 'bg-slate-100 text-slate-700'}`}>
                      {paymentStatusLabels[payment.status] || payment.status}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Ngày tạo</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{formatDate(order.createdAt)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Tổng tiền</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{formatPrice(order.total)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phương thức</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{payment ? paymentMethodLabels[payment.method] || payment.method : 'Chưa có'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Khách hàng</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{order.user?.name || order.recipientName || 'Khách hàng'}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Sản phẩm</h3>
                  <div className="mt-4 space-y-4">
                    {order.items.map((item) => {
                      const imageUrl = item.product?.images?.[0]?.url
                      const productName = item.product?.name || item.productName

                      return (
                        <div key={item.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                            {imageUrl ? (
                              <img src={imageUrl} alt={productName} className="h-full w-full object-cover" />
                            ) : (
                              productName.slice(0, 2).toUpperCase() || 'SP'
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">{productName}</p>
                            <p className="mt-1 text-xs text-slate-500">Số lượng: {item.quantity}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                              <span className="text-slate-600">Đơn giá: {formatPrice(item.price)}</span>
                              <span className="font-bold text-slate-900">{formatPrice(item.subtotal)}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Giao hàng</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Người nhận</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">{order.recipientName}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Số điện thoại</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">{order.phone}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Địa chỉ</p>
                      <p className="mt-2 text-sm font-bold text-slate-800">{[order.address, order.ward, order.district, order.province].filter(Boolean).join(', ')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Tổng tiền</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Tạm tính</span>
                      <span>{formatPrice(order.subtotal || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Giảm giá</span>
                      <span>{formatPrice(order.discount || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Phí vận chuyển</span>
                      <span>{formatPrice(order.shippingFee || 0)}</span>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3 flex items-center justify-between text-base font-black text-slate-900">
                      <span>Tổng</span>
                      <span>{formatPrice(order.total || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900">Thanh toán</h3>
                  {loadingPayment ? (
                    <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-100" />
                  ) : payment ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-700">
                      <div className="flex items-center justify-between">
                        <span>Phương thức</span>
                        <span className="font-bold text-slate-800">{paymentMethodLabels[payment.method] || payment.method}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Trạng thái</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${paymentStatusStyles[payment.status] || 'bg-slate-100 text-slate-700'}`}>
                          {paymentStatusLabels[payment.status] || payment.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Số tiền</span>
                        <span className="font-bold text-slate-800">{formatPrice(payment.amount || 0)}</span>
                      </div>
                      {payment.transactionId ? (
                        <div className="flex items-center justify-between gap-3">
                          <span>Mã giao dịch</span>
                          <span className="max-w-[140px] truncate font-bold text-slate-800">{payment.transactionId}</span>
                        </div>
                      ) : null}
                      {payment.paidAt ? (
                        <div className="flex items-center justify-between">
                          <span>Thanh toán lúc</span>
                          <span className="font-bold text-slate-800">{formatDate(payment.paidAt)}</span>
                        </div>
                      ) : null}
                      {paymentError ? <p className="text-xs text-red-600">{paymentError}</p> : null}
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Chưa có thông tin thanh toán.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-black text-slate-900">Thao tác</h3>

              <div className="mt-4 flex flex-wrap gap-3">
                {['PENDING', 'CONFIRMED'].includes(order.status) ? (
                  <button type="button" onClick={handleCancelOrder} disabled={cancellingOrder} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {cancellingOrder ? 'Đang hủy...' : 'Hủy đơn hàng'}
                  </button>
                ) : null}

                {payment && payment.status === 'PENDING' ? (
                  <button type="button" onClick={handleCancelPayment} disabled={cancellingPayment} className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
                    {cancellingPayment ? 'Đang hủy thanh toán...' : 'Hủy thanh toán'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  )
}
