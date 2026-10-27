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
  category: string
  brand: string
  minPrice: string
  maxPrice: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  specCapacity: string
  specInterface: string
  specSocket: string
  specRamType: string
  specFormFactor: string
  specWattage: string
  specResolution: string
}

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

const emptyFilters = (): ProductFilters => ({
  page: 1,
  search: '',
  category: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  sortBy: 'price',
  sortOrder: 'asc',
  specCapacity: '',
  specInterface: '',
  specSocket: '',
  specRamType: '',
  specFormFactor: '',
  specWattage: '',
  specResolution: '',
})

const parseFilterState = (query: Record<string, string | string[] | undefined>): ProductFilters => {
  const categoryRaw = typeof query.category === 'string'
    ? query.category
    : typeof query.categoryId === 'string'
      ? query.categoryId
      : typeof query.categorySlug === 'string'
        ? query.categorySlug
        : ''
  const brandRaw = typeof query.brand === 'string'
    ? query.brand
    : typeof query.brandId === 'string'
      ? query.brandId
      : typeof query.brandSlug === 'string'
        ? query.brandSlug
        : ''

  return {
    page: Math.max(1, Number(query.page ?? '1') || 1),
    search: typeof query.search === 'string' ? query.search : '',
    category: categoryRaw,
    brand: brandRaw,
    minPrice: typeof query.minPrice === 'string' ? query.minPrice : '',
    maxPrice: typeof query.maxPrice === 'string' ? query.maxPrice : '',
    sortBy: typeof query.sortBy === 'string' ? query.sortBy : 'price',
    sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc',
    specCapacity: typeof query.specCapacity === 'string' ? query.specCapacity : '',
    specInterface: typeof query.specInterface === 'string' ? query.specInterface : '',
    specSocket: typeof query.specSocket === 'string' ? query.specSocket : '',
    specRamType: typeof query.specRamType === 'string' ? query.specRamType : '',
    specFormFactor: typeof query.specFormFactor === 'string' ? query.specFormFactor : '',
    specWattage: typeof query.specWattage === 'string' ? query.specWattage : '',
    specResolution: typeof query.specResolution === 'string' ? query.specResolution : '',
  }
}

const sameFilters = (a: ProductFilters, b: ProductFilters) =>
  a.page === b.page &&
  a.search === b.search &&
  a.category === b.category &&
  a.brand === b.brand &&
  a.minPrice === b.minPrice &&
  a.maxPrice === b.maxPrice &&
  a.sortBy === b.sortBy &&
  a.sortOrder === b.sortOrder &&
  a.specCapacity === b.specCapacity &&
  a.specInterface === b.specInterface &&
  a.specSocket === b.specSocket &&
  a.specRamType === b.specRamType &&
  a.specFormFactor === b.specFormFactor &&
  a.specWattage === b.specWattage &&
  a.specResolution === b.specResolution

const buildQuery = (filters: ProductFilters) => {
  const query = new URLSearchParams()
  if (filters.search.trim()) query.set('search', filters.search.trim())
  if (filters.category) query.set('category', filters.category)
  if (filters.brand) query.set('brand', filters.brand)
  if (filters.minPrice) query.set('minPrice', filters.minPrice)
  if (filters.maxPrice) query.set('maxPrice', filters.maxPrice)
  if (filters.specCapacity) query.set('specCapacity', filters.specCapacity)
  if (filters.specInterface) query.set('specInterface', filters.specInterface)
  if (filters.specSocket) query.set('specSocket', filters.specSocket)
  if (filters.specRamType) query.set('specRamType', filters.specRamType)
  if (filters.specFormFactor) query.set('specFormFactor', filters.specFormFactor)
  if (filters.specWattage) query.set('specWattage', filters.specWattage)
  if (filters.specResolution) query.set('specResolution', filters.specResolution)
  query.set('sortBy', filters.sortBy)
  query.set('sortOrder', filters.sortOrder)
  if (filters.page > 1) query.set('page', String(filters.page))
  return query.toString()
}

function getCategoryDisplayName(cat?: Category | null, rawSlug?: string): string {
  if (cat) {
    if (cat.slug === 'monitor') return 'Màn hình máy tính'
    if (cat.slug === 'gpu') return 'Card màn hình (VGA/GPU)'
    if (cat.slug === 'mainboard') return 'Bo mạch chủ (Mainboard)'
    if (cat.slug === 'cpu') return 'Bộ vi xử lý (CPU)'
    if (cat.slug === 'psu') return 'Nguồn máy tính (PSU)'
    if (cat.slug === 'cpu-cooler') return 'Tản nhiệt CPU'
    return cat.name
  }
  if (!rawSlug) return 'Sản phẩm'
  if (rawSlug === 'laptop') return 'Laptop'
  if (rawSlug === 'pc-gaming') return 'PC Gaming'
  if (rawSlug === 'monitor') return 'Màn hình máy tính'
  if (rawSlug === 'gpu') return 'Card màn hình (VGA/GPU)'
  if (rawSlug === 'mainboard') return 'Bo mạch chủ (Mainboard)'
  if (rawSlug === 'cpu') return 'Bộ vi xử lý (CPU)'
  if (rawSlug === 'ram') return 'Bộ nhớ RAM'
  if (rawSlug === 'psu') return 'Nguồn máy tính (PSU)'
  if (rawSlug === 'case') return 'Vỏ Case máy tính'
  if (rawSlug === 'cpu-cooler') return 'Tản nhiệt CPU'
  if (rawSlug.includes('ssd') || rawSlug.includes('hdd')) return 'SSD / Thiết bị lưu trữ'
  if (rawSlug.includes('cpu,mainboard') || rawSlug.includes('cpu,') || rawSlug.includes(',gpu')) return 'Linh kiện máy tính'
  if (rawSlug.includes('keyboard') || rawSlug.includes('mouse') || rawSlug.includes('gear')) return 'Gaming Gear & Phụ kiện'
  if (rawSlug.includes('printer') || rawSlug.includes('webcam') || rawSlug.includes('wifi-card')) return 'Thiết bị văn phòng & Mạng'
  return rawSlug
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
    router.query.category,
    router.query.categoryId,
    router.query.categorySlug,
    router.query.brand,
    router.query.brandId,
    router.query.brandSlug,
    router.query.minPrice,
    router.query.maxPrice,
    router.query.sortBy,
    router.query.sortOrder,
    router.query.specCapacity,
    router.query.specInterface,
    router.query.specSocket,
    router.query.specRamType,
    router.query.specFormFactor,
    router.query.specWattage,
    router.query.specResolution,
  ])

  // Sync route query state to local state
  useEffect(() => {
    if (!router.isReady) return
    setFilters((previous) => sameFilters(previous, queryState) ? previous : queryState)
  }, [queryState, router.isReady])

  // Load categories once
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const loadCategories = async () => {
      setMetadataLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal })
        if (!response.ok) throw new Error('Không thể tải danh mục.')
        const payload = await response.json() as { data?: Category[] }
        if (!active) return
        setCategories(payload.data ?? [])
        setMetadataError('')
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError' && active) {
          setMetadataError('Không thể tải danh mục sản phẩm.')
        }
      } finally {
        if (active) setMetadataLoading(false)
      }
    }
    loadCategories()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  // Load brands dynamically scoped to active category
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const loadBrands = async () => {
      try {
        const url = queryState.category
          ? `${API_BASE_URL}/api/brands?category=${encodeURIComponent(queryState.category)}`
          : `${API_BASE_URL}/api/brands`
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) return
        const payload = await response.json() as { data?: Brand[] }
        if (!active) return
        setBrands(payload.data ?? [])
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError' && active) {
          setBrands([])
        }
      }
    }
    loadBrands()
    return () => {
      active = false
      controller.abort()
    }
  }, [queryState.category])

  // Category-First Guard: if brand is present without category, do NOT load mixed cross-category products
  const isBrandWithoutCategory = Boolean(queryState.brand && !queryState.category)

  // Load products
  useEffect(() => {
    if (!router.isReady) return
    if (isBrandWithoutCategory) {
      setLoading(false)
      setProducts([])
      setImageUrls({})
      setPageInfo({ page: 1, totalPages: 1, total: 0 })
      return
    }

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
        if (!response.ok) {
          const errData = await response.json().catch(() => ({})) as { message?: string }
          throw new Error(errData.message || 'Không thể tải danh sách sản phẩm.')
        }
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
        setError((loadError as Error).message || 'Không thể tải sản phẩm lúc này. Vui lòng thử lại.')
      } finally {
        if (active) setLoading(false)
      }
    }
    loadProducts()
    return () => {
      active = false
      controller.abort()
    }
  }, [queryState, retry, router.isReady, isBrandWithoutCategory])

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

  const selectedCategory = categories.find((item) => item.slug === filters.category || item.id === filters.category)
  const selectedBrand = brands.find((item) => item.slug === filters.brand || item.id === filters.brand)
  const categoryDisplayName = getCategoryDisplayName(selectedCategory, filters.category)

  const removeFilter = (key: keyof ProductFilters) => {
    if (key === 'category') {
      // Removing category also cleans brand (brand requires category) and component-specific specs
      const nextFilters: ProductFilters = {
        ...filters,
        category: '',
        brand: '',
        specCapacity: '',
        specInterface: '',
        specSocket: '',
        specRamType: '',
        specFormFactor: '',
        specWattage: '',
        specResolution: '',
        page: 1,
      }
      setFilters(nextFilters)
      applyFilters(nextFilters)
      return
    }

    const nextFilters: ProductFilters = {
      ...filters,
      [key]: '',
      page: 1,
    }
    setFilters(nextFilters)
    applyFilters(nextFilters)
  }

  type ActiveChip = {
    key: string
    label: string
    onRemove: () => void
  }

  const activeChips: ActiveChip[] = []
  if (filters.search) {
    activeChips.push({ key: 'search', label: `Từ khóa: ${filters.search}`, onRemove: () => removeFilter('search') })
  }
  if (filters.category) {
    activeChips.push({ key: 'category', label: `Danh mục: ${categoryDisplayName}`, onRemove: () => removeFilter('category') })
  }
  if (filters.brand) {
    activeChips.push({ key: 'brand', label: `Hãng: ${selectedBrand?.name ?? filters.brand}`, onRemove: () => removeFilter('brand') })
  }
  if (filters.minPrice) {
    activeChips.push({ key: 'minPrice', label: `Từ ${formatPrice(Number(filters.minPrice))}`, onRemove: () => removeFilter('minPrice') })
  }
  if (filters.maxPrice) {
    activeChips.push({ key: 'maxPrice', label: `Đến ${formatPrice(Number(filters.maxPrice))}`, onRemove: () => removeFilter('maxPrice') })
  }
  if (filters.specCapacity) {
    activeChips.push({ key: 'specCapacity', label: `Dung lượng: ${filters.specCapacity}`, onRemove: () => removeFilter('specCapacity') })
  }
  if (filters.specInterface) {
    activeChips.push({ key: 'specInterface', label: `Chuẩn: ${filters.specInterface}`, onRemove: () => removeFilter('specInterface') })
  }
  if (filters.specSocket) {
    activeChips.push({ key: 'specSocket', label: `Socket: ${filters.specSocket}`, onRemove: () => removeFilter('specSocket') })
  }
  if (filters.specRamType) {
    activeChips.push({ key: 'specRamType', label: `Chuẩn RAM: ${filters.specRamType}`, onRemove: () => removeFilter('specRamType') })
  }
  if (filters.specFormFactor) {
    activeChips.push({ key: 'specFormFactor', label: `Kích thước: ${filters.specFormFactor}`, onRemove: () => removeFilter('specFormFactor') })
  }
  if (filters.specWattage) {
    activeChips.push({ key: 'specWattage', label: `Công suất: ${filters.specWattage}`, onRemove: () => removeFilter('specWattage') })
  }
  if (filters.specResolution) {
    activeChips.push({ key: 'specResolution', label: `Độ phân giải: ${filters.specResolution}`, onRemove: () => removeFilter('specResolution') })
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          <Link href="/" className="font-semibold text-blue-700 hover:text-blue-500">Trang chủ</Link>
          <span className="mx-2">/</span>
          {filters.category ? (
            <>
              <Link href="/products" className="hover:text-blue-600">Sản phẩm</Link>
              <span className="mx-2">/</span>
              <span className="font-semibold text-slate-800">{categoryDisplayName}</span>
            </>
          ) : (
            <span>Sản phẩm</span>
          )}
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">TK Catalogue</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              {filters.search
                ? `Tìm kiếm: "${filters.search}"`
                : categoryDisplayName !== 'Sản phẩm'
                  ? categoryDisplayName
                  : 'Sản phẩm'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {filters.search
                ? `Kết quả tìm kiếm cho từ khóa "${filters.search}".`
                : categoryDisplayName !== 'Sản phẩm'
                  ? `Khám phá các sản phẩm ${categoryDisplayName} chính hãng với thông số và giá tốt nhất.`
                  : 'Khám phá linh kiện và thiết bị công nghệ được chọn cho mọi nhu cầu.'}
            </p>
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
              <FilterForm
                filters={filters}
                categories={categories}
                brands={brands}
                loading={metadataLoading}
                onChange={setFilters}
                onApply={applyFilters}
                onReset={resetFilters}
              />
            </div>
          </aside>

          <section aria-label="Danh sách sản phẩm" className="min-w-0">
            <div className="hidden items-center justify-between gap-4 lg:flex">
              <div className="flex flex-wrap gap-2" aria-label="Bộ lọc đang áp dụng">
                {activeChips.length === 0 ? (
                  <span className="text-sm text-slate-500">Tất cả sản phẩm</span>
                ) : (
                  activeChips.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onRemove}
                        aria-label={`Xóa bộ lọc ${chip.label}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 hover:text-blue-900 focus:outline-none"
                      >
                        ×
                      </button>
                    </span>
                  ))
                )}
              </div>
              <SortSelect filters={filters} onChange={(sortBy, sortOrder) => applyFilters({ ...filters, sortBy, sortOrder })} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 lg:hidden">
              {activeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                >
                  <span>{chip.label}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Xóa bộ lọc ${chip.label}`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full text-blue-500 hover:bg-blue-200 hover:text-blue-900 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Display Category Selection Guard when brand is chosen without category */}
            {isBrandWithoutCategory ? (
              <div className="mt-4">
                <BrandCategoryPickerState
                  brandSlug={queryState.brand}
                  categories={categories}
                  onSelectCategory={(catSlug) => {
                    applyFilters({
                      ...filters,
                      category: catSlug,
                      brand: queryState.brand,
                      page: 1,
                    })
                  }}
                />
              </div>
            ) : error ? (
              <div className="mt-4">
                <ErrorState message={error} onRetry={() => setRetry((value) => value + 1)} />
              </div>
            ) : loading ? (
              <div className="mt-4">
                <ProductSkeleton />
              </div>
            ) : products.length === 0 ? (
              <div className="mt-4">
                <EmptyState onReset={resetFilters} search={filters.search} category={filters.category} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} imageUrl={imageUrls[product.id]} />
                ))}
              </div>
            )}

            {!isBrandWithoutCategory && !loading && !error && products.length > 0 ? (
              <Pagination page={pageInfo.page} totalPages={pageInfo.totalPages} onChange={changePage} />
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}

function BrandCategoryPickerState({
  brandSlug,
  categories,
  onSelectCategory,
}: {
  brandSlug: string
  categories: Category[]
  onSelectCategory: (catSlug: string) => void
}) {
  const brandDisplayName = brandSlug.toUpperCase()
  return (
    <div className="rounded-2xl border border-blue-200 bg-white p-6 sm:p-10 shadow-sm text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
          <path d="M4 6h16M4 12h16M4 18h7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-4">
        <span className="inline-block rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 border border-amber-200">
          Yêu cầu chọn danh mục trước
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
          Bạn đang chọn hãng: <span className="text-blue-700">{brandDisplayName}</span>
        </h2>
        <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
          Để đảm bảo hiển thị đúng linh kiện bạn cần tìm, vui lòng chọn một bộ phận / danh mục bên dưới:
        </p>
      </div>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.slug)}
            className="group flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-500 hover:shadow-md transition text-slate-700 hover:text-blue-700 text-center"
          >
            <span className="font-bold text-sm sm:text-base text-slate-800 group-hover:text-blue-700">{cat.name}</span>
            <span className="mt-1 text-xs font-semibold text-blue-600 opacity-90 group-hover:underline">
              Xem {cat.name} {brandDisplayName} →
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FilterForm({
  filters,
  categories,
  brands,
  loading,
  onChange,
  onApply,
  onReset,
}: {
  filters: ProductFilters
  categories: Category[]
  brands: Brand[]
  loading: boolean
  onChange: (filters: ProductFilters) => void
  onApply: (filters: ProductFilters) => void
  onReset: () => void
}) {
  const currentCategory = categories.find((c) => c.slug === filters.category || c.id === filters.category)
  const currentBrand = brands.find((b) => b.slug === filters.brand || b.id === filters.brand)
  const categorySlug = currentCategory?.slug ?? filters.category

  const handleCategoryChange = (newCatSlug: string) => {
    // When switching category, remove category-specific specs and reset brand
    // Keep general filters (minPrice, maxPrice, sortBy, sortOrder)
    onChange({
      ...filters,
      category: newCatSlug,
      brand: '',
      specCapacity: '',
      specInterface: '',
      specSocket: '',
      specRamType: '',
      specFormFactor: '',
      specWattage: '',
      specResolution: '',
      page: 1,
    })
  }

  return (
    <div className="mt-6 space-y-5">
      <label className="block">
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Từ khóa</span>
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="CPU, RAM, RTX..."
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </label>

      {/* 1. Danh mục là điều kiện đầu tiên */}
      <label className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Danh mục (Bộ phận)</span>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Bắt buộc trước</span>
        </div>
        <select
          disabled={loading}
          value={categorySlug}
          onChange={(event) => handleCategoryChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
        >
          <option value="">-- Chọn danh mục bộ phận --</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
          {categorySlug && !categories.some((c) => c.slug === categorySlug) ? (
            <option value={categorySlug}>{getCategoryDisplayName(null, categorySlug)}</option>
          ) : null}
        </select>
      </label>

      {/* 2. Thương hiệu: chỉ cho phép sau khi đã chọn danh mục */}
      <div className="block">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Thương hiệu</span>
          {!categorySlug ? (
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Cần chọn danh mục
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 font-semibold">
              {brands.length} hãng
            </span>
          )}
        </div>
        <select
          disabled={loading || !categorySlug}
          value={currentBrand?.slug ?? filters.brand}
          onChange={(event) => onChange({ ...filters, brand: event.target.value })}
          className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none font-medium ${
            !categorySlug
              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'border-slate-200 bg-white text-slate-800 focus:border-blue-500'
          }`}
        >
          <option value="">
            {!categorySlug ? '— Vui lòng chọn danh mục trước —' : 'Tất cả thương hiệu'}
          </option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>
        {!categorySlug ? (
          <p className="mt-1.5 text-xs text-amber-600 font-medium leading-tight">
            ⚠️ Vui lòng chọn Danh mục trước khi lọc theo Hãng.
          </p>
        ) : null}
      </div>

      {/* 3. Bộ lọc thông số kỹ thuật đặc thù theo từng danh mục */}
      {categorySlug === 'ssd' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số SSD</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Dung lượng</span>
            <select
              value={filters.specCapacity}
              onChange={(e) => onChange({ ...filters, specCapacity: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả dung lượng</option>
              <option value="250GB">250GB - 256GB</option>
              <option value="500GB">500GB - 512GB</option>
              <option value="1TB">1TB (1000GB)</option>
              <option value="2TB">2TB (2000GB)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Chuẩn kết nối</span>
            <select
              value={filters.specInterface}
              onChange={(e) => onChange({ ...filters, specInterface: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả chuẩn kết nối</option>
              <option value="NVMe">NVMe M.2 PCIe</option>
              <option value="SATA">SATA III 2.5"</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'monitor' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số Màn hình</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Kích thước</span>
            <select
              value={filters.specCapacity}
              onChange={(e) => onChange({ ...filters, specCapacity: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả kích thước</option>
              <option value="24">24 inch</option>
              <option value="27">27 inch</option>
              <option value="32">32 inch trở lên</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Độ phân giải</span>
            <select
              value={filters.specResolution}
              onChange={(e) => onChange({ ...filters, specResolution: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả độ phân giải</option>
              <option value="FHD">Full HD (1080p)</option>
              <option value="2K">2K QHD (1440p)</option>
              <option value="4K">4K UHD</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'ram' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số RAM</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Thế hệ RAM</span>
            <select
              value={filters.specRamType}
              onChange={(e) => onChange({ ...filters, specRamType: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả chuẩn RAM</option>
              <option value="DDR4">DDR4</option>
              <option value="DDR5">DDR5</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Dung lượng</span>
            <select
              value={filters.specCapacity}
              onChange={(e) => onChange({ ...filters, specCapacity: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả dung lượng</option>
              <option value="8GB">8GB</option>
              <option value="16GB">16GB</option>
              <option value="32GB">32GB</option>
              <option value="64GB">64GB</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'cpu' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số CPU</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Socket</span>
            <select
              value={filters.specSocket}
              onChange={(e) => onChange({ ...filters, specSocket: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả socket</option>
              <option value="LGA 1700">Intel LGA 1700</option>
              <option value="LGA 1851">Intel LGA 1851</option>
              <option value="AM4">AMD AM4</option>
              <option value="AM5">AMD AM5</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'gpu' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số Card đồ họa</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Dung lượng VRAM</span>
            <select
              value={filters.specCapacity}
              onChange={(e) => onChange({ ...filters, specCapacity: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả VRAM</option>
              <option value="8GB">8GB</option>
              <option value="12GB">12GB</option>
              <option value="16GB">16GB</option>
              <option value="24GB">24GB trở lên</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'mainboard' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số Bo mạch chủ</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Socket</span>
            <select
              value={filters.specSocket}
              onChange={(e) => onChange({ ...filters, specSocket: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả socket</option>
              <option value="LGA 1700">LGA 1700</option>
              <option value="LGA 1851">LGA 1851</option>
              <option value="AM4">AM4</option>
              <option value="AM5">AM5</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Form Factor</span>
            <select
              value={filters.specFormFactor}
              onChange={(e) => onChange({ ...filters, specFormFactor: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả kích thước</option>
              <option value="ATX">ATX</option>
              <option value="Micro-ATX">Micro-ATX</option>
              <option value="Mini-ITX">Mini-ITX</option>
            </select>
          </label>
        </div>
      )}

      {categorySlug === 'psu' && (
        <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Thông số Nguồn</p>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Công suất</span>
            <select
              value={filters.specWattage}
              onChange={(e) => onChange({ ...filters, specWattage: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500"
            >
              <option value="">Tất cả công suất</option>
              <option value="550W">550W</option>
              <option value="650W">650W</option>
              <option value="750W">750W</option>
              <option value="850W">850W</option>
              <option value="1000W">1000W trở lên</option>
            </select>
          </label>
        </div>
      )}

      {/* 4. Khoảng giá chung */}
      <div>
        <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Khoảng giá</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            value={filters.minPrice}
            onChange={(event) => onChange({ ...filters, minPrice: event.target.value })}
            placeholder="Từ"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
          <input
            type="number"
            min="0"
            value={filters.maxPrice}
            onChange={(event) => onChange({ ...filters, maxPrice: event.target.value })}
            placeholder="Đến"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onApply(filters)}
          className="flex-1 rounded-xl bg-blue-700 px-3 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Áp dụng
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          Xóa
        </button>
      </div>
    </div>
  )
}

function SortSelect({ filters, onChange }: { filters: ProductFilters; onChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void }) {
  const value = `${filters.sortBy}-${filters.sortOrder}`
  return (
    <label className="flex items-center gap-2 text-sm text-slate-500">
      <span className="whitespace-nowrap">Sắp xếp</span>
      <select
        value={value}
        onChange={(event) => {
          const [sortBy, sortOrder] = event.target.value.split('-') as [string, 'asc' | 'desc']
          onChange(sortBy, sortOrder)
        }}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
      >
        <option value="price-asc">Mặc định</option>
        <option value="price-asc">Giá tăng dần</option>
        <option value="price-desc">Giá giảm dần</option>
        <option value="name-asc">Tên A → Z</option>
        <option value="name-desc">Tên Z → A</option>
        <option value="createdAt-desc">Mới nhất</option>
      </select>
    </label>
  )
}

function ProductCard({ product, imageUrl }: { product: Product; imageUrl?: string }) {
  const discount = discountFor(product)
  const displayPrice = discount ? (product.salePrice as number) : product.price
  return (
    <article className="group relative min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg sm:p-4">
      <Link href={`/products/${product.slug}`} className="block focus:outline-none">
        <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-blue-50 text-3xl font-black text-blue-200 sm:h-44">
          <ProductImageFallback
            src={imageUrl}
            name={product.name}
            categorySlug={product.category?.slug}
            width={320}
            height={220}
            loading="lazy"
            className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
          />
          {discount ? (
            <span className="absolute left-2 top-2 rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white">
              -{discount}%
            </span>
          ) : null}
        </div>
        <p className="mt-3 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
          {product.brand?.name || product.category?.name || 'TK Select'}
        </p>
        <h2 className="mt-1 line-clamp-2 min-h-[40px] text-sm font-bold text-slate-900 group-hover:text-blue-700">
          {product.name}
        </h2>
        <div className="mt-2">
          <p className="text-base font-black text-blue-700 sm:text-lg">{formatPrice(displayPrice)}</p>
          {discount ? <p className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</p> : null}
        </div>
        <p className={`mt-2 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
        </p>
        <span className="mt-3 block rounded-lg border border-blue-100 py-2 text-center text-xs font-bold text-blue-700 transition group-hover:bg-blue-700 group-hover:text-white">
          Xem chi tiết
        </span>
      </Link>
    </article>
  )
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4" aria-label="Đang tải sản phẩm">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="animate-pulse rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
          <div className="h-36 rounded-xl bg-slate-100 sm:h-44" />
          <div className="mt-4 h-3 w-20 rounded bg-slate-100" />
          <div className="mt-3 h-10 rounded bg-slate-100" />
          <div className="mt-3 h-5 w-28 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ onReset, search, category }: { onReset: () => void; search?: string; category?: string }) {
  const isLaptop = category === 'laptop'
  const isPcGaming = category === 'pc-gaming' || (search && search.toLowerCase() === 'pc gaming')

  if (isLaptop) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M2 20h20M7 20v-4M17 20v-4" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-black text-slate-900">Danh mục Laptop đang được cập nhật</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Hiện tại cửa hàng đang tập trung kinh doanh các dòng linh kiện máy tính ráp sẵn, màn hình đồ họa/gaming và phụ kiện PC chính hãng.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/pc-builder"
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Tự xây dựng cấu hình PC
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      </div>
    )
  }

  if (isPcGaming) {
    return (
      <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 px-6 py-14 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-black text-slate-900">Xây dựng cấu hình PC Gaming</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
          Cửa hàng cung cấp đầy đủ linh kiện lẻ chính hãng và công cụ PC Builder giúp bạn phối ghép máy chơi game tối ưu nhất theo tầm giá.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/pc-builder"
            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800"
          >
            Đến công cụ PC Builder
          </Link>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Xem tất cả sản phẩm
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5M8.5 11h5M11 8.5v5" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-black">
        {search ? `Không tìm thấy sản phẩm khớp với "${search}"` : 'Không tìm thấy sản phẩm'}
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        {search ? 'Hãy thử kiểm tra lỗi chính tả hoặc dùng từ khóa tổng quát hơn.' : 'Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Xóa bộ lọc
      </button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <h2 className="text-lg font-black text-red-800">Không thể tải sản phẩm</h2>
      <p className="mt-2 text-sm text-red-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        Thử lại
      </button>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trước
      </button>
      <div className="hidden gap-2 sm:flex">
        {pages.map((number) => (
          <button
            key={number}
            type="button"
            aria-current={number === page ? 'page' : undefined}
            onClick={() => onChange(number)}
            className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold ${
              number === page
                ? 'bg-blue-700 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700'
            }`}
          >
            {number}
          </button>
        ))}
      </div>
      <span className="text-sm font-semibold text-slate-500 sm:hidden">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau
      </button>
    </nav>
  )
}
