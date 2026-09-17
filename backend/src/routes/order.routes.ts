import { Router } from 'express'
import * as controller from '../controllers/order.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)
router.post('/', controller.createOrder)
router.get('/', controller.listOrders)
router.get('/:id', controller.getOrder)
router.put('/:id/cancel', controller.cancelOrder)

export default router
