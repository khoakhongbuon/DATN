import crypto from 'crypto'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import prisma from '../config/prisma'

export type MomoConfig = {
  partnerCode: string
  accessKey: string
  secretKey: string
  endpoint: string
  returnUrl: string
  ipnUrl: string
}

export function isMomoConfigured(): boolean {
  const partnerCode = process.env.MOMO_PARTNER_CODE?.trim()
  const accessKey = process.env.MOMO_ACCESS_KEY?.trim()
  const secretKey = process.env.MOMO_SECRET_KEY?.trim()
  return Boolean(partnerCode && accessKey && secretKey)
}

export function getMomoConfig(): MomoConfig {
  const partnerCode = process.env.MOMO_PARTNER_CODE?.trim()
  const accessKey = process.env.MOMO_ACCESS_KEY?.trim()
  const secretKey = process.env.MOMO_SECRET_KEY?.trim()

  if (!partnerCode || !accessKey || !secretKey) {
    throw {
      status: 503,
      message: 'Cổng thanh toán MoMo hiện chưa được cấu hình (thiếu thông tin kết nối API MoMo). Bạn có thể chọn Chuyển khoản QR ngân hàng hoặc COD thay thế.',
    }
  }

  return {
    partnerCode,
    accessKey,
    secretKey,
    endpoint: process.env.MOMO_ENDPOINT?.trim() || 'https://test-payment.momo.vn/v2/gateway/api/create',
    returnUrl: process.env.MOMO_RETURN_URL?.trim() || 'http://localhost:3000/orders/payment/momo-return',
    ipnUrl: process.env.MOMO_IPN_URL?.trim() || 'http://localhost:4000/api/payments/momo/ipn',
  }
}

export function createMomoCreateSignature(params: {
  accessKey: string
  secretKey: string
  amount: number
  extraData: string
  ipnUrl: string
  orderId: string
  orderInfo: string
  partnerCode: string
  redirectUrl: string
  requestId: string
  requestType: string
}): string {
  const rawSignature = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`
  return crypto.createHmac('sha256', params.secretKey).update(rawSignature).digest('hex')
}

export function createMomoCallbackSignature(
  params: {
    amount: number | string
    extraData?: string
    message: string
    orderId: string
    orderInfo: string
    orderType?: string
    partnerCode: string
    payType?: string
    requestId: string
    responseTime: number | string
    resultCode: number | string
    transId?: number | string
  },
  accessKey: string,
  secretKey: string
): string {
  const extraData = params.extraData ?? ''
  const orderType = params.orderType ?? ''
  const payType = params.payType ?? ''
  const transId = params.transId ?? ''

  const rawSignature = `accessKey=${accessKey}&amount=${params.amount}&extraData=${extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${orderType}&partnerCode=${params.partnerCode}&payType=${payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${transId}`
  return crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')
}

export function verifyMomoSignature(
  data: Record<string, any>,
  accessKey: string,
  secretKey: string
): boolean {
  const signature = data.signature
  if (!signature || typeof signature !== 'string') return false

  const expectedSignature = createMomoCallbackSignature(
    {
      amount: data.amount,
      extraData: data.extraData,
      message: data.message || '',
      orderId: data.orderId,
      orderInfo: data.orderInfo || '',
      orderType: data.orderType,
      partnerCode: data.partnerCode,
      payType: data.payType,
      requestId: data.requestId,
      responseTime: data.responseTime,
      resultCode: data.resultCode,
      transId: data.transId,
    },
    accessKey,
    secretKey
  )

  return expectedSignature.toLowerCase() === signature.trim().toLowerCase()
}

export type MomoCreatePaymentResult = {
  partnerCode: string
  orderId: string
  requestId: string
  amount: number
  responseTime: number
  message: string
  resultCode: number
  payUrl?: string
  qrCodeUrl?: string
  deeplink?: string
}

export async function createMomoPayment(params: {
  paymentId: string
  orderCode: string
  amount: number
  returnUrl?: string
  ipnUrl?: string
}): Promise<MomoCreatePaymentResult> {
  const config = getMomoConfig()
  const requestId = `${params.paymentId}_${Date.now()}`
  const orderId = params.paymentId
  const orderInfo = `Thanh toan don hang ${params.orderCode}`
  const redirectUrl = params.returnUrl || config.returnUrl
  const ipnUrl = params.ipnUrl || config.ipnUrl
  const extraData = ''
  const requestType = 'captureWallet'

  const signature = createMomoCreateSignature({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    amount: params.amount,
    extraData,
    ipnUrl,
    orderId,
    orderInfo,
    partnerCode: config.partnerCode,
    redirectUrl,
    requestId,
    requestType,
  })

  const requestBody = {
    partnerCode: config.partnerCode,
    partnerName: 'TK PC Store',
    storeId: 'TK PC Store',
    requestId,
    amount: params.amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: 'vi',
    extraData,
    requestType,
    signature,
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw {
      status: 502,
      message: `MoMo gateway returned error HTTP ${response.status}: ${errorText}`,
    }
  }

  const result = (await response.json()) as MomoCreatePaymentResult
  if (result.resultCode !== 0) {
    throw {
      status: 400,
      message: result.message || `MoMo error code ${result.resultCode}`,
    }
  }

  return result
}

export async function processMomoIpn(body: Record<string, any>) {
  const config = getMomoConfig()

  // 1. Verify signature
  const isValidSignature = verifyMomoSignature(body, config.accessKey, config.secretKey)
  if (!isValidSignature) {
    throw { status: 400, message: 'Invalid MoMo signature' }
  }

  const orderId = String(body.orderId || '')
  if (!orderId) {
    throw { status: 400, message: 'Missing orderId' }
  }

  // 2. Find payment & order
  let payment = await prisma.payment.findUnique({
    where: { id: orderId },
    include: { order: true },
  })

  if (!payment) {
    payment = await prisma.payment.findFirst({
      where: { order: { orderCode: orderId } },
      include: { order: true },
    })
  }

  if (!payment) {
    throw { status: 404, message: 'Payment not found for order' }
  }

  // 3. Verify amount
  const incomingAmount = Number(body.amount)
  if (incomingAmount !== payment.amount) {
    throw { status: 400, message: 'Invalid payment amount' }
  }

  // 4. Idempotent check
  if (payment.status === PaymentStatus.PAID) {
    return {
      resultCode: 0,
      message: 'Order already confirmed',
    }
  }

  const resultCode = Number(body.resultCode)
  const transId = String(body.transId || '')

  // 5. Update DB
  if (resultCode === 0) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment!.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: transId || payment!.transactionId,
        },
      })

      if (payment!.order && payment!.order.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: payment!.orderId },
          data: { status: OrderStatus.CONFIRMED },
        })
      }
    })

    return {
      resultCode: 0,
      message: 'Confirm Success',
    }
  }

  // Payment failed
  if (payment.status === PaymentStatus.PENDING) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: transId || payment.transactionId,
      },
    })
  }

  return {
    resultCode: 0,
    message: 'Payment failed acknowledged',
  }
}

export async function verifyMomoReturn(query: Record<string, any>) {
  const config = getMomoConfig()
  const isValidSignature = verifyMomoSignature(query, config.accessKey, config.secretKey)

  const orderId = String(query.orderId || '')
  let payment = null
  if (orderId) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: orderId }, { order: { orderCode: orderId } }],
      },
      include: { order: { select: { id: true, orderCode: true, status: true, total: true } } },
    })
  }

  const resultCode = Number(query.resultCode)
  const isSuccess = isValidSignature && resultCode === 0

  // Requirement 6: Do NOT mark PAID based solely on frontend redirect
  return {
    verified: isValidSignature,
    isSuccess,
    resultCode,
    paymentId: payment?.id || null,
    orderId: payment?.orderId || null,
    orderCode: payment?.order?.orderCode || null,
    paymentStatus: payment?.status || null,
    orderStatus: payment?.order?.status || null,
    message: !isValidSignature
      ? 'Chữ ký MoMo không hợp lệ'
      : isSuccess
      ? 'Giao dịch MoMo thành công'
      : 'Giao dịch MoMo không thành công hoặc bị hủy',
  }
}
