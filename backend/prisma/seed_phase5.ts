import prisma from '../src/config/prisma'
import {
  mice,
  keyboards,
  headsets,
  mousepads,
  webcams,
  controllers,
  wifiCards,
  printers,
  phase5Categories,
  phase5Brands,
  BasePeripheralSeed,
} from './phase5-data'

export async function seedPhase5() {
  console.log('=== PHASE 5 SEED START ===\n')

  // 1. Upsert Categories
  console.log('1. Upserting Phase 5 Categories...')
  for (const c of phase5Categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, description: c.description },
    })
  }

  // 2. Upsert Brands
  console.log('2. Upserting Phase 5 Brands...')
  for (const b of phase5Brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { name: b.name, slug: b.slug },
    })
  }

  const allPhase5: BasePeripheralSeed[] = [
    ...mice,
    ...keyboards,
    ...headsets,
    ...mousepads,
    ...webcams,
    ...controllers,
    ...wifiCards,
    ...printers,
  ]

  // 3. Check internal duplicates
  const skuSet = new Set(allPhase5.map((p) => p.sku))
  const slugSet = new Set(allPhase5.map((p) => p.slug))
  if (skuSet.size !== allPhase5.length || slugSet.size !== allPhase5.length) {
    throw new Error('Phase 5 contains duplicate SKU or slug values within itself')
  }

  // 4. Check occupied products in DB
  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: allPhase5.map((p) => p.sku) } },
        { slug: { in: allPhase5.map((p) => p.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of allPhase5) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 5 SKU/slug collision for ${product.sku}; aborting`)
    }
  }

  // 5. Seed items by category
  const groups = [
    { items: mice, categorySlug: 'mouse', label: 'Mouse' },
    { items: keyboards, categorySlug: 'keyboard', label: 'Keyboard' },
    { items: headsets, categorySlug: 'headset', label: 'Headset' },
    { items: mousepads, categorySlug: 'mousepad', label: 'Mousepad' },
    { items: webcams, categorySlug: 'webcam', label: 'Webcam' },
    { items: controllers, categorySlug: 'controller', label: 'Controller' },
    { items: wifiCards, categorySlug: 'wifi-card', label: 'WiFi Card' },
    { items: printers, categorySlug: 'printer', label: 'Printer' },
  ]

  let totalSeeded = 0
  for (const group of groups) {
    let groupCount = 0
    for (const item of group.items) {
      const existing = occupiedProducts.find((p) => p.sku === item.sku)
      if (existing) continue

      await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: item.description,
          price: item.price,
          salePrice: item.salePrice,
          stock: item.stock,
          category: { connect: { slug: group.categorySlug } },
          brand: { connect: { slug: item.brandSlug } },
          specifications: {
            create: {
              productType: item.productType,
              interface: item.interface,
              type: item.type,
              formFactor: item.formFactor,
              speed: item.speed,
              extra: item.extra as any,
            },
          },
        },
      })
      groupCount++
      totalSeeded++
    }
    console.log(`-> ${group.label.padEnd(12)} (${group.categorySlug.padEnd(10)}): Seeded ${groupCount}/${group.items.length} products.`)
  }

  console.log(`\n=== PHASE 5 SEED COMPLETED: ${totalSeeded} new products created ===\n`)
}

async function main() {
  await seedPhase5()
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
