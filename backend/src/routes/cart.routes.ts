import { Router } from 'express'
import * as controller from '../controllers/cart.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', controller.getCart)
router.post('/items', controller.addItem)
router.put('/items/:itemId', controller.updateItem)
router.delete('/items/:itemId', controller.deleteItem)
router.delete('/items', controller.clearItems)

export default router
