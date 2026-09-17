import { Router } from 'express'
import * as controller from '../controllers/product-specification.controller'

const router = Router({ mergeParams: true })

router.get('/', controller.listSpecifications)
router.post('/', controller.createSpecification)
router.get('/:specificationId', controller.getSpecification)
router.put('/:specificationId', controller.updateSpecification)
router.delete('/:specificationId', controller.deleteSpecification)

export default router
