import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Brand = {
  id: string
  name: string
  slug: string
  description?: string | null
  logo?: string | null
  _count?: { products?: number }
}

type BrandForm = {
  name: string
  slug: string
  description: string
  logo: string
}

const emptyForm = (): BrandForm => ({
  name: '',
  slug: '',
  description: '',
  logo: '',
})

const responseMessage = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === 'object') {
    const value = payload as { message?: string; error?: string }
    if (value.message) return value.message
    if (value.error) return value.error
  }
  return fallback
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default function AdminBrandsPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<BrandForm>(emptyForm())
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  const loadBrands = async (signal?: AbortSignal) => {
    setLoadingList(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/brands`, {
        signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Không thể tải thương hiệu.')
      const payload = await response.json() as { success?: boolean; data?: Brand[]; message?: string }
      if (!payload.success) throw new Error(payload.message || 'Không thể tải thương hiệu.')
      setBrands(payload.data ?? [])
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') {
        setError((loadError as Error).message || 'Không thể tải thương hiệu.')
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return
    const controller = new AbortController()
    void loadBrands(controller.signal)
    return () => controller.abort()
  }, [authenticated, refreshNonce, token, user])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim() || !form.slug.trim()) {
      setError('Tên và slug là bắt buộc.')
      return
    }
    if (!slugPattern.test(form.slug.trim())) {
      setError('Slug không hợp lệ. Chỉ dùng chữ thường, số và dấu gạch ngang.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const payloadBody = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        logo: form.logo.trim() || null,
      }
      const response = await fetch(`${API_BASE_URL}/api/brands${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadBody),
      })
      const payload = await response.json() as { success?: boolean; data?: Brand; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(responseMessage(payload, editingId ? 'Cập nhật thương hiệu thất bại.' : 'Tạo thương hiệu thất bại.'))
      }
      resetForm()
      setRefreshNonce((value) => value + 1)
    } catch (submitError) {
      setError((submitError as Error).message || 'Không thể lưu thương hiệu.')
    } finally {
      setSaving(false)
    }
  }

  const editBrand = (brand: Brand) => {
    setEditingId(brand.id)
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || '',
      logo: brand.logo || '',
    })
  }

  const deleteBrand = async (brand: Brand) => {
    if (!window.confirm(`Xóa thương hiệu "${brand.name}"?`)) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/brands/${brand.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const payload = await response.json() as { success?: boolean; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(responseMessage(payload, 'Không thể xóa thương hiệu.'))
      }
      setRefreshNonce((value) => value + 1)
      if (editingId === brand.id) resetForm()
    } catch (deleteError) {
      setError((deleteError as Error).message || 'Không thể xóa thương hiệu.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Thương hiệu" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không có quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để truy cập thương hiệu.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Thương hiệu" subtitle="Quản lý thương hiệu theo dữ liệu thật từ API Brand hiện có.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">{editingId ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}</h3>
            {editingId ? <button type="button" onClick={resetForm} className="text-sm font-bold text-slate-600">Hủy</button> : null}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Tên thương hiệu</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Ví dụ: AMD" required />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Slug</span>
              <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="amd" required />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Mô tả</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Mô tả thương hiệu" />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Logo (URL)</span>
              <input value={form.logo} onChange={(event) => setForm((current) => ({ ...current, logo: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="https://..." />
            </label>

            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {saving ? 'Đang lưu...' : editingId ? 'Cập nhật thương hiệu' : 'Thêm thương hiệu'}
              </button>
            </div>
          </form>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <h3 className="text-lg font-black text-slate-900">Danh sách thương hiệu</h3>
            <button type="button" onClick={() => setRefreshNonce((value) => value + 1)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Làm mới
            </button>
          </div>

          {loadingList ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : brands.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Chưa có thương hiệu nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Tên</th>
                    <th className="px-4 py-3 font-bold">Slug</th>
                    <th className="px-4 py-3 font-bold">Sản phẩm</th>
                    <th className="px-4 py-3 font-bold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr key={brand.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{brand.name}</div>
                        {brand.description ? <div className="mt-1 text-xs text-slate-500">{brand.description}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{brand.slug}</td>
                      <td className="px-4 py-3 text-slate-700">{typeof brand._count?.products === 'number' ? brand._count.products : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => editBrand(brand)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Sửa</button>
                          <button type="button" onClick={() => void deleteBrand(brand)} disabled={submitting} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
