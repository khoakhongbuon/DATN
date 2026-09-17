import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

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
  category?: Category | null
  brand?: Brand | null
}

type ProductApiResponse = {
  success: boolean
  data: Product[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

const formatPrice = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

export default function AdminProductsPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState({ page: 1, totalPages: 1, total: 0 })
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const loadMetadata = async () => {
      try {
        const [categoriesResponse, brandsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(`${API_BASE_URL}/api/brands`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
        ])

        if (!categoriesResponse.ok || !brandsResponse.ok) throw new Error('Không thể tải metadata.')
        const categoriesPayload = await categoriesResponse.json() as { data?: Category[] }
        const brandsPayload = await brandsResponse.json() as { data?: Brand[] }
        if (active) {
          setCategories(categoriesPayload.data ?? [])
          setBrands(brandsPayload.data ?? [])
        }
      } catch {
        if (active) setError('Không thể tải danh mục và thương hiệu.')
      }
    }

    loadMetadata()
    return () => {
      active = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!authenticated || !user || user.role !== 'ADMIN') return

    const controller = new AbortController()
    let active = true

    const loadProducts = async () => {
      setLoadingProducts(true)
      setError('')

      const params = new URLSearchParams({ page: String(page), limit: '12', sortBy, sortOrder })
      if (search.trim()) params.set('search', search.trim())
      if (categoryId) params.set('categoryId', categoryId)
      if (brandId) params.set('brandId', brandId)
      if (minPrice) params.set('minPrice', minPrice)
      if (maxPrice) params.set('maxPrice', maxPrice)

      try {
        const response = await fetch(`${API_BASE_URL}/api/products?${params.toString()}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error('Không thể tải dữ liệu sản phẩm.')
        const payload = await response.json() as ProductApiResponse
        if (!active) return
        setProducts(payload.data ?? [])
        setPageInfo({
          page: payload.pagination?.page ?? 1,
          totalPages: payload.pagination?.totalPages ?? 1,
          total: payload.pagination?.total ?? 0,
        })

        const productIds = (payload.data ?? []).map((product) => product.id)
        if (productIds.length === 0) {
          setImageMap({})
          return
        }

        const images = await Promise.all(productIds.map(async (id) => {
          try {
            const imageResponse = await fetch(`${API_BASE_URL}/api/products/${id}/images`, {
              signal: controller.signal,
              headers: { Accept: 'application/json' },
            })
            if (!imageResponse.ok) return [id, ''] as const
            const imagePayload = await imageResponse.json() as { data?: Array<{ url: string; sortOrder?: number | null }> }
            const image = [...(imagePayload.data ?? [])].sort((first, second) => (first.sortOrder ?? 0) - (second.sortOrder ?? 0))[0]
            return [id, image?.url ?? ''] as const
          } catch {
            return [id, ''] as const
          }
        }))

        if (active) setImageMap(Object.fromEntries(images) as Record<string, string>)
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError' && active) {
          setProducts([])
          setImageMap({})
          setPageInfo({ page: 1, totalPages: 1, total: 0 })
          setError('Không thể tải sản phẩm. Vui lòng thử lại.')
        }
      } finally {
        if (active) setLoadingProducts(false)
      }
    }

    loadProducts()
    return () => {
      active = false
      controller.abort()
    }
  }, [authenticated, brandId, categoryId, maxPrice, minPrice, page, refreshNonce, search, sortBy, sortOrder, user])

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const payload = await response.json() as { success?: boolean; message?: string }
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Xóa sản phẩm thất bại.')
      setRefreshNonce((value) => value + 1)
    } catch (deleteError) {
      setError((deleteError as Error).message || 'Không thể xóa sản phẩm.')
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Sản phẩm" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="space-y-4">
          <div className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không thuộc quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Chỉ tài khoản ADMIN mới được truy cập trang quản lý sản phẩm.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Sản phẩm" subtitle="Quản lý sản phẩm, giá, stock và trạng thái hiển thị.">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm kiếm theo tên, SKU, slug" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 md:max-w-md" />
            <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            <select value={brandId} onChange={(event) => { setBrandId(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="">Tất cả thương hiệu</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1) }} placeholder="Giá từ" type="number" className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            <input value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1) }} placeholder="Giá đến" type="number" className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500">
              <option value="createdAt">Mới nhất</option>
              <option value="price">Giá</option>
              <option value="name">Tên</option>
            </select>
            <button type="button" onClick={() => setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            <button type="button" onClick={() => setRefreshNonce((value) => value + 1)} className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
              Làm mới
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-500">{pageInfo.total} sản phẩm</div>
          <Link href="/admin/products/create" className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-800">+ Thêm sản phẩm</Link>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {loadingProducts ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-52 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            <p className="text-lg font-black text-slate-700">Không có sản phẩm nào.</p>
            <p className="mt-2 text-sm">Thử thay đổi bộ lọc hoặc thêm sản phẩm mới.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-50">
                  {imageMap[product.id] ? (
                    <img src={imageMap[product.id]} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100 text-xl font-black text-blue-700">{product.name.slice(0, 2).toUpperCase() || 'TK'}</div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{product.brand?.name || 'Thương hiệu'}</p>
                      <h3 className="mt-1 truncate text-base font-black text-slate-900">{product.name}</h3>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold ${product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-600">
                    <p><span className="font-bold text-slate-700">Danh mục:</span> {product.category?.name || '—'}</p>
                    <p><span className="font-bold text-slate-700">SKU:</span> {product.sku}</p>
                    <p><span className="font-bold text-slate-700">Giá:</span> {formatPrice(product.price)}</p>
                    {product.salePrice && product.salePrice < product.price ? <p><span className="font-bold text-slate-700">Sale:</span> {formatPrice(product.salePrice)}</p> : null}
                    <p><span className="font-bold text-slate-700">Stock:</span> {product.stock}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/admin/products/${product.id}/edit`} className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-bold text-blue-700 hover:bg-blue-100">Sửa</Link>
                    <button type="button" onClick={() => deleteProduct(product.id)} className="flex-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100">Xóa</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pageInfo.totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Trước</button>
            <span className="text-sm font-bold text-slate-700">Trang {pageInfo.page} / {pageInfo.totalPages}</span>
            <button type="button" disabled={page >= pageInfo.totalPages} onClick={() => setPage((current) => Math.min(pageInfo.totalPages, current + 1))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Sau</button>
          </div>
        ) : null}
      </div>
    </AdminLayout>
  )
}
