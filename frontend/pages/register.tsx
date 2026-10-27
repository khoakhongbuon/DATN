import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { safeReturnUrl, useAuth } from '../lib/auth'

export default function RegisterPage() {
  const router = useRouter()
  const { register, googleLogin, authenticated, loading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const destination = safeReturnUrl(router.query.returnUrl)

  useEffect(() => {
    if (router.isReady && !loading && authenticated) void router.replace(destination)
  }, [authenticated, destination, loading, router])

  const signInWithGoogle = useCallback(async (credential: string) => {
    setError('')
    setSubmitting(true)
    try {
      await googleLogin(credential)
      await router.replace(destination)
    } catch (signInError) {
      setError((signInError as Error).message)
    } finally {
      setSubmitting(false)
    }
  }, [destination, googleLogin, router])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName && !trimmedEmail && !password) {
      setError('Vui lòng nhập đầy đủ thông tin.')
      return
    }
    if (!trimmedName) {
      setError('Vui lòng nhập họ và tên.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Email không hợp lệ.')
      return
    }
    if (password.length < 8 || password.length > 72) {
      setError('Mật khẩu phải có từ 8 đến 72 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }

    setSubmitting(true)
    try {
      await register(trimmedName, trimmedEmail, password)
      await router.replace(destination)
    } catch (submitError) {
      setError((submitError as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const loginUrl = destination !== '/' ? `/login?returnUrl=${encodeURIComponent(destination)}` : '/login'

  return (
    <AuthShell title="Đăng ký tài khoản">
      <form onSubmit={submit} className="space-y-4">
        <Field id="register-name" label="Họ và tên" type="text" autoComplete="name" value={name} onChange={setName} />
        <Field id="register-email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field id="register-password" label="Mật khẩu" type="password" autoComplete="new-password" value={password} onChange={setPassword} />
        <Field id="register-confirm-password" label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50 transition hover:bg-blue-800"
        >
          {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />Hoặc<span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleSignInButton onCredential={signInWithGoogle} disabled={submitting || loading} />
        <p className="text-center text-sm text-slate-500">
          Đã có tài khoản? <Link href={loginUrl} className="font-bold text-blue-700">Đăng nhập</Link>
        </p>
      </form>
    </AuthShell>
  )
}

function Field({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string
  label: string
  type: string
  autoComplete: string
  value: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const inputType = type === 'password' && visible ? 'text' : type

  return (
    <label htmlFor={id} className="block text-sm font-bold text-slate-700">
      {label}
      <span className="mt-2 flex rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          id={id}
          required
          type={inputType}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-xl px-4 py-3 outline-none"
        />
        {type === 'password' ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            className="px-3 text-xs font-bold text-blue-700"
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        ) : null}
      </span>
    </label>
  )
}

function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-[60vh] bg-[#f4f7fb] px-4 py-12">
      <div className="mx-auto max-w-md rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">TK Account</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <div className="mt-7">{children}</div>
      </div>
    </div>
  )
}
