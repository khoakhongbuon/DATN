import { Request, Response, NextFunction } from 'express'
import * as service from '../services/order.service'

function requireUserId(req: Request) {
  if (!req.userId) throw { status: 401, message: 'Authentication required' }
  return req.userId
}

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createOrder(requireUserId(req), req.body.addressId)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listOrders(requireUserId(req), req.userRole)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getOrder(requireUserId(req), req.params.id, req.userRole)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.cancelOrder(requireUserId(req), req.params.id, req.userRole)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}
