import { Router } from 'express'
import * as controller from '../controllers/brand.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router()

// Public read endpoints
router.get('/', controller.listBrands)
router.get('/slug/:slug', controller.getBrandBySlug)
router.get('/:id', controller.getBrand)

// Admin-only mutation endpoints
router.post('/', authenticate, requireAdmin, controller.createBrand)
router.put('/:id', authenticate, requireAdmin, controller.updateBrand)
router.delete('/:id', authenticate, requireAdmin, controller.deleteBrandHandler)

export default router
