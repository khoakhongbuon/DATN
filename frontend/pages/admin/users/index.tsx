import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { AdminLayout } from '../../../components/admin/AdminLayout'
import { useAuth } from '../../../lib/auth'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, loading, authenticated } = useAuth()

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace(`/login?returnUrl=${encodeURIComponent(router.asPath)}`)
    }
  }, [authenticated, loading, router])

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

  if (user?.role !== 'ADMIN') {
    return (
      <AdminLayout title="Không có quyền" subtitle="Tài khoản hiện tại không có quyền quản trị.">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
          <p className="text-lg font-black">403 — Không có quyền truy cập</p>
          <p className="mt-2 text-sm">Hãy đăng nhập bằng tài khoản admin để xem quản lý người dùng.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Người dùng" subtitle="Quản lý người dùng chưa được backend hỗ trợ.">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Không hỗ trợ</p>
        <h3 className="mt-3 text-2xl font-black text-slate-900">Backend hiện chưa cung cấp API quản lý người dùng</h3>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Không có endpoint quản trị người dùng nào được xác định trong backend hiện tại, nên phần này không triển khai CRUD giả lập.
          Tài khoản người dùng đang được xử lý bởi các API auth và route hiện có, không có API /api/users để tạo, sửa, xóa hoặc liệt kê toàn bộ người dùng cho admin.
        </p>
      </div>
    </AdminLayout>
  )
}
