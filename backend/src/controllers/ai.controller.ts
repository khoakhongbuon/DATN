import { Request, Response, NextFunction } from 'express'
import * as service from '../services/ai.service'

const MAX_MESSAGE_LENGTH = 2000

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { message } = req.body as { message?: unknown }
    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'message is required' })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` })
    }

    const result = await service.chat(message.trim())
    return res.json({
      success: true,
      message: result.message,
      products: result.products,
    })
  } catch (error) {
    return next(error)
  }
}
