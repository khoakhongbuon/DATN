import { useEffect, useRef, useState } from 'react'

type GoogleCredentialResponse = { credential?: string }
type GoogleButtonOptions = {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'rectangular' | 'pill'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number | string
  logo_alignment?: 'left' | 'center'
  locale?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select: boolean
          }): void
          renderButton(element: HTMLElement, options: GoogleButtonOptions): void
        }
      }
    }
  }
}

type GoogleSignInButtonProps = {
  mode?: 'signin' | 'link'
  disabled?: boolean
  onCredential: (credential: string) => void | Promise<void>
}

const scriptSource = 'https://accounts.google.com/gsi/client'

export function GoogleSignInButton({
  mode = 'signin',
  disabled = false,
  onCredential,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'failed'>('loading')

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
    if (!clientId) {
      setStatus('missing')
      return
    }

    let active = true
    let script: HTMLScriptElement | null = null

    const renderButton = () => {
      if (!active || !window.google || !buttonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: (response) => {
          if (response.credential) void onCredentialRef.current(response.credential)
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'medium',
        shape: 'rectangular',
        text: mode === 'link' ? 'continue_with' : 'signin_with',
        logo_alignment: 'left',
        width: 320,
        locale: 'vi',
      })
      setStatus('ready')
    }

    if (window.google) {
      renderButton()
    } else {
      script = document.querySelector<HTMLScriptElement>(`script[src="${scriptSource}"]`)
      if (!script) {
        script = document.createElement('script')
        script.src = scriptSource
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', renderButton)
      script.addEventListener('error', () => {
        if (active) setStatus('failed')
      })
    }

    return () => {
      active = false
      script?.removeEventListener('load', renderButton)
    }
  }, [mode])

  return (
    <div aria-busy={status === 'loading'} aria-disabled={disabled || status !== 'ready'}>
      {status === 'missing' ? (
        <p role="status" className="text-center text-sm text-slate-500">
          Đăng nhập Google chưa được cấu hình. Vui lòng dùng email và mật khẩu.
        </p>
      ) : status === 'failed' ? (
        <p role="status" className="text-center text-sm text-amber-700">
          Không tải được dịch vụ Google. Vui lòng thử lại hoặc dùng email và mật khẩu.
        </p>
      ) : (
        <div
          ref={buttonRef}
          className={`flex justify-center ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        />
      )}
    </div>
  )
}
