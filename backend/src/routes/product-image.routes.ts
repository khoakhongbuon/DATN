import { Router } from 'express'
import * as controller from '../controllers/product-image.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })

// Public read endpoints
router.get('/', controller.listImages)
router.get('/:imageId', controller.getImage)

// Admin-only mutation endpoints
router.post('/', authenticate, requireAdmin, controller.createImage)
router.put('/:imageId', authenticate, requireAdmin, controller.updateImage)
router.delete('/:imageId', authenticate, requireAdmin, controller.deleteImage)

export default router
