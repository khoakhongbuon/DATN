import { Router } from 'express'
import * as controller from '../controllers/payment.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.post('/', controller.createPayment)
router.get('/', controller.getPayment)
router.put('/cancel', controller.cancelPayment)
router.post('/vnpay-url', controller.getVnpayUrl)
router.post('/momo-url', controller.getMomoUrl)

export default router
