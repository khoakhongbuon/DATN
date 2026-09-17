import { Router } from 'express'
import * as controller from '../controllers/category.controller'

const router = Router()

router.get('/', controller.listCategories)
router.get('/slug/:slug', controller.getCategoryBySlug)
router.get('/:id', controller.getCategory)
router.post('/', controller.createCategory)
router.put('/:id', controller.updateCategory)
router.delete('/:id', controller.deleteCategoryHandler)

export default router
