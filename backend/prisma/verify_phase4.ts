import prisma from '../src/config/prisma'
import { checkCompatibility } from '../src/services/pc-builder.service'
import { getProducts, getProductBySlug } from '../src/services/product.service'
import { psus, cases, cpuCoolers, monitors } from './phase4-data'

async function runVerification() {
  console.log('=== PHASE 4 VERIFICATION START ===\n')

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

  for (const c of categories) {
    console.log(`Category: ${c.name.padEnd(15)} (slug: ${c.slug.padEnd(12)}) => ${c._count.products} products`)
  }

  const psuCount = categories.find((c) => c.slug === 'psu')?._count.products ?? 0
  const caseCount = categories.find((c) => c.slug === 'case')?._count.products ?? 0
  const coolerCount = categories.find((c) => c.slug === 'cpu-cooler')?._count.products ?? 0
  const monitorCount = categories.find((c) => c.slug === 'monitor')?._count.products ?? 0

  if (psuCount < 30) throw new Error(`PSU count insufficient: ${psuCount} < 30`)
  if (caseCount < 20) throw new Error(`Case count insufficient: ${caseCount} < 20`)
  if (coolerCount < 15) throw new Error(`CPU Cooler count insufficient: ${coolerCount} < 15`)
  if (monitorCount < 20) throw new Error(`Monitor count insufficient: ${monitorCount} < 20`)
  console.log('Step 1 PASSED: All category product counts meet requirements.\n')

  // 2. Verify ProductSpecification
  console.log('--- Step 2: Verify ProductSpecification for Phase 4 ---')
  for (const p of psus) {
    const prod = await prisma.product.findUnique({
      where: { sku: p.sku },
      include: { specifications: true },
    })
    if (!prod) throw new Error(`Missing PSU: ${p.sku}`)
    const spec = prod.specifications.find((s) => s.productType === 'PSU')
    if (!spec || spec.wattage !== p.wattage || spec.efficiency !== p.efficiency || !spec.connectors) {
      throw new Error(`Invalid specification for PSU: ${p.sku}`)
    }
  }
  console.log(`Verified ${psus.length} PSU specifications.`)

  for (const c of cases) {
    const prod = await prisma.product.findUnique({
      where: { sku: c.sku },
      include: { specifications: true },
    })
    if (!prod) throw new Error(`Missing Case: ${c.sku}`)
    const spec = prod.specifications.find((s) => s.productType === 'CASE')
    if (!spec || spec.gpuClearance !== c.gpuClearance || spec.cpuCoolerClearance !== c.cpuCoolerClearance) {
      throw new Error(`Invalid specification for Case: ${c.sku}`)
    }
  }
  console.log(`Verified ${cases.length} Case specifications.`)

  for (const cl of cpuCoolers) {
    const prod = await prisma.product.findUnique({
      where: { sku: cl.sku },
      include: { specifications: true },
    })
    if (!prod) throw new Error(`Missing Cooler: ${cl.sku}`)
    const spec = prod.specifications.find((s) => s.productType === 'COOLER')
    if (!spec || spec.height !== cl.height || spec.tdp !== cl.tdp) {
      throw new Error(`Invalid specification for Cooler: ${cl.sku}`)
    }
  }
  console.log(`Verified ${cpuCoolers.length} CPU Cooler specifications.`)

  for (const m of monitors) {
    const prod = await prisma.product.findUnique({
      where: { sku: m.sku },
      include: { specifications: true },
    })
    if (!prod) throw new Error(`Missing Monitor: ${m.sku}`)
    const spec = prod.specifications.find((s) => s.productType === 'MONITOR')
    if (!spec || !spec.extra) {
      throw new Error(`Invalid specification for Monitor: ${m.sku}`)
    }
  }
  console.log(`Verified ${monitors.length} Monitor specifications.`)
  console.log('Step 2 PASSED: All ProductSpecifications are valid.\n')

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

  if (uniqueSkus.size !== totalInDb) throw new Error('Duplicate SKU found in DB!')
  if (uniqueSlugs.size !== totalInDb) throw new Error('Duplicate Slug found in DB!')
  console.log('Step 3 PASSED: Zero duplicate SKUs or slugs across DB.\n')

  // 4. Check price > 0, stock > 0, salePrice validity
  console.log('--- Step 4: Check price > 0, stock > 0, and salePrice validity ---')
  for (const p of allProducts) {
    if (p.price <= 0) throw new Error(`Product ${p.sku} has invalid price: ${p.price}`)
    if (p.stock <= 0) throw new Error(`Product ${p.sku} has invalid stock: ${p.stock}`)
    if (p.salePrice !== null) {
      if (p.salePrice <= 0 || p.salePrice >= p.price) {
        throw new Error(`Product ${p.sku} has invalid salePrice: ${p.salePrice} (price: ${p.price})`)
      }
    }
  }
  console.log(`Step 4 PASSED: All ${totalInDb} products have valid price, stock, and salePrice.\n`)

  // 5. Test PC Builder
  console.log('--- Step 5: Test PC Builder compatibility engine ---')
  const cpuProd = await prisma.product.findUniqueOrThrow({ where: { sku: 'CPU-INTEL-10700K' } }) // LGA1200, TDP 125W
  const mbProd = await prisma.product.findUniqueOrThrow({ where: { sku: 'MB-ASROCK-Z590-STEEL-LEGEND' } }) // LGA1200, DDR4
  const ramProd = await prisma.product.findUniqueOrThrow({ where: { sku: 'RAM-KINGSTON-FBRGB-16G-3200' } }) // DDR4
  const gpuProd = await prisma.product.findUniqueOrThrow({ where: { sku: 'GPU-ASUS-RTX4080S-TUF-16G' } }) // length 348mm, power 320W
  const caseCorsair = await prisma.product.findUniqueOrThrow({ where: { sku: 'CASE-CORSAIR-5000D-AIRFLOW-WHT' } }) // clearance 420mm, cooler 170mm
  const caseNyx = await prisma.product.findUniqueOrThrow({ where: { sku: 'CASE-XIGMATEK-NYX-AIR-3F' } }) // clearance 320mm, cooler 160mm
  const caseQ300L = await prisma.product.findUniqueOrThrow({ where: { sku: 'CASE-CM-MASTERBOX-Q300L' } }) // cooler 159mm
  const coolerAk620 = await prisma.product.findUniqueOrThrow({ where: { sku: 'COOL-DEEPCOOL-AK620-ZERO-DARK' } }) // height 160mm
  const coolerD15 = await prisma.product.findUniqueOrThrow({ where: { sku: 'COOL-NOCTUA-NH-D15-CHROMAX' } }) // height 165mm
  const psu850w = await prisma.product.findUniqueOrThrow({ where: { sku: 'PSU-CORSAIR-RM850X-SHIFT-850W' } }) // 850W
  const psu500w = await prisma.product.findUniqueOrThrow({ where: { sku: 'PSU-CM-MWE-BRONZE-500W-V2' } }) // 500W

  // 5A: PSU đủ công suất, fit Case, fit Cooler
  console.log('5A: Testing compatible build (PSU sufficient, GPU fits, Cooler fits)...')
  const buildA = await checkCompatibility({
    productIds: [
      cpuProd.id,
      mbProd.id,
      ramProd.id,
      gpuProd.id,
      caseCorsair.id,
      coolerAk620.id,
      psu850w.id,
    ],
  })
  console.log(`Build A result: compatible=${buildA.compatible}, estimatedPower=${buildA.estimatedPower}W, recommendedPSU=${buildA.recommendedPSU}W`)
  console.log(`Build A errors: ${JSON.stringify(buildA.errors)}`)
  console.log(`Build A warnings: ${JSON.stringify(buildA.warnings)}`)
  if (!buildA.compatible || buildA.errors.length > 0) {
    throw new Error('Build A expected compatible, but got errors: ' + buildA.errors.join('; '))
  }
  console.log('5A PASSED: PSU đủ công suất và toàn bộ linh kiện tương thích.\n')

  // 5B: PSU không đủ công suất
  console.log('5B: Testing insufficient PSU wattage...')
  const buildB = await checkCompatibility({
    productIds: [
      cpuProd.id,
      mbProd.id,
      ramProd.id,
      gpuProd.id,
      caseCorsair.id,
      coolerAk620.id,
      psu500w.id,
    ],
  })
  console.log(`Build B result: compatible=${buildB.compatible}, errors=${JSON.stringify(buildB.errors)}`)
  const hasPsuError = buildB.errors.some((e) => e.includes('PSU wattage') && e.includes('below the recommended minimum'))
  if (!hasPsuError) {
    throw new Error('Build B expected PSU wattage error, but none found!')
  }
  console.log('5B PASSED: Correctly caught insufficient PSU wattage error.\n')

  // 5C: GPU vượt GPU clearance của Case
  console.log('5C: Testing GPU length exceeding Case clearance...')
  const buildC = await checkCompatibility({
    productIds: [
      cpuProd.id,
      mbProd.id,
      ramProd.id,
      gpuProd.id, // 348mm
      caseNyx.id, // 320mm clearance
      psu850w.id,
    ],
  })
  console.log(`Build C result: compatible=${buildC.compatible}, errors=${JSON.stringify(buildC.errors)}`)
  const hasGpuClearanceError = buildC.errors.some((e) => e.includes('GPU length') && e.includes('exceeds case GPU clearance'))
  if (!hasGpuClearanceError) {
    throw new Error('Build C expected GPU clearance error, but none found!')
  }
  console.log('5C PASSED: Correctly caught GPU clearance error.\n')

  // 5D: Cooler vượt CPU cooler clearance
  console.log('5D: Testing CPU cooler height exceeding Case clearance...')
  const buildD = await checkCompatibility({
    productIds: [
      cpuProd.id,
      mbProd.id,
      ramProd.id,
      caseQ300L.id, // 159mm cooler clearance
      coolerD15.id, // 165mm height
      psu850w.id,
    ],
  })
  console.log(`Build D result: compatible=${buildD.compatible}, errors=${JSON.stringify(buildD.errors)}`)
  const hasCoolerClearanceError = buildD.errors.some((e) => e.includes('CPU cooler height') && e.includes('exceeds case cooler clearance'))
  if (!hasCoolerClearanceError) {
    throw new Error('Build D expected CPU cooler clearance error, but none found!')
  }
  console.log('5D PASSED: Correctly caught CPU cooler clearance error.\n')

  // 6. Test Product API
  console.log('--- Step 6: Test Product API for PSU, Case, Cooler, Monitor ---')
  const catPsu = categories.find((c) => c.slug === 'psu')!
  const catCase = categories.find((c) => c.slug === 'case')!
  const catCooler = categories.find((c) => c.slug === 'cpu-cooler')!
  const catMonitor = categories.find((c) => c.slug === 'monitor')!

  const apiPsu = await getProducts({ categoryId: catPsu.id, limit: 10 })
  console.log(`API getProducts(psu): returned ${apiPsu.data.length} items, total=${apiPsu.pagination.total}`)
  if (apiPsu.data.length === 0 || apiPsu.pagination.total < 30) throw new Error('API PSU query failed')

  const apiCase = await getProducts({ categoryId: catCase.id, limit: 10 })
  console.log(`API getProducts(case): returned ${apiCase.data.length} items, total=${apiCase.pagination.total}`)
  if (apiCase.data.length === 0 || apiCase.pagination.total < 20) throw new Error('API Case query failed')

  const apiCooler = await getProducts({ categoryId: catCooler.id, limit: 10 })
  console.log(`API getProducts(cpu-cooler): returned ${apiCooler.data.length} items, total=${apiCooler.pagination.total}`)
  if (apiCooler.data.length === 0 || apiCooler.pagination.total < 15) throw new Error('API Cooler query failed')

  const apiMonitor = await getProducts({ categoryId: catMonitor.id, limit: 10 })
  console.log(`API getProducts(monitor): returned ${apiMonitor.data.length} items, total=${apiMonitor.pagination.total}`)
  if (apiMonitor.data.length === 0 || apiMonitor.pagination.total < 20) throw new Error('API Monitor query failed')

  // Test getProductBySlug
  const testPsu = await getProductBySlug('corsair-rm850x-shift-850w-80-plus-gold-atx3')
  if (!testPsu || testPsu.category?.slug !== 'psu' || testPsu.brand?.slug !== 'corsair') {
    throw new Error('API getProductBySlug for PSU failed')
  }

  const testCase = await getProductBySlug('asus-rog-hyperion-gr701-full-tower-flagship')
  if (!testCase || testCase.category?.slug !== 'case' || testCase.brand?.slug !== 'asus') {
    throw new Error('API getProductBySlug for Case failed')
  }

  const testCooler = await getProductBySlug('noctua-nh-d15-chromax-black-flagship')
  if (!testCooler || testCooler.category?.slug !== 'cpu-cooler' || testCooler.brand?.slug !== 'noctua') {
    throw new Error('API getProductBySlug for Cooler failed')
  }

  const testMonitor = await getProductBySlug('samsung-odyssey-oled-g8-g80sd-32-inch-4k-240hz')
  if (!testMonitor || testMonitor.category?.slug !== 'monitor' || testMonitor.brand?.slug !== 'samsung') {
    throw new Error('API getProductBySlug for Monitor failed')
  }

  console.log('Step 6 PASSED: Product API returns correct data and filters for all Phase 4 categories.\n')

  console.log('=== ALL PHASE 4 VERIFICATIONS PASSED SUCCESSFULLY! ===')
}

runVerification()
  .catch((e) => {
    console.error('VERIFICATION ERROR:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
