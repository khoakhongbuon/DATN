import Link from 'next/link'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ProductImageFallback } from '../components/ProductImageFallback'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Product = {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  stock: number
  brand?: { name: string } | null
  category?: { name: string } | null
}

type ProductImage = {
  url: string
  alt?: string | null
  sortOrder?: number | null
}

type ProductResponse = {
  success: boolean
  data: Product[]
}

type ImageResponse = {
  success: boolean
  data: ProductImage[]
}

type ProductCardProps = {
  product: Product
  imageUrl?: string
}

const categories = [
  { label: 'CPU', detail: 'Hiệu năng mạnh mẽ', icon: <CpuIcon />, href: '/products?search=CPU' },
  { label: 'VGA / GPU', detail: 'Đồ họa gaming', icon: <GpuIcon />, href: '/products?search=VGA' },
  { label: 'Mainboard', detail: 'Nền tảng ổn định', icon: <CircuitIcon />, href: '/products?search=Mainboard' },
  { label: 'RAM', detail: 'Tốc độ vượt trội', icon: <MemoryIcon />, href: '/products?search=RAM' },
  { label: 'SSD', detail: 'Tăng tốc hệ thống', icon: <HardDriveIcon />, href: '/products?search=SSD' },
  { label: 'HDD', detail: 'Lưu trữ bền bỉ', icon: <HardDriveIcon />, href: '/products?search=HDD' },
  { label: 'Nguồn / PSU', detail: 'Cấp nguồn ổn định', icon: <PowerIcon />, href: '/products?search=PSU' },
  { label: 'Case', detail: 'Không gian build tối ưu', icon: <CaseIcon />, href: '/products?search=Case' },
  { label: 'Tản nhiệt', detail: 'Mát và bền bỉ', icon: <FanIcon />, href: '/products?search=Tản nhiệt' },
  { label: 'Màn hình', detail: 'Hình ảnh sắc nét', icon: <MonitorIcon />, href: '/products?search=Màn hình' },
  { label: 'Bàn phím', detail: 'Điều khiển chính xác', icon: <KeyboardIcon />, href: '/products?search=Bàn phím' },
  { label: 'Chuột', detail: 'Phản hồi nhanh', icon: <MouseIcon />, href: '/products?search=Chuột' },
]

const componentTabs = ['CPU', 'VGA', 'Mainboard', 'RAM', 'SSD', 'PSU', 'Case', 'Tản nhiệt']
const brands = ['ASUS', 'MSI', 'Gigabyte', 'Intel', 'AMD', 'NVIDIA', 'Kingston', 'Corsair', 'Samsung', 'WD', 'Logitech', 'Razer']
const news = [
  { tag: 'CPU', title: 'Chọn bộ xử lý phù hợp cho từng nhu cầu', detail: 'Gợi ý nhanh để cân bằng hiệu năng, nhiệt độ và ngân sách.' },
  { tag: 'GPU', title: 'GPU mới thay đổi trải nghiệm gaming ra sao?', detail: 'Những điểm cần quan tâm khi chọn card đồ họa cho màn hình hiện đại.' },
  { tag: 'AI', title: 'Bắt đầu với hệ thống AI tại nhà', detail: 'Các thành phần nền tảng cho local AI và công việc sáng tạo.' },
  { tag: 'PC & GAMING', title: 'Tối ưu góc máy cho phiên chơi dài', detail: 'Không gian gọn gàng, kết nối tiện lợi và trải nghiệm thoải mái hơn.' },
]

const formatPrice = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

function getDiscount(product: Product) {
  if (!product.salePrice || product.salePrice >= product.price || product.price <= 0) return null
  return Math.round(((product.price - product.salePrice) / product.price) * 100)
}

function matchesTab(product: Product, tab: string) {
  const haystack = `${product.name} ${product.category?.name ?? ''}`.toLowerCase()
  return haystack.includes(tab.toLowerCase())
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState('CPU')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const loadProducts = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${API_BASE_URL}/api/products?limit=24&sortBy=createdAt&sortOrder=desc`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error('Không thể tải danh sách sản phẩm.')
        const payload: ProductResponse = await response.json()
        const nextProducts = payload.data ?? []
        if (!active) return
        setProducts(nextProducts)

        const imageEntries = await Promise.all(nextProducts.map(async (product) => {
          try {
            const imageResponse = await fetch(`${API_BASE_URL}/api/products/${product.id}/images`, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            })
            if (!imageResponse.ok) return [product.id, ''] as const
            const imagePayload: ImageResponse = await imageResponse.json()
            const firstImage = [...(imagePayload.data ?? [])]
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0]
            return [product.id, firstImage?.url ?? ''] as const
          } catch {
            return [product.id, ''] as const
          }
        }))
        if (active) setImageUrls(Object.fromEntries(imageEntries))
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && active) {
          console.error('Không thể tải sản phẩm nổi bật.', error)
          setProducts([])
          setImageUrls({})
          setError('Không thể tải sản phẩm lúc này. Vui lòng thử lại sau.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadProducts()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  const featuredProducts = products.slice(0, 5)
  const saleProducts = products.filter((product) => getDiscount(product) !== null).slice(0, 5)
  const tabProducts = useMemo(
    () => products.filter((product) => matchesTab(product, activeTab)).slice(0, 5),
    [activeTab, products],
  )

  return (
    <div className="bg-[#f4f7fb] text-slate-900">
      <section className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1.7fr_0.8fr]">
          <div className="relative min-h-[340px] overflow-hidden rounded-[24px] bg-gradient-to-br from-[#075bd7] via-[#0b4cb5] to-[#092d75] px-6 py-10 text-white shadow-xl shadow-blue-100 sm:min-h-[390px] sm:px-10 sm:py-14 lg:px-14">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full border-[28px] border-white/10" />
            <div className="absolute bottom-[-90px] right-24 h-56 w-56 rounded-full border-[22px] border-cyan-300/10" />
            <div className="absolute right-8 top-8 hidden rounded-2xl border border-white/15 bg-white/10 p-4 text-right text-xs font-bold uppercase tracking-[0.16em] text-cyan-100 sm:block">Gaming<br />Workstation<br />AI Ready</div>
            <div className="relative max-w-2xl">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-cyan-200">TK | Technology partner</p>
              <h1 className="text-4xl font-black leading-tight text-balance sm:text-5xl lg:text-6xl">Nâng tầm trải nghiệm công nghệ.</h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-blue-100 sm:text-lg">PC Gaming, linh kiện, laptop và thiết bị công nghệ cho game thủ, creator và doanh nghiệp.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/products" className="rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50">Xem sản phẩm</Link>
                <Link href="/pc-builder" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">Xây dựng cấu hình</Link>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Link href="/products?search=PC%20Gaming" className="group rounded-[24px] border border-blue-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">PC Gaming</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Sẵn sàng chiến game</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Khám phá linh kiện và cấu hình theo nhu cầu.</p>
              <span className="mt-5 inline-flex text-sm font-bold text-blue-700 group-hover:text-blue-500">Khám phá ngay →</span>
            </Link>
            <Link href="/products?search=Màn%20hình" className="group rounded-[24px] bg-slate-900 p-6 text-white shadow-sm transition hover:-translate-y-1 hover:bg-slate-800">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Màn hình & Gear</p>
              <h2 className="mt-3 text-2xl font-black">Nâng cấp góc máy</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Thiết bị hiển thị và phụ kiện cho trải nghiệm liền mạch.</p>
              <span className="mt-5 inline-flex text-sm font-bold text-cyan-300 group-hover:text-white">Xem thiết bị →</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-4 py-12 sm:px-6 lg:py-14">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Danh mục sản phẩm</p><h2 className="mt-2 text-3xl font-black tracking-tight text-balance sm:text-4xl">Khám phá theo nhu cầu</h2></div>
          <Link href="/products" className="text-sm font-bold text-blue-700 hover:text-blue-500">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4 2xl:grid-cols-8">
          {categories.map((category) => (
            <Link key={category.label} href={category.href} className="group flex min-h-[160px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 transition duration-200 group-hover:bg-blue-600 group-hover:text-white">{category.icon}</div>
              <h3 className="mt-5 text-base font-black text-slate-900 group-hover:text-blue-700">{category.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{category.detail}</p>
            </Link>
          ))}
        </div>
      </section>

      <ProductSection title="FLASH SALE" eyebrow="Hôm nay" products={saleProducts} imageUrls={imageUrls} loading={loading} error={error} emptyText="Chưa có sản phẩm đang giảm giá." />
      <ProductSection title="Sản phẩm nổi bật" eyebrow="TK chọn lọc" products={featuredProducts} imageUrls={imageUrls} loading={loading} error={error} emptyText="Đang cập nhật sản phẩm nổi bật." />

      <section className="mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Linh kiện PC</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Chọn đúng thành phần cho build</h2></div>
            <Link href="/products" className="text-sm font-bold text-blue-700 hover:text-blue-500">Xem catalog →</Link>
          </div>
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {componentTabs.map((tab) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === tab ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700'}`}>{tab}</button>)}
          </div>
          <ProductGrid products={tabProducts} imageUrls={imageUrls} loading={loading} error={error} emptyText={`Chưa có sản phẩm ${activeTab} phù hợp.`} />
        </div>
      </section>

      <section id="builder" className="mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[24px] bg-[#0b3d8f] p-6 text-white shadow-xl shadow-blue-100 md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200">PC Builder</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Tự tin chọn đúng cấu hình.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">Từ CPU, Mainboard đến PSU và tản nhiệt, TK giúp bạn kiểm tra tương thích và cân đối ngân sách trước khi nâng cấp.</p><Link href="/pc-builder" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50">Bắt đầu xây dựng</Link></div>
          <div className="grid grid-cols-2 gap-3">{['Socket CPU / Mainboard', 'RAM DDR4 / DDR5', 'Kích thước GPU', 'Công suất PSU'].map((item) => <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4"><p className="text-sm font-bold">{item}</p><p className="mt-2 text-xs text-blue-200">Kiểm tra tương thích</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[24px] bg-white p-5 shadow-sm sm:p-7"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Đối tác công nghệ</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Thương hiệu nổi bật</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">{brands.map((brand) => <Link key={brand} href={`/products?search=${encodeURIComponent(brand)}`} className="flex min-h-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-lg font-black text-slate-700 transition hover:-translate-y-1 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{brand}</Link>)}</div></div>
      </section>

      <section className="mx-auto max-w-[1600px] px-4 pb-14 sm:px-6 lg:px-8"><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Tin tức công nghệ</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Kiến thức giúp bạn chọn tốt hơn</h2></div><Link href="/products" className="text-sm font-bold text-blue-700 hover:text-blue-500">Xem tất cả →</Link></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{news.map((item) => <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"><div className="flex h-32 items-end rounded-xl bg-gradient-to-br from-blue-100 via-sky-50 to-slate-100 p-4 text-xs font-black uppercase tracking-[0.16em] text-blue-700">{item.tag}</div><h3 className="mt-5 text-lg font-black text-slate-900">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p><Link href="/products" className="mt-4 inline-flex text-sm font-bold text-blue-700 hover:text-blue-500">Xem thêm →</Link></article>)}</div></section>
    </div>
  )
}

function ProductSection({ title, eyebrow, products, imageUrls, loading, error, emptyText }: { title: string; eyebrow: string; products: Product[]; imageUrls: Record<string, string>; loading: boolean; error: string; emptyText: string }) {
  return <section className="mx-auto max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8"><div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm sm:p-7"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{eyebrow}</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">{title}</h2></div><Link href="/products" className="text-sm font-bold text-blue-700 hover:text-blue-500">Xem catalog →</Link></div><ProductGrid products={products} imageUrls={imageUrls} loading={loading} error={error} emptyText={emptyText} /></div></section>
}

function ProductGrid({ products, imageUrls, loading, error, emptyText }: { products: Product[]; imageUrls: Record<string, string>; loading: boolean; error: string; emptyText: string }) {
  if (loading) return <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Đang tải sản phẩm...</div>
  if (error) return <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">{error}</div>
  if (products.length === 0) return <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">{emptyText}</div>
  return <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{products.map((product) => <ProductCard key={product.id} product={product} imageUrl={imageUrls[product.id]} />)}</div>
}

function ProductCard({ product, imageUrl }: ProductCardProps) {
  const discount = getDiscount(product)
  const displayPrice = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price
  return <Link href={`/products/${product.slug}`} className="group relative rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"><div className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-4xl font-black text-blue-200"><ProductImageFallback src={imageUrl} name={product.name} width={320} height={220} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />{discount ? <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">-{discount}%</span> : null}</div><p className="mt-4 truncate text-xs font-semibold uppercase tracking-wider text-slate-400">{product.brand?.name || product.category?.name || 'TK Select'}</p><h3 className="mt-2 line-clamp-2 min-h-[44px] text-sm font-bold text-slate-900 group-hover:text-blue-700">{product.name}</h3><p className="mt-3 text-lg font-black text-blue-700">{formatPrice(displayPrice)}</p>{discount ? <p className="mt-1 text-xs text-slate-400 line-through">{formatPrice(product.price)}</p> : null}<p className={`mt-3 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</p></Link>
}

function Icon({ children }: { children: ReactNode }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-9 w-9">{children}</svg> }
function CpuIcon() { return <Icon><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /><path d="M10 10h4v4h-4z" /></Icon> }
function GpuIcon() { return <Icon><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="9" cy="12" r="3" /><path d="M15 9h3M15 12h3M15 15h3M21 10v4M3 9H1v6h2" /></Icon> }
function CircuitIcon() { return <Icon><rect x="5" y="5" width="14" height="14" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M9 9h2v2h2v4" /></Icon> }
function MemoryIcon() { return <Icon><rect x="4" y="6" width="16" height="12" rx="1" /><path d="M8 6v12M12 6v12M16 6v12M7 3v3M11 3v3M15 3v3M19 3v3M7 18v3M11 18v3M15 18v3M19 18v3" /></Icon> }
function HardDriveIcon() { return <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8" cy="12" r="2" /><path d="M13 10h5M13 14h3" /></Icon> }
function FanIcon() { return <Icon><circle cx="12" cy="12" r="2" /><path d="M12 10c-1-5 4-6 5-3 1 2-1 4-5 5M14 12c5-1 6 4 3 5-2 1-4-1-5-5M12 14c1 5-4 6-5 3-1-2 1-4 5-5M10 12c-5 1-6-4-3-5 2-1 4 1 5 5" /></Icon> }
function PowerIcon() { return <Icon><path d="M12 2v9M6.5 5.5a8 8 0 1 0 11 0" /></Icon> }
function CaseIcon() { return <Icon><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 17h6M9 12h.01" /></Icon> }
function MonitorIcon() { return <Icon><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></Icon> }
function KeyboardIcon() { return <Icon><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h8M16 14h2" /></Icon> }
function MouseIcon() { return <Icon><rect x="7" y="3" width="10" height="18" rx="5" /><path d="M12 3v5M9 8h6" /></Icon> }
