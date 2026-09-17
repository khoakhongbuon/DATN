import { Request, Response, NextFunction } from 'express'
import * as service from '../services/category.service'

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getAllCategories()
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const data = await service.getCategoryById(id)
    if (!data) return res.status(404).json({ success: false, message: 'Category not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getCategoryBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params
    const data = await service.getCategoryBySlug(slug)
    if (!data) return res.status(404).json({ success: false, message: 'Category not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, description, image, parentId } = req.body
    if (!name || !slug) return res.status(400).json({ success: false, message: 'name and slug are required' })
    const data = await service.createCategory({ name, slug, description, image, parentId })
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const { name, slug, description, image, parentId } = req.body
    const data = await service.updateCategory(id, { name, slug, description, image, parentId })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteCategoryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await service.deleteCategory(id)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
