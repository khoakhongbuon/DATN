import { Router } from 'express'
import * as controller from '../controllers/product-specification.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })

// Public read endpoints
router.get('/', controller.listSpecifications)
router.get('/:specificationId', controller.getSpecification)

// Admin-only mutation endpoints
router.post('/', authenticate, requireAdmin, controller.createSpecification)
router.put('/:specificationId', authenticate, requireAdmin, controller.updateSpecification)
router.delete('/:specificationId', authenticate, requireAdmin, controller.deleteSpecification)

export default router
