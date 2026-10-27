import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { API_BASE_URL, apiFetch, cartHeaders } from '../../../lib/cart'

type MomoReturnVerification = {
  verified: boolean
  isSuccess: boolean
  resultCode: number
  paymentId: string | null
  orderId: string | null
  orderCode: string | null
  paymentStatus: string | null
  orderStatus: string | null
  message: string
}

type PaymentRecord = {
  id: string
  orderId: string
  method: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  amount: number
  transactionId?: string | null
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export default function MomoReturnPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [verification, setVerification] = useState<MomoReturnVerification | null>(null)
  const [payment, setPayment] = useState<PaymentRecord | null>(null)
  const [pollCount, setPollCount] = useState(0)
  const [error, setError] = useState('')

  const verifyAndCheckStatus = useCallback(async () => {
    if (!router.isReady) return
    const queryString = new URLSearchParams(router.query as Record<string, string>).toString()
    if (!queryString) {
      setError('Không tìm thấy tham số giao dịch MoMo.')
      setLoading(false)
      return
    }

    try {
      // 1. Verify signature on backend webhook endpoint (public)
      const verifyRes = await fetch(`${API_BASE_URL}/api/payments/momo/return?${queryString}`)
      const verifyJson = await verifyRes.json() as { success?: boolean; data?: MomoReturnVerification; message?: string }
      if (!verifyRes.ok || !verifyJson.data) {
        throw new Error(verifyJson.message || 'Không thể xác thực giao dịch với MoMo.')
      }

      const verData = verifyJson.data
      setVerification(verData)

      // 2. Fetch authoritative payment status from backend DB
      if (verData.orderId) {
        const payRes = await apiFetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(verData.orderId)}/payment`, {
          headers: cartHeaders(),
        })
        if (payRes.ok) {
          const payJson = await payRes.json() as { data?: PaymentRecord }
          if (payJson.data) {
            setPayment(payJson.data)
          }
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi khi kiểm tra kết quả thanh toán.')
    } finally {
      setLoading(false)
    }
  }, [router.isReady, router.query])

  useEffect(() => {
    void verifyAndCheckStatus()
  }, [verifyAndCheckStatus])

  // Polling for pending status (up to 4 times, 2.5s interval)
  useEffect(() => {
    if (loading || !verification || !verification.orderId) return
    const currentStatus = payment?.status || verification.paymentStatus
    if (currentStatus === 'PENDING' && pollCount < 4) {
      const timer = setTimeout(() => {
        setPollCount((prev) => prev + 1)
        void (async () => {
          try {
            const payRes = await apiFetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(verification.orderId!)}/payment`, {
              headers: cartHeaders(),
            })
            if (payRes.ok) {
              const payJson = await payRes.json() as { data?: PaymentRecord }
              if (payJson.data) {
                setPayment(payJson.data)
              }
            }
          } catch {
            // ignore polling error
          }
        })()
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [loading, verification, payment, pollCount])

  const orderId = payment?.orderId || verification?.orderId || ''
  const orderCode = verification?.orderCode || 'Đơn hàng'
  const isVerified = verification?.verified ?? false
  const effectiveStatus = payment?.status || verification?.paymentStatus || 'PENDING'
  const isPaid = isVerified && effectiveStatus === 'PAID'
  const isCancelled = verification?.resultCode === 1006 || effectiveStatus === 'FAILED'

  return (
    <>
      <Head>
        <title>Kết quả thanh toán MoMo | TK Store</title>
      </Head>

      <main className="min-h-screen bg-[#f4f7fb] px-4 py-12 text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <nav className="text-sm text-slate-500">
            <Link href="/" className="font-bold text-blue-700">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link href="/orders" className="font-bold text-blue-700">Đơn hàng</Link>
            <span className="mx-2">/</span>
            <span>Kết quả thanh toán MoMo</span>
          </nav>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
                <h1 className="mt-6 text-xl font-black text-slate-900">Đang xác thực giao dịch MoMo...</h1>
                <p className="mt-2 text-sm text-slate-500">Vui lòng chờ trong giây lát trong khi chúng tôi đối soát dữ liệu với MoMo.</p>
              </div>
            ) : error ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-600">✕</div>
                <h1 className="mt-4 text-2xl font-black text-slate-900">Không thể kiểm tra giao dịch</h1>
                <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link href="/orders" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Xem danh sách đơn hàng</Link>
                  <Link href="/" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Về trang chủ</Link>
                </div>
              </div>
            ) : !isVerified ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-600">!</div>
                <h1 className="mt-4 text-2xl font-black text-red-700">Chữ ký MoMo không hợp lệ</h1>
                <p className="mt-2 text-sm text-slate-600">Thông tin phản hồi từ MoMo không khớp với mã bảo mật. Để an toàn, giao dịch chưa được xác nhận.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {orderId ? <Link href={`/orders/${orderId}`} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white hover:bg-blue-800">Kiểm tra đơn hàng</Link> : null}
                  <Link href="/orders" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Về đơn hàng</Link>
                </div>
              </div>
            ) : isPaid ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-100 text-3xl font-black text-pink-600">✓</div>
                <h1 className="mt-4 text-2xl font-black text-slate-900">Thanh toán MoMo thành công</h1>
                <p className="mt-2 text-sm text-slate-600">Đơn hàng <strong>{orderCode}</strong> đã được thanh toán thành công qua Ví MoMo.</p>
                {payment?.amount ? <p className="mt-4 text-2xl font-black text-pink-700">{formatPrice(payment.amount)}</p> : null}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {orderId ? <Link href={`/orders/${orderId}`} className="rounded-xl bg-pink-600 px-6 py-3.5 text-sm font-black text-white hover:bg-pink-700">Xem chi tiết đơn hàng</Link> : null}
                  <Link href="/products" className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Tiếp tục mua hàng</Link>
                </div>
              </div>
            ) : effectiveStatus === 'PENDING' ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl font-black text-amber-600">⏳</div>
                <h1 className="mt-4 text-2xl font-black text-slate-900">Đang chờ xác nhận từ MoMo</h1>
                <p className="mt-2 text-sm text-slate-600">Giao dịch đã được ghi nhận. Hệ thống đang đồng bộ dữ liệu giao dịch với MoMo qua IPN.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button type="button" onClick={() => { setLoading(true); void verifyAndCheckStatus() }} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-bold text-white hover:bg-pink-700">Làm mới trạng thái</button>
                  {orderId ? <Link href={`/orders/${orderId}`} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Xem chi tiết đơn hàng</Link> : null}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl font-black text-red-600">✕</div>
                <h1 className="mt-4 text-2xl font-black text-slate-900">{isCancelled ? 'Giao dịch MoMo đã bị hủy' : 'Thanh toán MoMo không thành công'}</h1>
                <p className="mt-2 text-sm text-slate-600">{verification?.message || 'Giao dịch qua Ví MoMo không hoàn tất hoặc đã bị hủy bởi người dùng.'}</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {orderId ? <Link href={`/orders/${orderId}`} className="rounded-xl bg-pink-600 px-6 py-3.5 text-sm font-black text-white hover:bg-pink-700">Thử lại thanh toán</Link> : null}
                  <Link href="/orders" className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Xem danh sách đơn hàng</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
