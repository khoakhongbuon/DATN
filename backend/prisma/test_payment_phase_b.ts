import crypto from 'crypto'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import prisma from '../src/config/prisma'
import * as paymentService from '../src/services/payment.service'
import * as vnpayService from '../src/services/vnpay.service'
import * as momoService from '../src/services/momo.service'

async function runPhaseBTests() {
  console.log('===============================================================')
  console.log('   PHASE B TEST SUITE: FRONTEND/BACKEND PAYMENT INTEGRATION   ')
  console.log('===============================================================\n')

  let allPassed = true
  const TEST_VNP_SECRET = 'TEST_VNPAY_SECRET_KEY_1234567890'
  const TEST_VNP_TMN = 'TEST_TMN'
  const TEST_MOMO_SECRET = 'TEST_MOMO_SECRET_KEY_1234567890'
  const TEST_MOMO_ACCESS = 'TEST_MOMO_ACCESS_KEY'
  const TEST_MOMO_PARTNER = 'MOMO_PARTNER_DEMO'

  // Configure sandbox credentials for test
  process.env.VNPAY_TMN_CODE = TEST_VNP_TMN
  process.env.VNPAY_HASH_SECRET = TEST_VNP_SECRET
  process.env.MOMO_PARTNER_CODE = TEST_MOMO_PARTNER
  process.env.MOMO_ACCESS_KEY = TEST_MOMO_ACCESS
  process.env.MOMO_SECRET_KEY = TEST_MOMO_SECRET

  // Setup test user & orders
  let testUser = await prisma.user.findFirst({ where: { role: 'USER' } })
  if (!testUser) {
    testUser = await prisma.user.create({
      data: {
        email: `test_phase_b_${Date.now()}@test.com`,
        password: 'password123',
        name: 'Test Phase B User',
      },
    })
  }

  async function createOrder(total = 600000) {
    const code = `ORD-B-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    return prisma.order.create({
      data: {
        userId: testUser!.id,
        orderCode: code,
        subtotal: total,
        total,
        recipientName: 'Phase B Tester',
        phone: '0987654321',
        province: 'Hà Nội',
        district: 'Cầu Giấy',
        ward: 'Dịch Vọng',
        address: '99 Cầu Giấy',
        status: OrderStatus.PENDING,
      },
    })
  }

  // 1. COD payment creation
  console.log('--- 1. COD Payment Flow ---')
  const orderCod = await createOrder(300000)
  const paymentCod = await paymentService.createPayment(testUser.id, orderCod.id, 'COD')
  const passCod = paymentCod.method === 'COD' && paymentCod.status === 'PENDING' && paymentCod.amount === 300000
  console.log(`[${passCod ? 'PASS' : 'FAIL'}] COD payment created with status PENDING: ${passCod}`)
  if (!passCod) allPassed = false

  // 2. VNPAY URL creation
  console.log('\n--- 2. VNPAY URL Creation ---')
  const orderVnp = await createOrder(500000)
  const paymentVnp = await paymentService.createPayment(testUser.id, orderVnp.id, 'VNPAY', {
    bankCode: 'VNPAYQR',
    ipAddr: '127.0.0.1',
  })
  const passVnpUrl =
    paymentVnp.method === 'VNPAY' &&
    typeof (paymentVnp as any).paymentUrl === 'string' &&
    (paymentVnp as any).paymentUrl.includes('vnp_BankCode=VNPAYQR') &&
    (paymentVnp as any).paymentUrl.includes('vnp_Amount=50000000') // 500000 * 100
  console.log(`[${passVnpUrl ? 'PASS' : 'FAIL'}] VNPAY payment created with paymentUrl: ${passVnpUrl}`)
  if (!passVnpUrl) allPassed = false

  // 3. MoMo QR Response Mock Test
  console.log('\n--- 3. MoMo QR Response Generation ---')
  // Test momoService.createMomoCreateSignature
  const sig = momoService.createMomoCreateSignature({
    accessKey: TEST_MOMO_ACCESS,
    secretKey: TEST_MOMO_SECRET,
    amount: 500000,
    extraData: '',
    ipnUrl: 'http://localhost:4000/api/payments/momo/ipn',
    orderId: 'test-order-id',
    orderInfo: 'Thanh toan don hang',
    partnerCode: TEST_MOMO_PARTNER,
    redirectUrl: 'http://localhost:3000/orders/payment/momo-return',
    requestId: 'test-req-id',
    requestType: 'captureWallet',
  })
  const passMomoSig = typeof sig === 'string' && sig.length === 64
  console.log(`[${passMomoSig ? 'PASS' : 'FAIL'}] MoMo request signature generated correctly: ${passMomoSig}`)
  if (!passMomoSig) allPassed = false

  // 4. Return Success Tests
  console.log('\n--- 4. Return URL Success Handling ---')
  // 4.1 VNPAY Return Success
  {
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: String(orderVnp.total * 100),
      vnp_TxnRef: paymentVnp.id,
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
    }
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')

    const vnpReturn = await vnpayService.verifyVnpayReturn(queryParams)
    const pass = vnpReturn.verified === true && vnpReturn.isSuccess === true && vnpReturn.orderId === orderVnp.id
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY Return URL success verified: verified=${vnpReturn.verified}, isSuccess=${vnpReturn.isSuccess}`)
    if (!pass) allPassed = false
  }

  // 4.2 MoMo Return Success
  const orderMomo = await createOrder(700000)
  const paymentMomo = await prisma.payment.create({
    data: {
      orderId: orderMomo.id,
      method: PaymentMethod.MOMO,
      status: PaymentStatus.PENDING,
      amount: orderMomo.total,
    },
  })
  {
    const body: Record<string, any> = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: paymentMomo.id,
      requestId: `req-${Date.now()}`,
      amount: orderMomo.total,
      orderInfo: `Thanh toan don hang ${orderMomo.orderCode}`,
      orderType: 'momo_wallet',
      transId: 88776655,
      resultCode: 0,
      message: 'Thành công.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    }
    body.signature = momoService.createMomoCallbackSignature(body as any, TEST_MOMO_ACCESS, TEST_MOMO_SECRET)

    const momoReturn = await momoService.verifyMomoReturn(body)
    const pass = momoReturn.verified === true && momoReturn.isSuccess === true && momoReturn.orderId === orderMomo.id
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo Return URL success verified: verified=${momoReturn.verified}, isSuccess=${momoReturn.isSuccess}`)
    if (!pass) allPassed = false
  }

  // 5. Return Failed / Cancelled Tests
  console.log('\n--- 5. Return URL Failed & Cancelled Handling ---')
  // 5.1 VNPAY Return Cancelled by user (ResponseCode 24)
  {
    const queryParams: Record<string, any> = {
      vnp_TmnCode: TEST_VNP_TMN,
      vnp_Amount: String(orderVnp.total * 100),
      vnp_TxnRef: paymentVnp.id,
      vnp_ResponseCode: '24', // user cancelled
      vnp_TransactionStatus: '02',
    }
    const sorted = vnpayService.sortObject(queryParams)
    const signData = Object.keys(sorted).map(k => `${k}=${sorted[k]}`).join('&')
    queryParams.vnp_SecureHash = crypto.createHmac('sha512', TEST_VNP_SECRET).update(Buffer.from(signData, 'utf-8')).digest('hex')

    const vnpReturnFail = await vnpayService.verifyVnpayReturn(queryParams)
    const pass = vnpReturnFail.verified === true && vnpReturnFail.isSuccess === false && vnpReturnFail.responseCode === '24'
    console.log(`[${pass ? 'PASS' : 'FAIL'}] VNPAY Return URL user-cancellation handled: isSuccess=${vnpReturnFail.isSuccess}, code=${vnpReturnFail.responseCode}`)
    if (!pass) allPassed = false
  }

  // 5.2 MoMo Return Cancelled by user (resultCode 1006)
  {
    const body: Record<string, any> = {
      partnerCode: TEST_MOMO_PARTNER,
      orderId: paymentMomo.id,
      requestId: `req-${Date.now()}`,
      amount: orderMomo.total,
      orderInfo: `Thanh toan don hang ${orderMomo.orderCode}`,
      orderType: 'momo_wallet',
      transId: 88776655,
      resultCode: 1006, // user cancelled
      message: 'Giao dịch bị từ chối.',
      payType: 'qr',
      responseTime: Date.now(),
      extraData: '',
    }
    body.signature = momoService.createMomoCallbackSignature(body as any, TEST_MOMO_ACCESS, TEST_MOMO_SECRET)

    const momoReturnFail = await momoService.verifyMomoReturn(body)
    const pass = momoReturnFail.verified === true && momoReturnFail.isSuccess === false && momoReturnFail.resultCode === 1006
    console.log(`[${pass ? 'PASS' : 'FAIL'}] MoMo Return URL user-cancellation handled: isSuccess=${momoReturnFail.isSuccess}, code=${momoReturnFail.resultCode}`)
    if (!pass) allPassed = false
  }

  // 6. Pending Status & Anti-Tamper Check (DB status remains PENDING on return until IPN arrives)
  console.log('\n--- 6. Pending Status & Anti-Tamper Check ---')
  {
    const payInDb = await prisma.payment.findUnique({ where: { id: paymentVnp.id } })
    const pass = payInDb?.status === PaymentStatus.PENDING
    console.log(`[${pass ? 'PASS' : 'FAIL'}] Payment status remains PENDING in DB before IPN: ${pass} (${payInDb?.status})`)
    if (!pass) allPassed = false
  }

  // 7. API Error Handling (Invalid signature, missing params)
  console.log('\n--- 7. API Error Handling ---')
  {
    const badVnpReturn = await vnpayService.verifyVnpayReturn({ vnp_SecureHash: 'bad_hash' })
    const passVnp = badVnpReturn.verified === false
    console.log(`[${passVnp ? 'PASS' : 'FAIL'}] VNPAY return with bad hash rejected: verified=${badVnpReturn.verified}`)
    if (!passVnp) allPassed = false

    const badMomoReturn = await momoService.verifyMomoReturn({ signature: 'bad_hash' })
    const passMomo = badMomoReturn.verified === false
    console.log(`[${passMomo ? 'PASS' : 'FAIL'}] MoMo return with bad hash rejected: verified=${badMomoReturn.verified}`)
    if (!passMomo) allPassed = false
  }

  // Clean up test data
  await prisma.payment.deleteMany({
    where: {
      orderId: { in: [orderCod.id, orderVnp.id, orderMomo.id] },
    },
  })
  await prisma.order.deleteMany({
    where: {
      id: { in: [orderCod.id, orderVnp.id, orderMomo.id] },
    },
  })

  // Reset env
  process.env.VNPAY_TMN_CODE = ''
  process.env.VNPAY_HASH_SECRET = ''
  process.env.MOMO_PARTNER_CODE = ''
  process.env.MOMO_ACCESS_KEY = ''
  process.env.MOMO_SECRET_KEY = ''

  console.log(`\n===============================================================`)
  console.log(`FINAL RESULT: ${allPassed ? 'ALL PHASE B TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`)
  console.log(`===============================================================`)

  await prisma.$disconnect()
}

runPhaseBTests().catch((err) => {
  console.error('Phase B Test Error:', err)
  process.exit(1)
})
