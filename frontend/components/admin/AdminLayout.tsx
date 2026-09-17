import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, type ReactNode } from 'react'
import { useAuth } from '../../lib/auth'

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Sản phẩm', href: '/admin/products' },
  { label: 'Danh mục', href: '/admin/categories' },
  { label: 'Thương hiệu', href: '/admin/brands' },
  { label: 'Đơn hàng', href: '/admin/orders' },
  { label: 'Người dùng', href: '/admin/users' },
]

export function AdminLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-950 text-slate-200 xl:flex xl:flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">TK</div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin</p>
                <h1 className="text-lg font-black text-white">TK Admin</h1>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navItems.map((item) => {
              const active = router.pathname === item.href || (item.href !== '/admin' && router.pathname.startsWith(item.href))
              return (
                <Link key={item.label} href={item.href} className={`flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-slate-800 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Tài khoản</p>
            <div className="mt-3 rounded-xl bg-slate-900 p-3">
              <p className="truncate text-sm font-bold text-white">{user?.name || 'Admin'}</p>
              <p className="truncate text-xs text-slate-400">{user?.email || ''}</p>
            </div>
            <button type="button" onClick={() => logout()} className="mt-3 w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 transition hover:border-red-400 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 text-slate-700 xl:hidden" aria-label="Mở menu admin">
                  ☰
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">TK Admin</p>
                  <h2 className="text-xl font-black text-slate-900">{title}</h2>
                </div>
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                <div className="rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">{user?.role || 'ADMIN'}</div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{user?.name || 'Admin'}</p>
                  <p className="text-xs text-slate-500">{user?.email || ''}</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {subtitle ? <p className="mb-5 text-sm text-slate-500">{subtitle}</p> : null}
            {children}
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-900/50 xl:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-[82%] max-w-xs bg-slate-950 p-4 text-slate-200" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">TK</div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Admin</p>
                  <h3 className="font-black text-white">TK Admin</h3>
                </div>
              </div>
              <button type="button" onClick={() => setMobileOpen(false)} className="text-lg text-slate-300">✕</button>
            </div>
            <nav className="mt-5 space-y-2">
              {navItems.map((item) => (
                <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={`block rounded-xl px-4 py-3 text-sm font-semibold ${router.pathname === item.href ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <button type="button" onClick={() => { logout(); setMobileOpen(false) }} className="mt-6 w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-bold text-slate-200 hover:border-red-400 hover:text-red-300">
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
