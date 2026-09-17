import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import prisma from '../config/prisma'

function paymentError(status: number, message: string): never {
  throw { status, message }
}

function validateOrderId(orderId: unknown): asserts orderId is string {
  if (typeof orderId !== 'string' || orderId.trim() === '') {
    paymentError(400, 'Order id is required')
  }
}

function parsePaymentMethod(method: unknown): PaymentMethod {
  if (typeof method !== 'string' || !Object.values(PaymentMethod).includes(method as PaymentMethod)) {
    paymentError(400, 'Invalid payment method')
  }
  return method as PaymentMethod
}

const paymentSelect = {
  id: true,
  orderId: true,
  method: true,
  status: true,
  amount: true,
  transactionId: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect

export async function createPayment(userId: string, orderId: unknown, method: unknown) {
  validateOrderId(orderId)
  const paymentMethod = parsePaymentMethod(method)

  return prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, total: true, status: true },
    })
    if (!order) paymentError(404, 'Order not found')
    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
      paymentError(409, 'Order cannot be paid in its current status')
    }

    const existingPayment = await transaction.payment.findFirst({
      where: { orderId: order.id },
      select: { id: true },
    })
    if (existingPayment) paymentError(409, 'Payment already exists for this order')

    return transaction.payment.create({
      data: {
        order: { connect: { id: order.id } },
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        amount: order.total,
      },
      select: paymentSelect,
    })
  })
}

export async function getPayment(userId: string, orderId: unknown) {
  validateOrderId(orderId)
  const payment = await prisma.payment.findFirst({
    where: { orderId, order: { userId } },
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })
  if (!payment) paymentError(404, 'Payment not found')
  return payment
}

export async function cancelPayment(userId: string, orderId: unknown) {
  validateOrderId(orderId)

  return prisma.$transaction(async (transaction) => {
    const payment = await transaction.payment.findFirst({
      where: { orderId, order: { userId } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true },
    })
    if (!payment) paymentError(404, 'Payment not found')
    if (payment.status !== PaymentStatus.PENDING) {
      paymentError(409, 'Payment cannot be cancelled in its current status')
    }

    return transaction.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED },
      select: paymentSelect,
    })
  })
}
