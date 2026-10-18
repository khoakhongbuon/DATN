import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { API_BASE_URL, cartHeaders } from '../../lib/cart'
import { ProductImageFallback } from '../../components/ProductImageFallback'

type OrderItem = {
  id: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  product?: { images?: Array<{ url: string; alt?: string | null }> } | null
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
}

type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'VNPAY' | 'MOMO'
type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
type Payment = {
  id: string
  orderId: string
  method: PaymentMethod
  status: PaymentStatus
  amount: number
  transactionId?: string | null
  paidAt?: string | null
  paymentUrl?: string | null
  payUrl?: string | null
  qrCodeUrl?: string | null
  deeplink?: string | null
  bankTransfer?: {
    bankId: string
    bankName: string
    accountNumber: string
    accountName: string
    amount: number
    transferContent: string
    qrUrl: string
  } | null
  createdAt: string
  updatedAt: string
}

type ApiPayload<T> = { data?: T; message?: string; error?: string }

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
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

type PaymentConfig = {
  codAvailable: boolean
  vnpayAvailable: boolean
  momoAvailable: boolean
  bankTransferAvailable: boolean
  bankInfo?: {
    bankId: string
    bankName: string
    accountNumber: string
    accountName: string
  } | null
}

const paymentMethodLabels: Record<PaymentMethod, string> = {
  BANK_TRANSFER: 'Chuyển khoản ngân hàng (VietQR)',
  COD: 'Tiền mặt khi nhận hàng (COD)',
  VNPAY: 'VNPAY QR Sandbox',
  MOMO: 'Ví MoMo Sandbox',
}

const apiMessage = (payload: ApiPayload<unknown>, fallback: string) =>
  payload.message || payload.error || fallback

export default function OrderDetailPage() {
  const router = useRouter()
  const { token, authenticated, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [cancelling, setCancelling] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(true)
  const [paymentError, setPaymentError] = useState('')
  const [creatingPayment, setCreatingPayment] = useState(false)
  const [cancellingPayment, setCancellingPayment] = useState(false)
  const [loadingGateway, setLoadingGateway] = useState(false)
  const [momoQrModal, setMomoQrModal] = useState<{ qrCodeUrl?: string; payUrl?: string } | null>(null)

  const loadOrder = useCallback(
    async (signal: AbortSignal) => {
      if (typeof router.query.id !== 'string') return
      setLoading(true)
      setError('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(router.query.id)}`, {
          signal,
          headers: cartHeaders(token),
        })
        const payload = (await response.json()) as ApiPayload<Order>
        if (response.status === 401) {
          void router.replace(`/login?returnUrl=${encodeURIComponent(`/orders/${router.query.id}`)}`)
          return
        }
        if (response.status === 404) throw new Error('Không tìm thấy đơn hàng.')
        if (!response.ok || !payload.data) throw new Error(apiMessage(payload, 'Không thể tải chi tiết đơn hàng.'))
        if (!signal.aborted) {
          setOrder(payload.data)
          setPaymentLoading(true)
          setPaymentError('')
          try {
            const [paymentResponse, configResponse] = await Promise.all([
              fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(payload.data.id)}/payment`, {
                signal,
                headers: cartHeaders(token),
              }),
              fetch(`${API_BASE_URL}/api/payments/config`, { signal }).catch(() => null),
            ])

            if (configResponse && configResponse.ok) {
              const cfgPayload = (await configResponse.json()) as ApiPayload<PaymentConfig>
              if (cfgPayload.data) setPaymentConfig(cfgPayload.data)
            }

            const paymentPayload = (await paymentResponse.json()) as ApiPayload<Payment>
            if (paymentResponse.status === 401) {
              void router.replace(`/login?returnUrl=${encodeURIComponent(`/orders/${payload.data.id}`)}`)
            } else if (paymentResponse.status === 404) {
              setPayment(null)
            } else if (!paymentResponse.ok || !paymentPayload.data) {
              setPaymentError(apiMessage(paymentPayload, 'Không thể tải thông tin thanh toán.'))
            } else {
              setPayment(paymentPayload.data)
              setPaymentMethod(paymentPayload.data.method)
            }
          } catch (paymentLoadError) {
            if ((paymentLoadError as Error).name !== 'AbortError')
              setPaymentError((paymentLoadError as Error).message || 'Không thể tải thông tin thanh toán.')
          }
        }
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') {
          setError((loadError as Error).message || 'Không thể tải chi tiết đơn hàng.')
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false)
          setPaymentLoading(false)
        }
      }
    },
    [router, token]
  )

  useEffect(() => {
    if (authLoading || !router.isReady) return
    if (!authenticated) {
      void router.replace(`/login?returnUrl=${encodeURIComponent(`/orders/${router.query.id || ''}`)}`)
      return
    }
    const controller = new AbortController()
    void loadOrder(controller.signal)
    return () => controller.abort()
  }, [authLoading, authenticated, loadOrder, retry, router])

  const cancelOrder = async () => {
    if (!order || !['PENDING', 'CONFIRMED'].includes(order.status) || !window.confirm('Bạn có chắc muốn hủy đơn hàng này?'))
      return
    setCancelling(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: 'PUT',
        headers: cartHeaders(token, true),
      })
      const payload = (await response.json()) as ApiPayload<Order>
      if (!response.ok || !payload.data) throw new Error(apiMessage(payload, 'Không thể hủy đơn hàng.'))
      setOrder(payload.data)
    } catch (cancelError) {
      setError((cancelError as Error).message || 'Không thể hủy đơn hàng.')
    } finally {
      setCancelling(false)
    }
  }

  const createPayment = async () => {
    if (!order || payment || creatingPayment) return
    setCreatingPayment(true)
    setPaymentError('')
    try {
      if (paymentMethod === 'MOMO' && paymentConfig && !paymentConfig.momoAvailable) {
        throw new Error('Cổng MoMo Gateway hiện chưa được cấu hình. Quý khách vui lòng chọn Chuyển khoản VietQR hoặc COD.')
      }
      if (paymentMethod === 'BANK_TRANSFER' && paymentConfig && !paymentConfig.bankTransferAvailable) {
        throw new Error('Thông tin tài khoản ngân hàng chưa được cấu hình. Vui lòng chọn COD hoặc liên hệ hỗ trợ.')
      }
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/payment`, {
        method: 'POST',
        headers: cartHeaders(token, true),
        body: JSON.stringify({
          method: paymentMethod,
          bankCode: paymentMethod === 'VNPAY' ? 'VNPAYQR' : undefined,
        }),
      })
      const payload = (await response.json()) as ApiPayload<Payment>
      if (response.status === 401) {
        void router.replace(`/login?returnUrl=${encodeURIComponent(`/orders/${order.id}`)}`)
        return
      }
      if (!response.ok || !payload.data) throw new Error(apiMessage(payload, 'Không thể tạo thanh toán.'))
      setPayment(payload.data)
      setPaymentMethod(payload.data.method)

      if (payload.data.paymentUrl) {
        window.location.href = payload.data.paymentUrl
      } else if (payload.data.method === 'MOMO' && (payload.data.qrCodeUrl || payload.data.payUrl)) {
        setMomoQrModal({ qrCodeUrl: payload.data.qrCodeUrl || undefined, payUrl: payload.data.payUrl || undefined })
      }
    } catch (createError) {
      setPaymentError((createError as Error).message || 'Không thể tạo thanh toán.')
    } finally {
      setCreatingPayment(false)
    }
  }

  const payNow = async (targetMethod: PaymentMethod) => {
    if (!order) return
    setLoadingGateway(true)
    setPaymentError('')
    try {
      if (targetMethod === 'VNPAY') {
        const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/payment/vnpay-url`, {
          method: 'POST',
          headers: cartHeaders(token, true),
          body: JSON.stringify({ bankCode: 'VNPAYQR' }),
        })
        const payload = (await response.json()) as ApiPayload<Payment>
        if (!response.ok || !payload.data?.paymentUrl) {
          throw new Error(apiMessage(payload, 'Không thể tạo liên kết thanh toán VNPAY.'))
        }
        window.location.href = payload.data.paymentUrl
      } else if (targetMethod === 'MOMO') {
        const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/payment/momo-url`, {
          method: 'POST',
          headers: cartHeaders(token, true),
        })
        const payload = (await response.json()) as ApiPayload<Payment>
        if (!response.ok || !payload.data) {
          throw new Error(apiMessage(payload, 'Không thể tạo liên kết thanh toán MoMo.'))
        }
        setMomoQrModal({ qrCodeUrl: payload.data.qrCodeUrl || undefined, payUrl: payload.data.payUrl || undefined })
      }
    } catch (payErr) {
      setPaymentError((payErr as Error).message || 'Lỗi khi kích hoạt cổng thanh toán.')
    } finally {
      setLoadingGateway(false)
    }
  }

  const cancelPayment = async () => {
    if (
      !order ||
      !payment ||
      payment.status !== 'PENDING' ||
      cancellingPayment ||
      !window.confirm('Bạn có chắc muốn hủy thanh toán này?')
    )
      return
    setCancellingPayment(true)
    setPaymentError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(order.id)}/payment/cancel`, {
        method: 'PUT',
        headers: cartHeaders(token, true),
      })
      const payload = (await response.json()) as ApiPayload<Payment>
      if (response.status === 401) {
        void router.replace(`/login?returnUrl=${encodeURIComponent(`/orders/${order.id}`)}`)
        return
      }
      if (!response.ok || !payload.data) throw new Error(apiMessage(payload, 'Không thể hủy thanh toán.'))
      setPayment(payload.data)
    } catch (cancelError) {
      setPaymentError((cancelError as Error).message || 'Không thể hủy thanh toán.')
    } finally {
      setCancellingPayment(false)
    }
  }

  if (authLoading || loading) return <DetailSkeleton />
  if (error && !order) return <DetailError message={error} onRetry={() => setRetry((value) => value + 1)} />
  if (!order) return <DetailError message="Không tìm thấy đơn hàng." onRetry={() => router.push('/orders')} />

  const canCancel = order.status === 'PENDING' || order.status === 'CONFIRMED'
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="font-bold text-blue-700">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link href="/orders" className="font-bold text-blue-700">Đơn hàng</Link>
          <span className="mx-2">/</span>
          <span>{order.orderCode}</span>
        </nav>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Chi tiết đơn hàng</p>
            <h1 className="mt-2 text-3xl font-black">{order.orderCode}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Đặt ngày {new Date(order.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1.5 text-xs font-black ${statusStyles[order.status] || 'bg-slate-100 text-slate-700'}`}>
              {statusLabels[order.status] || order.status}
            </span>
            {canCancel ? (
              <button
                type="button"
                disabled={cancelling}
                onClick={cancelOrder}
                className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50 hover:bg-red-50"
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            ) : null}
          </div>
        </div>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Sản phẩm</h2>
              <div className="mt-4 divide-y divide-slate-100">
                {order.items.map((item) => {
                  const image = item.product?.images?.[0]
                  return (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                        <ProductImageFallback
                          src={image?.url}
                          alt={image?.alt || item.productName}
                          name={item.productName}
                          className="h-full w-full object-contain"
                          fallbackClassName="text-xl font-black text-slate-400"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold">{item.productName}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                        <p className="mt-2 font-black text-blue-700">{formatPrice(item.subtotal)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Thông tin giao hàng</h2>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Người nhận</dt>
                  <dd className="mt-1 font-bold">{order.recipientName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Số điện thoại</dt>
                  <dd className="mt-1 font-bold">{order.phone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-500">Địa chỉ</dt>
                  <dd className="mt-1 font-bold">
                    {[order.address, order.ward, order.district, order.province].filter(Boolean).join(', ')}
                  </dd>
                </div>
              </dl>
            </section>

            <PaymentSection
              order={order}
              payment={payment}
              paymentConfig={paymentConfig}
              paymentMethod={paymentMethod}
              paymentLoading={paymentLoading}
              paymentError={paymentError}
              creatingPayment={creatingPayment}
              cancellingPayment={cancellingPayment}
              loadingGateway={loadingGateway}
              onMethodChange={setPaymentMethod}
              onCreate={createPayment}
              onPayNow={payNow}
              onCancel={cancelPayment}
              onRetry={() => setRetry((value) => value + 1)}
            />
          </div>
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h2 className="text-xl font-black">Tóm tắt đơn hàng</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Tạm tính</span>
                <strong>{formatPrice(order.subtotal)}</strong>
              </div>
              {order.discount ? (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Giảm giá</span>
                  <strong className="text-emerald-600">-{formatPrice(order.discount)}</strong>
                </div>
              ) : null}
              {order.shippingFee ? (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Phí vận chuyển</span>
                  <strong>{formatPrice(order.shippingFee)}</strong>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 border-t border-slate-100 pt-4 text-lg">
                <span className="font-black">Tổng cộng</span>
                <strong className="text-blue-700">{formatPrice(order.total)}</strong>
              </div>
            </div>
            <Link
              href="/orders"
              className="mt-6 inline-flex w-full justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:bg-slate-50"
            >
              Quay lại danh sách đơn hàng
            </Link>
          </aside>
        </div>
      </div>

      {/* Modal hiển thị mã MoMo QR */}
      {momoQrModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-lg font-black text-pink-600">
              MoMo
            </div>
            <h3 className="mt-3 text-xl font-black text-slate-900">Quét mã QR MoMo Sandbox</h3>
            <p className="mt-1 text-xs text-slate-500">Số tiền: <strong className="text-pink-600">{formatPrice(order.total)}</strong></p>

            {momoQrModal.qrCodeUrl ? (
              <div className="mt-4 flex justify-center">
                <div className="rounded-2xl border-2 border-pink-200 p-2">
                  <img src={momoQrModal.qrCodeUrl} alt="MoMo QR" className="h-52 w-52 object-contain" />
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-2">
              {momoQrModal.payUrl ? (
                <a
                  href={momoQrModal.payUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-pink-600 px-4 py-3 text-sm font-bold text-white hover:bg-pink-700"
                >
                  Mở ứng dụng / trang MoMo Sandbox
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setMomoQrModal(null)
                  setRetry((v) => v + 1)
                }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Đóng / Kiểm tra lại trạng thái
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function PaymentSection({
  order,
  payment,
  paymentConfig,
  paymentMethod,
  paymentLoading,
  paymentError,
  creatingPayment,
  cancellingPayment,
  loadingGateway,
  onMethodChange,
  onCreate,
  onPayNow,
  onCancel,
  onRetry,
}: {
  order: Order
  payment: Payment | null
  paymentConfig: PaymentConfig | null
  paymentMethod: PaymentMethod
  paymentLoading: boolean
  paymentError: string
  creatingPayment: boolean
  cancellingPayment: boolean
  loadingGateway: boolean
  onMethodChange: (method: PaymentMethod) => void
  onCreate: () => void
  onPayNow: (method: PaymentMethod) => void
  onCancel: () => void
  onRetry: () => void
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [customerNotified, setCustomerNotified] = useState(false)

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }

  if (paymentLoading)
    return (
      <section className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-6 w-56 rounded bg-slate-200" />
        <div className="mt-4 h-20 rounded-xl bg-slate-100" />
      </section>
    )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Phương thức thanh toán</h2>
        {payment ? (
          <span className={`rounded-full px-3 py-1 text-xs font-black ${paymentStatusStyles[payment.status]}`}>
            {paymentStatusLabels[payment.status]}
          </span>
        ) : null}
      </div>
      {paymentError ? (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <p role="alert">{paymentError}</p>
          <button type="button" onClick={onRetry} className="mt-2 font-bold underline">
            Thử lại
          </button>
        </div>
      ) : null}
      {payment ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="text-slate-500">Hình thức: </span>
            <strong>{paymentMethodLabels[payment.method]}</strong>
          </p>
          <p>
            <span className="text-slate-500">Số tiền: </span>
            <strong className="text-blue-700">{formatPrice(payment.amount)}</strong>
          </p>

          {payment.method === 'COD' ? (
            <p className="rounded-xl bg-blue-50 p-3 text-blue-800">
              Thanh toán tiền mặt khi nhân viên giao hàng đến tận nơi.
            </p>
          ) : payment.method === 'BANK_TRANSFER' ? (
            payment.status === 'PAID' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-bold text-emerald-800">✓ Đã xác nhận thanh toán chuyển khoản thành công</p>
                <p className="mt-1 text-xs text-emerald-700">
                  {payment.transactionId ? `Mã đối soát: ${payment.transactionId}. ` : ''}
                  Đơn hàng đã được xác nhận và đang được đóng gói giao hàng.
                </p>
              </div>
            ) : payment.status === 'PENDING' ? (
              <div className="space-y-4">
                <div className="rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-5">
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    {payment.qrCodeUrl || payment.bankTransfer?.qrUrl ? (
                      <div className="flex flex-col items-center">
                        <div className="rounded-2xl border-2 border-blue-200 bg-white p-2 shadow-sm">
                          <img
                            src={payment.qrCodeUrl || payment.bankTransfer?.qrUrl || ''}
                            alt="VietQR Transfer"
                            className="h-48 w-48 object-contain"
                          />
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-500">Quét bằng app ngân hàng / Momo</p>
                      </div>
                    ) : null}

                    <div className="w-full flex-1 space-y-3 text-sm">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500">Ngân hàng</span>
                        <strong className="text-slate-800">
                          {payment.bankTransfer?.bankName || paymentConfig?.bankInfo?.bankName || payment.bankTransfer?.bankId || 'Ngân hàng Quân Đội (MB Bank)'}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500">Số tài khoản</span>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono text-base font-black text-blue-700">
                            {payment.bankTransfer?.accountNumber || paymentConfig?.bankInfo?.accountNumber || '—'}
                          </strong>
                          {(payment.bankTransfer?.accountNumber || paymentConfig?.bankInfo?.accountNumber) ? (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(payment.bankTransfer?.accountNumber || paymentConfig?.bankInfo?.accountNumber || '', 'acc')}
                              className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-200"
                            >
                              {copiedField === 'acc' ? 'Đã sao chép!' : 'Sao chép'}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500">Chủ tài khoản</span>
                        <strong className="uppercase text-slate-800">
                          {payment.bankTransfer?.accountName || paymentConfig?.bankInfo?.accountName || '—'}
                        </strong>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500">Số tiền</span>
                        <div className="flex items-center gap-2">
                          <strong className="text-base font-black text-blue-700">{formatPrice(payment.amount)}</strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(payment.amount), 'amount')}
                            className="rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 hover:bg-blue-200"
                          >
                            {copiedField === 'amount' ? 'Đã sao chép!' : 'Sao chép'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                        <span className="text-slate-500">Nội dung CK</span>
                        <div className="flex items-center gap-2">
                          <strong className="font-mono font-black text-indigo-700">
                            {payment.bankTransfer?.transferContent || order.orderCode}
                          </strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payment.bankTransfer?.transferContent || order.orderCode, 'content')}
                            className="rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700 hover:bg-indigo-200"
                          >
                            {copiedField === 'content' ? 'Đã sao chép!' : 'Sao chép'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    <p className="font-bold">⚠️ Lưu ý quan trọng:</p>
                    <p className="mt-1">
                      Vui lòng ghi đúng nội dung chuyển khoản <strong>{payment.bankTransfer?.transferContent || order.orderCode}</strong> để nhân viên đối soát và xác nhận đơn hàng nhanh chóng nhất.
                    </p>
                  </div>

                  {customerNotified ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <p className="font-bold">✓ Đã ghi nhận thông báo chuyển khoản!</p>
                      <p className="mt-1">
                        Đơn hàng của bạn đang được quản trị viên kiểm tra và đối soát giao dịch. Trạng thái đơn hàng sẽ được cập nhật sang Đã xác nhận ngay khi quản trị viên kiểm tra tài khoản.
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    {!customerNotified ? (
                      <button
                        type="button"
                        onClick={() => setCustomerNotified(true)}
                        className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-blue-800"
                      >
                        Tôi đã chuyển khoản thành công
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={cancellingPayment}
                      onClick={onCancel}
                      className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {cancellingPayment ? 'Đang hủy...' : 'Hủy thanh toán'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null
          ) : payment.status === 'PAID' ? (
            <p className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">
              Đơn hàng đã được thanh toán thành công qua {paymentMethodLabels[payment.method]}.
              {payment.transactionId ? ` (Mã giao dịch: ${payment.transactionId})` : ''}
            </p>
          ) : payment.status === 'PENDING' ? (
            <div className="space-y-3">
              <p className="rounded-xl bg-amber-50 p-3 text-amber-800">
                Đơn hàng đang chờ thanh toán qua cổng {paymentMethodLabels[payment.method]}.
              </p>
              <div className="flex flex-wrap gap-2">
                {payment.method === 'VNPAY' ? (
                  <button
                    type="button"
                    disabled={loadingGateway}
                    onClick={() => onPayNow('VNPAY')}
                    className="rounded-xl bg-blue-700 px-5 py-2.5 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {loadingGateway ? 'Đang kết nối...' : 'Thanh toán ngay qua VNPAY'}
                  </button>
                ) : payment.method === 'MOMO' ? (
                  <button
                    type="button"
                    disabled={loadingGateway}
                    onClick={() => onPayNow('MOMO')}
                    className="rounded-xl bg-pink-600 px-5 py-2.5 font-bold text-white hover:bg-pink-700 disabled:opacity-50"
                  >
                    {loadingGateway ? 'Đang kết nối...' : 'Thanh toán ngay qua MoMo QR'}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={cancellingPayment}
                  onClick={onCancel}
                  className="rounded-xl border border-red-200 px-4 py-2.5 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancellingPayment ? 'Đang hủy...' : 'Hủy thanh toán'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-slate-500">Chọn phương thức thanh toán cho đơn hàng này.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(['BANK_TRANSFER', 'COD', 'VNPAY', 'MOMO'] as PaymentMethod[]).map((method) => {
              const isMomo = method === 'MOMO'
              const isBank = method === 'BANK_TRANSFER'
              const isMomoDisabled = isMomo && paymentConfig && !paymentConfig.momoAvailable
              const isBankDisabled = isBank && paymentConfig && !paymentConfig.bankTransferAvailable

              return (
                <label
                  key={method}
                  className={`cursor-pointer rounded-xl border p-4 text-sm font-bold transition ${
                    paymentMethod === method
                      ? 'border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-blue-300'
                  } ${isMomoDisabled || isBankDisabled ? 'opacity-70' : ''}`}
                >
                  <input
                    type="radio"
                    name="payment-method"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => onMethodChange(method)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <span>{paymentMethodLabels[method]}</span>
                    {isBank && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">
                        Khuyên dùng
                      </span>
                    )}
                    {isMomoDisabled && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Chưa cấu hình
                      </span>
                    )}
                  </div>
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    {method === 'BANK_TRANSFER'
                      ? 'Quét mã VietQR chuyển khoản ngân hàng'
                      : method === 'COD'
                      ? 'Thanh toán tiền mặt khi nhận hàng'
                      : method === 'VNPAY'
                      ? 'Quét mã VNPAY-QR'
                      : 'Ví điện tử MoMo'}
                  </span>
                </label>
              )
            })}
          </div>

          {paymentMethod === 'MOMO' && paymentConfig && !paymentConfig.momoAvailable ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-bold">Lưu ý về cổng MoMo:</p>
              <p className="mt-1">
                Cổng MoMo Gateway hiện chưa được cấu hình khóa bảo mật. Vui lòng chọn <strong>Chuyển khoản VietQR</strong> hoặc <strong>COD</strong> để tiếp tục đơn hàng.
              </p>
              <button
                type="button"
                onClick={() => onMethodChange('BANK_TRANSFER')}
                className="mt-2 font-bold text-blue-700 underline"
              >
                Chuyển sang Chuyển khoản ngân hàng (VietQR)
              </button>
            </div>
          ) : null}

          <button
            type="button"
            disabled={Boolean(creatingPayment || (paymentMethod === 'MOMO' && paymentConfig && !paymentConfig.momoAvailable))}
            onClick={onCreate}
            className="mt-4 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {creatingPayment ? 'Đang tạo thanh toán...' : 'Tiến hành thanh toán'}
          </button>
        </div>
      )}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-4 w-52 rounded bg-slate-200" />
        <div className="mt-8 h-10 w-80 rounded bg-slate-200" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="h-96 rounded-2xl bg-white" />
          <div className="h-64 rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  )
}

function DetailError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-black">Không thể tải đơn hàng</h1>
        <p role="alert" className="mt-3 text-red-700">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white"
        >
          Thử lại
        </button>
      </div>
    </main>
  )
}
