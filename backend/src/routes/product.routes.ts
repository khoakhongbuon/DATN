import { Router } from 'express'
import * as controller from '../controllers/product.controller'

const router = Router()

router.get('/', controller.listProducts)
router.get('/slug/:slug', controller.getProductBySlug)
router.get('/:id', controller.getProduct)
router.post('/', controller.createProduct)
router.put('/:id', controller.updateProduct)
router.delete('/:id', controller.deleteProductHandler)

export default router
