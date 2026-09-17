import prisma from '../src/config/prisma'

async function main() {
  const cats = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
  })
  for (const c of cats) {
    console.log(`${c.id} \t ${c.slug} \t ${c.name} \t products=${c._count.products}`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
