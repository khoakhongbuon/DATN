import { Router } from 'express'
import * as controller from '../controllers/product-image.controller'

const router = Router({ mergeParams: true })

router.get('/', controller.listImages)
router.post('/', controller.createImage)
router.get('/:imageId', controller.getImage)
router.put('/:imageId', controller.updateImage)
router.delete('/:imageId', controller.deleteImage)

export default router
