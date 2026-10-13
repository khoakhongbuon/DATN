import { Request, Response, NextFunction } from 'express'
import * as service from '../services/cart.service'

function assertSelf(req: Request) {
  if (!req.userId) {
    throw { status: 401, message: 'Authentication required' }
  }
  if (req.userId !== req.params.userId) {
    throw { status: 403, message: 'You can only access your own cart' }
  }
}

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.getCart(req.userId!)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const { productId, quantity } = req.body
    const data = await service.addItem(req.userId!, productId, quantity)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    const data = await service.updateItem(req.userId!, req.params.itemId, req.body.quantity)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    await service.deleteItem(req.userId!, req.params.itemId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}

export async function clearItems(req: Request, res: Response, next: NextFunction) {
  try {
    assertSelf(req)
    await service.clearItems(req.userId!)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
