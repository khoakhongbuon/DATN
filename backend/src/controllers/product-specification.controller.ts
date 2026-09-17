import { Request, Response, NextFunction } from 'express'
import * as service from '../services/product-specification.service'

export async function listSpecifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const data = await service.listSpecifications(productId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getSpecification(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, specificationId } = req.params
    const data = await service.getSpecification(productId, specificationId)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createSpecification(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId } = req.params
    const body = req.body
    const data = await service.createSpecification(productId, body)
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateSpecification(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, specificationId } = req.params
    const body = req.body
    const data = await service.updateSpecification(productId, specificationId, body)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteSpecification(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, specificationId } = req.params
    await service.deleteSpecification(productId, specificationId)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
