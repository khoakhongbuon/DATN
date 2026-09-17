import prisma from '../config/prisma'

export async function getAllBrands() {
  return prisma.brand.findMany({ orderBy: { name: 'asc' } })
}

export async function getBrandById(id: string) {
  return prisma.brand.findUnique({ where: { id } })
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({ where: { slug } })
}

export async function createBrand(data: {
  name: string
  slug: string
  description?: string
  logo?: string
}) {
  const existing = await prisma.brand.findUnique({ where: { slug: data.slug } })
  if (existing) throw { status: 409, message: 'Slug already exists' }

  return prisma.brand.create({ data: {
    name: data.name,
    slug: data.slug,
    description: data.description,
    logo: data.logo,
  } })
}

export async function updateBrand(id: string, data: {
  name?: string
  slug?: string
  description?: string
  logo?: string
}) {
  const brand = await prisma.brand.findUnique({ where: { id } })
  if (!brand) throw { status: 404, message: 'Brand not found' }

  if (data.slug && data.slug !== brand.slug) {
    const exists = await prisma.brand.findUnique({ where: { slug: data.slug } })
    if (exists) throw { status: 409, message: 'Slug already exists' }
  }

  return prisma.brand.update({ where: { id }, data: {
    name: data.name ?? undefined,
    slug: data.slug ?? undefined,
    description: data.description ?? undefined,
    logo: data.logo ?? undefined,
  } })
}

export async function deleteBrand(id: string) {
  const brand = await prisma.brand.findUnique({ where: { id } })
  if (!brand) throw { status: 404, message: 'Brand not found' }

  const productCount = await prisma.product.count({ where: { brandId: id } })
  if (productCount > 0) throw { status: 409, message: 'Brand has products and cannot be deleted' }

  await prisma.brand.delete({ where: { id } })
  return true
}
