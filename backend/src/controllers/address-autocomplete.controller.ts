import { Request, Response, NextFunction } from 'express'
import * as service from '../services/address-autocomplete.service'

export async function autocomplete(req: Request, res: Response, next: NextFunction) {
  try {
    const input = typeof req.query.input === 'string' ? req.query.input : ''
    const result = await service.autocompleteAddress(input)
    return res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

export async function placeDetails(req: Request, res: Response, next: NextFunction) {
  try {
    const placeId = typeof req.query.placeId === 'string' ? req.query.placeId : ''
    if (!placeId) {
      return res.status(400).json({ success: false, message: 'placeId is required' })
    }
    const result = await service.getPlaceDetails(placeId)
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error, data: result })
    }
    return res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}
