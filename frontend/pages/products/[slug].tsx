import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL as CART_API_BASE_URL, cartHeaders } from '../../lib/cart'
import { useAuth } from '../../lib/auth'
import { ProductImageFallback } from '../../components/ProductImageFallback'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Product = {
  id: string
  name: string
  slug: string
  description?: string | null
  sku?: string | null
  price: number
  salePrice?: number | null
  stock: number
  isActive?: boolean
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
}

type ProductImage = { id: string; url: string; alt?: string | null; sortOrder?: number | null }
type ProductSpecification = {
  id: string
  productId: string
  productType?: string | null
  socket?: string | null
  cores?: number | null
  threads?: number | null
  baseClock?: number | null
  boostClock?: number | null
  tdp?: number | null
  chipset?: string | null
  vram?: number | null
  memoryType?: string | null
  length?: number | null
  powerConsumption?: number | null
  interface?: string | null
  powerConnector?: string | null
  ramType?: string | null
  ramSlots?: number | null
  maxRam?: number | null
  formFactor?: string | null
  pcieVersion?: string | null
  type?: string | null
  capacity?: number | null
  speed?: number | null
  modules?: number | null
  capacityGB?: number | null
  storageInterface?: string | null
  rpm?: number | null
  wattage?: number | null
  efficiency?: string | null
  certification?: string | null
  connectors?: string | null
  gpuClearance?: number | null
  cpuCoolerClearance?: number | null
  motherboardSupport?: string | null
  radiatorSupport?: string | null
  height?: number | null
}

type ApiResponse<T> = { success: boolean; data: T }
type ProductListResponse = ApiResponse<Product[]> & { pagination?: { totalPages?: number } }

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

const labels: Record<string, string> = {
  socket: 'Socket',
  cores: 'Nhân',
  threads: 'Luồng',
  baseClock: 'Xung cơ bản',
  boostClock: 'Xung boost',
  tdp: 'TDP',
  chipset: 'Chipset',
  vram: 'VRAM',
  memoryType: 'Loại bộ nhớ',
  length: 'Chiều dài',
  powerConsumption: 'Điện năng tiêu thụ',
  interface: 'Giao tiếp',
  powerConnector: 'Đầu cấp nguồn',
  ramType: 'Chuẩn RAM',
  ramSlots: 'Khe RAM',
  maxRam: 'RAM tối đa',
  formFactor: 'Kích thước',
  pcieVersion: 'Chuẩn PCIe',
  type: 'Loại',
  capacity: 'Dung lượng',
  speed: 'Tốc độ',
  modules: 'Số thanh',
  capacityGB: 'Dung lượng',
  storageInterface: 'Chuẩn lưu trữ',
  rpm: 'Tốc độ vòng quay',
  wattage: 'Công suất',
  efficiency: 'Hiệu suất',
  certification: 'Chứng nhận',
  connectors: 'Đầu kết nối',
  gpuClearance: 'Khoảng GPU hỗ trợ',
  cpuCoolerClearance: 'Khoảng tản CPU hỗ trợ',
  motherboardSupport: 'Hỗ trợ bo mạch',
  radiatorSupport: 'Hỗ trợ radiator',
  height: 'Chiều cao',
}

const formatSpecValue = (key: string, value: unknown) => {
  if (typeof value !== 'number') return String(value)
  if (['baseClock', 'boostClock'].includes(key)) return `${value} GHz`
  if (['length', 'height', 'gpuClearance', 'cpuCoolerClearance'].includes(key)) return `${value} mm`
  if (['vram', 'capacity', 'capacityGB', 'maxRam'].includes(key)) return `${value} GB`
  if (key === 'speed') return `${value} MHz`
  if (key === 'wattage' || key === 'powerConsumption' || key === 'tdp') return `${value} W`
  return String(value)
}

function getDiscount(product: Product) {
  if (!product.salePrice || product.salePrice >= product.price || product.price <= 0) return null
  return Math.round(((product.price - product.salePrice) / product.price) * 100)
}

function isPresent(value: unknown) {
  return value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '')
}

export default function ProductDetailPage() {
  const router = useRouter()
  const slug = typeof router.query.slug === 'string' ? router.query.slug : ''
  const [product, setProduct] = useState<Product | null>(null)
  const [images, setImages] = useState<ProductImage[]>([])
  const [specs, setSpecs] = useState<ProductSpecification[]>([])
  const [related, setRelated] = useState<Product[]>([])
  const [relatedImages, setRelatedImages] = useState<Record<string, string>>({})
  const [activeImage, setActiveImage] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [cartMessage, setCartMessage] = useState('')
  const [cartSubmitting, setCartSubmitting] = useState(false)
  const { user, token, authenticated } = useAuth()

  useEffect(() => {
    if (!router.isReady || !slug) return
    const controller = new AbortController()
    let active = true

    const load = async () => {
      setLoading(true)
      setError('')
      setCartMessage('')
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/slug/${encodeURIComponent(slug)}`, { signal: controller.signal, headers: { Accept: 'application/json' } })
        if (response.status === 404) throw new Error('NOT_FOUND')
        if (!response.ok) throw new Error('Không thể tải sản phẩm.')
        const payload = await response.json() as ApiResponse<Product>
        const current = payload.data
        if (!active) return
        setProduct(current)
        setQuantity(1)

        const [imageResponse, specResponse, relatedResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products/${current.id}/images`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(`${API_BASE_URL}/api/products/${current.id}/specifications`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          current.category?.id ? fetch(`${API_BASE_URL}/api/products?categoryId=${encodeURIComponent(current.category.id)}&limit=5`, { signal: controller.signal, headers: { Accept: 'application/json' } }) : Promise.resolve(null),
        ])

        const imagePayload = imageResponse?.ok ? await imageResponse.json() as ApiResponse<ProductImage[]> : { data: [] }
        const sortedImages = [...(imagePayload.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        const specPayload = specResponse?.ok ? await specResponse.json() as ApiResponse<ProductSpecification[]> : { data: [] }
        const relatedPayload = relatedResponse?.ok ? await relatedResponse.json() as ProductListResponse : { data: [] }
        const relatedProducts = (relatedPayload.data ?? []).filter((item) => item.id !== current.id).slice(0, 4)
        if (!active) return
        setImages(sortedImages)
        setActiveImage(sortedImages[0]?.url ?? '')
        setSpecs(specPayload.data ?? [])
        setRelated(relatedProducts)

        const imageEntries = await Promise.all(relatedProducts.map(async (item) => {
          try {
            const itemResponse = await fetch(`${API_BASE_URL}/api/products/${item.id}/images`, { signal: controller.signal, headers: { Accept: 'application/json' } })
            if (!itemResponse.ok) return [item.id, ''] as const
            const itemPayload = await itemResponse.json() as ApiResponse<ProductImage[]>
            const itemImage = [...(itemPayload.data ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]
            return [item.id, itemImage?.url ?? ''] as const
          } catch {
            return [item.id, ''] as const
          }
        }))
        if (active) setRelatedImages(Object.fromEntries(imageEntries))
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError' || !active) return
        setProduct(null)
        setImages([])
        setSpecs([])
        setRelated([])
        setError((loadError as Error).message === 'NOT_FOUND' ? 'Sản phẩm không tồn tại hoặc đã được gỡ khỏi catalog.' : 'Không thể tải chi tiết sản phẩm. Vui lòng thử lại.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
      controller.abort()
    }
  }, [router.isReady, slug, retry])

  const discount = product ? getDiscount(product) : null
  const displayPrice = product ? (discount ? product.salePrice as number : product.price) : 0
  const activeImageUrl = activeImage || images[0]?.url || ''
  const groupedSpecs = useMemo(() => {
    const groups = new Map<string, { label: string; value: string }[]>()
    specs.forEach((spec) => {
      Object.entries(spec).forEach(([key, value]) => {
        if (['id', 'productId', 'productType', 'extra'].includes(key) || !isPresent(value)) return
        const row = { label: labels[key] || key, value: formatSpecValue(key, value) }
        const group = spec.productType?.toUpperCase() || 'THÔNG SỐ CHUNG'
        const rows = groups.get(group) ?? []
        if (!rows.some((item) => item.label === row.label && item.value === row.value)) rows.push(row)
        groups.set(group, rows)
      })
    })
    return [...groups.entries()].filter(([, rows]) => rows.length > 0)
  }, [specs])

  const changeQuantity = (value: number) => {
    if (!product || product.stock <= 0) return
    setQuantity(Math.min(product.stock, Math.max(1, Math.floor(value) || 1)))
  }

  const addToCart = async () => {
    if (!product || product.stock <= 0) return setCartMessage('Sản phẩm hiện đã hết hàng.')
    if (!authenticated || !user?.id) {
      setCartMessage('Vui lòng đăng nhập để sử dụng giỏ hàng.')
      return
    }
    setCartSubmitting(true)
    try {
      const response = await fetch(`${CART_API_BASE_URL}/api/cart/${encodeURIComponent(user.id)}/items`, {
        method: 'POST',
        headers: cartHeaders(token, true),
        body: JSON.stringify({ productId: product.id, quantity }),
      })
      if (!response.ok) throw new Error('Không thể thêm sản phẩm vào giỏ hàng.')
      setCartMessage('Đã thêm sản phẩm vào giỏ hàng.')
      window.dispatchEvent(new Event('tk-cart-updated'))
    } catch {
      setCartMessage('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.')
    } finally {
      setCartSubmitting(false)
    }
  }

  if (loading) return <DetailSkeleton />
  if (!product) return <NotFoundState message={error} onRetry={() => setRetry((value) => value + 1)} />

  return (
    <div className="bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:text-blue-500">Trang chủ</Link><span>/</span>
          <Link href="/products" className="font-semibold text-blue-700 hover:text-blue-500">{product.category?.name || 'Sản phẩm'}</Link><span>/</span>
          <span className="max-w-[280px] truncate">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Gallery product={product} images={images} activeImage={activeImageUrl} onSelect={setActiveImage} />
          <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">{product.brand?.name || 'TK'}</span>
              {discount ? <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">-{discount}%</span> : null}
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500"><span>SKU: {product.sku || 'Đang cập nhật'}</span><span className={product.stock > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</span></div>
            <div className="mt-6 flex flex-wrap items-end gap-3"><span className="text-3xl font-black text-blue-700">{formatPrice(displayPrice)}</span>{discount ? <span className="text-base text-slate-400 line-through">{formatPrice(product.price)}</span> : null}</div>
            <PurchaseCard product={product} quantity={quantity} cartSubmitting={cartSubmitting} onQuantityChange={changeQuantity} onAdd={addToCart} />
            {cartMessage ? <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{cartMessage}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{['Kiểm tra tương thích', 'Hỗ trợ tư vấn', 'Bảo hành', 'Giao hàng'].map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-600">{item}</div>)}</div>
          </section>
        </div>

        <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-black">Mô tả sản phẩm</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}</p>
        </section>

        <section className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-2xl font-black">Thông số kỹ thuật</h2>
          {groupedSpecs.length ? <div className="mt-5 grid gap-5 md:grid-cols-2">{groupedSpecs.map(([group, rows]) => <div key={group} className="overflow-hidden rounded-2xl border border-slate-200"><h3 className="bg-slate-50 px-4 py-3 text-sm font-black uppercase tracking-wider text-blue-700">{group}</h3><dl className="divide-y divide-slate-200">{rows.map((row) => <div key={`${row.label}-${row.value}`} className="grid grid-cols-[1fr_1.2fr] gap-3 px-4 py-3 text-sm"><dt className="text-slate-500">{row.label}</dt><dd className="font-semibold text-slate-900">{row.value}</dd></div>)}</dl></div>)}</div> : <EmptySpecs />}
        </section>

        <section className="mt-6 pb-10">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-blue-600">Gợi ý cho bạn</p><h2 className="mt-1 text-2xl font-black">Sản phẩm liên quan</h2></div><Link href="/products" className="text-sm font-bold text-blue-700 hover:text-blue-500">Xem catalog →</Link></div>
          {related.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{related.map((item) => <RelatedCard key={item.id} product={item} imageUrl={relatedImages[item.id]} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Chưa có sản phẩm liên quan trong danh mục này.</div>}
        </section>
      </div>
    </div>
  )
}

function Gallery({ product, images, activeImage, onSelect }: { product: Product; images: ProductImage[]; activeImage: string; onSelect: (url: string) => void }) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex h-[340px] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 text-6xl font-black text-blue-200 sm:h-[500px]">
        <ProductImageFallback src={activeImage} name={product.name} categorySlug={product.category?.slug} className="h-full w-full object-contain" />
      </div>
      {images.length ? (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {images.map((image) => (
            <button
              key={image.id}
              type="button"
              aria-label={`Chọn ảnh ${image.alt || product.name}`}
              aria-pressed={activeImage === image.url}
              onClick={() => onSelect(image.url)}
              className={`overflow-hidden rounded-xl border-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 ${activeImage === image.url ? 'border-blue-600' : 'border-transparent'}`}
            >
              <ProductImageFallback
                src={image.url}
                alt={image.alt || product.name}
                name={product.name}
                categorySlug={product.category?.slug}
                className="h-20 w-full object-cover"
                fallbackClassName="flex h-20 w-full items-center justify-center text-xs font-black text-slate-400 bg-slate-100"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function PurchaseCard({ product, quantity, cartSubmitting, onQuantityChange, onAdd }: { product: Product; quantity: number; cartSubmitting: boolean; onQuantityChange: (value: number) => void; onAdd: () => void }) {
  return <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Số lượng</p><div className="mt-3 flex items-center gap-2"><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1 || product.stock <= 0} onClick={() => onQuantityChange(quantity - 1)} className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-xl font-bold disabled:opacity-40">−</button><input aria-label="Số lượng sản phẩm" type="number" min={1} max={product.stock || 1} value={quantity} disabled={product.stock <= 0} onChange={(event) => onQuantityChange(Number(event.target.value))} className="h-11 w-20 rounded-xl border border-slate-200 bg-white text-center font-bold outline-none focus:border-blue-500" /><button type="button" aria-label="Tăng số lượng" disabled={product.stock <= 0 || quantity >= product.stock} onClick={() => onQuantityChange(quantity + 1)} className="h-11 w-11 rounded-xl border border-slate-200 bg-white text-xl font-bold disabled:opacity-40">+</button><span className="ml-2 text-xs text-slate-500">{product.stock > 0 ? `Tối đa ${product.stock}` : 'Hết hàng'}</span></div><button type="button" disabled={product.stock <= 0 || cartSubmitting} onClick={onAdd} className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">{cartSubmitting ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}</button></div>
}

function RelatedCard({ product, imageUrl }: { product: Product; imageUrl?: string }) {
  const discount = getDiscount(product)
  return <Link href={`/products/${product.slug}`} className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"><div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-3xl font-black text-blue-200"><ProductImageFallback src={imageUrl} name={product.name} categorySlug={product.category?.slug} className="h-full w-full object-contain" />{discount ? <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">-{discount}%</span> : null}</div><p className="mt-3 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{product.brand?.name || 'TK'}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold group-hover:text-blue-700">{product.name}</h3><p className="mt-2 font-black text-blue-700">{formatPrice(discount ? product.salePrice as number : product.price)}</p></Link>
}

function DetailSkeleton() {
  return <div className="mx-auto max-w-[1600px] animate-pulse px-4 py-8 sm:px-6 lg:px-8"><div className="h-4 w-60 rounded bg-slate-200" /><div className="mt-6 grid gap-6 lg:grid-cols-2"><div className="h-[500px] rounded-3xl bg-slate-200" /><div className="space-y-4"><div className="h-10 w-3/4 rounded bg-slate-200" /><div className="h-6 w-1/3 rounded bg-slate-200" /><div className="h-32 rounded bg-slate-200" /><div className="h-16 rounded bg-slate-200" /></div></div></div>
}

function NotFoundState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 shadow-sm"><h1 className="text-2xl font-black">Không tìm thấy sản phẩm</h1><p className="mt-3 text-sm text-slate-500">{message || 'Sản phẩm không tồn tại hoặc đã được gỡ khỏi catalog.'}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/products" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white">Quay lại catalog</Link><button type="button" onClick={onRetry} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">Thử lại</button></div></div></div>
}

function EmptySpecs() {
  return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Sản phẩm này chưa có thông số kỹ thuật được cập nhật.</div>
}
