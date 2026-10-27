import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../lib/cart'
import { ProductImageFallback } from '../components/ProductImageFallback'

type ComponentKey = 'CPU' | 'MAINBOARD' | 'RAM' | 'GPU' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER'

type ProductSpecification = {
  socket?: string | null
  ramType?: string | null
  ramSlots?: number | null
  maxRam?: number | null
  tdp?: number | null
  length?: number | null
  height?: number | null
  wattage?: number | null
  type?: string | null
  capacity?: string | null
  formFactor?: string | null
}

type Product = {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  stock: number
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
  images?: Array<{ url: string; alt?: string | null; sortOrder?: number | null }>
  specifications?: ProductSpecification[]
}

type ProductApiResponse = {
  success: boolean
  data: Product[]
  pagination?: { page: number; totalPages: number; total: number }
}

type CompatibilityResult = {
  compatible: boolean
  totalPrice: number
  estimatedPower: number
  recommendedPSU: number
  warnings: string[]
  errors: string[]
  summary: { selectedComponents: number; types: string[] }
  components: Array<{
    id: string
    name: string
    type: ComponentKey
    price: number
    salePrice: number | null
    unitPrice: number
    category?: { id: string; name: string; slug: string } | null
    brand?: { id: string; name: string; slug: string } | null
    specifications: Record<string, unknown>
  }>
}

type ComponentBrandFilter = {
  label: string
  slug: string
}

type ComponentOption = {
  key: ComponentKey
  label: string
  categorySlug: string
  search?: string
  brands?: ComponentBrandFilter[]
}

const componentOptions: ComponentOption[] = [
  {
    key: 'CPU',
    label: 'Bộ vi xử lý (CPU)',
    categorySlug: 'cpu',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'Intel', slug: 'intel' },
      { label: 'AMD', slug: 'amd' },
    ],
  },
  {
    key: 'MAINBOARD',
    label: 'Bo mạch chủ (Mainboard)',
    categorySlug: 'mainboard',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'ASUS', slug: 'asus' },
      { label: 'MSI', slug: 'msi' },
      { label: 'Gigabyte', slug: 'gigabyte' },
      { label: 'ASRock', slug: 'asrock' },
    ],
  },
  {
    key: 'RAM',
    label: 'Bộ nhớ trong (RAM)',
    categorySlug: 'ram',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'Corsair', slug: 'corsair' },
      { label: 'Kingston', slug: 'kingston' },
      { label: 'G.Skill', slug: 'gskill' },
      { label: 'TeamGroup', slug: 'teamgroup' },
      { label: 'ADATA', slug: 'adata' },
      { label: 'Crucial', slug: 'crucial' },
    ],
  },
  {
    key: 'GPU',
    label: 'Card màn hình (VGA / GPU)',
    categorySlug: 'gpu',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'ASUS', slug: 'asus' },
      { label: 'MSI', slug: 'msi' },
      { label: 'Gigabyte', slug: 'gigabyte' },
      { label: 'Colorful', slug: 'colorful' },
      { label: 'Palit', slug: 'palit' },
      { label: 'Galax', slug: 'galax' },
      { label: 'Inno3D', slug: 'inno3d' },
    ],
  },
  {
    key: 'STORAGE',
    label: 'Ổ cứng (SSD / HDD)',
    categorySlug: 'ssd,hdd',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'Samsung', slug: 'samsung' },
      { label: 'Kingston', slug: 'kingston' },
      { label: 'Western Digital', slug: 'wd' },
      { label: 'Seagate', slug: 'seagate' },
      { label: 'Crucial', slug: 'crucial' },
      { label: 'Lexar', slug: 'lexar' },
    ],
  },
  {
    key: 'PSU',
    label: 'Nguồn máy tính (PSU)',
    categorySlug: 'psu',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'Corsair', slug: 'corsair' },
      { label: 'MSI', slug: 'msi' },
      { label: 'Seasonic', slug: 'seasonic' },
      { label: 'FSP', slug: 'fsp' },
      { label: 'Antec', slug: 'antec' },
      { label: 'DeepCool', slug: 'deepcool' },
      { label: 'Thermaltake', slug: 'thermaltake' },
    ],
  },
  {
    key: 'CASE',
    label: 'Vỏ máy tính (Case)',
    categorySlug: 'case',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'NZXT', slug: 'nzxt' },
      { label: 'Lian Li', slug: 'lian-li' },
      { label: 'Corsair', slug: 'corsair' },
      { label: 'Montech', slug: 'montech' },
      { label: 'Fractal Design', slug: 'fractal-design' },
      { label: 'Xigmatek', slug: 'xigmatek' },
      { label: 'DeepCool', slug: 'deepcool' },
    ],
  },
  {
    key: 'COOLER',
    label: 'Tản nhiệt CPU (Cooler)',
    categorySlug: 'cpu-cooler',
    brands: [
      { label: 'Tất cả', slug: '' },
      { label: 'Thermalright', slug: 'thermalright' },
      { label: 'DeepCool', slug: 'deepcool' },
      { label: 'Noctua', slug: 'noctua' },
      { label: 'NZXT', slug: 'nzxt' },
      { label: 'Corsair', slug: 'corsair' },
      { label: 'Arctic', slug: 'arctic' },
    ],
  },
]

const componentLookup = Object.fromEntries(componentOptions.map((option) => [option.key, option])) as Record<ComponentKey, ComponentOption>

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value)

const getUnitPrice = (product: Product) => {
  if (product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price) {
    return product.salePrice
  }
  return product.price
}

function getProductSocket(product: Product | null | undefined): string | undefined {
  if (!product) return undefined
  const specSocket = product.specifications?.[0]?.socket?.trim()
  if (specSocket) return specSocket
  const upper = product.name.toUpperCase()
  if (upper.includes('LGA1851') || upper.includes('LGA 1851')) return 'LGA1851'
  if (upper.includes('LGA1700') || upper.includes('LGA 1700')) return 'LGA1700'
  if (upper.includes('LGA1200') || upper.includes('LGA 1200')) return 'LGA1200'
  if (upper.includes('AM5')) return 'AM5'
  if (upper.includes('AM4')) return 'AM4'
  return undefined
}

function getProductRamType(product: Product | null | undefined): string | undefined {
  if (!product) return undefined
  const specRam = product.specifications?.[0]?.ramType?.trim()
  if (specRam) return specRam
  const upper = product.name.toUpperCase()
  if (upper.includes('DDR5')) return 'DDR5'
  if (upper.includes('DDR4')) return 'DDR4'
  return undefined
}

export default function PcBuilderPage() {
  const [selected, setSelected] = useState<Record<ComponentKey, Product | null>>({
    CPU: null,
    MAINBOARD: null,
    RAM: null,
    GPU: null,
    STORAGE: null,
    PSU: null,
    CASE: null,
    COOLER: null,
  })
  const [selectorKey, setSelectorKey] = useState<ComponentKey | null>(null)
  const [selectorQuery, setSelectorQuery] = useState('')
  const [selectedBrandSlug, setSelectedBrandSlug] = useState('')
  const [filterCompatibleOnly, setFilterCompatibleOnly] = useState(true)
  const [selectorProducts, setSelectorProducts] = useState<Product[]>([])
  const [selectorLoading, setSelectorLoading] = useState(false)
  const [selectorError, setSelectorError] = useState('')
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<CompatibilityResult | null>(null)
  const [resultError, setResultError] = useState('')

  const selectedEntries = useMemo(
    () => componentOptions.map((option) => ({ option, product: selected[option.key] })).filter((entry) => entry.product),
    [selected],
  )

  const totalPrice = useMemo(
    () => selectedEntries.reduce((sum, entry) => sum + getUnitPrice(entry.product as Product), 0),
    [selectedEntries],
  )

  const selectedIds = useMemo(() => selectedEntries.map((entry) => entry.product?.id).filter(Boolean) as string[], [selectedEntries])

  const activeConstraint = useMemo(() => {
    if (!selectorKey) return null
    if (selectorKey === 'MAINBOARD' && selected.CPU) {
      const socket = getProductSocket(selected.CPU)
      if (socket) return { type: 'socket' as const, value: socket, source: selected.CPU.name }
    }
    if (selectorKey === 'CPU' && selected.MAINBOARD) {
      const socket = getProductSocket(selected.MAINBOARD)
      if (socket) return { type: 'socket' as const, value: socket, source: selected.MAINBOARD.name }
    }
    if (selectorKey === 'RAM' && selected.MAINBOARD) {
      const ramType = getProductRamType(selected.MAINBOARD)
      if (ramType) return { type: 'ramType' as const, value: ramType, source: selected.MAINBOARD.name }
    }
    if (selectorKey === 'COOLER' && (selected.CPU || selected.MAINBOARD)) {
      const socket = getProductSocket(selected.CPU) || getProductSocket(selected.MAINBOARD)
      if (socket) return { type: 'socket' as const, value: socket, source: (selected.CPU || selected.MAINBOARD)?.name || '' }
    }
    return null
  }, [selectorKey, selected])

  const openSelector = (key: ComponentKey) => {
    setSelectorKey(key)
    setSelectorQuery('')
    setSelectedBrandSlug('')
    setFilterCompatibleOnly(true)
  }

  useEffect(() => {
    if (!selectorKey) return
    const option = componentLookup[selectorKey]
    const controller = new AbortController()

    const params = new URLSearchParams({
      limit: '60',
      categorySlug: option.categorySlug,
    })

    if (selectedBrandSlug) {
      params.set('brandSlug', selectedBrandSlug)
    }

    if (filterCompatibleOnly && activeConstraint) {
      if (activeConstraint.type === 'socket') {
        params.set('specSocket', activeConstraint.value)
      } else if (activeConstraint.type === 'ramType') {
        params.set('specRamType', activeConstraint.value)
      }
    }

    if (selectorQuery.trim()) {
      params.set('search', selectorQuery.trim())
    }

    setSelectorLoading(true)
    setSelectorError('')

    fetch(`${API_BASE_URL}/api/products?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Không thể tải sản phẩm.')
        const payload = await response.json() as ProductApiResponse
        setSelectorProducts(payload.data ?? [])
      })
      .catch((error) => {
        if ((error as Error).name !== 'AbortError') {
          setSelectorError('Không thể tải danh sách sản phẩm ứng với linh kiện này.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSelectorLoading(false)
      })

    return () => controller.abort()
  }, [selectorKey, selectorQuery, selectedBrandSlug, filterCompatibleOnly, activeConstraint])

  useEffect(() => {
    const ids = [...new Set([...selectedIds, ...selectorProducts.map((product) => product.id)])]
    if (ids.length === 0) return

    // Prepopulate images that came directly with the product response
    const nextMap: Record<string, string> = { ...imageMap }
    let changed = false
    for (const p of selectorProducts) {
      if (!nextMap[p.id] && p.images?.[0]?.url) {
        nextMap[p.id] = p.images[0].url
        changed = true
      }
    }
    if (changed) {
      setImageMap(nextMap)
    }

    const missingIds = ids.filter((id) => !nextMap[id])
    if (missingIds.length === 0) return

    let active = true
    const controller = new AbortController()

    Promise.all(
      missingIds.map(async (id) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/products/${encodeURIComponent(id)}/images`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          })
          if (!response.ok) return
          const payload = await response.json() as { data?: Array<{ url: string; sortOrder?: number | null }> }
          const image = [...(payload.data ?? [])].sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))[0]
          if (image?.url) nextMap[id] = image.url
        } catch {
          // ignore and fallback
        }
      }),
    ).finally(() => {
      if (active) setImageMap({ ...nextMap })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [imageMap, selectedIds, selectorProducts])

  const checkCompatibility = async () => {
    if (selectedIds.length === 0) return
    setChecking(true)
    setResultError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/pc-builder/check`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedIds }),
      })
      const payload = await response.json() as { success?: boolean; data?: CompatibilityResult; message?: string; error?: string }
      if (!response.ok || !payload.data) throw new Error(payload.message || payload.error || 'Không thể kiểm tra tương thích.')
      setResult(payload.data)
    } catch (error) {
      setResultError((error as Error).message || 'Không thể kiểm tra tương thích.')
    } finally {
      setChecking(false)
    }
  }

  const resetBuild = () => {
    setSelected({
      CPU: null,
      MAINBOARD: null,
      RAM: null,
      GPU: null,
      STORAGE: null,
      PSU: null,
      CASE: null,
      COOLER: null,
    })
    setResult(null)
    setResultError('')
    setSelectorKey(null)
  }

  const currentOption = selectorKey ? componentLookup[selectorKey] : null

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <nav className="text-sm text-slate-500">
          <Link href="/" className="font-bold text-blue-700">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span>PC Builder</span>
        </nav>

        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK | PC Builder</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">PC Builder — Xây dựng cấu hình</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Lựa chọn đầy đủ linh kiện chính hãng và kiểm tra khả năng tương thích hệ thống tức thì.</p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            {componentOptions.map((option) => {
              const product = selected[option.key]
              const imageUrl = product ? (product.images?.[0]?.url || imageMap[product.id]) : undefined
              return (
                <div key={option.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{option.label}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openSelector(option.key)}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 transition"
                      >
                        {product ? 'Thay đổi' : 'Chọn linh kiện'}
                      </button>
                      {product ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelected((previous) => ({ ...previous, [option.key]: null }))
                            setResult(null)
                            setResultError('')
                          }}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 transition"
                        >
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {product ? (
                    <div className="mt-4 flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-xl font-black text-blue-300">
                        <ProductImageFallback src={imageUrl} name={product.name} className="h-full w-full object-contain" fallbackClassName="text-xl font-black text-blue-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{product.brand?.name || product.category?.name || 'TK Select'}</p>
                        <h3 className="mt-1 text-base font-black text-slate-900">{product.name}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-black text-blue-700">{formatPrice(getUnitPrice(product))}</span>
                          {product.salePrice && product.salePrice < product.price ? <span className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</span> : null}
                        </div>
                        <p className={`mt-2 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stock > 0 ? `Còn ${product.stock} sản phẩm` : 'Hết hàng'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      Chưa chọn {option.label}. Bấm &ldquo;Chọn linh kiện&rdquo; để xem danh sách.
                    </div>
                  )}
                </div>
              )
            })}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Cấu hình đã chọn</h2>
                {selectedEntries.length > 0 ? (
                  <button type="button" onClick={resetBuild} className="text-sm font-bold text-red-600 hover:text-red-700">Xóa cấu hình</button>
                ) : null}
              </div>

              {selectedEntries.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Chưa có linh kiện nào được chọn.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedEntries.map(({ option, product }) => (
                    <div key={option.key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 text-sm">
                      <span className="font-semibold text-slate-600 shrink-0">{option.key}</span>
                      <span className="truncate text-right font-bold text-slate-900">{product?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Tổng chi phí dự tính</span>
                  <strong className="text-xl text-blue-700 font-black">{formatPrice(totalPrice)}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={checkCompatibility}
                disabled={checking || selectedIds.length === 0}
                className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 transition"
              >
                {checking ? 'Đang kiểm tra...' : 'Kiểm tra tương thích'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Kết quả tương thích</h2>

              {resultError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{resultError}</p> : null}

              {!result ? (
                <p className="mt-4 text-sm text-slate-500">Chọn linh kiện và bấm nút kiểm tra để xem chi tiết.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className={`rounded-2xl px-4 py-3 text-sm font-black ${result.compatible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {result.compatible ? '✓ Cấu hình tương thích' : '⚠ Có cảnh báo / không tương thích'}
                  </div>

                  <div className="space-y-3 text-sm">
                    {result.errors.length > 0 ? (
                      <div>
                        <p className="mb-2 font-bold text-red-600">✕ Không tương thích</p>
                        <ul className="space-y-2 text-red-700">
                          {result.errors.map((message) => <li key={message} className="rounded-xl bg-red-50 p-2">{message}</li>)}
                        </ul>
                      </div>
                    ) : null}

                    {result.warnings.length > 0 ? (
                      <div>
                        <p className="mb-2 font-bold text-amber-600">⚠ Cảnh báo</p>
                        <ul className="space-y-2 text-amber-700">
                          {result.warnings.map((message) => <li key={message} className="rounded-xl bg-amber-50 p-2">{message}</li>)}
                        </ul>
                      </div>
                    ) : null}

                    {result.errors.length === 0 && result.warnings.length === 0 ? (
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">✓ Tất cả các linh kiện phù hợp với cấu hình hiện tại.</div>
                    ) : null}
                  </div>

                  <div className="grid gap-3 rounded-2xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Công suất hệ thống ước tính</span>
                      <strong className="text-slate-900">{result.estimatedPower} W</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Công suất PSU khuyến nghị</span>
                      <strong className="text-slate-900">{result.recommendedPSU} W</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-500">Số linh kiện đã chọn</span>
                      <strong className="text-slate-900">{result.summary.selectedComponents}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {selectorKey && currentOption ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl sm:p-5 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between gap-3 shrink-0">
              <div>
                <h2 className="text-xl font-black">{currentOption.label}</h2>
                <p className="text-xs text-slate-500">Chọn linh kiện phù hợp cho bộ PC của bạn</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectorKey(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>

            <div className="mt-4 shrink-0 space-y-3">
              <input
                value={selectorQuery}
                onChange={(event) => setSelectorQuery(event.target.value)}
                placeholder={`Tìm kiếm trong ${currentOption.label}...`}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
              />

              {currentOption.brands && currentOption.brands.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-400 mr-1">Thương hiệu:</span>
                  {currentOption.brands.map((b) => (
                    <button
                      key={b.slug}
                      type="button"
                      onClick={() => setSelectedBrandSlug(b.slug)}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        selectedBrandSlug === b.slug
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {activeConstraint ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-900 border border-blue-100">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold">⚡ Tương thích:</span>
                    <span className="truncate">
                      {activeConstraint.type === 'socket'
                        ? `Socket ${activeConstraint.value} (${activeConstraint.source})`
                        : `RAM ${activeConstraint.value} (${activeConstraint.source})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterCompatibleOnly(!filterCompatibleOnly)}
                    className="shrink-0 font-bold text-blue-700 underline hover:text-blue-900 ml-2"
                  >
                    {filterCompatibleOnly ? 'Xem tất cả' : 'Chỉ hiện tương thích'}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 min-h-[200px]">
              {selectorLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : null}

              {selectorError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{selectorError}</p> : null}

              {!selectorLoading && !selectorError && selectorProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  {filterCompatibleOnly && activeConstraint ? (
                    <div>
                      <p className="font-semibold text-slate-700">
                        Không tìm thấy {currentOption.label} tương thích {activeConstraint.value}.
                      </p>
                      <button
                        type="button"
                        onClick={() => setFilterCompatibleOnly(false)}
                        className="mt-2 text-xs font-bold text-blue-700 underline"
                      >
                        Bấm vào đây để xem tất cả {currentOption.label}
                      </button>
                    </div>
                  ) : (
                    <p>Không tìm thấy linh kiện phù hợp{selectorQuery ? ` với "${selectorQuery}"` : ''}.</p>
                  )}
                </div>
              ) : null}

              {selectorProducts.map((product) => {
                const imageUrl = product.images?.[0]?.url || imageMap[product.id]
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setSelected((previous) => ({ ...previous, [selectorKey]: product }))
                      setSelectorKey(null)
                      setSelectorQuery('')
                    }}
                    className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xl font-black text-blue-300">
                      <ProductImageFallback src={imageUrl} name={product.name} className="h-full w-full object-contain" fallbackClassName="text-xl font-black text-blue-300" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{product.brand?.name || product.category?.name || 'TK Select'}</p>
                      <h3 className="mt-0.5 truncate text-sm font-black text-slate-900">{product.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-black text-blue-700">{formatPrice(getUnitPrice(product))}</span>
                        {product.salePrice && product.salePrice < product.price ? <span className="text-slate-400 line-through">{formatPrice(product.price)}</span> : null}
                        <span className={product.stock > 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>
                          {product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
