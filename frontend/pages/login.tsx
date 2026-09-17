import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login, authenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && authenticated) void router.replace(typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '/')
  }, [authenticated, loading, router])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) return setError('Vui lòng nhập email và mật khẩu.')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      await router.replace(typeof router.query.returnUrl === 'string' ? router.query.returnUrl : '/')
    } catch (submitError) {
      setError((submitError as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthShell title="Đăng nhập"><form onSubmit={submit} className="space-y-4"><Field label="Email" type="email" value={email} onChange={setEmail} /><Field label="Mật khẩu" type="password" value={password} onChange={setPassword} />{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<button type="submit" disabled={submitting || loading} className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button><p className="text-center text-sm text-slate-500">Chưa có tài khoản? <Link href="/register" className="font-bold text-blue-700">Đăng ký</Link></p></form></AuthShell>
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
}

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-h-[60vh] bg-[#f4f7fb] px-4 py-12"><div className="mx-auto max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Account</p><h1 className="mt-2 text-3xl font-black">{title}</h1><div className="mt-7">{children}</div></div></div>
}
