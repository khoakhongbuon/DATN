import { Request, Response, NextFunction } from 'express'
import * as service from '../services/payment.service'

function requireUserId(req: Request) {
  if (!req.userId) throw { status: 401, message: 'Authentication required' }
  return req.userId
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createPayment(requireUserId(req), req.params.orderId, req.body.method)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPayment(requireUserId(req), req.params.orderId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function cancelPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.cancelPayment(requireUserId(req), req.params.orderId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}
