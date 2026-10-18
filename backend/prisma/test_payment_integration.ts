import crypto from 'crypto'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import prisma from '../src/config/prisma'
import * as vnpayService from '../src/services/vnpay.service'
import * as momoService from '../src/services/momo.service'
import * as paymentService from '../src/services/payment.service'

async function runPaymentTests() {
  console.log('===============================================================')
  console.log('       PAYMENT INTEGRATION TEST SUITE (PHASE A - BACKEND)      ')
  console.log('===============================================================\n')

  let allPassed = true
  const TEST_VNP_SECRET = 'TEST_VNPAY_SECRET_KEY_1234567890'
  const TEST_VNP_TMN = 'TEST_TMN'
  const TEST_MOMO_SECRET = 'TEST_MOMO_SECRET_KEY_1234567890'
  const TEST_MOMO_ACCESS = 'TEST_MOMO_ACCESS_KEY'
  const TEST_MOMO_PARTNER = 'MOMO_PARTNER_DEMO'

  // -------------------------------------------------------------
  // TEST GROUP 1: Missing ENV Configuration
  // -------------------------------------------------------------
  console.log('--- TEST GROUP 1: Missing ENV Configuration ---')

  // 1.1 VNPAY missing ENV
  {
    const originalTmn = process.env.VNPAY_TMN_CODE
    const originalHash = process.env.VNPAY_HASH_SECRET
    delete process.env.VNPAY_TMN_CODE
    delete process.env.VNPAY_HASH_SECRET

    let vnpError: any = null
    try {
      vnpayService.getVnpayConfig()
    } catch (err) {
      vnpError = err
    }

    const pass = vnpError?.status === 503 && vnpError?.message?.includes('missing VNPAY_TMN_CODE')
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY missing ENV throws 503 clearly: ${vnpError?.message}`)
    if (!pass) allPassed = false

    if (originalTmn) process.env.VNPAY_TMN_CODE = originalTmn
    if (originalHash) process.env.VNPAY_HASH_SECRET = originalHash
  }

  // 1.2 MoMo missing ENV
  {
    const originalPartner = process.env.MOMO_PARTNER_CODE
    const originalAccess = process.env.MOMO_ACCESS_KEY
    const originalSecret = process.env.MOMO_SECRET_KEY
    delete process.env.MOMO_PARTNER_CODE
    delete process.env.MOMO_ACCESS_KEY
    delete process.env.MOMO_SECRET_KEY

    let momoError: any = null
    try {
      momoService.getMomoConfig()
    } catch (err) {
      momoError = err
    }

    const pass = momoError?.status === 503 && momoError?.message?.includes('missing MOMO')
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo missing ENV throws 503 clearly: ${momoError?.message}`)
    if (!pass) allPassed = false

    if (originalPartner) process.env.MOMO_PARTNER_CODE = originalPartner
    if (originalAccess) process.env.MOMO_ACCESS_KEY = originalAccess
    if (originalSecret) process.env.MOMO_SECRET_KEY = originalSecret
  }

  // Temporarily configure test sandbox credentials for the test execution
  process.env.VNPAY_TMN_CODE = TEST_VNP_TMN
  process.env.VNPAY_HASH_SECRET = TEST_VNP_SECRET
  process.env.MOMO_PARTNER_CODE = TEST_MOMO_PARTNER
  process.env.MOMO_ACCESS_KEY = TEST_MOMO_ACCESS
  process.env.MOMO_SECRET_KEY = TEST_MOMO_SECRET

  // -------------------------------------------------------------
  // TEST GROUP 2: VNPAY URL Generation & Hashing
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: VNPAY URL Generation & Checksum ---')
  {
    const url = vnpayService.createVnpayPaymentUrl({
      paymentId: 'test-pay-123',
      orderCode: 'ORD-999',
      amount: 500000,
      bankCode: 'VNPAYQR',
      ipAddr: '127.0.0.1',
    })

    const parsedUrl = new URL(url)
    const hasTmn = parsedUrl.searchParams.get('vnp_TmnCode') === TEST_VNP_TMN
    const hasAmount = parsedUrl.searchParams.get('vnp_Amount') === '50000000' // amount * 100
    const hasQr = parsedUrl.searchParams.get('vnp_BankCode') === 'VNPAYQR'
    const hasSecureHash = Boolean(parsedUrl.searchParams.get('vnp_SecureHash'))

    // Verify generated hash is valid
    const queryObj = Object.fromEntries(parsedUrl.searchParams.entries())
    const hashValid = vnpayService.verifyVnpaySecureHash(queryObj, TEST_VNP_SECRET)

    const pass = hasTmn && hasAmount && hasQr && hasSecureHash && hashValid
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY URL generated correctly: amount*100=${hasAmount}, bankCode=VNPAYQR=${hasQr}, checksumVerified=${hashValid}`)
    if (!pass) allPassed = false
  }

  // -------------------------------------------------------------
  // SETUP TEST DATA IN DB (Single user & test orders for tests)
  // -------------------------------------------------------------
  let testUser = await prisma.user.findFirst({ where: { role: 'USER' } })
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: `test_payment_${Date.now()}@test.com`,
        password: 'hashed-password-123',
        name: 'Test Payment User',
      },
    })
  }

  // Helper to create test order
  async function createTestOrder(total = 500000) {
    const code = `TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    return prisma.order.create({
      data: {
        userId: testUser!.id,
        orderCode: code,
        subtotal: total,
        total,
        recipientName: 'Test Recipient',
        phone: '0901234567',
        province: 'TP.HCM',
        district: 'Quận 1',
        ward: 'Bến Nghé',
        address: '123 Test St',
        status: OrderStatus.PENDING,
      },
    })
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: VNPAY IPN Callbacks
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: VNPAY IPN Callbacks ---')

  // 3.1 Invalid Signature
  {
    const invalidQuery = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: '50000000',
      vnp_TxnRef: 'nonexistent-order',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_SecureHash: 'invalid-checksum-value',
    }
    const ipnRes = await vnpayService.processVnpayIpn(invalidQuery)
    const pass = ipnRes.RspCode === '97'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY IPN Invalid Signature -> RspCode 97: ${JSON.stringify(ipnRes)}`)
    if (!pass) allPassed = false
  }

  // 3.2 Invalid Order
  {
    const nonExistentRef = `nonexistent-pay-${Date.now()}`
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: '50000000',
      vnp_TxnRef: nonExistentRef,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    }
    // Sign query
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')

    const ipnRes = await vnpayService.processVnpayIpn(queryParams)
    const pass = ipnRes.RspCode === '01'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY IPN Invalid Order -> RspCode 01: ${JSON.stringify(ipnRes)}`)
    if (!pass) allPassed = false
  }

  // 3.3 Successful Payment (Mark PAID & sync Order CONFIRMED)
  const orderVnpay1 = await createTestOrder(250000)
  const paymentVnpay1 = await prisma.payment.create({
    data: {
      orderId: orderVnpay1.id,
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      amount: orderVnpay1.total,
    },
  })

  let vnpaySuccessQuery: Record<string, any> = {}
  {
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: String(orderVnpay1.total * 100),
      vnp_TxnRef: paymentVnpay1.id,
      vnp_TransactionNo: 'VNP_TRANS_123456',
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    }
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')
    vnpaySuccessQuery = queryParams

    const ipnRes = await vnpayService.processVnpayIpn(queryParams)
    const updatedPay = await prisma.payment.findUnique({ where: { id: paymentVnpay1.id } })
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderVnpay1.id } })

    const pass = ipnRes.RspCode === '00' && updatedPay?.status === PaymentStatus.PAID && updatedOrder?.status === OrderStatus.CONFIRMED && updatedPay?.transactionId === 'VNP_TRANS_123456'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY IPN Successful Payment -> RspCode 00, Payment=PAID, Order=CONFIRMED: ${pass}`)
    if (!pass) allPassed = false
  }

  // 3.4 Duplicate Callback (Idempotency)
  {
    const duplicateRes = await vnpayService.processVnpayIpn(vnpaySuccessQuery)
    const pass = duplicateRes.RspCode === '02'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY IPN Duplicate Callback -> RspCode 02 (Already confirmed): ${JSON.stringify(duplicateRes)}`)
    if (!pass) allPassed = false
  }

  // 3.5 Failed Payment
  const orderVnpayFail = await createTestOrder(300000)
  const paymentVnpayFail = await prisma.payment.create({
    data: {
      orderId: orderVnpayFail.id,
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      amount: orderVnpayFail.total,
    },
  })
  {
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: String(orderVnpayFail.total * 100),
      vnp_TxnRef: paymentVnpayFail.id,
      vnp_TransactionNo: 'VNP_FAIL_TRANS',
      vnp_ResponseCode: '24', // User cancelled
      vnp_TransactionStatus: '02',
    }
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')

    const ipnRes = await vnpayService.processVnpayIpn(queryParams)
    const updatedPay = await prisma.payment.findUnique({ where: { id: paymentVnpayFail.id } })
    const pass = ipnRes.RspCode === '00' && updatedPay?.status === PaymentStatus.FAILED
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY IPN Failed Payment -> Payment=FAILED: ${pass}`)
    if (!pass) allPassed = false
  }

  // -------------------------------------------------------------
  // TEST GROUP 4: MoMo IPN Callbacks
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: MoMo IPN Callbacks ---')

  // 4.1 Invalid Signature
  {
    const invalidBody = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: 'test-order',
      requestId: 'test-req',
      amount: 500000,
      orderInfo: 'test',
      orderType: 'momo_wallet',
      transId: 123456,
      resultCode: 0,
      message: 'Success',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
      signature: 'invalid_signature_hex',
    }
    let momoErr: any = null
    try {
      await momoService.processMomoIpn(invalidBody)
    } catch (err) {
      momoErr = err
    }
    const pass = momoErr?.status === 400 && momoErr?.message?.includes('Invalid MoMo signature')
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo IPN Invalid Signature -> Rejected with 400: ${momoErr?.message}`)
    if (!pass) allPassed = false
  }

  // 4.2 Invalid Order
  {
    const nonExistentOrderId = `nonexistent-momo-${Date.now()}`
    const body: Record<string, any> = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: nonExistentOrderId,
      requestId: `req-${Date.now()}`,
      amount: 500000,
      orderInfo: 'Thanh toan don hang',
      orderType: 'momo_wallet',
      transId: 987654321,
      resultCode: 0,
      message: 'Success',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    }
    body.signature = momoService.createMomoCallbackSignature(body as any, TEST_MOMO_ACCESS, TEST_MOMO_SECRET)

    let momoErr: any = null
    try {
      await momoService.processMomoIpn(body)
    } catch (err) {
      momoErr = err
    }
    const pass = momoErr?.status === 404 && momoErr?.message?.includes('not found')
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo IPN Invalid Order -> Rejected with 404: ${momoErr?.message}`)
    if (!pass) allPassed = false
  }

  // 4.3 Successful Payment (Mark PAID & sync Order CONFIRMED)
  const orderMomo1 = await createTestOrder(750000)
  const paymentMomo1 = await prisma.payment.create({
    data: {
      orderId: orderMomo1.id,
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      amount: orderMomo1.total,
    },
  })

  let momoSuccessBody: Record<string, any> = {}
  {
    const body: Record<string, any> = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: paymentMomo1.id,
      requestId: `req-${Date.now()}`,
      amount: orderMomo1.total,
      orderInfo: `Thanh toan don hang ${orderMomo1.orderCode}`,
      orderType: 'momo_wallet',
      transId: 1122334455,
      resultCode: 0,
      message: 'Thanh toán thành công.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    }
    body.signature = momoService.createMomoCallbackSignature(body as any, TEST_MOMO_ACCESS, TEST_MOMO_SECRET)
    momoSuccessBody = body

    const ipnRes = await momoService.processMomoIpn(body)
    const updatedPay = await prisma.payment.findUnique({ where: { id: paymentMomo1.id } })
    const updatedOrder = await prisma.order.findUnique({ where: { id: orderMomo1.id } })

    const pass = ipnRes.resultCode === 0 && updatedPay?.status === PaymentStatus.PAID && updatedOrder?.status === OrderStatus.CONFIRMED && updatedPay?.transactionId === '1122334455'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo IPN Successful Payment -> resultCode 0, Payment=PAID, Order=CONFIRMED: ${pass}`)
    if (!pass) allPassed = false
  }

  // 4.4 Duplicate Callback (Idempotency)
  {
    const duplicateRes = await momoService.processMomoIpn(momoSuccessBody)
    const pass = duplicateRes.resultCode === 0 && duplicateRes.message.includes('already confirmed')
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo IPN Duplicate Callback -> Idempotent success without duplicate mutation: ${JSON.stringify(duplicateRes)}`)
    if (!pass) allPassed = false
  }

  // 4.5 Failed Payment
  const orderMomoFail = await createTestOrder(400000)
  const paymentMomoFail = await prisma.payment.create({
    data: {
      orderId: orderMomoFail.id,
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      amount: orderMomoFail.total,
    },
  })
  {
    const body: Record<string, any> = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: paymentMomoFail.id,
      requestId: `req-${Date.now()}`,
      amount: orderMomoFail.total,
      orderInfo: `Thanh toan don hang ${orderMomoFail.orderCode}`,
      orderType: 'momo_wallet',
      transId: 99887766,
      resultCode: 1006, // User cancelled transaction
      message: 'Giao dịch bị từ chối bởi người dùng.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    }
    body.signature = momoService.createMomoCallbackSignature(body as any, TEST_MOMO_ACCESS, TEST_MOMO_SECRET)

    const ipnRes = await momoService.processMomoIpn(body)
    const updatedPay = await prisma.payment.findUnique({ where: { id: paymentMomoFail.id } })
    const pass = ipnRes.resultCode === 0 && updatedPay?.status === PaymentStatus.FAILED
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo IPN Failed Payment -> Payment=FAILED: ${pass}`)
    if (!pass) allPassed = false
  }

  // -------------------------------------------------------------
  // TEST GROUP 5: Return URLs Do NOT Mark PAID solely from redirect
  // -------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Return URLs Anti-Spoofing (Requirement 6) ---')
  const orderReturnTest = await createTestOrder(120000)
  const paymentReturnTest = await prisma.payment.create({
    data: {
      orderId: orderReturnTest.id,
      method: PaymentMethod.VNPAY,
      status: PaymentStatus.PENDING,
      amount: orderReturnTest.total,
    },
  })
  {
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: String(orderReturnTest.total * 100),
      vnp_TxnRef: paymentReturnTest.id,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    }
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')

    // Call verifyReturnUrl
    const returnVerification = await vnpayService.verifyVnpayReturn(queryParams)

    // Verify Payment in DB is STILL PENDING (not marked PAID just because user landed on return URL)
    const dbPay = await prisma.payment.findUnique({ where: { id: paymentReturnTest.id } })
    const pass = returnVerification.verified === true && returnVerification.isSuccess === true && dbPay?.status === PaymentStatus.PENDING
    console.log(`[${pass ? 'PASS' : 'FAIL'}] Return URL verifies signature without mutating DB status to PAID: dbStatus=${dbPay?.status}`)
    if (!pass) allPassed = false
  }

  // Clean up created test orders and payments
  await prisma.payment.deleteMany({
    where: {
      orderId: {
        in: [orderVnpay1.id, orderVnpayFail.id, orderMomo1.id, orderMomoFail.id, orderReturnTest.id],
      },
    },
  })
  await prisma.order.deleteMany({
    where: {
      id: {
        in: [orderVnpay1.id, orderVnpayFail.id, orderMomo1.id, orderMomoFail.id, orderReturnTest.id],
      },
    },
  })

  // Restore env to blank as requested
  process.env.VNPAY_TMN_CODE = ''
  process.env.VNPAY_HASH_SECRET = ''
  process.env.MOMO_PARTNER_CODE = ''
  process.env.MOMO_ACCESS_KEY = ''
  process.env.MOMO_SECRET_KEY = ''

  console.log(`\n===============================================================`)
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PAYMENT INTEGRATION TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`)
  console.log(`===============================================================`)

  await prisma.$disconnect()
}

runPaymentTests().catch((err) => {
  console.error('Test execution error:', err)
  process.exit(1)
})
