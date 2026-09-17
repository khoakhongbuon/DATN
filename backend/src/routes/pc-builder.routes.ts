import { Router } from 'express'
import * as controller from '../controllers/pc-builder.controller'

const router = Router()

router.post('/check', controller.checkCompatibility)

export default router
