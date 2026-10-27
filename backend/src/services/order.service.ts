import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client'
import prisma from '../config/prisma'

function orderError(status: number, message: string): never {
  throw { status, message }
}

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function createOrderCode() {
  return `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
}

const orderDetailInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            select: { id: true, url: true, alt: true, sortOrder: true },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            take: 1,
          },
        },
      },
    },
  },
} satisfies Prisma.OrderInclude

async function getUserAddress(transaction: Prisma.TransactionClient, userId: string, addressId: unknown) {
  if (!isValidId(addressId)) orderError(400, 'addressId is required')

  const address = await transaction.address.findFirst({
    where: { id: addressId, userId },
  })
  if (!address) orderError(404, 'Address not found')
  return address
}

export async function createOrder(userId: string, addressId: unknown) {
  return prisma.$transaction(async (transaction) => {
    const address = await getUserAddress(transaction, userId, addressId)
    const cart = await transaction.cart.findFirst({
      where: { userId },
      include: { items: true },
    })
    if (!cart) orderError(400, 'Cart not found')
    if (cart.items.length === 0) orderError(400, 'Cart is empty')

    const products = await Promise.all(
      cart.items.map((item) =>
        transaction.product.findUnique({
          where: { id: item.productId },
          select: { id: true, name: true, price: true, salePrice: true, stock: true, isActive: true },
        }),
      ),
    )

    const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = []
    let subtotal = 0

    for (let index = 0; index < cart.items.length; index += 1) {
      const cartItem = cart.items[index]
      const product = products[index]
      if (!product || !product.isActive) orderError(404, 'Product not found')
      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity <= 0) {
        orderError(400, 'Cart contains an invalid quantity')
      }
      if (cartItem.quantity > product.stock) {
        orderError(409, `Insufficient stock for product ${product.name}`)
      }

      const unitPrice = product.salePrice ?? product.price
      if (!Number.isInteger(unitPrice) || unitPrice < 0) {
        orderError(400, `Invalid price for product ${product.name}`)
      }
      const itemSubtotal = unitPrice * cartItem.quantity
      subtotal += itemSubtotal
      orderItems.push({
        product: { connect: { id: product.id } },
        productName: product.name,
        price: unitPrice,
        quantity: cartItem.quantity,
        subtotal: itemSubtotal,
      })
    }

    const order = await transaction.order.create({
      data: {
        orderCode: createOrderCode(),
        user: { connect: { id: userId } },
        status: OrderStatus.PENDING,
        subtotal,
        discount: 0,
        shippingFee: 0,
        total: subtotal,
        recipientName: address.recipientName,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        address: address.detail,
        items: { create: orderItems },
      },
      include: orderDetailInclude,
    })

    for (const cartItem of cart.items) {
      const updated = await transaction.product.updateMany({
        where: { id: cartItem.productId, stock: { gte: cartItem.quantity } },
        data: { stock: { decrement: cartItem.quantity } },
      })
      if (updated.count !== 1) {
        orderError(409, 'Product stock changed; please try again')
      }
    }

    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } })
    return order
  })
}

export async function listOrders(userId: string, role?: string) {
  const where = role === 'ADMIN' ? {} : { userId }
  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderCode: true,
      status: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
      recipientName: true,
      province: true,
      district: true,
      ward: true,
    },
  })
}

export async function getOrder(userId: string, orderId: string, role?: string) {
  const where = role === 'ADMIN' ? { id: orderId } : { id: orderId, userId }
  const order = await prisma.order.findFirst({
    where,
    include: orderDetailInclude,
  })
  if (!order) orderError(404, 'Order not found')
  return order
}

export async function cancelOrder(userId: string, orderId: string, role?: string) {
  return prisma.$transaction(async (transaction) => {
    const where = role === 'ADMIN' ? { id: orderId } : { id: orderId, userId }
    const order = await transaction.order.findFirst({
      where,
      include: {
        items: true,
        payments: true,
      },
    })
    if (!order) orderError(404, 'Order not found')
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      orderError(409, 'Order cannot be cancelled in its current status')
    }

    const hasPaidPayment = order.payments.some((p) => p.status === PaymentStatus.PAID)
    if (hasPaidPayment && role !== 'ADMIN') {
      orderError(409, 'Cannot cancel a paid order without a refund process')
    }

    // Atomic update to ensure idempotent cancellation and prevent race conditions
    const updateResult = await transaction.order.updateMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
      },
      data: { status: OrderStatus.CANCELLED },
    })
    if (updateResult.count === 0) {
      orderError(409, 'Order cannot be cancelled in its current status')
    }

    for (const item of order.items) {
      await transaction.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })
    }

    await transaction.payment.updateMany({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.FAILED },
    })

    return transaction.order.findUniqueOrThrow({
      where: { id: order.id },
      include: orderDetailInclude,
    })
  })
}
