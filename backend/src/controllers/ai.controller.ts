import { Request, Response, NextFunction } from 'express'
import * as service from '../services/ai.service'

const MAX_MESSAGE_LENGTH = 2000

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, history } = req.body as { message?: unknown; history?: unknown }
    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ success: false, message: 'message is required' })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer` })
    }

    const validatedHistory = service.validateChatHistory(history)
    const result = await service.chat(message.trim(), undefined, validatedHistory)
    return res.json({
      success: true,
      message: result.message,
      products: result.products,
      ...(result.build ? { build: result.build } : {}),
    })
  } catch (error) {
    return next(error)
  }
}
