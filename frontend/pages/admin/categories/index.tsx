import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type Category = {
  id: string
  name: string
  slug: string
  description?: string | null
  image?: string | null
  parentId?: string | null
  parent?: Category | null
  children?: Category[]
  _count?: { products?: number }
}

type CategoryForm = {
  name: string
  slug: string
  parentId: string
  description: string
  image: string
}

const emptyForm = (): CategoryForm => ({
  name: '',
  slug: '',
  parentId: '',
  description: '',
  image: '',
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

export default function AdminCategoriesPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm())
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
      return
    }
  }, [authenticated, loading, router])

  const rootCategories = useMemo(() => categories.filter((category) => !category.parentId), [categories])

  const loadCategories = async (signal?: AbortSignal) => {
    setLoadingList(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        signal,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Không thể tải danh mục.')
      const payload = await response.json() as { success?: boolean; data?: Category[]; message?: string }
      if (!payload.success) throw new Error(payload.message || 'Không thể tải danh mục.')
      setCategories(payload.data ?? [])
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') {
        setError((loadError as Error).message || 'Không thể tải danh mục.')
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return
    const controller = new AbortController()
    void loadCategories(controller.signal)
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
        image: form.image.trim() || null,
        parentId: form.parentId || null,
      }
      const response = await fetch(`${API_BASE_URL}/api/categories${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payloadBody),
      })
      const payload = await response.json() as { success?: boolean; data?: Category; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(responseMessage(payload, editingId ? 'Cập nhật danh mục thất bại.' : 'Tạo danh mục thất bại.'))
      }
      resetForm()
      setRefreshNonce((value) => value + 1)
    } catch (submitError) {
      setError((submitError as Error).message || 'Không thể lưu danh mục.')
    } finally {
      setSaving(false)
    }
  }

  const editCategory = (category: Category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || '',
      description: category.description || '',
      image: category.image || '',
    })
  }

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Xóa danh mục "${category.name}"?`)) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      const payload = await response.json() as { success?: boolean; message?: string; error?: string }
      if (!response.ok || !payload.success) {
        throw new Error(responseMessage(payload, 'Không thể xóa danh mục.'))
      }
      setRefreshNonce((value) => value + 1)
      if (editingId === category.id) resetForm()
    } catch (deleteError) {
      setError((deleteError as Error).message || 'Không thể xóa danh mục.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Danh mục" subtitle="Đang kiểm tra quyền truy cập admin...">
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
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để truy cập danh mục.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Danh mục" subtitle="Quản lý danh mục sản phẩm theo phân cấp thực tế từ API.">
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-xl font-black">{editingId ? 'Sửa danh mục' : 'Thêm danh mục'}</h3>
            {editingId ? <button type="button" onClick={resetForm} className="text-sm font-bold text-slate-600">Hủy</button> : null}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Tên danh mục</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Ví dụ: CPU" required />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700">
              <span>Slug</span>
              <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="cpu" required />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Danh mục cha</span>
              <select value={form.parentId} onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500">
                <option value="">Không có danh mục cha</option>
                {rootCategories.filter((category) => category.id !== editingId).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Mô tả</span>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="Mô tả danh mục" />
            </label>

            <label className="space-y-2 text-sm font-semibold text-slate-700 md:col-span-2">
              <span>Ảnh (URL)</span>
              <input value={form.image} onChange={(event) => setForm((current) => ({ ...current, image: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-blue-500" placeholder="https://..." />
            </label>

            <div className="md:col-span-2">
              <button type="submit" disabled={saving} className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                {saving ? 'Đang lưu...' : editingId ? 'Cập nhật danh mục' : 'Thêm danh mục'}
              </button>
            </div>
          </form>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
            <h3 className="text-lg font-black text-slate-900">Danh sách danh mục</h3>
            <button type="button" onClick={() => setRefreshNonce((value) => value + 1)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
              Làm mới
            </button>
          </div>

          {loadingList ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">Chưa có danh mục nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-bold">Tên</th>
                    <th className="px-4 py-3 font-bold">Slug</th>
                    <th className="px-4 py-3 font-bold">Danh mục cha</th>
                    <th className="px-4 py-3 font-bold">Sản phẩm</th>
                    <th className="px-4 py-3 font-bold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{category.name}</div>
                        {category.description ? <div className="mt-1 text-xs text-slate-500">{category.description}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{category.slug}</td>
                      <td className="px-4 py-3 text-slate-700">{category.parent?.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{typeof category._count?.products === 'number' ? category._count.products : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => editCategory(category)} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">Sửa</button>
                          <button type="button" onClick={() => void deleteCategory(category)} disabled={submitting} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">Xóa</button>
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
