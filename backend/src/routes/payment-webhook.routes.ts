import { Router } from 'express'
import * as controller from '../controllers/payment-webhook.controller'

const router = Router()

// Public gateway webhook routes (No JWT authentication required)
router.get('/vnpay/ipn', controller.handleVnpayIpn)
router.get('/vnpay/return', controller.handleVnpayReturn)
router.post('/momo/ipn', controller.handleMomoIpn)
router.get('/momo/return', controller.handleMomoReturn)

export default router
