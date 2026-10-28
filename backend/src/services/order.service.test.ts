import assert from 'node:assert/strict'
import { test } from 'node:test'
import { OrderStatus, PaymentStatus } from '@prisma/client'
import { getOrder, listOrders } from './order.service'

test('getOrder returns full order details for ADMIN for any user order', async () => {
  const mockOrder = {
    id: 'ord-admin-test-1',
    orderCode: 'ORD-10001',
    userId: 'user-customer-1',
    status: OrderStatus.CONFIRMED,
    total: 35000000,
    recipientName: 'Nguyen Van A',
    phone: '0901234567',
    province: 'Hà Nội',
    district: 'Cầu Giấy',
    ward: 'Dịch Vọng',
    detail: 'Số 123 Đường Cầu Giấy',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: {
      id: 'user-customer-1',
      name: 'Nguyen Van A',
      email: 'customer@example.com',
      phone: '0901234567',
    },
    items: [
      {
        id: 'item-1',
        orderId: 'ord-admin-test-1',
        productId: 'prod-cpu',
        productName: 'AMD Ryzen 5 9600X',
        price: 7500000,
        quantity: 1,
        subtotal: 7500000,
        product: {
          id: 'prod-cpu',
          name: 'AMD Ryzen 5 9600X',
          slug: 'amd-ryzen-5-9600x',
          images: [{ id: 'img-1', url: '/images/9600x.png', alt: '9600X', sortOrder: 0 }],
        },
      },
      {
        id: 'item-2',
        orderId: 'ord-admin-test-1',
        productId: 'prod-gpu',
        productName: 'ASUS TUF RTX 4070 Ti SUPER 16GB',
        price: 27500000,
        quantity: 1,
        subtotal: 27500000,
        product: {
          id: 'prod-gpu',
          name: 'ASUS TUF RTX 4070 Ti SUPER 16GB',
          slug: 'asus-rtx-4070-ti-super',
          images: [{ id: 'img-2', url: '/images/4070.png', alt: '4070', sortOrder: 0 }],
        },
      },
    ],
    payments: [
      {
        id: 'pay-1',
        orderId: 'ord-admin-test-1',
        method: 'VNPAY',
        status: PaymentStatus.PAID,
        amount: 35000000,
        transactionId: 'VNP12345678',
      },
    ],
  }

  // Override prisma.order.findFirst
  const prisma = (await import('../config/prisma')).default
  const originalFindFirst = prisma.order.findFirst
  prisma.order.findFirst = (async (args: any) => {
    // ADMIN query has where: { id: 'ord-admin-test-1' } without userId restriction
    if (args.where.id === 'ord-admin-test-1' && !args.where.userId) {
      return mockOrder as any
    }
    return null
  }) as any

  try {
    const result = await getOrder('admin-user-id', 'ord-admin-test-1', 'ADMIN')

    assert.equal(result.id, 'ord-admin-test-1')
    assert.equal(result.orderCode, 'ORD-10001')
    assert.equal(result.total, 35000000)
    assert.equal(result.user.name, 'Nguyen Van A')
    assert.equal(result.items.length, 2)
    assert.equal(result.items[0].productName, 'AMD Ryzen 5 9600X')
    assert.equal(result.items[0].subtotal, 7500000)
    assert.equal(result.items[1].productName, 'ASUS TUF RTX 4070 Ti SUPER 16GB')
    assert.equal(result.items[1].subtotal, 27500000)
    assert.equal(result.payments[0].status, PaymentStatus.PAID)
    assert.equal(result.payments[0].amount, 35000000)
  } finally {
    prisma.order.findFirst = originalFindFirst
  }
})

test('getOrder throws 404 when orderId does not exist', async () => {
  const prisma = (await import('../config/prisma')).default
  const originalFindFirst = prisma.order.findFirst
  prisma.order.findFirst = (async () => null) as any

  try {
    await assert.rejects(
      async () => {
        await getOrder('admin-user-id', 'non-existent-order-id', 'ADMIN')
      },
      (err: any) => err.status === 404 && err.message === 'Order not found',
    )
  } finally {
    prisma.order.findFirst = originalFindFirst
  }
})

test('getOrder prevents normal USER from accessing another user order', async () => {
  const prisma = (await import('../config/prisma')).default
  const originalFindFirst = prisma.order.findFirst

  // Mock implementation: only returns if userId matches
  prisma.order.findFirst = (async (args: any) => {
    if (args.where.id === 'ord-user-1' && args.where.userId === 'user-owner') {
      return { id: 'ord-user-1', userId: 'user-owner' } as any
    }
    return null
  }) as any

  try {
    // Another user tries to access 'ord-user-1'
    await assert.rejects(
      async () => {
        await getOrder('other-attacker-user', 'ord-user-1', 'USER')
      },
      (err: any) => err.status === 404 && err.message === 'Order not found',
    )

    // Legitimate owner accesses 'ord-user-1'
    const ownerResult = await getOrder('user-owner', 'ord-user-1', 'USER')
    assert.equal(ownerResult.id, 'ord-user-1')
  } finally {
    prisma.order.findFirst = originalFindFirst
  }
})

test('listOrders allows ADMIN to see all orders and USER to see only their own', async () => {
  const prisma = (await import('../config/prisma')).default
  const originalFindMany = prisma.order.findMany

  let capturedWhere: any = null
  prisma.order.findMany = (async (args: any) => {
    capturedWhere = args.where
    return []
  }) as any

  try {
    await listOrders('admin-id', 'ADMIN')
    assert.deepEqual(capturedWhere, {})

    await listOrders('customer-id', 'USER')
    assert.deepEqual(capturedWhere, { userId: 'customer-id' })
  } finally {
    prisma.order.findMany = originalFindMany
  }
})
