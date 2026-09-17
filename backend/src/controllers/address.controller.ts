import { Request, Response, NextFunction } from 'express'
import * as service from '../services/address.service'

function assertSelf(req: Request) {
  if (!req.userId || req.userId !== req.params.userId) {
    throw { status: 403, message: 'You can only access your own addresses' }
  }
}

export async function listAddresses(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.listAddresses(req.params.userId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getAddress(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.getAddress(req.params.userId, req.params.addressId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createAddress(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.createAddress(req.params.userId, req.body)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateAddress(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.updateAddress(req.params.userId, req.params.addressId, req.body)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteAddress(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    await service.deleteAddress(req.params.userId, req.params.addressId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
