import type { Request, Response } from 'express'

export const AUTH_COOKIE_NAME = 'pc_store_session'

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }
}

export function readAuthCookie(req: Request) {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return undefined

  const prefix = `${AUTH_COOKIE_NAME}=`
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length)

  return value || undefined
}

export function setAuthCookie(res: Response, secret: string, expiresAt: Date) {
  res.cookie(AUTH_COOKIE_NAME, secret, { ...cookieOptions(), expires: expiresAt })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions())
}
