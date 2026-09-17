import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, useState } from 'react'
import { useAuth } from '../lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!name.trim() || !email.trim() || !password || !confirmPassword) return setError('Vui lòng nhập đầy đủ thông tin.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Email không hợp lệ.')
    if (password.length < 8 || password.length > 72) return setError('Mật khẩu phải có từ 8 đến 72 ký tự.')
    if (password !== confirmPassword) return setError('Mật khẩu xác nhận không khớp.')
    setSubmitting(true)
    try {
      await register(name.trim(), email.trim(), password)
      await router.replace('/')
    } catch (submitError) {
      setError((submitError as Error).message)
    } finally {
      setSubmitting(false)
    }
  }
  return <div className="min-h-[60vh] bg-[#f4f7fb] px-4 py-12"><div className="mx-auto max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Account</p><h1 className="mt-2 text-3xl font-black">Đăng ký</h1><form onSubmit={submit} className="mt-7 space-y-4"><Field label="Họ tên" type="text" value={name} onChange={setName} /><Field label="Email" type="email" value={email} onChange={setEmail} /><Field label="Mật khẩu" type="password" value={password} onChange={setPassword} /><Field label="Xác nhận mật khẩu" type="password" value={confirmPassword} onChange={setConfirmPassword} />{error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}<button type="submit" disabled={submitting} className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50">{submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}</button><p className="text-center text-sm text-slate-500">Đã có tài khoản? <Link href="/login" className="font-bold text-blue-700">Đăng nhập</Link></p></form></div></div>
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-700">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
}
