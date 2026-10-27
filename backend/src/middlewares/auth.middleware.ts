import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'
import { readAuthCookie } from '../utils/auth-cookie'

type SessionAuthenticator = (secret: string) => Promise<{ userId: string; role: string }>
type AllowedOrigins = () => Set<string>

declare global {
  namespace Express {
    interface Request {
      userId?: string
      userRole?: string
    }
  }
}

function configuredOrigins() {
  const origins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000')
  }
  return new Set(origins)
}

export function createSameOriginMutationMiddleware(
  getAllowedOrigins: AllowedOrigins = configuredOrigins,
) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !readAuthCookie(req)) {
      return next()
    }

    const origin = req.get('origin')
    if (!origin) return next()

    const normalizedOrigin = origin.trim().replace(/\/+$/, '')
    if (!getAllowedOrigins().has(normalizedOrigin)) {
      return next({ status: 403, message: 'Request origin is not allowed' })
    }
    return next()
  }
}

export function createAuthenticateMiddleware(
  authenticateSession: SessionAuthenticator = authService.authenticateSession,
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const secret = readAuthCookie(req)
    if (!secret) return next({ status: 401, message: 'Authentication required' })

    try {
      const session = await authenticateSession(secret)
      req.userId = session.userId
      req.userRole = session.role
      return next()
    } catch (err) {
      return next(err)
    }
  }
}

export const authenticate = createAuthenticateMiddleware()
export const requireSameOriginMutation = createSameOriginMutationMiddleware()

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    return next({ status: 401, message: 'Authentication required' })
  }
  if (req.userRole !== 'ADMIN') {
    return next({ status: 403, message: 'Forbidden: Admin access required' })
  }
  next()
}
