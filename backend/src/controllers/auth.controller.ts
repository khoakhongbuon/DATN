import { Request, Response, NextFunction } from 'express'
import * as service from '../services/auth.service'

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.register(req.body.name, req.body.email, req.body.password)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.login(req.body.email, req.body.password)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getMe(req.userId as string)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}
