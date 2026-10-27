import { Request, Response, NextFunction } from 'express'
import * as service from '../services/product.service'

export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      page,
      limit,
      search,
      categoryId,
      category,
      categorySlug,
      brandId,
      brand,
      brandSlug,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      allowAllCategories,
      includeInactive,
      specSocket,
      specRamType,
      specCapacity,
      specInterface,
      specFormFactor,
      specWattage,
      specResolution,
    } = req.query

    const hasBrand = Boolean(brandId || brand || brandSlug)
    const hasCategory = Boolean(categoryId || category || categorySlug)
    if (hasBrand && !hasCategory && allowAllCategories !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn danh mục trước khi lọc theo thương hiệu',
        code: 'CATEGORY_REQUIRED',
        requiresCategory: true,
      })
    }

    const opts = {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      search: search as string | undefined,
      categoryId: categoryId as string | undefined,
      categorySlug: (categorySlug || category) as string | undefined,
      brandId: brandId as string | undefined,
      brandSlug: (brandSlug || brand) as string | undefined,
      minPrice: minPrice ? parseInt(minPrice as string, 10) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice as string, 10) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: (sortOrder as 'asc' | 'desc') || undefined,
      requireCategory: allowAllCategories !== 'true',
      includeInactive: includeInactive === 'true',
      specSocket: specSocket as string | undefined,
      specRamType: specRamType as string | undefined,
      specCapacity: specCapacity as string | undefined,
      specInterface: specInterface as string | undefined,
      specFormFactor: specFormFactor as string | undefined,
      specWattage: specWattage as string | undefined,
      specResolution: specResolution as string | undefined,
    }
    const result = await service.getProducts(opts)
    return res.json({ success: true, data: result.data, pagination: result.pagination })
  } catch (err) { next(err) }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const includeInactive = req.query.includeInactive === 'true'
    const data = await service.getProductById(id, includeInactive)
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function getProductBySlug(req: Request, res: Response, next: NextFunction) {
  try {
    const { slug } = req.params
    const includeInactive = req.query.includeInactive === 'true'
    const data = await service.getProductBySlug(slug, includeInactive)
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' })
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, slug, description, price, salePrice, stock, sku, categoryId, brandId } = req.body
    if (!name || !slug || !sku || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, message: 'name, slug, sku, price and stock are required' })
    }
    if (price < 0 || (salePrice !== undefined && salePrice < 0) || stock < 0) {
      return res.status(400).json({ success: false, message: 'price, salePrice and stock must be non-negative' })
    }
    if (salePrice !== undefined && salePrice > price) {
      return res.status(400).json({ success: false, message: 'salePrice cannot be greater than price' })
    }

    const data = await service.createProduct({ name, slug, description, price: Number(price), salePrice: salePrice === undefined ? undefined : Number(salePrice), stock: Number(stock), sku, categoryId, brandId })
    return res.status(201).json({ success: true, data })
  } catch (err) { next(err) }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    const updates = req.body
    if (updates.price !== undefined && updates.price < 0) return res.status(400).json({ success: false, message: 'price must be non-negative' })
    if (updates.salePrice !== undefined && updates.salePrice < 0) return res.status(400).json({ success: false, message: 'salePrice must be non-negative' })
    if (updates.stock !== undefined && updates.stock < 0) return res.status(400).json({ success: false, message: 'stock must be non-negative' })
    if (updates.salePrice !== undefined && updates.price !== undefined && updates.salePrice > updates.price) return res.status(400).json({ success: false, message: 'salePrice cannot be greater than price' })

    const data = await service.updateProduct(id, updates)
    return res.json({ success: true, data })
  } catch (err) { next(err) }
}

export async function deleteProductHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params
    await service.deleteProduct(id)
    return res.json({ success: true, data: null })
  } catch (err) { next(err) }
}
