import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as controller from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()
const authLimit = (max: number) => rateLimit({
  windowMs: 15 * 60 * 1000,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
})

router.post('/register', authLimit(5), controller.register)
router.post('/login', authLimit(10), controller.login)
router.post('/google', authLimit(10), controller.googleLogin)
router.post('/google/link', authenticate, controller.linkGoogle)
router.get('/me', authenticate, controller.me)
router.post('/logout', controller.logout)

export default router
