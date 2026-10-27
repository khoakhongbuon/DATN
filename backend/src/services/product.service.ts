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

export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

export function normalizeSearchKeyword(str: string): string {
  return removeVietnameseTones(str.trim().toLowerCase()).replace(/\s+/g, ' ')
}

export interface CategoryAliasRule {
  categorySlug: string
  patterns: string[]
}

export const CATEGORY_ALIAS_RULES: CategoryAliasRule[] = [
  // GPU must be checked before monitor because 'card man hinh' contains 'man hinh'
  {
    categorySlug: 'gpu',
    patterns: ['card man hinh', 'card do hoa', 'card do hoa roi', 'card roi', 'vga', 'gpu'],
  },
  {
    categorySlug: 'monitor',
    patterns: ['man hinh may tinh', 'man hinh', 'manhinh', 'monitor', 'monitors'],
  },
  {
    categorySlug: 'cpu',
    patterns: ['bo vi xu ly', 'vi xu ly', 'chip cpu', 'chip', 'cpu'],
  },
  {
    categorySlug: 'mainboard',
    patterns: ['bo mach chu', 'bo mach', 'mainboard', 'main may tinh'],
  },
  {
    categorySlug: 'cpu-cooler',
    patterns: ['tan nhiet cpu', 'tan nhiet nuoc', 'tan nhiet khi', 'tan nhiet', 'quat cpu', 'cpu cooler', 'cooler'],
  },
  {
    categorySlug: 'psu',
    patterns: ['nguon may tinh', 'nguon pc', 'nguon', 'psu', 'power supply'],
  },
  {
    categorySlug: 'case',
    patterns: ['vo case', 'vo may tinh', 'thung may tinh', 'thung may', 'case pc', 'case'],
  },
  {
    categorySlug: 'ram',
    patterns: ['bo nho trong', 'ram pc', 'ram'],
  },
  {
    categorySlug: 'ssd',
    patterns: ['o cung ssd', 'o ssd', 'ssd'],
  },
  {
    categorySlug: 'hdd',
    patterns: ['o cung hdd', 'o hdd', 'hdd'],
  },
  {
    categorySlug: 'keyboard',
    patterns: ['ban phim co', 'ban phim may tinh', 'ban phim', 'phim co', 'keyboard'],
  },
  {
    categorySlug: 'mouse',
    patterns: ['chuot may tinh', 'chuot gaming', 'chuot khong day', 'chuot', 'mouse'],
  },
  {
    categorySlug: 'headset',
    patterns: ['tai nghe gaming', 'tai nghe chup tai', 'tai nghe', 'headset', 'headphone'],
  },
  {
    categorySlug: 'mousepad',
    patterns: ['lot chuot', 'ban di chuot', 'mousepad'],
  },
  {
    categorySlug: 'webcam',
    patterns: ['webcam'],
  },
  {
    categorySlug: 'controller',
    patterns: ['tay cam choi game', 'tay cam', 'gamepad', 'controller'],
  },
  {
    categorySlug: 'wifi-card',
    patterns: ['card mang wifi', 'card mang', 'card wifi', 'wifi card'],
  },
  {
    categorySlug: 'printer',
    patterns: ['may in', 'printer'],
  },
]

export function buildSearchCondition(searchQuery: string): any {
  const q = searchQuery.trim()
  if (!q) return null

  const normalizedQ = normalizeSearchKeyword(q)

  let matchedRule: CategoryAliasRule | null = null
  let matchedPattern = ''
  let remainingWords = ''

  for (const rule of CATEGORY_ALIAS_RULES) {
    for (const pattern of rule.patterns) {
      if (normalizedQ === pattern) {
        matchedRule = rule
        matchedPattern = pattern
        remainingWords = ''
        break
      } else if (normalizedQ.startsWith(pattern + ' ')) {
        if (pattern.length > matchedPattern.length) {
          matchedRule = rule
          matchedPattern = pattern
          remainingWords = normalizedQ.substring(pattern.length).trim()
        }
      } else if (normalizedQ.endsWith(' ' + pattern)) {
        if (pattern.length > matchedPattern.length) {
          matchedRule = rule
          matchedPattern = pattern
          remainingWords = normalizedQ.substring(0, normalizedQ.length - pattern.length).trim()
        }
      }
    }
    if (matchedRule && remainingWords === '') {
      break
    }
  }

  if (matchedRule) {
    if (!remainingWords) {
      // Exact category alias query (e.g. 'Màn hình', 'man hinh', 'Monitor', 'VGA')
      return {
        OR: [
          { category: { slug: matchedRule.categorySlug } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
          { name: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q, mode: 'insensitive' } },
          { brand: { name: { contains: q, mode: 'insensitive' } } },
          { brand: { slug: { contains: q, mode: 'insensitive' } } },
        ],
      }
    }

    // Category alias + keyword query (e.g. 'màn hình asus', 'card màn hình msi')
    return {
      OR: [
        {
          AND: [
            { category: { slug: matchedRule.categorySlug } },
            {
              OR: [
                { name: { contains: remainingWords, mode: 'insensitive' } },
                { sku: { contains: remainingWords, mode: 'insensitive' } },
                { slug: { contains: remainingWords, mode: 'insensitive' } },
                { brand: { name: { contains: remainingWords, mode: 'insensitive' } } },
                { brand: { slug: { contains: remainingWords, mode: 'insensitive' } } },
              ],
            },
          ],
        },
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
        { brand: { slug: { contains: q, mode: 'insensitive' } } },
      ],
    }
  }

  // Standard search across product identifiers, brand, and category
  return {
    OR: [
      { name: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
      { category: { slug: { contains: q, mode: 'insensitive' } } },
      { brand: { name: { contains: q, mode: 'insensitive' } } },
      { brand: { slug: { contains: q, mode: 'insensitive' } } },
    ],
  }
}

export async function getProducts(options: {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  categorySlug?: string
  brandId?: string
  brandSlug?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  requireCategory?: boolean
  includeInactive?: boolean
  specSocket?: string
  specRamType?: string
  specCapacity?: string
  specInterface?: string
  specFormFactor?: string
  specWattage?: string
  specResolution?: string
}) {
  const hasBrand = Boolean(options.brandId || options.brandSlug)
  const hasCategory = Boolean(options.categoryId || options.categorySlug)
  if (options.requireCategory && hasBrand && !hasCategory) {
    throw {
      status: 400,
      message: 'Vui lòng chọn danh mục trước khi lọc theo thương hiệu',
      requiresCategory: true,
      code: 'CATEGORY_REQUIRED',
    }
  }

  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 20))
  const skip = (page - 1) * limit

  const andConditions: any[] = []

  if (!options.includeInactive) {
    andConditions.push({ isActive: true })
  }

  if (options.search) {
    const searchCond = buildSearchCondition(options.search)
    if (searchCond) {
      andConditions.push(searchCond)
    }
  }

  if (options.categoryId) {
    andConditions.push({ categoryId: options.categoryId })
  } else if (options.categorySlug) {
    const rawSlugs = options.categorySlug.split(',').map((s) => s.trim()).filter(Boolean)
    if (rawSlugs.length > 1) {
      const lowerSlugs = rawSlugs.map((s) => s.toLowerCase())
      andConditions.push({
        OR: [
          { categoryId: { in: rawSlugs } },
          { category: { slug: { in: lowerSlugs } } },
          { category: { parent: { slug: { in: lowerSlugs } } } },
          ...rawSlugs.map((s) => ({ category: { name: { equals: s, mode: 'insensitive' as const } } })),
          ...rawSlugs.map((s) => ({ category: { parent: { name: { equals: s, mode: 'insensitive' as const } } } })),
        ],
      })
    } else if (rawSlugs.length === 1) {
      const s = rawSlugs[0]
      const sLower = s.toLowerCase()
      andConditions.push({
        OR: [
          { categoryId: s },
          { category: { slug: { equals: sLower, mode: 'insensitive' as const } } },
          { category: { name: { equals: s, mode: 'insensitive' as const } } },
          { category: { parent: { slug: { equals: sLower, mode: 'insensitive' as const } } } },
          { category: { parent: { name: { equals: s, mode: 'insensitive' as const } } } },
        ],
      })
    }
  }

  if (options.brandId) {
    andConditions.push({ brandId: options.brandId })
  } else if (options.brandSlug) {
    const b = options.brandSlug.trim()
    const bLower = b.toLowerCase()
    andConditions.push({
      OR: [
        { brandId: b },
        { brand: { slug: { equals: bLower, mode: 'insensitive' as const } } },
        { brand: { name: { equals: b, mode: 'insensitive' as const } } },
      ],
    })
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    const priceCondition: any = {}
    if (options.minPrice !== undefined) priceCondition.gte = options.minPrice
    if (options.maxPrice !== undefined) priceCondition.lte = options.maxPrice
    andConditions.push({ price: priceCondition })
  }

  if (options.specSocket) {
    const s = options.specSocket.trim()
    if (s) {
      andConditions.push({
        OR: [
          { specifications: { some: { socket: { contains: s, mode: 'insensitive' } } } },
          { name: { contains: s, mode: 'insensitive' } },
        ],
      })
    }
  }

  if (options.specRamType) {
    const r = options.specRamType.trim()
    if (r) {
      andConditions.push({
        OR: [
          { specifications: { some: { ramType: { contains: r, mode: 'insensitive' } } } },
          { name: { contains: r, mode: 'insensitive' } },
        ],
      })
    }
  }

  if (options.specCapacity) {
    const c = options.specCapacity.trim()
    if (c) {
      andConditions.push({ name: { contains: c, mode: 'insensitive' } })
    }
  }

  if (options.specInterface) {
    const i = options.specInterface.trim()
    if (i) {
      andConditions.push({
        OR: [
          { specifications: { some: { interface: { contains: i, mode: 'insensitive' } } } },
          { name: { contains: i, mode: 'insensitive' } },
        ],
      })
    }
  }

  if (options.specFormFactor) {
    const f = options.specFormFactor.trim()
    if (f) {
      andConditions.push({
        OR: [
          { specifications: { some: { formFactor: { contains: f, mode: 'insensitive' } } } },
          { name: { contains: f, mode: 'insensitive' } },
        ],
      })
    }
  }

  if (options.specWattage) {
    const w = options.specWattage.trim()
    if (w) {
      andConditions.push({ name: { contains: w, mode: 'insensitive' } })
    }
  }

  if (options.specResolution) {
    const res = options.specResolution.trim()
    if (res) {
      andConditions.push({ name: { contains: res, mode: 'insensitive' } })
    }
  }

  const where: any = andConditions.length > 0 ? { AND: andConditions } : {}

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
        categoryId: true,
        brandId: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        images: {
          select: { url: true, alt: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        specifications: {
          select: {
            socket: true,
            ramType: true,
            ramSlots: true,
            maxRam: true,
            tdp: true,
            length: true,
            height: true,
            wattage: true,
            type: true,
            capacity: true,
            formFactor: true,
          },
        },
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

export async function getProductById(id: string, includeInactive = false) {
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true, brand: true } })
  if (!product) return null
  if (!includeInactive && !product.isActive) return null
  return product
}

export async function getProductBySlug(slug: string, includeInactive = false) {
  const product = await prisma.product.findUnique({ where: { slug }, include: { category: true, brand: true } })
  if (!product) return null
  if (!includeInactive && !product.isActive) return null
  return product
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
