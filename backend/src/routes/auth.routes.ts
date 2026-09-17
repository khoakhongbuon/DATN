import { Router } from 'express'
import * as controller from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

router.post('/register', controller.register)
router.post('/login', controller.login)
router.get('/me', authenticate, controller.me)

export default router
