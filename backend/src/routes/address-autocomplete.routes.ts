import { Router } from 'express'
import * as controller from '../controllers/address-autocomplete.controller'

const router = Router()

router.get('/autocomplete', controller.autocomplete)
router.get('/place-details', controller.placeDetails)

export default router
