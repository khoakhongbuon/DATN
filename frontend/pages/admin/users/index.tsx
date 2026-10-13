import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

type UserRole = 'USER' | 'ADMIN'

type UserItem = {
  id: string
  name: string | null
  email: string
  phone: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

type CreateFormState = {
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
}

type EditFormState = {
  name: string
  email: string
  phone: string
  role: UserRole
  password: string
}

const emptyCreateForm = (): CreateFormState => ({
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'USER',
})

const emptyEditForm = (): EditFormState => ({
  name: '',
  email: '',
  phone: '',
  role: 'USER',
  password: '',
})

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const obj = payload as { message?: string; error?: string }
    if (obj.message) return obj.message
    if (obj.error) return obj.error
  }
  return fallback
}

function formatDate(isoString: string): string {
  if (!isoString) return '—'
  try {
    const d = new Date(isoString)
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, token, loading, authenticated } = useAuth()

  // List data state
  const [users, setUsers] = useState<UserItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState('')
  const [successFeedback, setSuccessFeedback] = useState('')

  // Filter & Search & Pagination
  const [searchInput, setSearchInput] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [refreshNonce, setRefreshNonce] = useState(0)

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(emptyCreateForm())
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState('')

  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm())
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')

  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Auth gatekeeper
  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
    }
  }, [authenticated, loading, router])

  // Clear success banner automatically after 5s
  useEffect(() => {
    if (!successFeedback) return
    const timer = setTimeout(() => setSuccessFeedback(''), 5000)
    return () => clearTimeout(timer)
  }, [successFeedback])

  // Fetch users list
  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return
      setLoadingList(true)
      setListError('')

      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        })

        if (activeSearch.trim()) {
          queryParams.set('search', activeSearch.trim())
        }

        if (roleFilter !== 'ALL') {
          queryParams.set('role', roleFilter)
        }

        const res = await fetch(`${API_BASE_URL}/api/users?${queryParams.toString()}`, {
          signal,
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = (await res.json()) as {
          success?: boolean
          message?: string
          data?:
            | UserItem[]
            | {
                items?: UserItem[]
                total?: number
                page?: number
                limit?: number
                totalPages?: number
              }
        }

        if (!res.ok || !payload.success) {
          throw new Error(extractErrorMessage(payload, 'Không thể tải danh sách người dùng.'))
        }

        if (Array.isArray(payload.data)) {
          setUsers(payload.data)
          setTotalCount(payload.data.length)
          setTotalPages(Math.ceil(payload.data.length / limit) || 1)
        } else if (payload.data && Array.isArray(payload.data.items)) {
          setUsers(payload.data.items)
          setTotalCount(payload.data.total ?? payload.data.items.length)
          setTotalPages(payload.data.totalPages ?? 1)
        } else {
          setUsers([])
          setTotalCount(0)
          setTotalPages(1)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setListError((err as Error).message || 'Lỗi khi nạp dữ liệu người dùng.')
        }
      } finally {
        setLoadingList(false)
      }
    },
    [activeSearch, limit, page, refreshNonce, roleFilter, token]
  )

  useEffect(() => {
    if (!authenticated || user?.role !== 'ADMIN') return
    const controller = new AbortController()
    void loadUsers(controller.signal)
    return () => controller.abort()
  }, [authenticated, loadUsers, user?.role])

  // Search handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setActiveSearch(searchInput)
  }

  const handleClearSearch = () => {
    setSearchInput('')
    setActiveSearch('')
    setPage(1)
  }

  // Create User Action
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')

    if (!createForm.email.trim()) {
      setCreateError('Vui lòng nhập email.')
      return
    }
    if (!createForm.password || createForm.password.length < 8) {
      setCreateError('Mật khẩu bắt buộc và phải có ít nhất 8 ký tự.')
      return
    }

    setCreateSubmitting(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name.trim() || undefined,
          email: createForm.email.trim(),
          password: createForm.password,
          phone: createForm.phone.trim() || undefined,
          role: createForm.role,
        }),
      })

      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(extractErrorMessage(payload, 'Tạo tài khoản thất bại.'))
      }

      setIsCreateOpen(false)
      setCreateForm(emptyCreateForm())
      setSuccessFeedback(`Đã tạo thành công tài khoản: ${createForm.email.trim()}`)
      setRefreshNonce((n) => n + 1)
    } catch (err) {
      setCreateError((err as Error).message || 'Có lỗi xảy ra khi tạo tài khoản.')
    } finally {
      setCreateSubmitting(false)
    }
  }

  // Edit User Action
  const openEditModal = (u: UserItem) => {
    setEditingUser(u)
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      role: u.role,
      password: '',
    })
    setEditError('')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setEditError('')

    if (!editForm.email.trim()) {
      setEditError('Email không được để trống.')
      return
    }

    if (editForm.password && editForm.password.length < 8) {
      setEditError('Mật khẩu mới phải có tối thiểu 8 ký tự.')
      return
    }

    setEditSubmitting(true)
    try {
      const bodyPayload: Record<string, unknown> = {
        name: editForm.name.trim() || null,
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
      }
      if (editForm.password.trim()) {
        bodyPayload.password = editForm.password.trim()
      }

      const res = await fetch(`${API_BASE_URL}/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      })

      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(extractErrorMessage(payload, 'Cập nhật tài khoản thất bại.'))
      }

      setEditingUser(null)
      setSuccessFeedback(`Đã cập nhật thông tin người dùng: ${editForm.email.trim()}`)
      setRefreshNonce((n) => n + 1)
    } catch (err) {
      setEditError((err as Error).message || 'Có lỗi xảy ra khi cập nhật tài khoản.')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Delete User Action
  const openDeleteModal = (u: UserItem) => {
    setDeletingUser(u)
    setDeleteError('')
  }

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return
    setDeleteError('')
    setDeleteSubmitting(true)

    try {
      const res = await fetch(`${API_BASE_URL}/api/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await res.json()
      if (!res.ok || !payload.success) {
        throw new Error(extractErrorMessage(payload, 'Không thể xóa người dùng.'))
      }

      setDeletingUser(null)
      setSuccessFeedback(`Đã xóa thành công người dùng: ${deletingUser.email}`)
      setRefreshNonce((n) => n + 1)
    } catch (err) {
      setDeleteError((err as Error).message || 'Không thể xóa người dùng.')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // Render auth loading state
  if (loading) {
    return (
      <AdminLayout title="Người dùng" subtitle="Đang kiểm tra quyền truy cập admin...">
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </AdminLayout>
    )
  }

  if (!authenticated) return null

  // 403 Forbidden screen if not ADMIN
  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không có quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Chỉ tài khoản ADMIN mới có quyền xem và quản lý người dùng hệ thống.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Quản lý Người dùng"
      subtitle="Tra cứu, tạo mới, chỉnh sửa và phân quyền tài khoản người dùng trong hệ thống."
    >
      <div className="space-y-6">
        {/* Success Alert Banner */}
        {successFeedback && (
          <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-sm transition">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successFeedback}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessFeedback('')}
              className="text-emerald-600 hover:text-emerald-900"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        {/* Action Bar: Search, Role Filter, Create Button */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm theo tên, email, SĐT..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <svg
                className="absolute left-3 top-3 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Tìm
            </button>
          </form>

          {/* Right Controls: Role Filter & Create Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(['ALL', 'USER', 'ADMIN'] as const).map((r) => {
                const isSelected = roleFilter === r
                const label = r === 'ALL' ? 'Tất cả' : r === 'USER' ? 'Khách hàng' : 'Quản trị'
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRoleFilter(r)
                      setPage(1)
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Create New User Button */}
            <button
              type="button"
              onClick={() => {
                setCreateForm(emptyCreateForm())
                setCreateError('')
                setIsCreateOpen(true)
              }}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Thêm người dùng</span>
            </button>
          </div>
        </div>

        {/* Content Table / Cards Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Loading state */}
          {loadingList ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
              <p className="mt-3 text-sm font-semibold text-slate-600">Đang tải danh sách người dùng...</p>
            </div>
          ) : listError ? (
            /* Error state with retry button */
            <div className="p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="mt-3 text-base font-bold text-slate-900">Không thể tải dữ liệu</h4>
              <p className="mt-1 text-sm text-red-600">{listError}</p>
              <button
                type="button"
                onClick={() => void loadUsers()}
                className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
              >
                Thử lại
              </button>
            </div>
          ) : users.length === 0 ? (
            /* Empty state */
            <div className="p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h4 className="mt-3 text-base font-bold text-slate-900">Không tìm thấy người dùng</h4>
              <p className="mt-1 text-sm text-slate-500">
                {activeSearch || roleFilter !== 'ALL'
                  ? 'Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Hệ thống chưa có tài khoản nào.'}
              </p>
              {(activeSearch || roleFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    handleClearSearch()
                    setRoleFilter('ALL')
                  }}
                  className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            /* Responsive Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 font-bold">Người dùng</th>
                    <th scope="col" className="px-6 py-3.5 font-bold">Số điện thoại</th>
                    <th scope="col" className="px-6 py-3.5 font-bold">Vai trò</th>
                    <th scope="col" className="px-6 py-3.5 font-bold">Ngày tạo</th>
                    <th scope="col" className="px-6 py-3.5 text-right font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isSelf = user?.id === u.id
                    const isAdmin = u.role === 'ADMIN'
                    const initials = (u.name || u.email || 'U').substring(0, 2).toUpperCase()

                    return (
                      <tr key={u.id} className="transition hover:bg-slate-50/60">
                        {/* User Identity Column */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-sm ${
                                isAdmin ? 'bg-indigo-600' : 'bg-slate-700'
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{u.name || 'Chưa đặt tên'}</span>
                                {isSelf && (
                                  <span className="rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-black text-blue-700">
                                    BẠN
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Phone Column */}
                        <td className="px-6 py-4 text-slate-600">
                          {u.phone || <span className="text-slate-400">Chưa cập nhật</span>}
                        </td>

                        {/* Role Column */}
                        <td className="px-6 py-4">
                          {isAdmin ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-black text-purple-700 ring-1 ring-inset ring-purple-600/20">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 011.385 1.156l-.8 3.996 1.488 1.488a1 1 0 01-.707 1.707H17v2a1 1 0 01-1 1h-1v1a1 1 0 11-2 0v-1H7v1a1 1 0 11-2 0v-1H4a1 1 0 01-1-1v-2h-.119a1 1 0 01-.707-1.707l1.488-1.488-.8-3.996a1 1 0 011.385-1.156l1.599.8L9 4.323V3a1 1 0 011-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              ADMIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              USER
                            </span>
                          )}
                        </td>

                        {/* Created At Column */}
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {formatDate(u.createdAt)}
                        </td>

                        {/* Actions Column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => openDeleteModal(u)}
                              title={isSelf ? 'Không thể tự xóa tài khoản của bạn' : 'Xóa tài khoản'}
                              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                                isSelf
                                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                  : 'border-slate-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700'
                              }`}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loadingList && users.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 px-6 py-4 sm:flex-row">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Tổng <strong>{totalCount}</strong> người dùng
                </span>
                <span>•</span>
                <span>
                  Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
                </span>
                <span>•</span>
                <label className="flex items-center gap-1.5">
                  <span>Mỗi trang:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value))
                      setPage(1)
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: CREATE USER                                           */}
      {/* ============================================================ */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-black text-slate-900">Thêm người dùng mới</h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="nguyenvana@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="0987654321"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="USER">USER (Khách hàng)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mật khẩu ban đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Tối thiểu 8 ký tự"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">Mật khẩu sẽ được mã hóa an toàn qua bcryptjs.</p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {createSubmitting ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT USER                                             */}
      {/* ============================================================ */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Chỉnh sửa thông tin</h3>
                <p className="text-xs text-slate-500">ID: {editingUser.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Họ và tên"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Vai trò <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.role}
                    disabled={user?.id === editingUser.id}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="USER">USER (Khách hàng)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                  </select>
                  {user?.id === editingUser.id && (
                    <p className="mt-1 text-[10px] text-amber-600 font-semibold">
                      Không thể tự thay đổi vai trò tài khoản của bạn.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mật khẩu mới (Tùy chọn)
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Để trống nếu không muốn đổi mật khẩu"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-[11px] text-slate-500">Chỉ điền nếu muốn cấp lại mật khẩu cho người dùng này (tối thiểu 8 ký tự).</p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: DELETE USER CONFIRMATION                              */}
      {/* ============================================================ */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900">Xác nhận xóa tài khoản</h3>
            <p className="mt-2 text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa người dùng{' '}
              <strong className="text-slate-900">{deletingUser.name || deletingUser.email}</strong> (
              <span className="text-slate-500">{deletingUser.email}</span>)?
            </p>
            <p className="mt-1 text-xs text-red-600 font-semibold">
              Hành động này sẽ xóa dữ liệu giỏ hàng, địa chỉ liên quan và không thể hoàn tác. Người dùng đã có đơn hàng sẽ không thể xóa.
            </p>

            {deleteError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deleteSubmitting}
                onClick={handleDeleteConfirm}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSubmitting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
