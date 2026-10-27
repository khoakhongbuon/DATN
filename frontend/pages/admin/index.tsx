import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { useAuth } from '../../lib/auth'
import { apiFetch } from '../../lib/cart'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type StatCard = {
  label: string
  value: string
  hint: string
  accent: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, loading, authenticated } = useAuth()
  const [stats, setStats] = useState<StatCard[]>([])
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  useEffect(() => {
    if (!authenticated || !user || user.role !== 'ADMIN') return

    const controller = new AbortController()
    let active = true

    const loadStats = async () => {
      setStatsLoading(true)
      setStatsError('')
      try {
        const [productsResponse, categoriesResponse, brandsResponse, ordersResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/products?limit=1`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(`${API_BASE_URL}/api/categories`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          fetch(`${API_BASE_URL}/api/brands`, { signal: controller.signal, headers: { Accept: 'application/json' } }),
          apiFetch(`${API_BASE_URL}/api/orders`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
          }),
        ])

        const productPayload = productsResponse.ok ? await productsResponse.json() as { pagination?: { total?: number } } : null
        const categoryPayload = categoriesResponse.ok ? await categoriesResponse.json() as { data?: Array<{ id: string }> } : null
        const brandPayload = brandsResponse.ok ? await brandsResponse.json() as { data?: Array<{ id: string }> } : null
        const ordersPayload = ordersResponse.ok ? await ordersResponse.json() as { data?: unknown[]; success?: boolean } : null

        if (!active) return

        const cards: StatCard[] = [
          {
            label: 'Tổng sản phẩm',
            value: productPayload?.pagination?.total ? String(productPayload.pagination.total) : 'Chưa có dữ liệu',
            hint: 'Product API',
            accent: 'bg-blue-50 text-blue-700 border-blue-100',
          },
          {
            label: 'Tổng danh mục',
            value: categoryPayload?.data ? String(categoryPayload.data.length) : 'Chưa có dữ liệu',
            hint: 'Category API',
            accent: 'bg-violet-50 text-violet-700 border-violet-100',
          },
          {
            label: 'Tổng thương hiệu',
            value: brandPayload?.data ? String(brandPayload.data.length) : 'Chưa có dữ liệu',
            hint: 'Brand API',
            accent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          },
          {
            label: 'Tổng đơn hàng',
            value: ordersPayload && Array.isArray(ordersPayload.data) ? String(ordersPayload.data.length) : 'Chưa có dữ liệu',
            hint: 'Order API của user hiện tại',
            accent: 'bg-amber-50 text-amber-700 border-amber-100',
          },
          {
            label: 'Tổng người dùng',
            value: 'Chưa có dữ liệu',
            hint: 'Không có endpoint tổng hợp user',
            accent: 'bg-slate-100 text-slate-700 border-slate-200',
          },
        ]
        setStats(cards)
      } catch (error) {
        if ((error as Error).name !== 'AbortError' && active) {
          setStatsError('Không thể tải thống kê dashboard.')
        }
      } finally {
        if (active) setStatsLoading(false)
      }
    }

    loadStats()
    return () => {
      active = false
      controller.abort()
    }
  }, [authenticated, user, loading])

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Bạn không có quyền truy cập trang quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Tài khoản hiện tại không thuộc vai trò ADMIN.</p>
          <Link href="/" className="mt-4 inline-flex rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white">Về trang chủ</Link>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard" subtitle="Tổng quan hoạt động cửa hàng và dữ liệu quản trị.">
      <div className="space-y-6">
        {statsError ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{statsError}</div> : null}

        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border p-4 shadow-sm ${stat.accent}`}>
                <p className="text-xs font-black uppercase tracking-[0.18em]">{stat.label}</p>
                <p className="mt-4 text-3xl font-black">{stat.value}</p>
                <p className="mt-2 text-xs opacity-80">{stat.hint}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black">Quick access</h3>
            <div className="mt-4 space-y-3">
              <Link href="/admin/products" className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-3 font-bold text-blue-700">
                <span>Quản lý sản phẩm</span>
                <span>→</span>
              </Link>
              <Link href="/admin/products/create" className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 font-bold text-slate-700">
                <span>Thêm sản phẩm</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-black">Ghi chú</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>• Sử dụng API Product, Category, Brand và Order hiện có để lấy dữ liệu thật.</li>
              <li>• Không có endpoint tổng hợp user trên backend hiện tại, nên mục “Tổng người dùng” hiển thị “Chưa có dữ liệu”.</li>
              <li>• Chế độ admin được kiểm tra dựa trên role từ API /api/auth/me.</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
