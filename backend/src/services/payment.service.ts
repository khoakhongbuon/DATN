import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import prisma from '../config/prisma'
import * as vnpayService from './vnpay.service'
import * as momoService from './momo.service'

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

export type CreatePaymentOptions = {
  bankCode?: string
  ipAddr?: string
}

export async function createPayment(
  userId: string,
  orderId: unknown,
  method: unknown,
  options?: CreatePaymentOptions
) {
  validateOrderId(orderId)
  const paymentMethod = parsePaymentMethod(method)

  const { payment, orderCode } = await prisma.$transaction(async (transaction) => {
    const order = await transaction.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, total: true, status: true, orderCode: true },
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

    const created = await transaction.payment.create({
      data: {
        order: { connect: { id: order.id } },
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        amount: order.total,
      },
      select: paymentSelect,
    })

    return { payment: created, orderCode: order.orderCode }
  })

  // If VNPAY, generate payment URL (including VNPAYQR support)
  if (paymentMethod === PaymentMethod.VNPAY) {
    const paymentUrl = vnpayService.createVnpayPaymentUrl({
      paymentId: payment.id,
      orderCode,
      amount: payment.amount,
      bankCode: options?.bankCode || 'VNPAYQR',
      ipAddr: options?.ipAddr,
    })
    return { ...payment, paymentUrl }
  }

  // If MoMo, call sandbox create payment
  if (paymentMethod === PaymentMethod.MOMO) {
    const momoResult = await momoService.createMomoPayment({
      paymentId: payment.id,
      orderCode,
      amount: payment.amount,
    })
    return {
      ...payment,
      payUrl: momoResult.payUrl,
      qrCodeUrl: momoResult.qrCodeUrl,
      deeplink: momoResult.deeplink,
    }
  }

  return payment
}

export async function getPayment(userId: string, orderId: unknown, role?: string) {
  validateOrderId(orderId)
  const where = role === 'ADMIN' ? { orderId } : { orderId, order: { userId } }
  const payment = await prisma.payment.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })
  if (!payment) paymentError(404, 'Payment not found')
  return payment
}

export async function cancelPayment(userId: string, orderId: unknown, role?: string) {
  validateOrderId(orderId)

  return prisma.$transaction(async (transaction) => {
    const where = role === 'ADMIN' ? { orderId } : { orderId, order: { userId } }
    const payment = await transaction.payment.findFirst({
      where,
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

export async function getVnpayUrl(
  userId: string,
  orderId: unknown,
  options?: { bankCode?: string; ipAddr?: string }
) {
  validateOrderId(orderId)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, orderCode: true, total: true, status: true },
  })
  if (!order) paymentError(404, 'Order not found')
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
    paymentError(409, 'Order cannot be paid in its current status')
  }

  let payment = await prisma.payment.findFirst({
    where: { orderId: order.id, method: PaymentMethod.VNPAY },
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })

  if (!payment) {
    // If no payment exists yet, create one
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: PaymentMethod.VNPAY,
        status: PaymentStatus.PENDING,
        amount: order.total,
      },
      select: paymentSelect,
    })
  } else if (payment.status === PaymentStatus.PAID) {
    paymentError(409, 'Payment already paid for this order')
  }

  const paymentUrl = vnpayService.createVnpayPaymentUrl({
    paymentId: payment.id,
    orderCode: order.orderCode,
    amount: payment.amount,
    bankCode: options?.bankCode || 'VNPAYQR',
    ipAddr: options?.ipAddr,
  })

  return { ...payment, paymentUrl }
}

export async function getMomoUrl(userId: string, orderId: unknown) {
  validateOrderId(orderId)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { id: true, orderCode: true, total: true, status: true },
  })
  if (!order) paymentError(404, 'Order not found')
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.CONFIRMED) {
    paymentError(409, 'Order cannot be paid in its current status')
  }

  let payment = await prisma.payment.findFirst({
    where: { orderId: order.id, method: PaymentMethod.MOMO },
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })

  if (!payment) {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: PaymentMethod.MOMO,
        status: PaymentStatus.PENDING,
        amount: order.total,
      },
      select: paymentSelect,
    })
  } else if (payment.status === PaymentStatus.PAID) {
    paymentError(409, 'Payment already paid for this order')
  }

  const momoResult = await momoService.createMomoPayment({
    paymentId: payment.id,
    orderCode: order.orderCode,
    amount: payment.amount,
  })

  return {
    ...payment,
    payUrl: momoResult.payUrl,
    qrCodeUrl: momoResult.qrCodeUrl,
    deeplink: momoResult.deeplink,
  }
}

// Webhook delegates
export const processVnpayIpn = vnpayService.processVnpayIpn
export const verifyVnpayReturn = vnpayService.verifyVnpayReturn
export const processMomoIpn = momoService.processMomoIpn
export const verifyMomoReturn = momoService.verifyMomoReturn
