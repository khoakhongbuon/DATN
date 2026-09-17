import prisma from '../src/config/prisma'

async function main() {
  const brands = await prisma.brand.findMany({
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  })
  for (const b of brands) {
    console.log(`${b.id}\t${b.slug}\t${b.name}\tproducts=${b._count.products}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
