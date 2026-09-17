import prisma from '../config/prisma'

export async function getAllCategories() {
  return prisma.category.findMany({
    include: { children: true },
    orderBy: { name: 'asc' },
  })
}

export async function getCategoryById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    include: { children: true, parent: true },
  })
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { children: true, parent: true },
  })
}

export async function createCategory(data: {
  name: string
  slug: string
  description?: string
  image?: string
  parentId?: string | null
}) {
  // check slug unique
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } })
  if (existing) throw { status: 409, message: 'Slug already exists' }

  // if parentId provided, ensure exists
  if (data.parentId) {
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } })
    if (!parent) throw { status: 400, message: 'parentId does not exist' }
  }

  return prisma.category.create({ data: {
    name: data.name,
    slug: data.slug,
    description: data.description,
    image: data.image,
    parentId: data.parentId || null,
  } })
}

async function isDescendant(childId: string, parentId: string): Promise<boolean> {
  // walk up from parentId to see if we reach childId
  let current = await prisma.category.findUnique({ where: { id: parentId } })
  while (current) {
    if (!current.parentId) return false
    if (current.parentId === childId) return true
    current = await prisma.category.findUnique({ where: { id: current.parentId } })
  }
  return false
}

export async function updateCategory(id: string, data: {
  name?: string
  slug?: string
  description?: string
  image?: string
  parentId?: string | null
}) {
  const cat = await prisma.category.findUnique({ where: { id } })
  if (!cat) throw { status: 404, message: 'Category not found' }

  if (data.slug && data.slug !== cat.slug) {
    const exists = await prisma.category.findUnique({ where: { slug: data.slug } })
    if (exists) throw { status: 409, message: 'Slug already exists' }
  }

  if (data.parentId) {
    if (data.parentId === id) throw { status: 400, message: 'parentId cannot be same as id' }
    const parent = await prisma.category.findUnique({ where: { id: data.parentId } })
    if (!parent) throw { status: 400, message: 'parentId does not exist' }
    // prevent circular
    const circular = await isDescendant(id, data.parentId)
    if (circular) throw { status: 400, message: 'Circular parent relationship detected' }
  }

  return prisma.category.update({ where: { id }, data: {
    name: data.name ?? undefined,
    slug: data.slug ?? undefined,
    description: data.description ?? undefined,
    image: data.image ?? undefined,
    parentId: data.parentId === undefined ? undefined : data.parentId,
  } })
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({ where: { id } })
  if (!cat) throw { status: 404, message: 'Category not found' }

  const productCount = await prisma.product.count({ where: { categoryId: id } })
  if (productCount > 0) throw { status: 409, message: 'Category has products and cannot be deleted' }

  const childrenCount = await prisma.category.count({ where: { parentId: id } })
  if (childrenCount > 0) throw { status: 400, message: 'Category has child categories and cannot be deleted' }

  await prisma.category.delete({ where: { id } })
  return true
}
