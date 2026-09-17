import { Request, Response, NextFunction } from 'express'
import * as service from '../services/product-image.service'

export async function listImages(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const data = await service.getImages(productId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, imageId } = req.params
    const data = await service.getImage(productId, imageId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const { url, alt, sortOrder } = req.body
    const data = await service.createImage(productId, { url, alt, sortOrder })
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, imageId } = req.params
    const { url, alt, sortOrder } = req.body
    const data = await service.updateImage(productId, imageId, { url, alt, sortOrder })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteImage(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, imageId } = req.params
    await service.deleteImage(productId, imageId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
