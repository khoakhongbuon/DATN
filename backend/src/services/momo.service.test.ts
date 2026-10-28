import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { afterEach, beforeEach, test } from 'node:test'
import { PaymentStatus, OrderStatus } from '@prisma/client'
import {
  createMomoCreateSignature,
  createMomoCallbackSignature,
  verifyMomoSignature,
  getMomoConfig,
  createMomoPayment,
  processMomoIpn,
  verifyMomoReturn,
  type MomoFetchFn,
} from './momo.service'

const originalPartnerCode = process.env.MOMO_PARTNER_CODE
const originalAccessKey = process.env.MOMO_ACCESS_KEY
const originalSecretKey = process.env.MOMO_SECRET_KEY
const originalMomoEnv = process.env.MOMO_ENV
const originalEndpoint = process.env.MOMO_ENDPOINT
const originalReturnUrl = process.env.MOMO_RETURN_URL
const originalIpnUrl = process.env.MOMO_IPN_URL

beforeEach(() => {
  delete process.env.MOMO_PARTNER_CODE
  delete process.env.MOMO_ACCESS_KEY
  delete process.env.MOMO_SECRET_KEY
  delete process.env.MOMO_ENV
  delete process.env.MOMO_ENDPOINT
  delete process.env.MOMO_RETURN_URL
  delete process.env.MOMO_IPN_URL
})

afterEach(() => {
  if (originalPartnerCode !== undefined) process.env.MOMO_PARTNER_CODE = originalPartnerCode
  else delete process.env.MOMO_PARTNER_CODE

  if (originalAccessKey !== undefined) process.env.MOMO_ACCESS_KEY = originalAccessKey
  else delete process.env.MOMO_ACCESS_KEY

  if (originalSecretKey !== undefined) process.env.MOMO_SECRET_KEY = originalSecretKey
  else delete process.env.MOMO_SECRET_KEY

  if (originalMomoEnv !== undefined) process.env.MOMO_ENV = originalMomoEnv
  else delete process.env.MOMO_ENV

  if (originalEndpoint !== undefined) process.env.MOMO_ENDPOINT = originalEndpoint
  else delete process.env.MOMO_ENDPOINT

  if (originalReturnUrl !== undefined) process.env.MOMO_RETURN_URL = originalReturnUrl
  else delete process.env.MOMO_RETURN_URL

  if (originalIpnUrl !== undefined) process.env.MOMO_IPN_URL = originalIpnUrl
  else delete process.env.MOMO_IPN_URL
})

test('createMomoCreateSignature correctly signs payload with HMAC-SHA256', () => {
  const secretKey = 'momo-secret-test'
  const accessKey = 'momo-access-test'
  const signature = createMomoCreateSignature({
    accessKey,
    secretKey,
    amount: 100000,
    extraData: '',
    ipnUrl: 'https://example.com/ipn',
    orderId: 'pay-123',
    orderInfo: 'Thanh toan don hang ORD-123',
    partnerCode: 'MOMOPARTNER',
    redirectUrl: 'https://example.com/return',
    requestId: 'req-123',
    requestType: 'captureWallet',
  })

  const rawSignature = `accessKey=${accessKey}&amount=100000&extraData=&ipnUrl=https://example.com/ipn&orderId=pay-123&orderInfo=Thanh toan don hang ORD-123&partnerCode=MOMOPARTNER&redirectUrl=https://example.com/return&requestId=req-123&requestType=captureWallet`
  const expected = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex')

  assert.equal(signature, expected)
})

test('getMomoConfig throws friendly 503 error when keys are missing', () => {
  assert.throws(
    () => getMomoConfig(),
    (err: any) => err.status === 503 && err.message.includes('Cổng thanh toán MoMo hiện chưa được cấu hình')
  )
})

test('getMomoConfig selects sandbox endpoint when MOMO_ENV=sandbox', () => {
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = 'MOMO_ACCESS'
  process.env.MOMO_SECRET_KEY = 'MOMO_SECRET'
  process.env.MOMO_ENV = 'sandbox'

  const config = getMomoConfig()
  assert.equal(config.endpoint, 'https://test-payment.momo.vn/v2/gateway/api/create')
})

test('getMomoConfig selects production endpoint when MOMO_ENV=production', () => {
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = 'MOMO_ACCESS'
  process.env.MOMO_SECRET_KEY = 'MOMO_SECRET'
  process.env.MOMO_ENV = 'production'

  const config = getMomoConfig()
  assert.equal(config.endpoint, 'https://payment.momo.vn/v2/gateway/api/create')
})

test('createMomoPayment successfully requests payment from gateway with mock fetch', async () => {
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = 'MOMO_ACCESS'
  process.env.MOMO_SECRET_KEY = 'MOMO_SECRET'

  const mockFetch: MomoFetchFn = async (_url, init) => {
    const body = JSON.parse(init?.body as string)
    assert.equal(body.partnerCode, 'MOMO_PARTNER')
    assert.equal(body.amount, 500000)
    assert.equal(body.orderId, 'pay-test-1')
    return new Response(
      JSON.stringify({
        partnerCode: 'MOMO_PARTNER',
        orderId: 'pay-test-1',
        requestId: body.requestId,
        amount: 500000,
        responseTime: Date.now(),
        message: 'Success',
        resultCode: 0,
        payUrl: 'https://test-payment.momo.vn/v2/gateway/pay?token=xyz',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const result = await createMomoPayment(
    {
      paymentId: 'pay-test-1',
      orderCode: 'ORD-999',
      amount: 500000,
    },
    mockFetch
  )

  assert.equal(result.resultCode, 0)
  assert.ok(result.payUrl?.includes('test-payment.momo.vn'))
})

test('processMomoIpn rejects invalid signature with 400', async () => {
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = 'MOMO_ACCESS'
  process.env.MOMO_SECRET_KEY = 'MOMO_SECRET'

  await assert.rejects(
    async () => {
      await processMomoIpn({
        orderId: 'pay-1',
        amount: 100000,
        signature: 'invalid-signature-123',
      })
    },
    (err: any) => err.status === 400 && err.message.includes('Invalid MoMo signature')
  )
})

test('processMomoIpn rejects amount mismatch', async () => {
  const secretKey = 'MOMO_SECRET'
  const accessKey = 'MOMO_ACCESS'
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = accessKey
  process.env.MOMO_SECRET_KEY = secretKey

  const ipnBody = {
    partnerCode: 'MOMO_PARTNER',
    orderId: 'pay-amount-mismatch',
    requestId: 'req-1',
    amount: 200000, // Incoming 200k, but payment is 100k
    orderInfo: 'Thanh toan',
    orderType: 'momo_wallet',
    transId: 12345678,
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1600000000000,
    extraData: '',
  }

  const signature = createMomoCallbackSignature(ipnBody, accessKey, secretKey)
  const fullBody = { ...ipnBody, signature }

  const mockDb: any = {
    payment: {
      findUnique: async () => ({
        id: 'pay-amount-mismatch',
        orderId: 'ord-1',
        amount: 100000, // DB amount is 100k
        status: PaymentStatus.PENDING,
        order: { id: 'ord-1', status: OrderStatus.PENDING },
      }),
      findFirst: async () => null,
    },
  }

  await assert.rejects(
    async () => {
      await processMomoIpn(fullBody, mockDb)
    },
    (err: any) => err.status === 400 && err.message.includes('Invalid payment amount')
  )
})

test('processMomoIpn marks payment as PAID and order as CONFIRMED on resultCode=0', async () => {
  const secretKey = 'MOMO_SECRET'
  const accessKey = 'MOMO_ACCESS'
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = accessKey
  process.env.MOMO_SECRET_KEY = secretKey

  const ipnBody = {
    partnerCode: 'MOMO_PARTNER',
    orderId: 'pay-success-1',
    requestId: 'req-success-1',
    amount: 150000,
    orderInfo: 'Thanh toan don hang',
    orderType: 'momo_wallet',
    transId: 987654321,
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1600000000000,
    extraData: '',
  }

  const signature = createMomoCallbackSignature(ipnBody, accessKey, secretKey)
  const fullBody = { ...ipnBody, signature }

  let paymentUpdated: any = null
  let orderUpdated: any = null

  const mockDb: any = {
    payment: {
      findUnique: async () => ({
        id: 'pay-success-1',
        orderId: 'ord-success-1',
        amount: 150000,
        status: PaymentStatus.PENDING,
        order: { id: 'ord-success-1', status: OrderStatus.PENDING },
      }),
      findFirst: async () => null,
    },
    $transaction: async (cb: any) => {
      const tx = {
        payment: {
          update: async (args: any) => {
            paymentUpdated = args
          },
        },
        order: {
          update: async (args: any) => {
            orderUpdated = args
          },
        },
      }
      return cb(tx)
    },
  }

  const result = await processMomoIpn(fullBody, mockDb)
  assert.equal(result.resultCode, 0)
  assert.equal(result.message, 'Confirm Success')
  assert.equal(paymentUpdated.data.status, PaymentStatus.PAID)
  assert.equal(paymentUpdated.data.transactionId, '987654321')
  assert.equal(orderUpdated.data.status, OrderStatus.CONFIRMED)
})

test('processMomoIpn marks payment as FAILED on non-zero resultCode', async () => {
  const secretKey = 'MOMO_SECRET'
  const accessKey = 'MOMO_ACCESS'
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = accessKey
  process.env.MOMO_SECRET_KEY = secretKey

  const ipnBody = {
    partnerCode: 'MOMO_PARTNER',
    orderId: 'pay-failed-1',
    requestId: 'req-failed-1',
    amount: 150000,
    orderInfo: 'Thanh toan',
    orderType: 'momo_wallet',
    transId: 11111,
    resultCode: 1006, // User cancelled transaction
    message: 'User cancelled',
    payType: 'qr',
    responseTime: 1600000000000,
    extraData: '',
  }

  const signature = createMomoCallbackSignature(ipnBody, accessKey, secretKey)
  const fullBody = { ...ipnBody, signature }

  let paymentFailedArgs: any = null
  const mockDb: any = {
    payment: {
      findUnique: async () => ({
        id: 'pay-failed-1',
        orderId: 'ord-failed-1',
        amount: 150000,
        status: PaymentStatus.PENDING,
        order: { id: 'ord-failed-1', status: OrderStatus.PENDING },
      }),
      findFirst: async () => null,
      update: async (args: any) => {
        paymentFailedArgs = args
      },
    },
  }

  const result = await processMomoIpn(fullBody, mockDb)
  assert.equal(result.resultCode, 0)
  assert.equal(result.message, 'Payment failed acknowledged')
  assert.equal(paymentFailedArgs.data.status, PaymentStatus.FAILED)
})

test('processMomoIpn returns idempotent response for already PAID payment', async () => {
  const secretKey = 'MOMO_SECRET'
  const accessKey = 'MOMO_ACCESS'
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = accessKey
  process.env.MOMO_SECRET_KEY = secretKey

  const ipnBody = {
    partnerCode: 'MOMO_PARTNER',
    orderId: 'pay-already-paid',
    requestId: 'req-paid',
    amount: 150000,
    orderInfo: 'Thanh toan',
    orderType: 'momo_wallet',
    transId: 11111,
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1600000000000,
    extraData: '',
  }

  const signature = createMomoCallbackSignature(ipnBody, accessKey, secretKey)
  const fullBody = { ...ipnBody, signature }

  const mockDb: any = {
    payment: {
      findUnique: async () => ({
        id: 'pay-already-paid',
        orderId: 'ord-paid',
        amount: 150000,
        status: PaymentStatus.PAID,
        order: { id: 'ord-paid', status: OrderStatus.CONFIRMED },
      }),
      findFirst: async () => null,
    },
  }

  const result = await processMomoIpn(fullBody, mockDb)
  assert.equal(result.resultCode, 0)
  assert.equal(result.message, 'Order already confirmed')
})

test('verifyMomoReturn checks signature and does NOT mark order as PAID', async () => {
  const secretKey = 'MOMO_SECRET'
  const accessKey = 'MOMO_ACCESS'
  process.env.MOMO_PARTNER_CODE = 'MOMO_PARTNER'
  process.env.MOMO_ACCESS_KEY = accessKey
  process.env.MOMO_SECRET_KEY = secretKey

  const returnQuery = {
    partnerCode: 'MOMO_PARTNER',
    orderId: 'pay-return-test',
    requestId: 'req-return',
    amount: 150000,
    orderInfo: 'Thanh toan',
    orderType: 'momo_wallet',
    transId: 22222,
    resultCode: 0,
    message: 'Success',
    payType: 'qr',
    responseTime: 1600000000000,
    extraData: '',
  }

  const signature = createMomoCallbackSignature(returnQuery, accessKey, secretKey)
  const fullQuery = { ...returnQuery, signature }

  const mockDb: any = {
    payment: {
      findFirst: async () => ({
        id: 'pay-return-test',
        orderId: 'ord-return-test',
        status: PaymentStatus.PENDING, // Must remain PENDING until IPN arrives!
        order: { id: 'ord-return-test', orderCode: 'ORD-RET', status: OrderStatus.PENDING, total: 150000 },
      }),
    },
  }

  const result = await verifyMomoReturn(fullQuery, mockDb)
  assert.equal(result.verified, true)
  assert.equal(result.isSuccess, true)
  assert.equal(result.paymentStatus, PaymentStatus.PENDING) // Not modified
})
