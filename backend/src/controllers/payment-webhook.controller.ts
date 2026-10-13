import { Request, Response, NextFunction } from 'express'
import * as vnpayService from '../services/vnpay.service'
import * as momoService from '../services/momo.service'

export async function handleVnpayIpn(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vnpayService.processVnpayIpn(req.query)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function handleVnpayReturn(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await vnpayService.verifyVnpayReturn(req.query)
    return res.json({ success: result.isSuccess, data: result })
  } catch (err) {
    next(err)
  }
}

export async function handleMomoIpn(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await momoService.processMomoIpn(req.body)
    return res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}

export async function handleMomoReturn(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await momoService.verifyMomoReturn(req.query)
    return res.json({ success: result.isSuccess, data: result })
  } catch (err) {
    next(err)
  }
}
