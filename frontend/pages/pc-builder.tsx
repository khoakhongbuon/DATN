import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { API_BASE_URL } from '../lib/cart'
import { ProductImageFallback } from '../components/ProductImageFallback'

type ComponentKey = 'CPU' | 'MAINBOARD' | 'RAM' | 'GPU' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER'

type Product = {
  id: string
  name: string
  slug: string
  price: number
  salePrice?: number | null
  stock: number
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
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

type ComponentOption = {
  key: ComponentKey
  label: string
  search: string
}

const componentOptions: ComponentOption[] = [
  { key: 'CPU', label: 'CPU', search: 'CPU AMD Intel Ryzen' },
  { key: 'MAINBOARD', label: 'Mainboard', search: 'Mainboard motherboard AM5 AM4' },
  { key: 'RAM', label: 'RAM', search: 'RAM DDR4 DDR5' },
  { key: 'GPU', label: 'GPU / VGA', search: 'GPU VGA graphics card RTX Radeon' },
  { key: 'STORAGE', label: 'Storage', search: 'SSD NVMe HDD storage' },
  { key: 'PSU', label: 'PSU', search: 'Power Supply PSU 80 Plus' },
  { key: 'CASE', label: 'Case', search: 'Case PC gaming tower' },
  { key: 'COOLER', label: 'CPU Cooler', search: 'Cooler CPU heatsink fan' },
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

const getInitials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'TK'

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

  useEffect(() => {
    if (!selectorKey) return
    const controller = new AbortController()
    const option = componentLookup[selectorKey]
    const query = selectorQuery.trim() || option.search
    const params = new URLSearchParams({ limit: '12' })
    if (query.trim()) params.set('search', query.trim())
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
        if ((error as Error).name !== 'AbortError') setSelectorError('Không thể tải danh sách sản phẩm ứng với linh kiện này.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setSelectorLoading(false)
      })
    return () => controller.abort()
  }, [selectorKey, selectorQuery])

  useEffect(() => {
    const ids = [...new Set([...selectedIds, ...selectorProducts.map((product) => product.id)])]
    if (ids.length === 0) return

    const missingIds = ids.filter((id) => !imageMap[id])
    if (missingIds.length === 0) return

    let active = true
    const controller = new AbortController()
    const nextMap: Record<string, string> = { ...imageMap }

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
          // ignore and fallback to initials
        }
      }),
    ).finally(() => {
      if (active) setImageMap(nextMap)
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
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">PC Builder</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Xây dựng cấu hình PC và kiểm tra tương thích giữa các linh kiện.</p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            {componentOptions.map((option) => {
              const product = selected[option.key]
              const imageUrl = product ? imageMap[product.id] : undefined
              return (
                <div key={option.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{option.label}</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectorKey(option.key)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100">
                        {product ? 'Thay đổi' : 'Chọn linh kiện'}
                      </button>
                      {product ? (
                        <button type="button" onClick={() => {
                          setSelected((previous) => ({ ...previous, [option.key]: null }))
                          setResult(null)
                          setResultError('')
                        }} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">
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
                        <p className={`mt-2 text-xs font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">Chưa có linh kiện nào được chọn cho {option.label}.</div>
                  )}
                </div>
              )
            })}
          </section>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Tóm tắt cấu hình</h2>
                <button type="button" onClick={resetBuild} className="text-sm font-bold text-red-600 hover:text-red-700">Xóa cấu hình</button>
              </div>

              {selectedEntries.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Chưa có linh kiện nào được chọn.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedEntries.map(({ option, product }) => (
                    <div key={option.key} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-2.5 text-sm">
                      <span className="font-semibold text-slate-600">{option.label}</span>
                      <span className="truncate text-right font-bold text-slate-900">{product?.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Tổng giá</span>
                  <strong className="text-lg text-blue-700">{formatPrice(totalPrice)}</strong>
                </div>
              </div>

              <button type="button" onClick={checkCompatibility} disabled={checking || selectedIds.length === 0} className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {checking ? 'Đang kiểm tra...' : 'Kiểm tra tương thích'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Kết quả tương thích</h2>
              {resultError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{resultError}</p> : null}

              {!result ? (
                <p className="mt-4 text-sm text-slate-500">Chọn linh kiện để kiểm tra tương thích.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className={`rounded-2xl px-4 py-3 text-sm font-black ${result.compatible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {result.compatible ? 'Tương thích' : 'Có vấn đề tương thích'}
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

      {selectorKey ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">{componentLookup[selectorKey].label}</h2>
              <button type="button" onClick={() => setSelectorKey(null)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Đóng</button>
            </div>

            <div className="mt-4">
              <input
                value={selectorQuery}
                onChange={(event) => setSelectorQuery(event.target.value)}
                placeholder="Tìm kiếm linh kiện..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-blue-500"
              />
            </div>

            <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {selectorLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}
                </div>
              ) : null}

              {selectorError ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{selectorError}</p> : null}

              {!selectorLoading && !selectorError && selectorProducts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Không tìm thấy linh kiện phù hợp.</div>
              ) : null}

              {selectorProducts.map((product) => {
                const imageUrl = imageMap[product.id]
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
                      <h3 className="mt-1 truncate text-sm font-black text-slate-900">{product.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <span className="font-black text-blue-700">{formatPrice(getUnitPrice(product))}</span>
                        {product.salePrice && product.salePrice < product.price ? <span className="text-slate-400 line-through">{formatPrice(product.price)}</span> : null}
                        <span className={product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}>{product.stock > 0 ? `Còn ${product.stock}` : 'Hết hàng'}</span>
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
