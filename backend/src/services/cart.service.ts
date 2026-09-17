import prisma from '../config/prisma'
import { Prisma } from '@prisma/client'

const productSelect: Prisma.ProductSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  stock: true,
  images: {
    select: { id: true, url: true, alt: true, sortOrder: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    take: 1,
  },
}

function notFound(message: string): never {
  throw { status: 404, message }
}

function validateQuantity(quantity: unknown): asserts quantity is number {
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) {
    throw { status: 400, message: 'quantity must be an integer' }
  }
  if (quantity <= 0) {
    throw { status: 400, message: 'quantity must be greater than 0' }
  }
}

async function ensureUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) notFound('User not found')
}

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findFirst({ where: { userId } })
  return existing ?? prisma.cart.create({ data: { userId } })
}

export async function getCart(userId: string) {
  await ensureUser(userId)
  return prisma.cart.findFirst({
    where: { userId },
    include: { items: { include: { product: { select: productSelect } } } },
  })
}

export async function addItem(userId: string, productId: unknown, quantity: unknown) {
  await ensureUser(userId)
  if (typeof productId !== 'string' || productId.trim() === '') {
    throw { status: 400, message: 'productId is required' }
  }
  validateQuantity(quantity)

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true },
  })
  if (!product) notFound('Product not found')

  const cart = await getOrCreateCart(userId)
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  })
  const nextQuantity = (existing?.quantity ?? 0) + quantity
  if (nextQuantity > product.stock) {
    throw { status: 409, message: 'Requested quantity exceeds product stock' }
  }

  return prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity: nextQuantity },
    include: { product: { select: productSelect } },
  })
}

async function getOwnedItem(userId: string, itemId: string) {
  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cart: { userId } },
    include: { product: { select: { id: true, stock: true } } },
  })
  if (!item) notFound('Cart item not found')
  return item
}

export async function updateItem(userId: string, itemId: string, quantity: unknown) {
  validateQuantity(quantity)
  const item = await getOwnedItem(userId, itemId)
  if (quantity > item.product.stock) {
    throw { status: 409, message: 'Requested quantity exceeds product stock' }
  }

  return prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
    include: { product: { select: productSelect } },
  })
}

export async function deleteItem(userId: string, itemId: string) {
  await getOwnedItem(userId, itemId)
  await prisma.cartItem.delete({ where: { id: itemId } })
}

export async function clearItems(userId: string) {
  await ensureUser(userId)
  const cart = await prisma.cart.findFirst({ where: { userId }, select: { id: true } })
  if (!cart) return
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
}
