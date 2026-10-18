import prisma from '../src/config/prisma'
import { getImages } from '../src/services/product-image.service'
import { getProducts, getProductBySlug } from '../src/services/product.service'
import { catalogProductImages } from './product-images-data'

async function runFullVerification() {
  console.log('====================================================')
  console.log('       PHASE 6B FULL CATALOG VERIFICATION')
  console.log('====================================================\n')

  // 1. Tổng product
  const totalProducts = await prisma.product.count()
  console.log(`1. Total products in DB:               ${totalProducts}`)
  if (totalProducts !== 325) {
    throw new Error(`Expected 325 products, got ${totalProducts}`)
  }

  // 2. Tổng product có >= 1 image
  const productsWithImages = await prisma.product.findMany({
    where: { images: { some: {} } },
    select: { id: true, sku: true, name: true, _count: { select: { images: true } } },
  })
  console.log(`2. Total products with >= 1 image:     ${productsWithImages.length}`)
  if (productsWithImages.length !== 325) {
    throw new Error(`Expected 325 products with >= 1 image, got ${productsWithImages.length}`)
  }

  // 3. Tổng product thiếu image
  const productsWithoutImages = await prisma.product.findMany({
    where: { images: { none: {} } },
    select: { id: true, sku: true, name: true },
  })
  console.log(`3. Total products missing image:       ${productsWithoutImages.length}`)
  if (productsWithoutImages.length > 0) {
    console.error('Products missing image:', productsWithoutImages.map((p) => p.sku))
    throw new Error(`Found ${productsWithoutImages.length} products without images!`)
  }

  // 4. Duplicate URL/image bất thường
  const duplicateUrls = await prisma.productImage.groupBy({
    by: ['productId', 'url'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  })
  console.log(`4. Duplicate images for same product:  ${duplicateUrls.length}`)
  if (duplicateUrls.length > 0) {
    throw new Error(`Found duplicate images for the same product: ${JSON.stringify(duplicateUrls)}`)
  }

  // 5. SKU không tìm thấy
  const allDbSkus = new Set((await prisma.product.findMany({ select: { sku: true } })).map((p) => p.sku))
  const missingSkusInDb = catalogProductImages.filter((item) => !allDbSkus.has(item.sku)).map((item) => item.sku)
  console.log(`5. SKUs mapped but not found in DB:    ${missingSkusInDb.length}`)
  if (missingSkusInDb.length > 0) {
    throw new Error(`Missing SKUs in DB: ${missingSkusInDb.join(', ')}`)
  }

  // 6. GET Product Image API
  console.log('\n6. Checking Product Image API across diverse categories...')
  const sampleCategories = [
    'cpu',
    'gpu',
    'mainboard',
    'ram',
    'ssd',
    'hdd',
    'psu',
    'case',
    'cpu-cooler',
    'monitor',
    'mouse',
    'keyboard',
    'headset',
    'mousepad',
    'webcam',
    'controller',
    'wifi-card',
    'printer',
  ]

  for (const catSlug of sampleCategories) {
    const prod = await prisma.product.findFirst({
      where: { category: { slug: catSlug } },
      select: { id: true, sku: true, name: true },
    })
    if (!prod) {
      throw new Error(`No product found for category ${catSlug}`)
    }
    const images = await getImages(prod.id)
    if (!images || images.length === 0) {
      throw new Error(`getImages failed for product ${prod.sku}`)
    }
    const primary = images[0]
    if (!primary.url || primary.sortOrder !== 0) {
      throw new Error(`Invalid primary image for product ${prod.sku}`)
    }
    console.log(`  [API PASS] ${catSlug.padEnd(12)} | SKU: ${prod.sku.padEnd(28)} | sortOrder: ${primary.sortOrder} | URL: ${primary.url.slice(0, 50)}...`)
  }

  // 7. Product Detail hiển thị ảnh (via getProductBySlug + getImages)
  console.log('\n7. Checking Product Detail Gallery compatibility...')
  const sampleSlug = 'ryzen-7-7800x3d'
  const detailProduct = await getProductBySlug(sampleSlug)
  if (!detailProduct) throw new Error(`Product not found: ${sampleSlug}`)
  const detailImages = await getImages(detailProduct.id)
  if (!detailImages || detailImages.length === 0) throw new Error(`Detail images empty for ${sampleSlug}`)
  console.log(`  [DETAIL PASS] Slug: ${sampleSlug} => Found ${detailImages.length} image(s), primary: ${detailImages[0].url.slice(0, 60)}...`)

  // 8. Catalog/Product Card hiển thị ảnh (via getProducts + getImages)
  console.log('\n8. Checking Catalog/Product Card compatibility...')
  const catalogList = await getProducts({ page: 1, limit: 10 })
  let cardPassCount = 0
  for (const item of catalogList.data) {
    const cardImages = await getImages(item.id)
    if (cardImages && cardImages.length > 0 && cardImages[0].url) {
      cardPassCount++
    }
  }
  console.log(`  [CARD PASS] ${cardPassCount}/${catalogList.data.length} first catalog cards successfully have resolved image URLs.`)
  if (cardPassCount !== catalogList.data.length) {
    throw new Error('Some catalog products failed image check!')
  }

  // Breakdown per category
  console.log('\n--- Category Image Coverage Summary ---')
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      products: {
        select: {
          id: true,
          _count: { select: { images: true } },
        },
      },
    },
    orderBy: { name: 'asc' },
  })

  for (const c of categories) {
    const totalInCat = c.products.length
    const withImg = c.products.filter((p) => p._count.images > 0).length
    console.log(`  ${c.name.padEnd(25)} (${c.slug.padEnd(12)}): ${withImg}/${totalInCat} products have images (100%)`)
    if (withImg !== totalInCat) {
      throw new Error(`Category ${c.slug} has products without images!`)
    }
  }

  console.log('\n====================================================')
  console.log('       ALL 325 PRODUCTS SUCCESSFULLY VERIFIED!')
  console.log('====================================================\n')
}

runFullVerification()
  .catch((err) => {
    console.error('Verification failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
