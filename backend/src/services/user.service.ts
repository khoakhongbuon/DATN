import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import prisma from '../config/prisma'

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

function userError(status: number, message: string): never {
  throw { status, message }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function listUsers(query?: {
  page?: string | number
  limit?: string | number
  search?: string
  role?: string
}) {
  const page = query?.page ? Math.max(1, Number(query.page)) : undefined
  const limit = query?.limit ? Math.max(1, Math.min(100, Number(query.limit))) : undefined
  const search = query?.search?.trim()
  const roleInput = query?.role?.toUpperCase()

  const where: any = {}

  if (roleInput && (roleInput === Role.USER || roleInput === Role.ADMIN)) {
    where.role = roleInput as Role
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (page && limit) {
    const skip = (page - 1) * limit
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: publicUserSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  return prisma.user.findMany({
    where,
    select: publicUserSelect,
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUserById(id: string) {
  if (!id) userError(400, 'User ID is required')

  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  })

  if (!user) userError(404, 'User not found')
  return user
}

export async function createUser(data: {
  name?: string | null
  email: string
  password: string
  phone?: string | null
  role?: string
}) {
  if (!data.email || typeof data.email !== 'string') {
    userError(400, 'Email is required')
  }

  const normalizedEmail = data.email.trim().toLowerCase()
  if (!isValidEmail(normalizedEmail)) {
    userError(400, 'A valid email is required')
  }

  if (!data.password || typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 72) {
    userError(400, 'Password must be between 8 and 72 characters')
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    userError(409, 'Email already registered')
  }

  let role: Role = Role.USER
  if (data.role) {
    const upperRole = String(data.role).toUpperCase()
    if (upperRole === Role.ADMIN) role = Role.ADMIN
    else if (upperRole === Role.USER) role = Role.USER
    else userError(400, 'Invalid role. Must be USER or ADMIN')
  }

  const hashedPassword = await bcrypt.hash(data.password, 12)

  return prisma.user.create({
    data: {
      name: data.name ? String(data.name).trim() : null,
      email: normalizedEmail,
      password: hashedPassword,
      phone: data.phone ? String(data.phone).trim() : null,
      role,
    },
    select: publicUserSelect,
  })
}

export async function updateUser(
  id: string,
  data: {
    name?: string | null
    email?: string
    password?: string
    phone?: string | null
    role?: string
  },
  currentAdminId?: string
) {
  if (!id) userError(400, 'User ID is required')

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) userError(404, 'User not found')

  const updateData: any = {}

  if (data.name !== undefined) {
    updateData.name = data.name ? String(data.name).trim() : null
  }

  if (data.phone !== undefined) {
    updateData.phone = data.phone ? String(data.phone).trim() : null
  }

  if (data.email !== undefined) {
    if (typeof data.email !== 'string') userError(400, 'Invalid email')
    const normalizedEmail = data.email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) userError(400, 'A valid email is required')

    if (normalizedEmail !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (duplicate) userError(409, 'Email already in use')
      updateData.email = normalizedEmail
    }
  }

  if (data.password !== undefined) {
    if (typeof data.password !== 'string' || data.password.length < 8 || data.password.length > 72) {
      userError(400, 'Password must be between 8 and 72 characters')
    }
    updateData.password = await bcrypt.hash(data.password, 12)
  }

  if (data.role !== undefined) {
    const upperRole = String(data.role).toUpperCase()
    if (upperRole !== Role.USER && upperRole !== Role.ADMIN) {
      userError(400, 'Invalid role. Must be USER or ADMIN')
    }

    if (currentAdminId && currentAdminId === id && upperRole !== Role.ADMIN) {
      userError(400, 'Cannot remove admin privileges from your own account')
    }

    updateData.role = upperRole as Role
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: publicUserSelect,
  })
}

export async function deleteUser(id: string, currentAdminId?: string) {
  if (!id) userError(400, 'User ID is required')

  if (currentAdminId && currentAdminId === id) {
    userError(400, 'Cannot delete your own account')
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) userError(404, 'User not found')

  const orderCount = await prisma.order.count({ where: { userId: id } })
  if (orderCount > 0) {
    userError(409, 'Cannot delete user with existing orders')
  }

  await prisma.$transaction(async (tx) => {
    const carts = await tx.cart.findMany({ where: { userId: id }, select: { id: true } })
    if (carts.length > 0) {
      await tx.cartItem.deleteMany({ where: { cartId: { in: carts.map((c) => c.id) } } })
      await tx.cart.deleteMany({ where: { userId: id } })
    }

    await tx.address.deleteMany({ where: { userId: id } })
    await tx.review.deleteMany({ where: { userId: id } })
    await tx.pCBuild.deleteMany({ where: { userId: id } })
    await tx.user.delete({ where: { id } })
  })

  return true
}
