import { Request, Response, NextFunction } from 'express'
import * as service from '../services/brand.service'

export async function listBrands(req: Request, res: Response, next: NextFunction) {
  try {
    const category = (req.query.category || req.query.categorySlug || req.query.categoryId) as string | undefined
    const data = await service.getAllBrands(category)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const data = await service.getBrandById(id)
    if (!data) return res.status(404).json({ success: false, message: 'Brand not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getBrandBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params
    const data = await service.getBrandBySlug(slug)
    if (!data) return res.status(404).json({ success: false, message: 'Brand not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, description, logo } = req.body
    if (!name || !slug) return res.status(400).json({ success: false, message: 'name and slug are required' })
    const data = await service.createBrand({ name, slug, description, logo })
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateBrand(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name, slug, description, logo } = req.body
    const data = await service.updateBrand(id, { name, slug, description, logo })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteBrandHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await service.deleteBrand(id)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
