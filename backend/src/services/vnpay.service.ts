import crypto from 'crypto'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import prisma from '../config/prisma'

export type VnpayConfig = {
  tmnCode: string
  hashSecret: string
  vnpUrl: string
  returnUrl: string
  ipnUrl: string
}

export function isVnpayConfigured(): boolean {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim()
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim()
  return Boolean(tmnCode && hashSecret)
}

export function getVnpayConfig(): VnpayConfig {
  const tmnCode = process.env.VNPAY_TMN_CODE?.trim()
  const hashSecret = process.env.VNPAY_HASH_SECRET?.trim()

  if (!tmnCode || !hashSecret) {
    throw {
      status: 503,
      message: 'VNPAY payment gateway is not configured (missing VNPAY_TMN_CODE or VNPAY_HASH_SECRET)',
    }
  }

  return {
    tmnCode,
    hashSecret,
    vnpUrl: process.env.VNPAY_URL?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL?.trim() || 'http://localhost:3000/orders/payment/vnpay-return',
    ipnUrl: process.env.VNPAY_IPN_URL?.trim() || 'http://localhost:4000/api/payments/vnpay/ipn',
  }
}

export function sortObject(obj: Record<string, any>): Record<string, string> {
  const sorted: Record<string, string> = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    const val = obj[key]
    if (val !== '' && val !== undefined && val !== null) {
      sorted[key] = encodeURIComponent(String(val)).replace(/%20/g, '+')
    }
  }
  return sorted
}

export function formatDateVnpay(date: Date): string {
  // Format as YYYYMMDDHHmmss in Vietnam timezone (UTC+7)
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const vnDate = new Date(utc + 7 * 3600000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${vnDate.getFullYear()}${pad(vnDate.getMonth() + 1)}${pad(vnDate.getDate())}${pad(vnDate.getHours())}${pad(vnDate.getMinutes())}${pad(vnDate.getSeconds())}`
}

export function createVnpayPaymentUrl(params: {
  paymentId: string
  orderCode: string
  amount: number
  ipAddr?: string
  bankCode?: string
  returnUrl?: string
}): string {
  const config = getVnpayConfig()
  const now = new Date()
  const createDate = formatDateVnpay(now)

  // VNPAY requires amount * 100 (in Vietnamese dong cents)
  const vnpAmount = Math.round(params.amount * 100)

  const vnpParams: Record<string, any> = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: config.tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: params.paymentId,
    vnp_OrderInfo: `Thanh toan don hang ${params.orderCode}`,
    vnp_OrderType: 'other',
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: params.returnUrl || config.returnUrl,
    vnp_IpAddr: params.ipAddr || '127.0.0.1',
    vnp_CreateDate: createDate,
  }

  // Support VNPAYQR or specific bankCode if requested
  if (params.bankCode && params.bankCode.trim() !== '') {
    vnpParams.vnp_BankCode = params.bankCode.trim()
  }

  const sorted = sortObject(vnpParams)
  const signData = Object.keys(sorted)
    .map((key) => `${key}=${sorted[key]}`)
    .join('&')

  const hmac = crypto.createHmac('sha512', config.hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return `${config.vnpUrl}?${signData}&vnp_SecureHash=${signed}`
}

export function verifyVnpaySecureHash(query: Record<string, any>, hashSecret: string): boolean {
  const secureHash = query.vnp_SecureHash
  if (!secureHash || typeof secureHash !== 'string') return false

  const cleanQuery: Record<string, any> = {}
  for (const [key, value] of Object.entries(query)) {
    if (
      key !== 'vnp_SecureHash' &&
      key !== 'vnp_SecureHashType' &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      cleanQuery[key] = value
    }
  }

  const sorted = sortObject(cleanQuery)
  const signData = Object.keys(sorted)
    .map((key) => `${key}=${sorted[key]}`)
    .join('&')

  const hmac = crypto.createHmac('sha512', hashSecret)
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

  return signed.toLowerCase() === secureHash.trim().toLowerCase()
}

export type VnpayIpnResponse = {
  RspCode: string
  Message: string
}

export async function processVnpayIpn(query: Record<string, any>): Promise<VnpayIpnResponse> {
  const config = getVnpayConfig()

  // 1. Verify checksum
  const isValidSignature = verifyVnpaySecureHash(query, config.hashSecret)
  if (!isValidSignature) {
    return { RspCode: '97', Message: 'Checksum failed' }
  }

  const txnRef = String(query.vnp_TxnRef || '')
  if (!txnRef) {
    return { RspCode: '01', Message: 'Order not found' }
  }

  // 2. Find payment & order by paymentId or order.orderCode
  let payment = await prisma.payment.findUnique({
    where: { id: txnRef },
    include: { order: true },
  })

  if (!payment) {
    payment = await prisma.payment.findFirst({
      where: { order: { orderCode: txnRef } },
      include: { order: true },
    })
  }

  if (!payment) {
    return { RspCode: '01', Message: 'Order not found' }
  }

  // 3. Verify amount (VNPAY query has amount * 100)
  const incomingAmount = Number(query.vnp_Amount)
  const expectedVnpAmount = payment.amount * 100
  if (incomingAmount !== expectedVnpAmount) {
    return { RspCode: '04', Message: 'Invalid amount' }
  }

  // 4. Idempotency: if already confirmed, do not update again
  if (payment.status === PaymentStatus.PAID) {
    return { RspCode: '02', Message: 'Order already confirmed' }
  }

  const responseCode = String(query.vnp_ResponseCode || '')
  const transactionStatus = String(query.vnp_TransactionStatus || '')
  const transactionNo = String(query.vnp_TransactionNo || '')

  // 5. Update DB based on transaction status
  if (responseCode === '00' && transactionStatus === '00') {
    // Transaction success
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment!.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          transactionId: transactionNo || payment!.transactionId,
        },
      })

      // Synchronize Order status
      if (payment!.order && payment!.order.status === OrderStatus.PENDING) {
        await tx.order.update({
          where: { id: payment!.orderId },
          data: { status: OrderStatus.CONFIRMED },
        })
      }
    })

    return { RspCode: '00', Message: 'Confirm Success' }
  }

  // Failed transaction
  if (payment.status === PaymentStatus.PENDING) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.FAILED,
        transactionId: transactionNo || payment.transactionId,
      },
    })
  }

  return { RspCode: '00', Message: 'Confirm Success' }
}

export async function verifyVnpayReturn(query: Record<string, any>) {
  const config = getVnpayConfig()
  const isValidSignature = verifyVnpaySecureHash(query, config.hashSecret)

  const txnRef = String(query.vnp_TxnRef || '')
  let payment = null
  if (txnRef) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [{ id: txnRef }, { order: { orderCode: txnRef } }],
      },
      include: { order: { select: { id: true, orderCode: true, status: true, total: true } } },
    })
  }

  const responseCode = String(query.vnp_ResponseCode || '')
  const transactionStatus = String(query.vnp_TransactionStatus || '')
  const isSuccess = isValidSignature && responseCode === '00' && transactionStatus === '00'

  // Requirement 6: Do NOT mark PAID based solely on frontend redirect
  return {
    verified: isValidSignature,
    isSuccess,
    responseCode,
    transactionStatus,
    paymentId: payment?.id || null,
    orderId: payment?.orderId || null,
    orderCode: payment?.order?.orderCode || null,
    paymentStatus: payment?.status || null,
    orderStatus: payment?.order?.status || null,
    message: !isValidSignature
      ? 'Chữ ký không hợp lệ'
      : isSuccess
      ? 'Giao dịch VNPAY thành công'
      : 'Giao dịch VNPAY không thành công hoặc bị hủy',
  }
}
