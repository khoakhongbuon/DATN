import prisma from '../src/config/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  // create categories
  const categories = [
    'CPU','GPU','Mainboard','RAM','SSD','HDD','PSU','Case','CPU Cooler'
  ]

  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-')
      }
    })
  }

  // create brands
  const brands = ['AMD','Intel','ASUS','MSI','Gigabyte','Corsair','Kingston','Samsung','Cooler Master']
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: { name: b, slug: b.toLowerCase().replace(/\s+/g, '-') }
    })
  }

  // create a user (password hashed)
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10)
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Seed User',
      email: 'user@example.com',
      password: passwordHash,
      phone: ''
    }
  })

  // sample products minimal
  const ryzen = await prisma.product.upsert({
    where: { sku: 'RYZ-7800X3D' },
    update: {},
    create: {
      name: 'Ryzen 7 7800X3D',
      slug: 'ryzen-7-7800x3d',
      description: 'AMD Ryzen 7 7800X3D',
      price: 3990000,
      salePrice: 3790000,
      stock: 10,
      sku: 'RYZ-7800X3D',
      category: { connect: { slug: 'cpu' } },
      brand: { connect: { slug: 'amd' } },
    }
  })

  // mainboard AM5
  await prisma.product.upsert({
    where: { sku: 'MB-AM5-EX' },
    update: {},
    create: {
      name: 'Mainboard AM5 Example',
      slug: 'mainboard-am5-example',
      description: 'AM5 socket mainboard',
      price: 2490000,
      stock: 5,
      sku: 'MB-AM5-EX',
      category: { connect: { slug: 'mainboard' } },
      brand: { connect: { slug: 'asus' } },
    }
  })

  // RAM DDR5
  await prisma.product.upsert({
    where: { sku: 'RAM-DDR5-16GB' },
    update: {},
    create: {
      name: '16GB DDR5 RAM',
      slug: '16gb-ddr5-ram',
      description: 'DDR5 5200MHz 16GB',
      price: 899000,
      stock: 20,
      sku: 'RAM-DDR5-16GB',
      category: { connect: { slug: 'ram' } },
      brand: { connect: { slug: 'kingston' } },
    }
  })

  // GPU example
  await prisma.product.upsert({
    where: { sku: 'GPU-EX-01' },
    update: {},
    create: {
      name: 'GPU Example',
      slug: 'gpu-example',
      description: 'Sample GPU for seed',
      price: 1299000,
      stock: 7,
      sku: 'GPU-EX-01',
      category: { connect: { slug: 'gpu' } },
      brand: { connect: { slug: 'msi' } },
    }
  })

  // PSU
  await prisma.product.upsert({
    where: { sku: 'PSU-650W' },
    update: {},
    create: {
      name: 'Power Supply 650W',
      slug: 'power-supply-650w',
      description: '650W PSU',
      price: 599000,
      stock: 12,
      sku: 'PSU-650W',
      category: { connect: { slug: 'psu' } },
      brand: { connect: { slug: 'corsair' } },
    }
  })

  // Case
  await prisma.product.upsert({
    where: { sku: 'CASE-MID' },
    update: {},
    create: {
      name: 'Mid Tower Case',
      slug: 'mid-tower-case',
      description: 'ATX Mid Tower Case',
      price: 399000,
      stock: 8,
      sku: 'CASE-MID',
      category: { connect: { slug: 'case' } },
      brand: { connect: { slug: 'cooler-master' } },
    }
  })

  // CPU Cooler
  await prisma.product.upsert({
    where: { sku: 'COOL-01' },
    update: {},
    create: {
      name: 'CPU Cooler Example',
      slug: 'cpu-cooler-example',
      description: 'Air cooler',
      price: 199000,
      stock: 15,
      sku: 'COOL-01',
      category: { connect: { slug: 'cpu-cooler' } },
      brand: { connect: { slug: 'cooler-master' } },
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
