import { Router } from 'express'
import * as controller from '../controllers/product.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router()

// Public read endpoints
router.get('/', controller.listProducts)
router.get('/slug/:slug', controller.getProductBySlug)
router.get('/:id', controller.getProduct)

// Admin-only mutation endpoints
router.post('/', authenticate, requireAdmin, controller.createProduct)
router.put('/:id', authenticate, requireAdmin, controller.updateProduct)
router.delete('/:id', authenticate, requireAdmin, controller.deleteProductHandler)

export default router
