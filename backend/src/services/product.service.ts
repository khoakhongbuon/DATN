import prisma from '../config/prisma'

type ProductCreateInput = {
  name: string
  slug: string
  description?: string | null
  price: number
  salePrice?: number | null
  stock: number
  sku: string
  categoryId?: string | null
  brandId?: string | null
}

export async function getProducts(options: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 20))
  const skip = (page - 1) * limit

  const where: any = { }

  if (options.search) {
    const q = options.search
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (options.categoryId) where.categoryId = options.categoryId
  if (options.brandId) where.brandId = options.brandId
  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    where.price = {}
    if (options.minPrice !== undefined) where.price.gte = options.minPrice
    if (options.maxPrice !== undefined) where.price.lte = options.maxPrice
  }

  const allowedSort = new Set(['price', 'name', 'createdAt'])
  const orderBy: any = {}
  if (options.sortBy && allowedSort.has(options.sortBy)) {
    orderBy[options.sortBy] = options.sortOrder ?? 'asc'
  } else {
    orderBy.createdAt = 'desc'
  }

  const [data, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        price: true,
        salePrice: true,
        stock: true,
        createdAt: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
      }
    }),
    prisma.product.count({ where }),
  ])

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  }
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({ where: { id }, include: { category: true, brand: true } })
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({ where: { slug }, include: { category: true, brand: true } })
}

export async function createProduct(data: ProductCreateInput) {
  // validation checks are expected in controller but double-check uniqueness
  const existingSlug = await prisma.product.findUnique({ where: { slug: data.slug } })
  if (existingSlug) throw { status: 409, message: 'Slug already exists' }

  const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } })
  if (existingSku) throw { status: 409, message: 'SKU already exists' }

  // category and brand exist checks
  if (data.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: data.categoryId } })
    if (!cat) throw { status: 400, message: 'categoryId does not exist' }
  }
  if (data.brandId) {
    const b = await prisma.brand.findUnique({ where: { id: data.brandId } })
    if (!b) throw { status: 400, message: 'brandId does not exist' }
  }

  return prisma.product.create({ data: {
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: Math.max(0, Math.floor(data.price)),
    salePrice: data.salePrice === undefined ? null : Math.floor(data.salePrice as number),
    stock: Math.max(0, Math.floor(data.stock)),
    sku: data.sku,
    categoryId: data.categoryId || null,
    brandId: data.brandId || null,
  } })
}

export async function updateProduct(id: string, updates: Partial<ProductCreateInput>) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw { status: 404, message: 'Product not found' }

  if (updates.slug && updates.slug !== product.slug) {
    const ex = await prisma.product.findUnique({ where: { slug: updates.slug } })
    if (ex) throw { status: 409, message: 'Slug already exists' }
  }
  if (updates.sku && updates.sku !== product.sku) {
    const ex = await prisma.product.findUnique({ where: { sku: updates.sku } })
    if (ex) throw { status: 409, message: 'SKU already exists' }
  }
  if (updates.categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: updates.categoryId } })
    if (!cat) throw { status: 400, message: 'categoryId does not exist' }
  }
  if (updates.brandId) {
    const b = await prisma.brand.findUnique({ where: { id: updates.brandId } })
    if (!b) throw { status: 400, message: 'brandId does not exist' }
  }

  const data: any = {}
  if (updates.name !== undefined) data.name = updates.name
  if (updates.slug !== undefined) data.slug = updates.slug
  if (updates.description !== undefined) data.description = updates.description
  if (updates.price !== undefined) data.price = Math.max(0, Math.floor(updates.price as number))
  if (updates.salePrice !== undefined) data.salePrice = updates.salePrice === null ? null : Math.floor(updates.salePrice as number)
  if (updates.stock !== undefined) data.stock = Math.max(0, Math.floor(updates.stock as number))
  if (updates.sku !== undefined) data.sku = updates.sku
  if (updates.categoryId !== undefined) data.categoryId = updates.categoryId
  if (updates.brandId !== undefined) data.brandId = updates.brandId

  return prisma.product.update({ where: { id }, data })
}

export async function deleteProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id } })
  if (!p) throw { status: 404, message: 'Product not found' }

  const checks = await Promise.all([
    prisma.cartItem.count({ where: { productId: id } }),
    prisma.orderItem.count({ where: { productId: id } }),
    prisma.review.count({ where: { productId: id } }),
    prisma.productImage.count({ where: { productId: id } }),
    prisma.productSpecification.count({ where: { productId: id } }),
  ])

  const totalUsage = checks.reduce((a, b) => a + b, 0)
  if (totalUsage > 0) throw { status: 409, message: 'Product is in use and cannot be deleted' }

  await prisma.product.delete({ where: { id } })
  return true
}
