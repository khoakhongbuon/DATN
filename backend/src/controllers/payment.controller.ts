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

export function getPaymentConfig(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = service.getPaymentConfig()
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
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

export async function getBankTransferDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getBankTransferDetails(requireUserId(req), req.params.orderId, req.userRole)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function confirmManualPayment(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin privileges required' })
    }
    const data = await service.confirmManualPayment(
      req.params.orderId,
      requireUserId(req),
      req.body.transactionNote
    )
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
