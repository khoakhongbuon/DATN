import Link from 'next/link'
import { useRouter } from 'next/router'
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { safeReturnUrl, useAuth } from '../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const { login, googleLogin, authenticated, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email không hợp lệ.')
      return
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.')
      return
    }

    setSubmitting(true)
    try {
      await login(email.trim(), password)
      await router.replace(destination)
    } catch (submitError) {
      const msg = (submitError as Error).message
      if (msg === 'Invalid email or password') {
        setError('Email hoặc mật khẩu không chính xác.')
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell title="Đăng nhập">
      <form onSubmit={submit} className="space-y-4">
        <Field id="login-email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field id="login-password" label="Mật khẩu" type="password" autoComplete="current-password" value={password} onChange={setPassword} />
        {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || loading}
          className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-50"
        >
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />Hoặc<span className="h-px flex-1 bg-slate-200" />
        </div>
        <GoogleSignInButton onCredential={signInWithGoogle} disabled={submitting || loading} />
        <p className="text-center text-sm text-slate-500">
          Chưa có tài khoản? <Link href={destination !== '/' ? `/register?returnUrl=${encodeURIComponent(destination)}` : '/register'} className="font-bold text-blue-700">Đăng ký</Link>
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
