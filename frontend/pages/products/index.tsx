import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ProductImageFallback } from '../../components/ProductImageFallback'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'
const DEFAULT_LIMIT = 12

type Product = {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice?: number | null
  stock: number
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
}

type ProductImage = { url: string; alt?: string | null; sortOrder?: number | null }
type ProductApiResponse = {
  success: boolean
  data: Product[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}
type Category = { id: string; name: string; slug: string }
type Brand = { id: string; name: string; slug: string }
type ProductFilters = {
  page: number
  search: string
  categoryId: string
  brandId: string
  minPrice: string
  maxPrice: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

const emptyFilters = (): ProductFilters => ({
  page: 1,
  search: '',
  categoryId: '',
  brandId: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'price',
  sortOrder: 'asc',
})

const parseFilterState = (query: Record<string, string | string[] | undefined>): ProductFilters => ({
  page: Math.max(1, Number(query.page ?? '1') || 1),
  search: typeof query.search === 'string' ? query.search : '',
  categoryId: typeof query.categoryId === 'string' ? query.categoryId : '',
  brandId: typeof query.brandId === 'string' ? query.brandId : '',
  minPrice: typeof query.minPrice === 'string' ? query.minPrice : '',
  maxPrice: typeof query.maxPrice === 'string' ? query.maxPrice : '',
  sortBy: typeof query.sortBy === 'string' ? query.sortBy : 'price',
  sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
})

const sameFilters = (a: ProductFilters, b: ProductFilters) =>
  a.page === b.page &&
  a.search === b.search &&
  a.categoryId === b.categoryId &&
  a.brandId === b.brandId &&
  a.minPrice === b.minPrice &&
  a.maxPrice === b.maxPrice &&
  a.sortBy === b.sortBy &&
  a.sortOrder === b.sortOrder

const buildQuery = (filters: ProductFilters) => {
  const query = new URLSearchParams()
  if (filters.search.trim()) query.set('search', filters.search.trim())
  if (filters.categoryId) query.set('categoryId', filters.categoryId)
  if (filters.brandId) query.set('brandId', filters.brandId)
  if (filters.minPrice) query.set('minPrice', filters.minPrice)
  if (filters.maxPrice) query.set('maxPrice', filters.maxPrice)
  query.set('sortBy', filters.sortBy)
  query.set('sortOrder', filters.sortOrder)
  if (filters.page > 1) query.set('page', String(filters.page))
  return query.toString()
}

function discountFor(product: Product) {
  if (!product.salePrice || product.salePrice >= product.price || product.price <= 0) return null
  return Math.round(((product.price - product.salePrice) / product.price) * 100)
}

export default function ProductCatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [filters, setFilters] = useState<ProductFilters>(emptyFilters)
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [error, setError] = useState('')
  const [metadataError, setMetadataError] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [retry, setRetry] = useState(0)

  const queryState = useMemo(() => parseFilterState(router.query ?? {}), [
    router.query.page,
    router.query.search,
    router.query.categoryId,
    router.query.brandId,
    router.query.minPrice,
    router.query.maxPrice,
    router.query.sortBy,
    router.query.sortOrder,
  ])

  useEffect(() => {
    if (!router.isReady) return
    setFilters((previous) => sameFilters(previous, queryState) ? previous : queryState)
  }, [queryState, router.isReady])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const loadMetadata = async () => {
      setMetadataLoading(true)
      try {
        const [categoryResponse, brandResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/api/brands`, { signal: controller.signal }),
        ])
        if (!categoryResponse.ok || !brandResponse.ok) throw new Error('Không thể tải bộ lọc.')
        const categoryPayload = await categoryResponse.json() as { data?: Category[] }
        const brandPayload = await brandResponse.json() as { data?: Brand[] }
        if (!active) return
        setCategories(categoryPayload.data ?? [])
        setBrands(brandPayload.data ?? [])
        setMetadataError('')
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError' && active) {
          setMetadataError('Không thể tải danh mục và thương hiệu.')
        }
      } finally {
        if (active) setMetadataLoading(false)
      }
    }
    loadMetadata()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!router.isReady) return
    const controller = new AbortController()
    let active = true
    const loadProducts = async () => {
      setLoading(true)
      setError('')
      const params = new URLSearchParams(buildQuery(queryState))
      params.set('limit', String(DEFAULT_LIMIT))
      try {
        const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error('Không thể tải danh sách sản phẩm.')
        const payload = await response.json() as ProductApiResponse
        if (!active) return
        setProducts(payload.data ?? [])
        setPageInfo({
          page: payload.pagination?.page ?? queryState.page,
          totalPages: payload.pagination?.totalPages ?? 1,
          total: payload.pagination?.total ?? 0,
        })

        const imageEntries = await Promise.all((payload.data ?? []).map(async (product) => {
          try {
            const imageResponse = await fetch(`${API_BASE_URL}/api/products/${product.id}/images`, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            })
            if (!imageResponse.ok) return [product.id, ''] as const
            const imagePayload = await imageResponse.json() as { data?: ProductImage[] }
            const image = [...(imagePayload.data ?? [])]
              .sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0))[0]
            return [product.id, image?.url ?? ''] as const
          } catch {
            return [product.id, ''] as const
          }
        }))
        if (active) setImageUrls(Object.fromEntries(imageEntries))
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError' || !active) return
        setProducts([])
        setImageUrls({})
        setPageInfo((previous) => ({ ...previous, total: 0, totalPages: 1 }))
        setError('Không thể tải sản phẩm lúc này. Vui lòng thử lại.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProducts()
    return () => {
      active = false
      controller.abort()
    }
  }, [queryState, retry, router.isReady])

  const applyFilters = (nextFilters: ProductFilters) => {
    const query = buildQuery({ ...nextFilters, page: 1 })
    setFilterOpen(false)
    void router.push(query ? `/products?${query}` : '/products', undefined, { shallow: true })
  }

  const resetFilters = () => {
    setFilterOpen(false)
    setFilters(emptyFilters())
    void router.push('/products', undefined, { shallow: true })
  }

  const changePage = (page: number) => {
    if (page < 1 || page > pageInfo.totalPages) return
    const nextFilters = { ...filters, page }
    setFilters(nextFilters)
    void router.push(`/products?${buildQuery(nextFilters)}`, undefined, { shallow: true })
  }

  const activeChips = [
    filters.search ? { label: `Từ khóa: ${filters.search}`, key: 'search' } : null,
    filters.categoryId ? { label: `Danh mục: ${categories.find((item) => item.id === filters.categoryId)?.name ?? 'Đã chọn'}`, key: 'categoryId' } : null,
    filters.brandId ? { label: `Hãng: ${brands.find((item) => item.id === filters.brandId)?.name ?? 'Đã chọn'}`, key: 'brandId' } : null,
    filters.minPrice ? { label: `Từ ${formatPrice(Number(filters.minPrice))}`, key: 'minPrice' } : null,
    filters.maxPrice ? { label: `Đến ${formatPrice(Number(filters.maxPrice))}`, key: 'maxPrice' } : null,
  ].filter((chip): chip is { label: string; key: keyof ProductFilters } => Boolean(chip))

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:text-blue-500">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span>Sản phẩm</span>
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">TK Catalogue</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Sản phẩm</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Khám phá linh kiện và thiết bị công nghệ được chọn cho mọi nhu cầu.</p>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="text-slate-500">Tổng sản phẩm</span>
            <strong className="ml-2 text-lg text-blue-700">{pageInfo.total}</strong>
          </div>
        </header>

        <div className="mt-7 flex items-center justify-between gap-3 lg:hidden">
          <button type="button" onClick={() => setFilterOpen(true)} className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-sm focus:outline-none">Bộ lọc</button>
          <SortSelect filters={filters} onChange={(sortBy, sortOrder) => applyFilters({ ...filters, sortBy, sortOrder })} />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={`${filterOpen ? 'fixed inset-0 z-50 flex' : 'hidden'} lg:static lg:block`} aria-label="Bộ lọc sản phẩm">
            <button type="button" aria-label="Đóng bộ lọc" onClick={() => setFilterOpen(false)} className="absolute inset-0 bg-slate-950/40 lg:hidden" />
            <div className="relative ml-auto h-full w-[min(88vw,340px)] overflow-y-auto bg-white p-5 shadow-2xl lg:sticky lg:top-6 lg:h-auto lg:w-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:p-5 lg:shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black">Bộ lọc</h2>
                <button type="button" onClick={resetFilters} className="text-xs font-bold text-blue-700 hover:text-blue-500">Xóa bộ lọc</button>
              </div>
              {metadataError ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600">{metadataError}</p> : null}
              <FilterForm filters={filters} categories={categories} brands={brands} loading={metadataLoading} onChange={setFilters} onApply={applyFilters} onReset={resetFilters} />
            </div>
          </aside>

          <section aria-label="Danh sách sản phẩm" className="min-w-0">
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <div className="flex flex-wrap gap-2" aria-label="Bộ lọc đang áp dụng">
                {activeChips.length === 0 ? <span className="text-sm text-slate-500">Tất cả sản phẩm</span> : activeChips.map((chip) => <span key={chip.key} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{chip.label}</span>)}
              </div>
              <SortSelect filters={filters} onChange={(sortBy, sortOrder) => applyFilters({ ...filters, sortBy, sortOrder })} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {activeChips.map((chip) => <span key={chip.key} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">{chip.label}</span>)}
            </div>
            {error ? <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} /> : loading ? <ProductSkeleton /> : products.length === 0 ? <EmptyState onReset={resetFilters} /> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} imageUrl={imageUrls[product.id]} />)}</div>}
            {!loading && !error && products.length > 0 ? <Pagination page={pageInfo.page} totalPages={pageInfo.totalPages} onChange={changePage} /> : null}
          </section>
        </div>
      </div>
    </div>
  )
}

function FilterForm({ filters, categories, brands, loading, onChange, onApply, onReset }: { filters: ProductFilters; categories: Category[]; brands: Brand[]; loading: boolean; onChange: (filters: ProductFilters) => void; onApply: (filters: ProductFilters) => void; onReset: () => void }) {
  return (
    <div className="mt-6 space-y-5">
      <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Từ khóa</span><input value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="CPU, RAM, RTX..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Danh mục</span><select disabled={loading} value={filters.categoryId} onChange={(event) => onChange({ ...filters, categoryId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">{<option value="">Tất cả danh mục</option>}{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Thương hiệu</span><select disabled={loading} value={filters.brandId} onChange={(event) => onChange({ ...filters, brandId: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500">{<option value="">Tất cả thương hiệu</option>}{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
      <div><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Khoảng giá</span><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={filters.minPrice} onChange={(event) => onChange({ ...filters, minPrice: event.target.value })} placeholder="Từ" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /><input type="number" min="0" value={filters.maxPrice} onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })} placeholder="Đến" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div></div>
      <div className="flex gap-2"><button type="button" onClick={() => onApply(filters)} className="flex-1 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">Áp dụng</button><button type="button" onClick={onReset} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200">Xóa</button></div>
    </div>
  )
}

function SortSelect({ filters, onChange }: { filters: ProductFilters; onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void }) {
  const value = `${filters.sortBy}-${filters.sortOrder}`
  return <label className="flex items-center gap-2 text-sm text-slate-500"><span className="whitespace-nowrap">Sắp xếp</span><select value={value} onChange={(event) => { const [sortBy, sortOrder] = event.target.value.split('-') as [string, 'asc' | 'desc']; onChange(sortBy, sortOrder) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"><option value="price-asc">Mặc định</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option><option value="name-asc">Tên A → Z</option><option value="name-desc">Tên Z → A</option><option value="createdAt-desc">Mới nhất</option></select></label>
}

function ProductCard({ product, imageUrl }: { product: Product; imageUrl?: string }) {
  const discount = discountFor(product)
  const displayPrice = discount ? product.salePrice as number : product.price
  return <article className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg sm:p-4"><Link href={`/products/${product.slug}`} className="block focus:outline-none"><div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-3xl font-black text-blue-200 sm:h-44"><ProductImageFallback src={imageUrl} name={product.name} width={320} height={220} loading="lazy" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" />{discount ? <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">-{discount}%</span> : null}</div><p className="mt-3 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">{product.brand?.name || product.category?.name || 'TK Select'}</p><h2 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-bold text-slate-900 group-hover:text-blue-700">{product.name}</h2><div className="mt-2"><p className="text-base font-black text-blue-700 sm:text-lg">{formatPrice(displayPrice)}</p>{discount ? <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</p> : null}</div><p className={`mt-2 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}</p><span className="mt-3 block rounded-lg border border-blue-100 py-2 text-center text-xs font-bold text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">Xem chi tiết</span></Link></article>
}

function ProductSkeleton() {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4" aria-label="Đang tải sản phẩm">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3 sm:p-4"><div className="h-36 rounded-xl bg-slate-100 sm:h-44" /><div className="mt-4 h-3 w-20 rounded bg-slate-100" /><div className="mt-3 h-10 rounded bg-slate-100" /><div className="mt-3 h-5 w-28 rounded bg-slate-100" /></div>)}</div>
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5" /></svg></div><h2 className="mt-4 text-lg font-black">Không tìm thấy sản phẩm</h2><p className="mt-2 text-sm text-slate-500">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p><button type="button" onClick={onReset} className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300">Xóa bộ lọc</button></div>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center"><h2 className="text-lg font-black text-red-800">Không thể tải sản phẩm</h2><p className="mt-2 text-sm text-red-600">{message}</p><button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">Thử lại</button></div>
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-2"><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Trước</button><div className="hidden gap-2 sm:flex">{pages.map((number) => <button key={number} type="button" aria-current={number === page ? 'page' : undefined} onClick={() => onChange(number)} className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold ${number === page ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'}`}>{number}</button>)}</div><span className="text-sm font-semibold text-slate-500 sm:hidden">{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40">Sau</button></nav>
}
