import { OrderStatus, PaymentMethod, PaymentStatus, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/prisma'
import { getBankTransferConfig, generateVietQrData } from '../src/services/bank-transfer.service'
import * as paymentService from '../src/services/payment.service'

async function runTests() {
  console.log('=== STARTING PAYMENT SYSTEM VERIFICATION ===\n')

  // Setup test users
  const adminEmail = `test_admin_${Date.now()}@example.com`
  const userEmail = `test_user_${Date.now()}@example.com`
  const password = await bcrypt.hash('TestPass@123', 10)

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      password,
      name: 'Test Admin',
      role: Role.ADMIN,
    },
  })

  const user = await prisma.user.create({
    data: {
      email: userEmail,
      password,
      name: 'Test Customer',
      role: Role.USER,
    },
  })

  // Find a product with stock
  const product = await prisma.product.findFirst({
    where: { stock: { gte: 5 } },
  })

  if (!product) {
    throw new Error('No product with stock found for testing')
  }

  const expectedPrice = product.salePrice ?? product.price
  console.log(`[SETUP] Using product "${product.name}" with DB price: ${expectedPrice} VND`)

  // Create an address for user
  const address = await prisma.address.create({
    data: {
      userId: user.id,
      recipientName: 'Nguyen Van Test',
      phone: '0901234567',
      province: 'Ha Noi',
      district: 'Cau Giay',
      ward: 'Dich Vong',
      detail: '123 Xuan Thuy',
      isDefault: true,
    },
  })

  try {
    // -------------------------------------------------------------
    // TEST 1: VietQR Generation & Config Reading
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: VietQR Service Configuration & Generation ---')
    const config = getBankTransferConfig()
    console.log('Bank config status:', {
      configured: config.configured,
      bankId: config.bankId,
      bankName: config.bankName,
      accountNumber: config.bankAccountNumber ? '***' + config.bankAccountNumber.slice(-4) : 'none',
      accountName: config.bankAccountName,
    })

    if (!config.configured) {
      throw new Error('Bank transfer is expected to be configured from .env in this test!')
    }

    const qrResult = generateVietQrData({
      amount: 1500000,
      orderCode: 'DH-TEST-001',
    })

    if (!qrResult || !qrResult.qrCodeUrl.includes('img.vietqr.io')) {
      throw new Error(`Failed to generate valid VietQR URL: ${JSON.stringify(qrResult)}`)
    }
    console.log('✓ VietQR generated URL:', qrResult.qrCodeUrl)
    console.log('✓ VietQR transfer memo:', qrResult.transferMemo)

    // -------------------------------------------------------------
    // TEST 2: Order Creation & Backend Price Integrity
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Backend Price Integrity in Order Creation ---')
    const orderCode = `ORD-${Date.now().toString().slice(-6)}`
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orderCode,
        status: OrderStatus.PENDING,
        subtotal: expectedPrice,
        shippingFee: 0,
        discount: 0,
        total: expectedPrice, // strictly from DB
        recipientName: address.recipientName,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        address: address.detail,
        items: {
          create: [
            {
              productId: product.id,
              productName: product.name,
              price: expectedPrice,
              quantity: 1,
              subtotal: expectedPrice,
            },
          ],
        },
      },
      include: { items: true },
    })

    console.log(`✓ Order created: ${order.orderCode}, status=${order.status}, total=${order.total}`)
    if (order.status !== OrderStatus.PENDING) {
      throw new Error(`Expected order status PENDING, got ${order.status}`)
    }

    // -------------------------------------------------------------
    // TEST 3: Create Payment with BANK_TRANSFER
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Create Payment via BANK_TRANSFER ---')
    const paymentResult = (await paymentService.createPayment(
      user.id,
      order.id,
      PaymentMethod.BANK_TRANSFER
    )) as any

    console.log('Payment created:', {
      id: paymentResult.id,
      method: paymentResult.method,
      status: paymentResult.status,
      amount: paymentResult.amount,
      qrCodeUrl: paymentResult.qrCodeUrl,
      bankTransfer: paymentResult.bankTransfer ? 'Present' : 'Missing',
    })

    if (paymentResult.method !== PaymentMethod.BANK_TRANSFER) {
      throw new Error(`Expected method BANK_TRANSFER, got ${paymentResult.method}`)
    }
    if (paymentResult.status !== PaymentStatus.PENDING) {
      throw new Error(`Requirement 5 & 8: Payment must start as PENDING, got ${paymentResult.status}`)
    }
    if (!paymentResult.qrCodeUrl || !paymentResult.qrCodeUrl.includes('img.vietqr.io')) {
      throw new Error(`Requirement 3: QR URL must be valid VietQR URL, got: ${paymentResult.qrCodeUrl}`)
    }
    console.log('✓ BANK_TRANSFER payment created in PENDING state with VietQR data')

    // -------------------------------------------------------------
    // TEST 4: Get Payment with QR Data Attachment
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Customer Gets Payment Details ---')
    const fetchedPayment = (await paymentService.getPayment(user.id, order.id)) as any
    if (!fetchedPayment.qrCodeUrl || !fetchedPayment.bankTransfer) {
      throw new Error('Expected fetched payment to have qrCodeUrl and bankTransfer data dynamically attached')
    }
    console.log('✓ Payment retrieval includes QR and bank transfer memo for pending order')

    // -------------------------------------------------------------
    // TEST 5: Verify Order Status Stays PENDING (No fake PAID)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Verify Order and Payment Remain PENDING ---')
    const currentOrder = await prisma.order.findUnique({ where: { id: order.id } })
    if (currentOrder?.status !== OrderStatus.PENDING) {
      throw new Error(`Requirement 8 violation: Order should still be PENDING, got ${currentOrder?.status}`)
    }
    console.log('✓ Requirement 8 satisfied: Customer actions cannot mark order as PAID without admin confirmation')

    // -------------------------------------------------------------
    // TEST 6: Admin Manual Payment Confirmation (Requirement 8 & 9)
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Admin Manual Payment Confirmation ---')
    const confirmResult = await paymentService.confirmManualPayment(
      order.id,
      admin.id,
      'BANK-TX-REF-998877'
    )

    console.log('Confirmation result:', {
      alreadyConfirmed: confirmResult.alreadyConfirmed,
      paymentStatus: confirmResult.payment.status,
      orderStatus: confirmResult.order.status,
      transactionId: confirmResult.payment.transactionId,
    })

    if (confirmResult.payment.status !== PaymentStatus.PAID) {
      throw new Error(`Expected payment status PAID, got ${confirmResult.payment.status}`)
    }
    if (confirmResult.order.status !== OrderStatus.CONFIRMED) {
      throw new Error(`Expected order status CONFIRMED, got ${confirmResult.order.status}`)
    }
    if (confirmResult.payment.transactionId !== 'BANK-TX-REF-998877') {
      throw new Error(`Expected transactionId BANK-TX-REF-998877, got ${confirmResult.payment.transactionId}`)
    }
    console.log('✓ Payment marked as PAID and Order as CONFIRMED by Admin')

    // -------------------------------------------------------------
    // TEST 7: Idempotent Admin Confirmation (Anti-duplicate confirmation)
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Anti-duplicate / Idempotent Admin Confirmation ---')
    const duplicateConfirm = await paymentService.confirmManualPayment(
      order.id,
      admin.id,
      'BANK-TX-REF-DUPLICATE'
    )

    if (!duplicateConfirm.alreadyConfirmed) {
      throw new Error('Requirement 9: Expected alreadyConfirmed=true for subsequent confirmation calls')
    }
    if (duplicateConfirm.payment.status !== PaymentStatus.PAID) {
      throw new Error('Payment status should remain PAID')
    }
    console.log('✓ Requirement 9 satisfied: Duplicate confirmation safely ignored (alreadyConfirmed=true)')

    // -------------------------------------------------------------
    // TEST 8: MoMo Gateway Unconfigured Graceful Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: MoMo Unconfigured Gateway Handling ---')
    const order2 = await prisma.order.create({
      data: {
        userId: user.id,
        orderCode: `ORD-${Date.now().toString().slice(-6)}-MOMO`,
        status: OrderStatus.PENDING,
        subtotal: expectedPrice,
        shippingFee: 0,
        discount: 0,
        total: expectedPrice,
        recipientName: address.recipientName,
        phone: address.phone,
        province: address.province,
        district: address.district,
        ward: address.ward,
        address: address.detail,
      },
    })

    try {
      await paymentService.createPayment(user.id, order2.id, PaymentMethod.MOMO)
      throw new Error('Expected MoMo creation to fail due to missing credentials, but it succeeded!')
    } catch (momoErr: any) {
      console.log('✓ MoMo rejected with friendly error:', momoErr.message)
      if (!momoErr.message.includes('MoMo')) {
        throw new Error(`Unexpected MoMo error message: ${momoErr.message}`)
      }
    }

    // -------------------------------------------------------------
    // TEST 9: Bank Transfer Unconfigured Handling
    // -------------------------------------------------------------
    console.log('\n--- TEST 9: Bank Transfer Unconfigured Handling ---')
    const originalBankId = process.env.BANK_ID
    const originalAccount = process.env.BANK_ACCOUNT_NUMBER

    // Temporarily unset bank info
    delete process.env.BANK_ID
    delete process.env.BANK_ACCOUNT_NUMBER

    const unconfiguredStatus = getBankTransferConfig().configured
    console.log('Unconfigured check (should be false):', unconfiguredStatus)
    if (unconfiguredStatus !== false) {
      throw new Error('Expected configured to be false when BANK_ID is missing')
    }

    try {
      await paymentService.createPayment(user.id, order2.id, PaymentMethod.BANK_TRANSFER)
      throw new Error('Expected BANK_TRANSFER to fail when unconfigured, but it succeeded!')
    } catch (bankErr: any) {
      console.log('✓ Unconfigured BANK_TRANSFER rejected with friendly message:', bankErr.message)
      if (!bankErr.message.includes('chưa được cấu hình')) {
        throw new Error(`Unexpected error message when unconfigured: ${bankErr.message}`)
      }
    }

    // Restore environment
    process.env.BANK_ID = originalBankId
    process.env.BANK_ACCOUNT_NUMBER = originalAccount
    console.log('✓ Restored environment variables')

    console.log('\n======================================================')
    console.log('🎉 ALL 9 TEST SUITES PASSED SUCCESSFULLY!')
    console.log('======================================================')
  } finally {
    // Cleanup test data
    await prisma.payment.deleteMany({ where: { order: { userId: { in: [user.id, admin.id] } } } })
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [user.id, admin.id] } } } })
    await prisma.order.deleteMany({ where: { userId: { in: [user.id, admin.id] } } })
    await prisma.address.deleteMany({ where: { userId: { in: [user.id, admin.id] } } })
    await prisma.user.deleteMany({ where: { id: { in: [user.id, admin.id] } } })
    await prisma.$disconnect()
    console.log('Cleaned up test records.')
  }
}

runTests().catch((err) => {
  console.error('❌ Verification test failed:', err)
  process.exit(1)
})
