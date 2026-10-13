import { Router } from 'express'
import * as controller from '../controllers/category.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router()

// Public read endpoints
router.get('/', controller.listCategories)
router.get('/slug/:slug', controller.getCategoryBySlug)
router.get('/:id', controller.getCategory)

// Admin-only mutation endpoints
router.post('/', authenticate, requireAdmin, controller.createCategory)
router.put('/:id', authenticate, requireAdmin, controller.updateCategory)
router.delete('/:id', authenticate, requireAdmin, controller.deleteCategoryHandler)

export default router
