import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import prisma from '../config/prisma'

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

function authError(status: number, message: string): never {
  throw { status, message }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  return secret
}

function validateEmail(email: unknown): asserts email is string {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authError(400, 'A valid email is required')
  }
}

function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    authError(400, 'Password must be between 8 and 72 characters')
  }
}

function signToken(userId: string) {
  return jwt.sign({ userId }, getJwtSecret(), { expiresIn: '1h' })
}

export async function register(name: unknown, email: unknown, password: unknown) {
  if (typeof name !== 'string' || name.trim() === '') authError(400, 'Name is required')
  validateEmail(email)
  validatePassword(password)

  const normalizedEmail = email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) authError(409, 'Email already registered')

  const hashedPassword = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: Role.USER,
    },
    select: publicUserSelect,
  })

  return { user, token: signToken(user.id) }
}

export async function login(email: unknown, password: unknown) {
  validateEmail(email)
  if (typeof password !== 'string' || password.length === 0) authError(400, 'Password is required')

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  const passwordMatches = user ? await bcrypt.compare(password, user.password) : false
  if (!user || !passwordMatches) authError(401, 'Invalid email or password')

  const { password: _password, ...publicUser } = user
  return { user: publicUser, token: signToken(user.id) }
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect })
  if (!user) authError(401, 'Authentication required')
  return user
}

export function verifyToken(token: string) {
  const payload = jwt.verify(token, getJwtSecret())
  if (typeof payload !== 'object' || typeof payload.userId !== 'string') {
    authError(401, 'Invalid token')
  }
  return payload.userId
}
