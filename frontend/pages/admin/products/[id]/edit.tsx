import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AdminLayout } from '../../../../components/admin/AdminLayout'
import { useAuth } from '../../../../lib/auth'
import { apiFetch, parseJsonResponse } from '../../../../lib/cart'

import { ProductImagePicker, type ProductImageItem } from '../../../../components/admin/ProductImagePicker'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Category = { id: string; name: string; slug: string }
type Brand = { id: string; name: string; slug: string }
type Product = {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice?: number | null
  stock: number
  description?: string | null
  categoryId?: string | null
  brandId?: string | null
  category?: Category | null
  brand?: Brand | null
}

type ImageRecord = ProductImageItem
type SpecificationRecord = {
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
  extra?: Record<string, unknown> | null
}

type ProductForm = {
  name: string
  slug: string
  sku: string
  price: string
  salePrice: string
  stock: string
  description: string
  categoryId: string
  brandId: string
}

const responseMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: string; error?: string }
    if (value.message) return value.message
    if (value.error) return value.error
  }
  return fallback
}

const fieldGroups: Record<string, string[]> = {
  cpu: ['productType', 'socket', 'cores', 'threads', 'baseClock', 'boostClock', 'tdp'],
  gpu: ['productType', 'chipset', 'vram', 'memoryType', 'length', 'powerConsumption', 'interface', 'powerConnector'],
  mainboard: ['productType', 'socket', 'ramType', 'ramSlots', 'maxRam', 'formFactor', 'pcieVersion'],
  ram: ['productType', 'type', 'capacity', 'speed', 'modules'],
  storage: ['productType', 'capacityGB', 'storageInterface', 'rpm'],
  psu: ['productType', 'wattage', 'efficiency', 'certification', 'connectors'],
  case: ['productType', 'gpuClearance', 'cpuCoolerClearance'],
  cooler: ['productType', 'gpuClearance', 'cpuCoolerClearance', 'height', 'motherboardSupport', 'radiatorSupport'],
}

const normalizeProductType = (value?: string | null) => {
  const text = (value || '').toLowerCase()
  if (text.includes('cpu')) return 'cpu'
  if (text.includes('gpu') || text.includes('graphics')) return 'gpu'
  if (text.includes('mainboard') || text.includes('motherboard')) return 'mainboard'
  if (text.includes('ram') || text.includes('memory')) return 'ram'
  if (text.includes('ssd') || text.includes('hdd') || text.includes('storage')) return 'storage'
  if (text.includes('psu') || text.includes('power supply')) return 'psu'
  if (text.includes('case')) return 'case'
  if (text.includes('cooler') || text.includes('heatsink') || text.includes('fan')) return 'cooler'
  return 'cpu'
}

export default function EditProductPage() {
  const router = useRouter()
  const rawId = router.query.id ?? router.query.productId
  const productId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined
  const { user, loading, authenticated } = useAuth()

  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [images, setImages] = useState<ImageRecord[]>([])
  const [specs, setSpecs] = useState<SpecificationRecord[]>([])
  const [form, setForm] = useState<ProductForm>({
    name: '',
    slug: '',
    sku: '',
    price: '',
    salePrice: '',
    stock: '',
    description: '',
    categoryId: '',
    brandId: '',
  })
  const [specForm, setSpecForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [loadingProduct, setLoadingProduct] = useState(true)
  const [submitError, setSubmitError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  const productTypeKey = useMemo(() => {
    if (product?.category?.name) return normalizeProductType(product.category.name)
    if (product?.category?.slug) return normalizeProductType(product.category.slug)
    if (product?.name) {
      const text = product.name.toLowerCase()
      if (text.includes('cpu')) return 'cpu'
      if (text.includes('gpu') || text.includes('vga')) return 'gpu'
      if (text.includes('mainboard') || text.includes('motherboard')) return 'mainboard'
      if (text.includes('ram') || text.includes('memory')) return 'ram'
      if (text.includes('psu') || text.includes('power')) return 'psu'
      if (text.includes('case')) return 'case'
      if (text.includes('cooler') || text.includes('fan')) return 'cooler'
    }
    return 'cpu'
  }, [product])

  const baseFields = useMemo(() => fieldGroups[productTypeKey] ?? fieldGroups.cpu, [productTypeKey])

  const visibleFields = useMemo(() => {
    const keys = new Set<string>()
    baseFields.forEach((key) => keys.add(key))

    if (specs[0]) {
      Object.keys(specs[0]).forEach((key) => {
        if (key === 'id' || key === 'productId' || key === 'extra') return
        keys.add(key)
      })
    }

    return Array.from(keys).filter((key) => {
      if (key === 'productType') return true
      const match = specs[0] && Object.prototype.hasOwnProperty.call(specs[0], key)
      return match || baseFields.includes(key)
    })
  }, [baseFields, specs])

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    if (!router.isReady) return
    if (!productId || typeof productId !== 'string' || !authenticated || user?.role !== 'ADMIN') {
      if (authenticated && user?.role === 'ADMIN' && !productId) {
        setLoadingProduct(false)
        setLoadError('Thiếu mã sản phẩm trong đường dẫn.')
      }
      return
    }

    const controller = new AbortController()
    let active = true

    const loadData = async () => {
      setLoadingProduct(true)
      setLoadError('')
      try {
        const [productResponse, categoriesResponse, brandsResponse, imageResponse, specResponse] = await Promise.all([
          apiFetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          apiFetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          apiFetch(`${API_BASE_URL}/api/brands`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          apiFetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}/images`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          apiFetch(`${API_BASE_URL}/api/products/${encodeURIComponent(productId)}/specifications`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        ])

        if (!productResponse.ok) {
          if (productResponse.status === 404) throw new Error('Sản phẩm không tồn tại.')
          throw new Error('Không thể tải thông tin sản phẩm.')
        }

        const productPayload = await parseJsonResponse<{ data?: Product }>(productResponse, 'Không thể tải thông tin sản phẩm.')
        const categoryPayload = await parseJsonResponse<{ data?: Category[] }>(categoriesResponse, 'Không thể tải danh mục.')
        const brandPayload = await parseJsonResponse<{ data?: Brand[] }>(brandsResponse, 'Không thể tải thương hiệu.')
        const imagePayload = await parseJsonResponse<{ data?: ImageRecord[] }>(imageResponse, 'Không thể tải hình ảnh.')
        const specPayload = await parseJsonResponse<{ data?: SpecificationRecord[] }>(specResponse, 'Không thể tải thông số kỹ thuật.')

        if (!active) return

        const nextProduct = productPayload.data ?? null
        setProduct(nextProduct)
        setCategories(categoryPayload.data ?? [])
        setBrands(brandPayload.data ?? [])
        setImages(imagePayload.data ?? [])
        setSpecs(specPayload.data ?? [])

        if (nextProduct) {
          setForm({
            name: nextProduct.name ?? '',
            slug: nextProduct.slug ?? '',
            sku: nextProduct.sku ?? '',
            price: String(nextProduct.price ?? 0),
            salePrice: nextProduct.salePrice !== null && nextProduct.salePrice !== undefined ? String(nextProduct.salePrice) : '',
            stock: String(nextProduct.stock ?? 0),
            description: nextProduct.description ?? '',
            categoryId: nextProduct.categoryId ?? '',
            brandId: nextProduct.brandId ?? '',
          })
        }

        if (specPayload.data && specPayload.data.length > 0) {
          const first = specPayload.data[0]
          const nextSpecForm: Record<string, string> = {}
          Object.keys(first).forEach((key) => {
            if (key === 'id' || key === 'productId' || key === 'extra') return
            const value = first[key as keyof SpecificationRecord]
            nextSpecForm[key] = value === null || value === undefined ? '' : String(value)
          })
          setSpecForm(nextSpecForm)
        } else {
          setSpecForm({ productType: productTypeKey })
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && active) setLoadError((error as Error).message || 'Không thể tải dữ liệu sản phẩm.')
      } finally {
        if (active) setLoadingProduct(false)
      }
    }

    loadData()
    return () => {
      active = false
      controller.abort()
    }
  }, [authenticated, productId, refreshNonce, user, productTypeKey, router.isReady])

  const handleProductSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!productId || typeof productId !== 'string') return

    const price = Number(form.price)
    const salePrice = form.salePrice === '' ? null : Number(form.salePrice)
    const stock = Number(form.stock)

    if (!form.name.trim() || !form.slug.trim() || !form.sku.trim() || !Number.isFinite(price) || !Number.isFinite(stock)) {
      setSubmitError('Tên, slug, SKU, giá và stock là bắt buộc.')
      return
    }

    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice > price)) {
      setSubmitError('Sale price không hợp lệ.')
      return
    }

    setSaving(true)
    setSubmitError('')
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          sku: form.sku.trim(),
          price,
          salePrice,
          stock,
          description: form.description.trim() || null,
          categoryId: form.categoryId || null,
          brandId: form.brandId || null,
        }),
      })

      const payload = await parseJsonResponse<{ success?: boolean; message?: string; error?: string }>(response, 'Cập nhật sản phẩm thất bại.')
      if (!response.ok || !payload.success) throw new Error(responseMessage(payload, 'Cập nhật sản phẩm thất bại.'))

      setSuccessMessage('Cập nhật sản phẩm thành công!')
      setTimeout(() => setSuccessMessage(''), 4000)

      setProduct((current) => {
        if (!current) return current
        return { ...current, name: form.name.trim(), slug: form.slug.trim(), sku: form.sku.trim(), price, salePrice: salePrice ?? current.salePrice ?? null, stock, description: form.description.trim() || null, categoryId: form.categoryId || null, brandId: form.brandId || null }
      })
    } catch (error) {
      setSubmitError((error as Error).message || 'Không thể cập nhật sản phẩm.')
    } finally {
      setSaving(false)
    }
  }

  const handleImagePickerChange = async (nextImages: ProductImageItem[]) => {
    // Check if any new images were picked or added from URL
    const newItems = nextImages.filter((img) => img.isNew && !img.id)
    if (newItems.length > 0 && productId && typeof productId === 'string') {
      try {
        const addedImages: ProductImageItem[] = []
        for (const item of newItems) {
          const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}/images`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: item.url,
              alt: item.alt?.trim() || form.name.trim(),
              sortOrder: item.sortOrder ?? images.length,
            }),
          })
          const payload = (await response.json()) as { success?: boolean; data?: ProductImageItem; message?: string }
          if (response.ok && payload.success && payload.data) {
            addedImages.push(payload.data)
          } else {
            throw new Error(payload.message || 'Không thể lưu ảnh mới.')
          }
        }
        const remainingExisting = nextImages.filter((img) => img.id)
        setImages([...remainingExisting, ...addedImages])
        return
      } catch (err) {
        setSubmitError((err as Error).message || 'Không thể lưu ảnh mới.')
      }
    }
    setImages(nextImages)
  }

  const handleUpdateImage = async (image: ProductImageItem) => {
    if (!productId || typeof productId !== 'string' || !image.id) return
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}/images/${image.id}`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: image.url.trim(), alt: image.alt?.trim() || null, sortOrder: image.sortOrder ?? 0 }),
      })
      const payload = await response.json() as { success?: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể cập nhật ảnh.')
    } catch (error) {
      setSubmitError((error as Error).message || 'Không thể cập nhật ảnh.')
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    if (!productId || typeof productId !== 'string') return
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}/images/${imageId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      })
      const payload = await response.json() as { success?: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Không thể xóa ảnh.')
      setImages((current) => current.filter((image) => image.id !== imageId))
    } catch (error) {
      setSubmitError((error as Error).message || 'Không thể xóa ảnh.')
      throw error
    }
  }

  const saveSpecification = async () => {
    if (!productId || typeof productId !== 'string') return

    const payload = Object.fromEntries(
      Object.entries(specForm).filter(([key, value]) => key && value !== undefined && value !== null && value !== ''),
    ) as Record<string, string>

    if (Object.keys(payload).length === 0) {
      setSubmitError('Vui lòng nhập ít nhất một thông số kỹ thuật.')
      return
    }

    try {
      if (!specs.length) {
        const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}/specifications`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ productType: productTypeKey, ...payload }),
        })
        const result = await response.json() as { success?: boolean; data?: SpecificationRecord; message?: string }
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tạo thông số kỹ thuật.')
        setSpecs((current) => current.length > 0 ? current : [result.data as SpecificationRecord])
        setRefreshNonce((value) => value + 1)
        return
      }

      const existing = specs[0]
      if (!existing?.id) throw new Error('Không tìm thấy thông số cần cập nhật.')

      const response = await apiFetch(`${API_BASE_URL}/api/products/${productId}/specifications/${existing.id}`, {
        method: 'PUT',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: productTypeKey, ...payload }),
      })
      const result = await response.json() as { success?: boolean; data?: SpecificationRecord; message?: string }
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật thông số kỹ thuật.')
      setSpecs((current) => {
        if (current.length === 0) return [result.data as SpecificationRecord]
        const next = [...current]
        next[0] = result.data as SpecificationRecord
        return next
      })
    } catch (error) {
      setSubmitError((error as Error).message || 'Không thể lưu thông số kỹ thuật.')
    }
  }

  if (loading || (loadingProduct && !product && !loadError)) {
    return (
      <AdminLayout title="Chỉnh sửa sản phẩm" subtitle="Đang tải dữ liệu sản phẩm...">
        <div className="space-y-4">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không được phép sửa sản phẩm.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Chỉ tài khoản admin mới có quyền chỉnh sửa sản phẩm.</p>
        </div>
      </AdminLayout>
    )
  }

  if (!product) {
    return (
      <AdminLayout title="Sản phẩm" subtitle="Không thể tải dữ liệu sản phẩm.">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {loadError ? <p className="text-red-700 font-semibold">{loadError}</p> : <p className="text-slate-600">Không tìm thấy sản phẩm.</p>}
          <div className="mt-4">
            <Link href="/admin/products" className="inline-block rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              ← Quay lại danh sách sản phẩm
            </Link>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Chỉnh sửa sản phẩm" subtitle="Cập nhật thông tin, hình ảnh và thông số kỹ thuật của sản phẩm.">
      <div className="space-y-6">
        {successMessage ? (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 shadow-sm">
            <span>✓ {successMessage}</span>
            <button type="button" onClick={() => setSuccessMessage('')} className="font-bold text-emerald-700 hover:text-emerald-900">✕</button>
          </div>
        ) : null}
        {submitError ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div> : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">Thông tin cơ bản</h3>
            <Link href="/admin/products" className="text-sm font-bold text-blue-700">← Quay lại</Link>
          </div>

          <form onSubmit={handleProductSave} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Tên sản phẩm</span>
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" required />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Slug</span>
                <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" required />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>SKU</span>
                <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" required />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Stock</span>
                <input value={form.stock} type="number" min="0" onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" required />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Giá</span>
                <input value={form.price} type="number" min="0" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" required />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Sale price</span>
                <input value={form.salePrice} type="number" min="0" onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" />
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Danh mục</span>
                <select value={form.categoryId || ''} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500">
                  <option value="">Chưa chọn</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                <span>Thương hiệu</span>
                <select value={form.brandId || ''} onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500">
                  <option value="">Chưa chọn</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
              </label>
            </div>

            <label className="block space-y-2 text-sm font-semibold text-slate-700">
              <span>Mô tả</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" />
            </label>

            <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {saving ? 'Đang lưu...' : 'Lưu sản phẩm'}
            </button>
          </form>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
          {/* Visual Product Image Picker */}
          <div>
            <ProductImagePicker
              images={images}
              onChange={handleImagePickerChange}
              onDeleteExisting={handleDeleteImage}
              onSaveExisting={handleUpdateImage}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black">Thông số kỹ thuật</h3>
            <div className="mt-4 space-y-3">
              {visibleFields.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">Chưa có thông số kỹ thuật cho sản phẩm này.</div>
              ) : (
                visibleFields.map((field) => (
                  <label key={field} className="block space-y-2 text-sm font-semibold text-slate-700">
                    <span>{field}</span>
                    <input value={specForm[field] ?? ''} onChange={(event) => setSpecForm((current) => ({ ...current, [field]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" />
                  </label>
                ))
              )}
            </div>
            <button type="button" onClick={() => void saveSpecification()} className="mt-5 rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800">Lưu thông số</button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
