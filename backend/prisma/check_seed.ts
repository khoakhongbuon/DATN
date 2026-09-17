import prisma from '../src/config/prisma'

async function main() {
  const categories = await prisma.category.count()
  const brands = await prisma.brand.count()
  const users = await prisma.user.count()
  const products = await prisma.product.count()

  console.log(`counts: categories=${categories}, brands=${brands}, users=${users}, products=${products}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
