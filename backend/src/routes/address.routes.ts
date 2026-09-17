import { Router } from 'express'
import * as controller from '../controllers/address.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.get('/', controller.listAddresses)
router.post('/', controller.createAddress)
router.get('/:addressId', controller.getAddress)
router.put('/:addressId', controller.updateAddress)
router.delete('/:addressId', controller.deleteAddress)

export default router
