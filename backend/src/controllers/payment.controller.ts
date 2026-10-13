import { Request, Response, NextFunction } from 'express'
import * as service from '../services/payment.service'

function requireUserId(req: Request) {
  if (!req.userId) throw { status: 401, message: 'Authentication required' }
  return req.userId
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || '127.0.0.1'
}

export async function createPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createPayment(
      requireUserId(req),
      req.params.orderId,
      req.body.method,
      {
        bankCode: req.body.bankCode,
        ipAddr: getClientIp(req),
      }
    )
    return res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getPayment(requireUserId(req), req.params.orderId, req.userRole)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function cancelPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.cancelPayment(requireUserId(req), req.params.orderId, req.userRole)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getVnpayUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getVnpayUrl(requireUserId(req), req.params.orderId, {
      bankCode: req.body.bankCode,
      ipAddr: getClientIp(req),
    })
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getMomoUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getMomoUrl(requireUserId(req), req.params.orderId)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
