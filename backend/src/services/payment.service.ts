import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client'
import prisma from '../config/prisma'
import * as vnpayService from './vnpay.service'
import * as momoService from './momo.service'
import * as bankTransferService from './bank-transfer.service'

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

export function getPaymentConfig() {
  const bankConfig = bankTransferService.getBankTransferConfig()
  const momoConfigured = momoService.isMomoConfigured()
  const vnpayConfigured = vnpayService.isVnpayConfigured()

  return {
    codAvailable: true,
    vnpayAvailable: vnpayConfigured,
    momoAvailable: momoConfigured,
    bankTransferAvailable: bankConfig.configured,
    bankInfo: bankConfig.configured
      ? {
          bankId: bankConfig.bankId,
          bankName: bankConfig.bankName,
          accountNumber: bankConfig.bankAccountNumber,
          accountName: bankConfig.bankAccountName,
        }
      : null,
  }
}

export async function createPayment(
  userId: string,
  orderId: unknown,
  method: unknown,
  options?: CreatePaymentOptions
) {
  validateOrderId(orderId)
  const paymentMethod = parsePaymentMethod(method)

  // Pre-validate gateway availability before creating a database payment record
  if (paymentMethod === PaymentMethod.MOMO && !momoService.isMomoConfigured()) {
    paymentError(
      503,
      'Cổng thanh toán MoMo hiện chưa được cấu hình. Bạn có thể sử dụng phương thức Chuyển khoản ngân hàng (QR) hoặc COD thay thế.'
    )
  }
  if (paymentMethod === PaymentMethod.VNPAY && !vnpayService.isVnpayConfigured()) {
    paymentError(503, 'Cổng thanh toán VNPAY hiện chưa được cấu hình trên hệ thống.')
  }
  if (paymentMethod === PaymentMethod.BANK_TRANSFER && !bankTransferService.getBankTransferConfig().configured) {
    paymentError(
      503,
      'Cổng thanh toán QR chuyển khoản ngân hàng hiện chưa được cấu hình. Vui lòng chọn phương thức thanh toán khác hoặc liên hệ bộ phận hỗ trợ.'
    )
  }

  // 1. Transaction to validate order & prevent duplicate payment record
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
      select: { id: true, method: true, status: true },
    })
    if (existingPayment) {
      paymentError(409, 'Payment already exists for this order')
    }

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

  // 2. Gateway logic
  // VNPAY
  if (paymentMethod === PaymentMethod.VNPAY) {
    if (!vnpayService.isVnpayConfigured()) {
      paymentError(503, 'Cổng thanh toán VNPAY hiện chưa được cấu hình trên hệ thống.')
    }
    const paymentUrl = vnpayService.createVnpayPaymentUrl({
      paymentId: payment.id,
      orderCode,
      amount: payment.amount,
      bankCode: options?.bankCode || 'VNPAYQR',
      ipAddr: options?.ipAddr,
    })
    return { ...payment, paymentUrl }
  }

  // MoMo
  if (paymentMethod === PaymentMethod.MOMO) {
    if (!momoService.isMomoConfigured()) {
      paymentError(
        503,
        'Cổng thanh toán MoMo hiện chưa được cấu hình. Bạn có thể sử dụng phương thức Chuyển khoản ngân hàng (QR) hoặc COD thay thế.'
      )
    }
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

  // BANK_TRANSFER (VietQR)
  if (paymentMethod === PaymentMethod.BANK_TRANSFER) {
    const vietQrData = bankTransferService.generateVietQrData({
      amount: payment.amount,
      orderCode,
    })
    if (!vietQrData) {
      paymentError(
        400,
        'Thông tin tài khoản ngân hàng nhận tiền chưa được cấu hình trên hệ thống (thiếu BANK_ID, BANK_ACCOUNT_NUMBER hoặc BANK_ACCOUNT_NAME). Vui lòng chọn COD hoặc liên hệ cửa hàng.'
      )
    }
    return {
      ...payment,
      qrCodeUrl: vietQrData.qrCodeUrl,
      bankTransfer: vietQrData,
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
    select: {
      ...paymentSelect,
      order: {
        select: { orderCode: true, total: true, status: true },
      },
    },
  })
  if (!payment) paymentError(404, 'Payment not found')

  // If BANK_TRANSFER, attach dynamic VietQR data
  if (payment.method === PaymentMethod.BANK_TRANSFER) {
    const vietQrData = bankTransferService.generateVietQrData({
      amount: payment.amount,
      orderCode: payment.order.orderCode,
    })
    return {
      ...payment,
      qrCodeUrl: vietQrData?.qrCodeUrl,
      bankTransfer: vietQrData,
    }
  }

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

  if (!vnpayService.isVnpayConfigured()) {
    paymentError(503, 'Cổng thanh toán VNPAY hiện chưa được cấu hình trên hệ thống.')
  }

  let payment = await prisma.payment.findFirst({
    where: { orderId: order.id, method: PaymentMethod.VNPAY },
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })

  if (!payment) {
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

  if (!momoService.isMomoConfigured()) {
    paymentError(
      503,
      'Cổng thanh toán MoMo hiện chưa được cấu hình. Bạn có thể sử dụng phương thức Chuyển khoản ngân hàng (QR) thay thế.'
    )
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

export async function getBankTransferDetails(userId: string, orderId: unknown, role?: string) {
  validateOrderId(orderId)
  const where = role === 'ADMIN' ? { id: orderId } : { id: orderId, userId }
  const order = await prisma.order.findFirst({
    where,
    select: { id: true, orderCode: true, total: true, status: true },
  })
  if (!order) paymentError(404, 'Order not found')

  const vietQrData = bankTransferService.generateVietQrData({
    amount: order.total,
    orderCode: order.orderCode,
  })

  if (!vietQrData) {
    paymentError(
      400,
      'Thông tin tài khoản ngân hàng nhận tiền chưa được cấu hình trên hệ thống. Vui lòng liên hệ quản trị viên.'
    )
  }

  let payment = await prisma.payment.findFirst({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
    select: paymentSelect,
  })

  // If no payment exists and order is still payable, create BANK_TRANSFER pending payment
  if (!payment && (order.status === OrderStatus.PENDING || order.status === OrderStatus.CONFIRMED)) {
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        method: PaymentMethod.BANK_TRANSFER,
        status: PaymentStatus.PENDING,
        amount: order.total,
      },
      select: paymentSelect,
    })
  }

  return {
    payment,
    bankTransfer: vietQrData,
  }
}

/**
 * Requirement 8 & 9: Manual admin confirmation of payment
 * Idempotent, prevents duplicate confirmation, sets payment to PAID & order to CONFIRMED
 */
export async function confirmManualPayment(
  orderId: unknown,
  adminUserId: string,
  transactionNote?: string
) {
  validateOrderId(orderId)

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!order) paymentError(404, 'Order not found')
    if (order.status === OrderStatus.CANCELLED) {
      paymentError(409, 'Không thể xác nhận thanh toán cho đơn hàng đã bị hủy')
    }

    let payment = order.payments[0]
    const note = transactionNote?.trim() || `MANUAL-CONFIRM-ADMIN-${adminUserId.slice(-6)}-${Date.now()}`

    if (!payment) {
      payment = await tx.payment.create({
        data: {
          orderId: order.id,
          method: PaymentMethod.BANK_TRANSFER,
          status: PaymentStatus.PAID,
          amount: order.total,
          paidAt: new Date(),
          transactionId: note,
        },
      })
    } else if (payment.status === PaymentStatus.PAID) {
      return {
        alreadyConfirmed: true,
        message: 'Thanh toán đơn hàng đã được xác nhận trước đó.',
        payment,
        order,
      }
    } else {
      payment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: payment.transactionId || note,
        },
      })
    }

    let updatedOrder = order
    if (order.status === OrderStatus.PENDING) {
      updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.CONFIRMED },
        include: { payments: true },
      })
    }

    return {
      alreadyConfirmed: false,
      message: 'Xác nhận đã nhận thanh toán thành công.',
      payment,
      order: updatedOrder,
    }
  })
}

// Webhook delegates
export const processVnpayIpn = vnpayService.processVnpayIpn
export const verifyVnpayReturn = vnpayService.verifyVnpayReturn
export const processMomoIpn = momoService.processMomoIpn
export const verifyMomoReturn = momoService.verifyMomoReturn
