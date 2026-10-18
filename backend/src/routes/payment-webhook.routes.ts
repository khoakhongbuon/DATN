import { Router } from 'express'
import * as webhookController from '../controllers/payment-webhook.controller'
import * as paymentController from '../controllers/payment.controller'

const router = Router()

// Public payment configuration & availability check (No secrets leaked)
router.get('/config', paymentController.getPaymentConfig)

// Public gateway webhook routes (No JWT authentication required)
router.get('/vnpay/ipn', webhookController.handleVnpayIpn)
router.get('/vnpay/return', webhookController.handleVnpayReturn)
router.post('/momo/ipn', webhookController.handleMomoIpn)
router.get('/momo/return', webhookController.handleMomoReturn)

export default router
