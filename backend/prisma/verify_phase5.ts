import prisma from '../src/config/prisma'
import { getProducts, getProductBySlug } from '../src/services/product.service'
import {
  mice,
  keyboards,
  headsets,
  mousepads,
  webcams,
  controllers,
  wifiCards,
  printers,
} from './phase5-data'

async function runVerification() {
  console.log('=== PHASE 5 VERIFICATION START ===\n')

  // 1. Verify counts of each category
  console.log('--- Step 1: Verify category product counts ---')
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  })

  let totalProducts = 0
  for (const c of categories) {
    console.log(`Category: ${c.name.padEnd(25)} (slug: ${c.slug.padEnd(14)}) => ${c._count.products} products`)
    totalProducts += c._count.products
  }

  const mouseCount = categories.find((c) => c.slug === 'mouse')?._count.products ?? 0
  const keyboardCount = categories.find((c) => c.slug === 'keyboard')?._count.products ?? 0
  const headsetCount = categories.find((c) => c.slug === 'headset')?._count.products ?? 0
  const mousepadCount = categories.find((c) => c.slug === 'mousepad')?._count.products ?? 0
  const webcamCount = categories.find((c) => c.slug === 'webcam')?._count.products ?? 0
  const controllerCount = categories.find((c) => c.slug === 'controller')?._count.products ?? 0
  const wifiCount = categories.find((c) => c.slug === 'wifi-card')?._count.products ?? 0
  const printerCount = categories.find((c) => c.slug === 'printer')?._count.products ?? 0

  if (mouseCount < 15 || mouseCount > 20) throw new Error(`Mouse count out of bounds [15, 20]: ${mouseCount}`)
  if (keyboardCount < 12 || keyboardCount > 15) throw new Error(`Keyboard count out of bounds [12, 15]: ${keyboardCount}`)
  if (headsetCount < 6 || headsetCount > 8) throw new Error(`Headset count out of bounds [6, 8]: ${headsetCount}`)
  if (mousepadCount < 5 || mousepadCount > 6) throw new Error(`Mousepad count out of bounds [5, 6]: ${mousepadCount}`)
  if (webcamCount < 4 || webcamCount > 5) throw new Error(`Webcam count out of bounds [4, 5]: ${webcamCount}`)
  if (controllerCount < 4 || controllerCount > 5) throw new Error(`Controller count out of bounds [4, 5]: ${controllerCount}`)
  if (wifiCount < 5) throw new Error(`WiFi Card count insufficient (< 5): ${wifiCount}`)
  if (printerCount < 5) throw new Error(`Printer count insufficient (< 5): ${printerCount}`)

  console.log(`\nTotal products in database: ${totalProducts}`)
  if (totalProducts < 320 || totalProducts > 350) {
    throw new Error(`Total catalog count out of bounds [320, 350]: ${totalProducts}`)
  }
  console.log('Step 1 PASSED: All category product counts meet requirements.\n')

  // 2. Verify ProductSpecification
  console.log('--- Step 2: Verify ProductSpecification for Phase 5 items ---')
  const allPhase5 = [
    ...mice,
    ...keyboards,
    ...headsets,
    ...mousepads,
    ...webcams,
    ...controllers,
    ...wifiCards,
    ...printers,
  ]

  for (const item of allPhase5) {
    const prod = await prisma.product.findUnique({
      where: { sku: item.sku },
      include: { specifications: true, category: true, brand: true },
    })
    if (!prod) throw new Error(`Missing product: ${item.sku}`)
    if (!prod.category || !prod.brand) throw new Error(`Missing relation for: ${item.sku}`)
    const spec = prod.specifications.find((s) => s.productType === item.productType)
    if (!spec) throw new Error(`Missing specification of type ${item.productType} for: ${item.sku}`)
    if (item.extra && !spec.extra) throw new Error(`Missing extra spec for: ${item.sku}`)
  }
  console.log(`Step 2 PASSED: Verified ${allPhase5.length} Phase 5 specifications.\n`)

  // 3. Check duplicate SKU/slug across DB
  console.log('--- Step 3: Check duplicate SKU and slug across entire DB ---')
  const allProducts = await prisma.product.findMany({
    select: { id: true, sku: true, slug: true, price: true, salePrice: true, stock: true },
  })
  const totalInDb = allProducts.length
  const uniqueSkus = new Set(allProducts.map((p) => p.sku))
  const uniqueSlugs = new Set(allProducts.map((p) => p.slug))
  console.log(`Total products in DB: ${totalInDb}`)
  console.log(`Unique SKUs: ${uniqueSkus.size}`)
  console.log(`Unique Slugs: ${uniqueSlugs.size}`)

  if (uniqueSkus.size !== totalInDb) throw new Error('Duplicate SKUs found in DB!')
  if (uniqueSlugs.size !== totalInDb) throw new Error('Duplicate Slugs found in DB!')
  console.log('Step 3 PASSED: All SKUs and Slugs are 100% unique.\n')

  // 4. Verify price/stock/salePrice
  console.log('--- Step 4: Verify price > 0, stock >= 0, salePrice valid across entire DB ---')
  for (const p of allProducts) {
    if (p.price <= 0) throw new Error(`Invalid price for SKU ${p.sku}: ${p.price}`)
    if (p.stock < 0) throw new Error(`Invalid stock for SKU ${p.sku}: ${p.stock}`)
    if (p.salePrice !== null && (p.salePrice <= 0 || p.salePrice >= p.price)) {
      throw new Error(`Invalid salePrice for SKU ${p.sku}: sale=${p.salePrice}, price=${p.price}`)
    }
  }
  console.log('Step 4 PASSED: All price, stock, and salePrice values are valid.\n')

  // 5. Test Product API for Mouse, Keyboard, Headset, WiFi Card, Printer
  console.log('--- Step 5: Test Product API for Mouse, Keyboard, Headset, WiFi Card, Printer ---')
  const testCategories = ['mouse', 'keyboard', 'headset', 'wifi-card', 'printer']
  for (const slug of testCategories) {
    const cat = await prisma.category.findUnique({ where: { slug } })
    if (!cat) throw new Error(`Category not found: ${slug}`)

    const result = await getProducts({ categoryId: cat.id, limit: 10 })
    console.log(`API getProducts for category '${slug}' returned ${result.data.length} items (total: ${result.pagination.total})`)
    if (result.data.length === 0) throw new Error(`No products returned for category ${slug}`)
  }
  console.log('Step 5 PASSED: Product API returns expected items for all requested categories.\n')

  // 6. Test search API for at least 3 products
  console.log('--- Step 6: Test search for at least 3 products ---')
  const searchQueries = [
    { query: 'Superlight', expectedMin: 1 },
    { query: 'Huntsman', expectedMin: 1 },
    { query: 'Cloud III', expectedMin: 1 },
    { query: 'LBP2900B', expectedMin: 1 },
    { query: 'TXE75E', expectedMin: 1 },
  ]

  for (const { query, expectedMin } of searchQueries) {
    const result = await getProducts({ search: query })
    console.log(`Search '${query}': found ${result.data.length} items (first: ${result.data[0]?.name})`)
    if (result.data.length < expectedMin) {
      throw new Error(`Search for '${query}' expected at least ${expectedMin} items, got ${result.data.length}`)
    }
  }
  console.log('Step 6 PASSED: Search tests succeeded.\n')

  console.log('=== ALL PHASE 5 VERIFICATIONS PASSED SUCCESSFULLY ===')
}

runVerification()
  .catch((e) => {
    console.error('VERIFICATION ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
