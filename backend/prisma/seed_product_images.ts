import prisma from '../src/config/prisma'
import { catalogProductImages, pilotProductImages, ProductImageData } from './product-images-data'

export async function seedProductImages(isPilot = false) {
  const imagesToSeed: ProductImageData[] = isPilot ? pilotProductImages : catalogProductImages
  console.log(`Starting Product Images Seed (${isPilot ? 'PILOT (10 items)' : 'FULL CATALOG'})...`)
  console.log(`Total image records to process: ${imagesToSeed.length}`)

  let insertedCount = 0
  let updatedCount = 0
  let notFoundCount = 0
  const notFoundSkus: string[] = []

  for (const item of imagesToSeed) {
    const product = await prisma.product.findUnique({
      where: { sku: item.sku },
      select: { id: true, sku: true, name: true },
    })

    if (!product) {
      notFoundCount++
      notFoundSkus.push(item.sku)
      console.warn(`[WARN] Product with SKU "${item.sku}" not found in database. Skipping.`)
      continue
    }

    const existingImage = await prisma.productImage.findFirst({
      where: {
        productId: product.id,
        url: item.url,
      },
    })

    if (existingImage) {
      await prisma.productImage.update({
        where: { id: existingImage.id },
        data: {
          alt: item.alt,
          sortOrder: item.sortOrder ?? 0,
        },
      })
      updatedCount++
    } else {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: item.url,
          alt: item.alt,
          sortOrder: item.sortOrder ?? 0,
        },
      })
      insertedCount++
    }
  }

  console.log('\n--- SEED PRODUCT IMAGES SUMMARY ---')
  console.log(`Processed: ${imagesToSeed.length}`)
  console.log(`Inserted:  ${insertedCount}`)
  console.log(`Updated:   ${updatedCount}`)
  console.log(`Not Found: ${notFoundCount}`)
  if (notFoundSkus.length > 0) {
    console.log(`Missing SKUs: ${notFoundSkus.join(', ')}`)
  }
  console.log('-----------------------------------\n')

  return {
    processed: imagesToSeed.length,
    inserted: insertedCount,
    updated: updatedCount,
    notFound: notFoundCount,
    notFoundSkus,
  }
}

if (require.main === module) {
  const isPilot = process.argv.includes('--pilot')
  seedProductImages(isPilot)
    .catch((err) => {
      console.error('Error during product image seed:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma.$disconnect()
    })
}
