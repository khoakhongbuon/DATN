import { Request, Response, NextFunction } from 'express'
import * as authService from '../services/auth.service'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization')
    if (!header || !header.startsWith('Bearer ')) {
      throw { status: 401, message: 'Authentication required' }
    }

    const token = header.slice(7).trim()
    if (!token) throw { status: 401, message: 'Authentication required' }

    req.userId = authService.verifyToken(token)
    next()
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      return next({ status: 401, message: 'Token expired' })
    }
    if (err instanceof Error && err.name === 'JsonWebTokenError') {
      return next({ status: 401, message: 'Invalid token' })
    }
    return next(err)
  }
}
