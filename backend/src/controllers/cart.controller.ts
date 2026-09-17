import { Request, Response, NextFunction } from 'express'
import * as service from '../services/cart.service'

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getCart(req.params.userId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, quantity } = req.body
    const data = await service.addItem(req.params.userId, productId, quantity)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.updateItem(req.params.userId, req.params.itemId, req.body.quantity)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteItem(req.params.userId, req.params.itemId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}

export async function clearItems(req: Request, res: Response, next: NextFunction) {
  try {
    await service.clearItems(req.params.userId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
