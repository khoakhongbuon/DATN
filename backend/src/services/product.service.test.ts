import assert from 'node:assert/strict'
import { test } from 'node:test'
import { updateProduct } from './product.service'

test('updateProduct preserves unedited fields when partial updates are submitted', async () => {
  const existingProduct = {
    id: 'prod-edit-1',
    name: 'AMD Ryzen 5 7600',
    slug: 'amd-ryzen-5-7600',
    sku: 'CPU-7600',
    price: 5500000,
    salePrice: 5200000,
    stock: 20,
    description: 'CPU thế hệ mới',
    categoryId: 'cat-cpu',
    brandId: 'brand-amd',
  }

  const prisma = (await import('../config/prisma')).default
  const originalFindUnique = prisma.product.findUnique
  const originalUpdate = prisma.product.update

  let capturedUpdateData: any = null

  prisma.product.findUnique = (async (args: any) => {
    if (args.where.id === 'prod-edit-1') return existingProduct as any
    return null
  }) as any

  prisma.product.update = (async (args: any) => {
    capturedUpdateData = args.data
    return { ...existingProduct, ...args.data } as any
  }) as any

  try {
    // Only update price and stock
    const result = await updateProduct('prod-edit-1', {
      price: 5400000,
      stock: 15,
    })

    assert.equal(result.price, 5400000)
    assert.equal(result.stock, 15)

    // Verify unedited fields were NOT sent as null or undefined in update payload
    assert.equal(capturedUpdateData.price, 5400000)
    assert.equal(capturedUpdateData.stock, 15)
    assert.equal('name' in capturedUpdateData, false)
    assert.equal('slug' in capturedUpdateData, false)
    assert.equal('sku' in capturedUpdateData, false)
    assert.equal('description' in capturedUpdateData, false)
    assert.equal('categoryId' in capturedUpdateData, false)
    assert.equal('brandId' in capturedUpdateData, false)
  } finally {
    prisma.product.findUnique = originalFindUnique
    prisma.product.update = originalUpdate
  }
})

test('updateProduct rejects non-existent product ID with 404', async () => {
  const prisma = (await import('../config/prisma')).default
  const originalFindUnique = prisma.product.findUnique
  prisma.product.findUnique = (async () => null) as any

  try {
    await assert.rejects(
      async () => {
        await updateProduct('non-existent-id', { price: 100000 })
      },
      (err: any) => err.status === 404 && err.message === 'Product not found',
    )
  } finally {
    prisma.product.findUnique = originalFindUnique
  }
})

test('updateProduct rejects duplicate slug with 409', async () => {
  const existingProduct = {
    id: 'prod-1',
    name: 'Product 1',
    slug: 'product-1',
    sku: 'SKU-1',
    price: 100000,
    stock: 5,
  }

  const prisma = (await import('../config/prisma')).default
  const originalFindUnique = prisma.product.findUnique

  prisma.product.findUnique = (async (args: any) => {
    if (args.where.id === 'prod-1') return existingProduct as any
    if (args.where.slug === 'duplicate-slug') return { id: 'other-prod', slug: 'duplicate-slug' } as any
    return null
  }) as any

  try {
    await assert.rejects(
      async () => {
        await updateProduct('prod-1', { slug: 'duplicate-slug' })
      },
      (err: any) => err.status === 409 && err.message === 'Slug already exists',
    )
  } finally {
    prisma.product.findUnique = originalFindUnique
  }
})
