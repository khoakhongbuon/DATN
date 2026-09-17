import { Request, Response, NextFunction } from 'express'
import * as service from '../services/pc-builder.service'

export async function checkCompatibility(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.checkCompatibility({ productIds: req.body?.productIds })
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}
