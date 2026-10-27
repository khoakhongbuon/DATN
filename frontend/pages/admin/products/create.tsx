import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'
import { apiFetch } from '../../../lib/cart'

import { ProductImagePicker, type ProductImageItem } from '../../../components/admin/ProductImagePicker'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Category = { id: string; name: string; slug: string }
type Brand = { id: string; name: string; slug: string }

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

const initialForm: ProductForm = {
  name: '',
  slug: '',
  sku: '',
  price: '',
  salePrice: '',
  stock: '',
  description: '',
  categoryId: '',
  brandId: '',
}

const responseMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: string; error?: string }
    if (value.message) return value.message
    if (value.error) return value.error
  }
  return fallback
}

export default function CreateProductPage() {
  const router = useRouter()
  const { user, loading, authenticated } = useAuth()
  const [form, setForm] = useState<ProductForm>(initialForm)
  const [images, setImages] = useState<ProductImageItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [metadataLoading, setMetadataLoading] = useState(true)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return

    const controller = new AbortController()
    let active = true
    const loadMetadata = async () => {
      setMetadataLoading(true)
      try {
        const [categoryResponse, brandResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(`${API_BASE_URL}/api/brands`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        ])
        if (!categoryResponse.ok || !brandResponse.ok) throw new Error('Không thể tải danh mục và thương hiệu.')
        const categoryPayload = await categoryResponse.json() as { data?: Category[] }
        const brandPayload = await brandResponse.json() as { data?: Brand[] }
        if (active) {
          setCategories(categoryPayload.data ?? [])
          setBrands(brandPayload.data ?? [])
        }
      } catch (error) {
        if (active && (error as Error).name !== 'AbortError') {
          setSubmitError('Không thể tải danh mục và thương hiệu để tạo sản phẩm.')
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
  }, [authenticated, user])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError('')

    const price = Number(form.price)
    const salePrice = form.salePrice === '' ? undefined : Number(form.salePrice)
    const stock = Number(form.stock)

    if (!form.name.trim() || !form.slug.trim() || !form.sku.trim() || !Number.isFinite(price) || !Number.isFinite(stock)) {
      setSubmitError('Tên, slug, SKU, giá và tồn kho là bắt buộc.')
      return
    }
    if (price < 0 || stock < 0 || (salePrice !== undefined && salePrice < 0)) {
      setSubmitError('Giá, salePrice và stock không được âm.')
      return
    }
    if (salePrice !== undefined && salePrice > price) {
      setSubmitError('Sale price không được lớn hơn price.')
      return
    }

    setSaving(true)
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim(),
          sku: form.sku.trim(),
          price,
          salePrice: salePrice === undefined ? undefined : salePrice,
          stock,
          description: form.description.trim() || null,
          categoryId: form.categoryId || undefined,
          brandId: form.brandId || undefined,
        }),
      })
      const payload = await response.json() as { success?: boolean; data?: { id?: string }; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(responseMessage(payload, 'Không thể tạo sản phẩm.'))
      }

      // If images were selected, upload/save them for the newly created product
      const newProductId = payload.data?.id
      if (newProductId && images.length > 0) {
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx]
          try {
            await apiFetch(`${API_BASE_URL}/api/products/${newProductId}/images`, {
              method: 'POST',
              headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: img.url,
                alt: img.alt?.trim() || form.name.trim(),
                sortOrder: idx,
              }),
            })
          } catch {
            // Non-blocking for subsequent images
          }
        }
      }

      router.push('/admin/products')
    } catch (error) {
      setSubmitError((error as Error).message || 'Không thể tạo sản phẩm.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Thêm sản phẩm" subtitle="Đang xác thực quyền truy cập...">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản này không có quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để thêm sản phẩm.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Thêm sản phẩm" subtitle="Tạo sản phẩm mới bằng API Product hiện có.">
      <div className="max-w-5xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">Thông tin sản phẩm</h3>
          <Link href="/admin/products" className="text-sm font-bold text-blue-700">← Quay lại danh sách</Link>
        </div>

        {submitError ? <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</div> : null}

        <form onSubmit={handleSubmit} className="space-y-5">
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
              <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" disabled={metadataLoading}>
                <option value="">Chưa chọn</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Thương hiệu</span>
              <select value={form.brandId} onChange={(event) => setForm((current) => ({ ...current, brandId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" disabled={metadataLoading}>
                <option value="">Chưa chọn</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span>Mô tả</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={5} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" />
          </label>

          {/* Visual Product Image Picker */}
          <ProductImagePicker images={images} onChange={setImages} disabled={saving} />

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {saving ? 'Đang tạo...' : 'Tạo sản phẩm'}
            </button>
            <Link href="/admin/products" className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Hủy</Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
