import { Router } from 'express'
import * as controller from '../controllers/user.controller'
import { authenticate, requireAdmin } from '../middlewares/auth.middleware'

const router = Router()

router.use(authenticate)
router.use(requireAdmin)

router.get('/', controller.listUsers)
router.get('/:id', controller.getUser)
router.post('/', controller.createUser)
router.put('/:id', controller.updateUser)
router.delete('/:id', controller.deleteUser)

export default router
