import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { API_BASE_URL, Cart, cartHeaders, productPrice } from '../lib/cart'

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

const emptyForm: AddressForm = {
  recipientName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  detail: '',
  isDefault: false,
}

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

function apiError(payload: ApiPayload<unknown>, fallback: string) {
  return payload.message || payload.error || fallback
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, token, authenticated, loading: authLoading } = useAuth()
  const [cart, setCart] = useState<Cart | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddress, setSelectedAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AddressForm>(emptyForm)
  const [formError, setFormError] = useState('')
  const [savingAddress, setSavingAddress] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
  const [order, setOrder] = useState<Record<string, unknown> | null>(null)

  const loadCheckout = useCallback(async (signal: AbortSignal) => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const [cartResponse, addressResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/cart/${encodeURIComponent(user.id)}`, { signal, headers: cartHeaders(token) }),
        fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(user.id)}/addresses`, { signal, headers: cartHeaders(token) }),
      ])
      const cartPayload = await cartResponse.json() as ApiPayload<Cart>
      const addressPayload = await addressResponse.json() as ApiPayload<Address[]>
      if (!cartResponse.ok) throw new Error(apiError(cartPayload, 'Không thể tải giỏ hàng.'))
      if (!addressResponse.ok) throw new Error(apiError(addressPayload, 'Không thể tải địa chỉ.'))
      if (signal.aborted) return
      const nextAddresses = addressPayload.data ?? []
      setCart(cartPayload.data ?? { id: '', items: [] })
      setAddresses(nextAddresses)
      setSelectedAddress((current) => current || nextAddresses.find((address) => address.isDefault)?.id || nextAddresses[0]?.id || '')
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Không thể tải dữ liệu checkout.')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [token, user?.id])

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
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + productPrice(item.product) * item.quantity, 0), [items])
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
      const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(user.id)}/addresses`, {
        method: 'POST',
        headers: cartHeaders(token, true),
        body: JSON.stringify(form),
      })
      const payload = await response.json() as ApiPayload<Address>
      if (!response.ok || !payload.data) throw new Error(apiError(payload, 'Không thể thêm địa chỉ.'))
      setAddresses((current) => form.isDefault ? [payload.data as Address, ...current.map((address) => ({ ...address, isDefault: false }))] : [...current, payload.data as Address])
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
    setPlacingOrder(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: cartHeaders(token, true),
        body: JSON.stringify({ addressId: selectedAddress }),
      })
      const payload = await response.json() as ApiPayload<Record<string, unknown>>
      if (!response.ok || !payload.data) throw new Error(apiError(payload, 'Không thể tạo đơn hàng.'))
      setOrder(payload.data)
      window.dispatchEvent(new Event('tk-cart-updated'))
    } catch (placeError) {
      setError((placeError as Error).message)
    } finally {
      setPlacingOrder(false)
    }
  }

  if (order) return <OrderSuccess order={order} />
  if (authLoading || loading) return <CheckoutSkeleton />
  if (error && !cart) return <CheckoutError message={error} onRetry={() => setRetry((value) => value + 1)} />
  if (!cart || items.length === 0) return <EmptyCheckout />

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="text-sm text-slate-500"><Link href="/" className="font-bold text-blue-700">Trang chủ</Link><span className="mx-2">/</span><Link href="/cart" className="font-bold text-blue-700">Giỏ hàng</Link><span className="mx-2">/</span><span>Thanh toán</span></nav>
        <div className="mt-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Checkout</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Xác nhận đơn hàng</h1></div>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Thông tin giao hàng</h2><button type="button" onClick={() => setShowForm((value) => !value)} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{showForm ? 'Đóng' : 'Thêm địa chỉ'}</button></div>
              {addresses.length ? <div className="mt-4 grid gap-3">{addresses.map((address) => <button key={address.id} type="button" onClick={() => setSelectedAddress(address.id)} className={`w-full rounded-xl border p-4 text-left transition ${selectedAddress === address.id ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}><div className="flex flex-wrap items-center gap-2"><strong>{address.recipientName}</strong><span className="text-sm text-slate-500">{address.phone}</span>{address.isDefault ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">Mặc định</span> : null}</div><p className="mt-2 text-sm leading-6 text-slate-600">{address.detail}, {address.ward}, {address.district}, {address.province}</p></button>)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Bạn chưa có địa chỉ giao hàng</div>}
              {showForm ? <AddressForm form={form} setForm={setForm} error={formError} saving={savingAddress} onSubmit={saveAddress} /> : null}
            </div>
          </section>
          <aside className="h-fit rounded-2xl border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-6"><h2 className="text-xl font-black">Tóm tắt đơn hàng</h2><div className="mt-4 space-y-3">{items.map((item) => <div key={item.id} className="flex justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate font-semibold">{item.product.name}</span><span className="text-slate-500">x{item.quantity}</span></span><strong className="shrink-0">{formatPrice(productPrice(item.product) * item.quantity)}</strong></div>)}</div><div className="mt-5 border-t border-slate-200 pt-4"><div className="flex justify-between text-base font-black"><span>Tổng cộng</span><span className="text-blue-700">{formatPrice(subtotal)}</span></div><p className="mt-3 text-xs leading-5 text-slate-500">Phí vận chuyển chưa được backend tính ở bước này.</p></div>{hasInvalidStock ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Số lượng sản phẩm không còn đủ trong kho.</p> : null}<button type="button" disabled={!selectedAddress || hasInvalidStock || placingOrder} onClick={placeOrder} className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">{placingOrder ? 'Đang tạo đơn hàng...' : 'Đặt hàng'}</button></aside>
        </div>
      </div>
    </div>
  )
}

function AddressForm({ form, setForm, error, saving, onSubmit }: { form: AddressForm; setForm: (form: AddressForm) => void; error: string; saving: boolean; onSubmit: (event: FormEvent) => void }) {
  const field = (key: keyof AddressForm, label: string) => <label className="text-sm font-bold text-slate-700">{label}<input required={key !== 'isDefault'} value={String(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-500" /></label>
  return <form onSubmit={onSubmit} className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">{field('recipientName', 'Họ tên người nhận')}{field('phone', 'Số điện thoại')}{field('province', 'Tỉnh/thành phố')}{field('district', 'Quận/huyện')}{field('ward', 'Phường/xã')}<div className="sm:col-span-2">{field('detail', 'Địa chỉ chi tiết')}</div><label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.isDefault} onChange={(event) => setForm({ ...form, isDefault: event.target.checked })} />Đặt làm địa chỉ mặc định</label>{error ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p> : null}<button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Đang lưu...' : 'Lưu địa chỉ'}</button></form>
}

function CheckoutSkeleton() { return <div className="mx-auto max-w-[1600px] animate-pulse px-4 py-10"><div className="h-8 w-72 rounded bg-slate-200" /><div className="mt-8 grid gap-6 lg:grid-cols-2"><div className="h-96 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div></div> }
function CheckoutError({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><div className="rounded-3xl bg-red-50 p-10"><h1 className="text-2xl font-black text-red-800">Không thể tải checkout</h1><p className="mt-3 text-sm text-red-700">{message}</p><button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold text-white">Thử lại</button></div></div> }
function EmptyCheckout() { return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10"><h1 className="text-2xl font-black">Giỏ hàng đang trống</h1><p className="mt-3 text-sm text-slate-500">Hãy chọn sản phẩm trước khi thanh toán.</p><Link href="/products" className="mt-5 inline-flex rounded-xl bg-blue-700 px-5 py-3 font-bold text-white">Tiếp tục mua sắm</Link></div></div> }
function OrderSuccess({ order }: { order: Record<string, unknown> }) { const orderId = typeof order.id === 'string' ? order.id : ''; const orderCode = typeof order.orderCode === 'string' ? order.orderCode : 'Đơn hàng mới'; const total = typeof order.total === 'number' ? order.total : 0; return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><div className="rounded-3xl border border-emerald-200 bg-white p-8 shadow-sm"><div className="text-5xl text-emerald-600">✓</div><h1 className="mt-4 text-3xl font-black">Đặt hàng thành công</h1><p className="mt-3 text-slate-500">Mã đơn hàng: <strong>{orderCode}</strong></p><p className="mt-2 text-xl font-black text-blue-700">{formatPrice(total)}</p><div className="mt-6 flex flex-wrap justify-center gap-3">{orderId ? <Link href={`/orders/${orderId}`} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Xem đơn hàng</Link> : null}<Link href="/products" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold">Tiếp tục mua sắm</Link></div></div></div> }
