import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { API_BASE_URL, Cart, apiFetch, cartHeaders, productPrice } from '../lib/cart'
import AddressAutocomplete, { SelectedAddressData } from '../components/AddressAutocomplete'

type Address = {
  id: string
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  detail: string
  isDefault: boolean
}

type AddressForm = Omit<Address, 'id'>
type ApiPayload<T> = { success?: boolean; data?: T; message?: string; error?: string }
type PaymentMethod = 'COD' | 'BANK_TRANSFER' | 'VNPAY' | 'MOMO'

type BankTransferData = {
  qrCodeUrl: string
  bankId: string
  bankName: string
  accountNumber: string
  accountName: string
  amount: number
  orderCode: string
  transferMemo: string
  instructions: string
}

type CreatedPaymentData = {
  id: string
  orderId: string
  method: PaymentMethod
  status: string
  amount: number
  paymentUrl?: string
  payUrl?: string
  qrCodeUrl?: string
  deeplink?: string
  bankTransfer?: BankTransferData
}

type PaymentGatewayConfig = {
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

const emptyForm: AddressForm = {
  recipientName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  detail: '',
  isDefault: false,
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

function apiError(payload: ApiPayload<unknown>, fallback: string) {
  return payload.message || payload.error || fallback
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, authenticated, loading: authLoading } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)
  const [momoPayment, setMomoPayment] = useState<CreatedPaymentData | null>(null)
  const [bankPayment, setBankPayment] = useState<CreatedPaymentData | null>(null)
  const [redirectingVnpay, setRedirectingVnpay] = useState(false)
  const [vnpayUrl, setVnpayUrl] = useState('')
  const [paymentConfig, setPaymentConfig] = useState<PaymentGatewayConfig | null>(null)

  const loadCheckout = useCallback(
    async (signal: AbortSignal) => {
      if (!user?.id) return
      setLoading(true)
      setError('')
      try {
        const [cartResponse, addressResponse, configResponse] = await Promise.all([
          apiFetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(user.id)}`, {
            signal,
            headers: cartHeaders(),
          }),
          apiFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(user.id)}/addresses`, {
            signal,
            headers: cartHeaders(),
          }),
          fetch(`${API_BASE_URL}/api/payments/config`, { signal }).catch(() => null),
        ])

        const cartPayload = (await cartResponse.json()) as ApiPayload<Cart>
        const addressPayload = (await addressResponse.json()) as ApiPayload<Address[]>
        if (!cartResponse.ok) throw new Error(apiError(cartPayload, 'Không thể tải giỏ hàng.'))
        if (!addressResponse.ok) throw new Error(apiError(addressPayload, 'Không thể tải địa chỉ.'))

        if (configResponse && configResponse.ok) {
          const configPayload = (await configResponse.json()) as ApiPayload<PaymentGatewayConfig>
          if (configPayload.data) {
            setPaymentConfig(configPayload.data)
            // If bank transfer not available, fallback to COD
            if (!configPayload.data.bankTransferAvailable) {
              setPaymentMethod('COD')
            }
          }
        }

        if (signal.aborted) return
        const nextAddresses = addressPayload.data ?? []
        setCart(cartPayload.data ?? { id: '', items: [] })
        setAddresses(nextAddresses)
        setSelectedAddress(
          (current) => current || nextAddresses.find((address) => address.isDefault)?.id || nextAddresses[0]?.id || ''
        )
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError')
          setError((loadError as Error).message || 'Không thể tải dữ liệu checkout.')
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [user?.id]
  )

  useEffect(() => {
    if (authLoading) return
    if (!authenticated || !user?.id) {
      void router.replace('/login?returnUrl=/checkout')
      return
    }
    const controller = new AbortController()
    void loadCheckout(controller.signal)
    return () => controller.abort()
  }, [authLoading, authenticated, loadCheckout, retry, router, user?.id])

  const items = cart?.items ?? []
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + productPrice(item.product) * item.quantity, 0),
    [items]
  )
  const hasInvalidStock = items.some((item) => item.quantity < 1 || item.quantity > item.product.stock)

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.id) return
    setFormError('')
    if (Object.entries(form).some(([key, value]) => key !== 'isDefault' && !String(value).trim())) {
      setFormError('Vui lòng nhập đầy đủ thông tin địa chỉ.')
      return
    }
    setSavingAddress(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/users/${encodeURIComponent(user.id)}/addresses`, {
        method: 'POST',
        headers: cartHeaders(true),
        body: JSON.stringify(form),
      })
      const payload = (await response.json()) as ApiPayload<Address>
      if (!response.ok || !payload.data) throw new Error(apiError(payload, 'Không thể thêm địa chỉ.'))
      setAddresses((current) =>
        form.isDefault
          ? [payload.data as Address, ...current.map((address) => ({ ...address, isDefault: false }))]
          : [...current, payload.data as Address]
      )
      setSelectedAddress(payload.data.id)
      setForm(emptyForm)
      setShowForm(false)
    } catch (saveError) {
      setFormError((saveError as Error).message)
    } finally {
      setSavingAddress(false)
    }
  }

  const placeOrder = async () => {
    if (!user?.id || !selectedAddress || items.length === 0 || hasInvalidStock) return

    // Pre-check gateway availability to prevent crash & obscure errors
    if (paymentMethod === 'MOMO' && paymentConfig && !paymentConfig.momoAvailable) {
      setError('Cổng thanh toán MoMo hiện chưa được cấu hình khóa API. Bạn vui lòng chọn Chuyển khoản QR ngân hàng hoặc COD.')
      return
    }
    if (paymentMethod === 'BANK_TRANSFER' && paymentConfig && !paymentConfig.bankTransferAvailable) {
      setError('Thông tin tài khoản ngân hàng chưa được cấu hình. Bạn vui lòng chọn phương thức COD.')
      return
    }

    setPlacingOrder(true)
    setError('')
    try {
      // 1. Tạo đơn hàng (Giá trị tiền được backend tính toán chuẩn từ database/cart, không tin frontend)
      const response = await apiFetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: cartHeaders(true),
        body: JSON.stringify({ addressId: selectedAddress }),
      })
      const payload = (await response.json()) as ApiPayload<Record<string, unknown>>
      if (!response.ok || !payload.data) throw new Error(apiError(payload, 'Không thể tạo đơn hàng.'))
      const createdOrder = payload.data
      setOrder(createdOrder)
      window.dispatchEvent(new Event('tk-cart-updated'))

      // 2. Tạo thanh toán tương ứng
      const orderId = String(createdOrder.id)
      const payResponse = await apiFetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderId)}/payment`, {
        method: 'POST',
        headers: cartHeaders(true),
        body: JSON.stringify({
          method: paymentMethod,
          bankCode: paymentMethod === 'VNPAY' ? 'VNPAYQR' : undefined,
        }),
      })
      const payPayload = (await payResponse.json()) as ApiPayload<CreatedPaymentData>

      if (!payResponse.ok || !payPayload.data) {
        setError(`Đơn hàng #${createdOrder.orderCode || ''} đã được tạo thành công nhưng chưa kích hoạt được cổng thanh toán: ${payPayload.message || 'Lỗi xử lý'}. Bạn có thể vào chi tiết đơn hàng để thực hiện lại.`)
        return
      }

      const payData = payPayload.data

      // Xử lý chuyển khoản QR Ngân hàng (VietQR)
      if (paymentMethod === 'BANK_TRANSFER') {
        setBankPayment(payData)
        return
      }

      // Xử lý chuyển hướng VNPAY
      if (paymentMethod === 'VNPAY' && payData.paymentUrl) {
        setVnpayUrl(payData.paymentUrl)
        setRedirectingVnpay(true)
        window.location.href = payData.paymentUrl
        return
      }

      // Xử lý MoMo
      if (paymentMethod === 'MOMO') {
        setMomoPayment(payData)
        return
      }
    } catch (placeError) {
      setError((placeError as Error).message)
    } finally {
      setPlacingOrder(false)
    }
  }

  if (redirectingVnpay && vnpayUrl) {
    return <RedirectingVnpay url={vnpayUrl} order={order} />
  }

  if (bankPayment && order) {
    return <BankTransferPaymentView payment={bankPayment} order={order} />
  }

  if (momoPayment && order) {
    return <MomoPaymentView payment={momoPayment} order={order} />
  }

  if (order) return <OrderSuccess order={order} method={paymentMethod} />
  if (authLoading || loading) return <CheckoutSkeleton />
  if (error && !cart) return <CheckoutError message={error} onRetry={() => setRetry((value) => value + 1)} />
  if (!cart || items.length === 0) return <EmptyCheckout />

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="text-sm text-slate-500">
          <NextLink href="/" className="font-bold text-blue-700">Trang chủ</NextLink>
          <span className="mx-2">/</span>
          <NextLink href="/cart" className="font-bold text-blue-700">Giỏ hàng</NextLink>
          <span className="mx-2">/</span>
          <span>Thanh toán</span>
        </nav>
        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Checkout</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Xác nhận đơn hàng</h1>
        </div>

        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
            {/* Địa chỉ giao hàng */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">1. Thông tin giao hàng</h2>
                <button
                  type="button"
                  onClick={() => setShowForm((value) => !value)}
                  className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  {showForm ? 'Đóng' : 'Thêm địa chỉ'}
                </button>
              </div>

              {addresses.length ? (
                <div className="mt-4 grid gap-3">
                  {addresses.map((address) => (
                    <button
                      key={address.id}
                      type="button"
                      onClick={() => setSelectedAddress(address.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedAddress === address.id
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{address.recipientName}</strong>
                        <span className="text-sm text-slate-500">{address.phone}</span>
                        {address.isDefault ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            Mặc định
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {address.detail}, {address.ward}, {address.district}, {address.province}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                  Bạn chưa có địa chỉ giao hàng. Vui lòng thêm địa chỉ bên dưới.
                </div>
              )}

              {showForm ? (
                <AddressForm
                  form={form}
                  setForm={setForm}
                  error={formError}
                  saving={savingAddress}
                  onSubmit={saveAddress}
                />
              ) : null}
            </div>

            {/* Phương thức thanh toán */}
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-xl font-black">2. Phương thức thanh toán</h2>
              <p className="mt-1 text-sm text-slate-500">Chọn hình thức bạn muốn thanh toán cho đơn hàng này.</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Option 1: Chuyển khoản QR Ngân hàng (VietQR) */}
                <label
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                    paymentMethod === 'BANK_TRANSFER'
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-blue-300'
                  } ${paymentConfig && !paymentConfig.bankTransferAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 px-2.5 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                        VietQR
                      </span>
                      <input
                        type="radio"
                        name="checkout-payment-method"
                        value="BANK_TRANSFER"
                        disabled={paymentConfig ? !paymentConfig.bankTransferAvailable : false}
                        checked={paymentMethod === 'BANK_TRANSFER'}
                        onChange={() => setPaymentMethod('BANK_TRANSFER')}
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      <strong className="text-sm font-bold text-slate-900">Quét mã QR Ngân hàng</strong>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Khuyên dùng</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {paymentConfig && !paymentConfig.bankTransferAvailable
                        ? 'Chưa cấu hình tài khoản nhận tiền'
                        : 'Quét mã VietQR bằng mọi app ngân hàng (MB, VCB, TCB,...)'}
                    </p>
                  </div>
                </label>

                {/* Option 2: COD */}
                <label
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                    paymentMethod === 'COD'
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-black text-emerald-700">
                        COD
                      </span>
                      <input
                        type="radio"
                        name="checkout-payment-method"
                        value="COD"
                        checked={paymentMethod === 'COD'}
                        onChange={() => setPaymentMethod('COD')}
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                    <strong className="mt-3 block text-sm font-bold text-slate-900">Tiền mặt (COD)</strong>
                    <p className="mt-1 text-xs text-slate-500">Thanh toán tiền mặt khi nhận hàng tận nơi</p>
                  </div>
                </label>

                {/* Option 3: MoMo */}
                <label
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                    paymentMethod === 'MOMO'
                      ? 'border-pink-600 bg-pink-50/70 ring-2 ring-pink-100'
                      : 'border-slate-200 hover:border-pink-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-100 text-xs font-black text-pink-700">
                        MoMo
                      </span>
                      <input
                        type="radio"
                        name="checkout-payment-method"
                        value="MOMO"
                        checked={paymentMethod === 'MOMO'}
                        onChange={() => setPaymentMethod('MOMO')}
                        className="h-4 w-4 text-pink-600"
                      />
                    </div>
                    <strong className="mt-3 block text-sm font-bold text-slate-900">Ví MoMo</strong>
                    <p className="mt-1 text-xs text-slate-500">
                      {paymentConfig && !paymentConfig.momoAvailable
                        ? 'Chưa kết nối API MoMo'
                        : 'Quét mã thanh toán qua Ví MoMo'}
                    </p>
                  </div>
                </label>

                {/* Option 4: VNPAY */}
                <label
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-4 transition ${
                    paymentMethod === 'VNPAY'
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                      : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">
                        VNP
                      </span>
                      <input
                        type="radio"
                        name="checkout-payment-method"
                        value="VNPAY"
                        checked={paymentMethod === 'VNPAY'}
                        onChange={() => setPaymentMethod('VNPAY')}
                        className="h-4 w-4 text-blue-600"
                      />
                    </div>
                    <strong className="mt-3 block text-sm font-bold text-slate-900">VNPAY</strong>
                    <p className="mt-1 text-xs text-slate-500">Cổng thanh toán thẻ ATM / Visa VNPAY</p>
                  </div>
                </label>
              </div>

              {/* Friendly notification if MoMo selected but not configured */}
              {paymentMethod === 'MOMO' && paymentConfig && !paymentConfig.momoAvailable ? (
                <div className="mt-4 rounded-xl border border-pink-200 bg-pink-50 p-4 text-sm text-pink-900">
                  <p className="font-bold">⚠️ Cổng MoMo chưa được cấu hình khóa bảo mật.</p>
                  <p className="mt-1 text-xs text-pink-700">
                    Cửa hàng chưa thiết lập mã đối tác MoMo production. Vui lòng chọn phương thức <strong>Quét mã QR Ngân hàng (VietQR)</strong> hoặc <strong>Tiền mặt (COD)</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
                  >
                    Chuyển sang Quét mã QR Ngân hàng
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          {/* Tóm tắt đơn hàng */}
          <aside className="h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-6 sm:p-6">
            <h2 className="text-xl font-black">Tóm tắt đơn hàng</h2>
            <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">{item.product.name}</span>
                    <span className="text-xs text-slate-500">Số lượng: {item.quantity}</span>
                  </span>
                  <strong className="shrink-0 text-slate-900">
                    {formatPrice(productPrice(item.product) * item.quantity)}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-base font-black">
                <span>Tổng cộng</span>
                <span className="text-xl text-blue-700">{formatPrice(subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Hình thức thanh toán:</span>
                <span className="font-bold text-slate-700">
                  {paymentMethod === 'BANK_TRANSFER'
                    ? 'Chuyển khoản QR Ngân hàng'
                    : paymentMethod === 'COD'
                    ? 'Tiền mặt khi nhận hàng'
                    : paymentMethod === 'VNPAY'
                    ? 'Cổng VNPAY'
                    : 'Ví MoMo'}
                </span>
              </div>
            </div>

            {hasInvalidStock ? (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                Số lượng sản phẩm không còn đủ trong kho.
              </p>
            ) : null}

            <button
              type="button"
              disabled={!selectedAddress || hasInvalidStock || placingOrder}
              onClick={placeOrder}
              className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-4 text-base font-black text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {placingOrder
                ? 'Đang xử lý đơn hàng...'
                : paymentMethod === 'BANK_TRANSFER'
                ? 'Tạo đơn & Quét mã QR thanh toán'
                : paymentMethod === 'COD'
                ? 'Đặt hàng (COD)'
                : paymentMethod === 'VNPAY'
                ? 'Tiến hành thanh toán VNPAY'
                : 'Tiến hành thanh toán MoMo'}
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}

function AddressForm({
  form,
  setForm,
  error,
  saving,
  onSubmit,
}: {
  form: AddressForm
  setForm: (form: AddressForm) => void
  error: string
  saving: boolean
  onSubmit: (e: FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-bold">Thêm địa chỉ giao hàng mới</h3>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <AddressAutocomplete
        onSelectAddress={(selected: SelectedAddressData) => {
          setForm({
            ...form,
            province: selected.province || form.province,
            district: selected.district || form.district,
            ward: selected.ward || form.ward,
            detail: selected.detail || form.detail,
          })
        }}
        disabled={saving}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          placeholder="Họ tên người nhận *"
          value={form.recipientName}
          onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
          className="rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          required
          placeholder="Số điện thoại *"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          required
          placeholder="Tỉnh / Thành phố *"
          value={form.province}
          onChange={(e) => setForm({ ...form, province: e.target.value })}
          className="rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          required
          placeholder="Quận / Huyện *"
          value={form.district}
          onChange={(e) => setForm({ ...form, district: e.target.value })}
          className="rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          required
          placeholder="Phường / Xã *"
          value={form.ward}
          onChange={(e) => setForm({ ...form, ward: e.target.value })}
          className="rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>
      <input
        required
        placeholder="Địa chỉ chi tiết (số nhà, tên đường...) *"
        value={form.detail}
        onChange={(e) => setForm({ ...form, detail: e.target.value })}
        className="w-full rounded-lg border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500"
      />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
          className="h-4 w-4 rounded text-blue-600"
        />
        Đặt làm địa chỉ mặc định
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {saving ? 'Đang lưu...' : 'Lưu địa chỉ'}
      </button>
    </form>
  )
}

function BankTransferPaymentView({
  payment,
  order,
}: {
  payment: CreatedPaymentData
  order: Record<string, unknown>
}) {
  const router = useRouter()
  const orderId = String(order.id || '')
  const orderCode = String(order.orderCode || payment.bankTransfer?.orderCode || 'Đơn hàng')
  const amount = Number(order.total || payment.amount || 0)
  const bank = payment.bankTransfer
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [userClickedTransferred, setUserClickedTransferred] = useState(false)

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-700">
            VietQR &#8226; Chuyển khoản 24/7
          </span>
          <h1 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">Quét mã QR để thanh toán</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mã đơn hàng: <strong className="text-slate-800">{orderCode}</strong>
          </p>
          <p className="mt-2 text-3xl font-black text-blue-700">{formatPrice(amount)}</p>
        </div>

        {/* QR Display */}
        {bank?.qrCodeUrl ? (
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="rounded-2xl border-2 border-blue-100 bg-white p-3 shadow-md sm:p-4">
              <img
                src={bank.qrCodeUrl}
                alt="VietQR Chuyển khoản"
                className="h-64 w-64 object-contain sm:h-72 sm:w-72"
              />
            </div>
            <p className="mt-3 max-w-md text-center text-xs text-slate-500">
              Quét mã bằng app ngân hàng bất kỳ. Số tiền và nội dung chuyển khoản đã được tạo sẵn.
            </p>
          </div>
        ) : null}

        {/* Bank Account Info Card with Copy Buttons */}
        <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm">
            <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
            <span className="font-bold text-slate-900">{bank?.bankName || bank?.bankId || 'Ngân hàng'}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm">
            <span className="text-slate-500">Chủ tài khoản:</span>
            <span className="font-black text-slate-900 uppercase">{bank?.accountName || 'PC STORE'}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm">
            <span className="text-slate-500">Số tài khoản:</span>
            <div className="flex items-center gap-2">
              <strong className="font-mono text-base text-blue-700">{bank?.accountNumber}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(bank?.accountNumber || '', 'acc')}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-sm border border-slate-200 hover:bg-blue-50"
              >
                {copiedKey === 'acc' ? 'Đã sao chép ✓' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-sm">
            <span className="text-slate-500">Số tiền:</span>
            <div className="flex items-center gap-2">
              <strong className="text-base font-black text-emerald-700">{formatPrice(amount)}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(String(amount), 'amount')}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-sm border border-slate-200 hover:bg-blue-50"
              >
                {copiedKey === 'amount' ? 'Đã sao chép ✓' : 'Sao chép'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Nội dung chuyển khoản:</span>
            <div className="flex items-center gap-2">
              <strong className="font-mono text-base text-red-600">{bank?.transferMemo || orderCode}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(bank?.transferMemo || orderCode, 'memo')}
                className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-blue-600 shadow-sm border border-slate-200 hover:bg-blue-50"
              >
                {copiedKey === 'memo' ? 'Đã sao chép ✓' : 'Sao chép'}
              </button>
            </div>
          </div>
        </div>

        {/* Warning / Important instructions */}
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
          <p className="font-bold">⚠️ Lưu ý quan trọng:</p>
          <ul className="mt-1 list-disc pl-4 space-y-1 text-amber-800">
            <li>Vui lòng chuyển <strong>chính xác số tiền</strong> và <strong>nội dung chuyển khoản</strong> ghi ở trên.</li>
            <li>Đơn hàng giữ trạng thái <strong>Chờ xác nhận</strong> cho đến khi bộ phận quản trị đối soát sao kê ngân hàng thành công.</li>
          </ul>
        </div>

        {/* Notification when user clicks "I have transferred" */}
        {userClickedTransferred ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <span className="text-lg">✓</span> Đã ghi nhận thông báo chuyển khoản của bạn!
            </div>
            <p className="mt-1 text-xs text-emerald-700">
              Đơn hàng <strong>{orderCode}</strong> đang ở trạng thái <em>Chờ xác nhận thanh toán</em>. Quản trị viên sẽ kiểm tra tài khoản ngân hàng và cập nhật đơn hàng của bạn trong ít phút.
            </p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3">
          {!userClickedTransferred ? (
            <button
              type="button"
              onClick={() => setUserClickedTransferred(true)}
              className="w-full rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-black text-white hover:bg-blue-800 transition"
            >
              Tôi đã chuyển khoản thành công
            </button>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {orderId ? (
              <button
                type="button"
                onClick={() => router.push(`/orders/${orderId}`)}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-center"
              >
                Xem chi tiết đơn hàng
              </button>
            ) : null}
            <NextLink
              href="/products"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 text-center"
            >
              Tiếp tục mua sắm
            </NextLink>
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderSuccess({ order, method }: { order: Record<string, unknown>; method: PaymentMethod }) {
  const orderId = typeof order.id === 'string' ? order.id : ''
  const orderCode = typeof order.orderCode === 'string' ? order.orderCode : 'Đơn hàng mới'
  const total = typeof order.total === 'number' ? order.total : 0
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="text-5xl text-emerald-600">✓</div>
        <h1 className="mt-4 text-3xl font-black">Đặt hàng thành công</h1>
        <p className="mt-3 text-slate-500">
          Mã đơn hàng: <strong>{orderCode}</strong>
        </p>
        <p className="mt-2 text-xl font-black text-blue-700">{formatPrice(total)}</p>
        <p className="mt-2 text-sm text-slate-600">
          Hình thức thanh toán:{' '}
          <strong>
            {method === 'COD'
              ? 'Thanh toán tiền mặt khi nhận hàng (COD)'
              : method === 'BANK_TRANSFER'
              ? 'Chuyển khoản QR Ngân hàng'
              : method}
          </strong>
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {orderId ? (
            <NextLink href={`/orders/${orderId}`} className="rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-800">
              Xem đơn hàng
            </NextLink>
          ) : null}
          <NextLink href="/products" className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-bold hover:bg-slate-50">
            Tiếp tục mua sắm
          </NextLink>
        </div>
      </div>
    </div>
  )
}

function RedirectingVnpay({ url, order }: { url: string; order: Record<string, unknown> | null }) {
  const orderCode = typeof order?.orderCode === 'string' ? order.orderCode : 'Đơn hàng'
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="rounded-3xl border border-blue-200 bg-white p-8 shadow-sm">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <h1 className="mt-6 text-2xl font-black text-slate-900">Đang chuyển đến VNPAY...</h1>
        <p className="mt-2 text-sm text-slate-500">
          Đơn hàng <strong>{orderCode}</strong> đang được kết nối tới cổng thanh toán VNPAY.
        </p>
        <div className="mt-6">
          <a
            href={url}
            className="inline-block rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            Nhấn vào đây nếu không tự động chuyển hướng
          </a>
        </div>
      </div>
    </div>
  )
}

function MomoPaymentView({
  payment,
  order,
}: {
  payment: CreatedPaymentData
  order: Record<string, unknown>
}) {
  const orderId = String(order.id || '')
  const orderCode = String(order.orderCode || 'Đơn hàng')
  const amount = Number(order.total || payment.amount || 0)

  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <div className="rounded-3xl border border-pink-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-xl font-black text-pink-600">
          MoMo
        </div>
        <h1 className="mt-4 text-2xl font-black text-slate-900">Thanh toán qua Ví MoMo</h1>
        <p className="mt-1 text-sm text-slate-500">Mã đơn hàng: <strong>{orderCode}</strong></p>
        <p className="mt-2 text-2xl font-black text-pink-600">{formatPrice(amount)}</p>

        {payment.qrCodeUrl ? (
          <div className="mt-6 flex flex-col items-center justify-center">
            <div className="rounded-2xl border-2 border-pink-200 bg-white p-4 shadow-sm">
              <img
                src={payment.qrCodeUrl}
                alt="MoMo QR Code"
                className="h-56 w-56 object-contain"
              />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Mở ứng dụng MoMo hoặc camera điện thoại quét mã QR để thanh toán
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3">
          {payment.payUrl ? (
            <a
              href={payment.payUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full rounded-xl bg-pink-600 px-6 py-3.5 text-sm font-bold text-white hover:bg-pink-700"
            >
              Mở trang thanh toán MoMo
            </a>
          ) : null}

          {orderId ? (
            <NextLink
              href={`/orders/${orderId}`}
              className="inline-block w-full rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Kiểm tra trạng thái đơn hàng
            </NextLink>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] animate-pulse px-4 py-8">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <div className="h-48 rounded-2xl bg-slate-200" />
          <div className="h-48 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-96 rounded-2xl bg-slate-200" />
      </div>
    </div>
  )
}

function EmptyCheckout() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8">
        <h2 className="text-xl font-black">Giỏ hàng của bạn đang trống</h2>
        <p className="mt-2 text-sm text-slate-500">Hãy thêm sản phẩm vào giỏ trước khi thanh toán.</p>
        <NextLink href="/products" className="mt-6 inline-block rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white">
          Khám phá sản phẩm
        </NextLink>
      </div>
    </div>
  )
}

function CheckoutError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8">
        <h2 className="text-xl font-black text-red-800">Không thể tải thanh toán</h2>
        <p className="mt-2 text-sm text-red-600">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    </div>
  )
}
