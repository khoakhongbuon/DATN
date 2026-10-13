import { Request, Response, NextFunction } from 'express'
import * as service from '../services/user.service'

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.listUsers(req.query)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.getUserById(req.params.id)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.createUser(req.body)
    return res.status(201).json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await service.updateUser(req.params.id, req.body, req.userId)
    return res.json({ success: true, data })
  } catch (err) {
    next(err)
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteUser(req.params.id, req.userId)
    return res.json({ success: true, message: 'User deleted successfully' })
  } catch (err) {
    next(err)
  }
}
