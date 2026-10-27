import { Request, Response, NextFunction } from 'express'
import * as service from '../services/auth.service'
import { clearAuthCookie, readAuthCookie, setAuthCookie } from '../utils/auth-cookie'

type AuthControllerService = {
  register: typeof service.register
  login: typeof service.login
  googleLogin: typeof service.googleLogin
  linkGoogle: typeof service.linkGoogle
  getMe: typeof service.getMe
  revokeSession: typeof service.revokeSession
}

export function createAuthController(authService: AuthControllerService) {
  function sendSession(res: Response, data: Awaited<ReturnType<typeof authService.login>>) {
    setAuthCookie(res, data.session.secret, data.session.expiresAt)
    return { success: true, data: { user: data.user } }
  }

  async function register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.register(req.body?.name, req.body?.email, req.body?.password)
      return res.status(201).json(sendSession(res, data))
    } catch (err) { return next(err) }
  }

  async function login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.login(req.body?.email, req.body?.password)
      return res.json(sendSession(res, data))
    } catch (err) { return next(err) }
  }

  async function googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const credential = req.body?.credential
      if (typeof credential !== 'string') {
        return res.status(400).json({ success: false, message: 'A Google credential is required' })
      }
      const data = await authService.googleLogin(credential)
      return res.json(sendSession(res, data))
    } catch (err) { return next(err) }
  }

  async function linkGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }
      const credential = req.body?.credential
      if (typeof credential !== 'string') {
        return res.status(400).json({ success: false, message: 'A Google credential is required' })
      }
      const user = await authService.linkGoogle(req.userId, credential)
      return res.json({ success: true, data: { user } })
    } catch (err) { return next(err) }
  }

  async function me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' })
      }
      const data = await authService.getMe(req.userId)
      return res.json({ success: true, data })
    } catch (err) { return next(err) }
  }

  async function logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.revokeSession(readAuthCookie(req))
      clearAuthCookie(res)
      return res.json({ success: true })
    } catch (err) { return next(err) }
  }

  return { register, login, googleLogin, linkGoogle, me, logout }
}

const controller = createAuthController(service)

export const { register, login, googleLogin, linkGoogle, me, logout } = controller
