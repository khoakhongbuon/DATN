import OpenAI from 'openai'
import { Prisma } from '@prisma/client'
import prisma from '../config/prisma'

export type AiProduct = {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  stock: number
  image: string | null
}

type ProductContext = AiProduct & {
  category: string | null
  brand: string | null
  specifications: Record<string, unknown>[]
}


const MAX_MESSAGE_LENGTH = 2000
const PRODUCT_CONTEXT_LIMIT = 12
const OPENAI_MODEL = 'gpt-4o-mini'
const OPENAI_TIMEOUT_MS = 15000

const categoryAliases: Array<{ name: string; slug: string; terms: string[] }> = [
  { name: 'CPU Cooler', slug: 'cpu-cooler', terms: ['cpu cooler', 'cooler', 'tan nhiet', 'quat tan nhiet', 'tan khi', 'tan nuoc'] },
  { name: 'CPU', slug: 'cpu', terms: ['cpu', 'processor', 'vi xu ly', 'bo xu ly', 'chip'] },
  { name: 'GPU', slug: 'gpu', terms: ['gpu', 'vga', 'card man hinh', 'card do hoa'] },
  { name: 'Mainboard', slug: 'mainboard', terms: ['mainboard', 'main', 'bo mach chu', 'motherboard', 'bo mach'] },
  { name: 'RAM', slug: 'ram', terms: ['ram', 'bo nho', 'thanh ram'] },
  { name: 'SSD', slug: 'ssd', terms: ['ssd', 'o cung the ran', 'o the ran'] },
  { name: 'HDD', slug: 'hdd', terms: ['hdd', 'o cung co', 'o cung hdd'] },
  { name: 'PSU', slug: 'psu', terms: ['psu', 'nguon', 'power supply', 'bo nguon'] },
  { name: 'Case', slug: 'case', terms: ['case', 'vo may', 'thung may'] },
]

const stopWords = new Set([
  'cho', 'toi', 'minh', 'em', 'ban', 'ad', 'shop', 'muon', 'can', 'tu', 'van', 'hoi',
  'nen', 'chon', 'mua', 'nao', 'gi', 'sao', 'the', 'nao', 'ra', 'sao',
  'voi', 'gia', 'khoang', 'tam', 'duoi', 'tren', 'phu', 'hop', 'tot', 'nhat',
  'mot', 'bo', 'cau', 'hinh', 'va', 'hay', 'la', 'co', 'the', 'khong', 'chua',
  'su', 'dung', 'de', 'xin', 'trieu', 'tr', 'm', 'million', 'k', 'vnd', 'dong',
  'duoc', 'di', 'a', 'san', 'pham', 'loai', 'dong', 'hang', 'chiec', 'cai',
  'chut', 'ti', 'day', 'nhe', 'thong', 'tin', 'ton', 'tai', 'goi', 'y', 'huong',
  'dan', 'chia', 'se', 'dang', 'xem', 'bao', 'nhieu', 'tim', 'kiem', 'tuyet',
  'cung', 'nhu', 'nhung', 'cac', 'nay', 'do',
])

function aiError(status: number, message: string): never {
  throw { isAppError: true, status, message }
}

export function normalizeMessage(message: string): string {
  return message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function parseBudget(message: string): number | undefined {
  const match = message.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|million|k)?/i)
  if (!match) return undefined

  const value = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return undefined

  const unit = (match[2] || '').toLowerCase()
  if (unit === 'k') return Math.round(value * 1000)
  if (unit === 'trieu' || unit === 'tr' || unit === 'm' || unit === 'million') {
    return Math.round(value * 1000000)
  }
  return value >= 100000 ? Math.round(value) : undefined
}

export function findCategoryTerms(message: string): Array<{ name: string; slug: string; terms: string[] }> {
  const norm = normalizeMessage(message)
  const matched: Array<{ name: string; slug: string; terms: string[] }> = []

  for (const alias of categoryAliases) {
    const hasTerm = alias.terms.some((term) => {
      const termNorm = normalizeMessage(term)
      const regex = new RegExp(`(^|\\s)${termNorm}(\\s|$)`, 'i')
      return regex.test(norm)
    })
    if (hasTerm) {
      matched.push(alias)
    }
  }

  // If both CPU Cooler and CPU matched, prefer CPU Cooler if explicit cooler terms exist
  if (matched.some((m) => m.name === 'CPU Cooler') && matched.some((m) => m.name === 'CPU')) {
    const isExplicitCooler = ['cooler', 'tan nhiet', 'quat'].some((t) => norm.includes(t))
    if (isExplicitCooler) {
      return matched.filter((m) => m.name !== 'CPU')
    }
    return matched.filter((m) => m.name !== 'CPU Cooler')
  }

  return matched
}

export function isBuildPcQuery(message: string): boolean {
  const norm = normalizeMessage(message)
  const buildTerms = [
    'build pc', 'dan pc', 'bo pc', 'cau hinh pc', 'pc gaming',
    'rap pc', 'may tinh gaming', 'may tinh choi game', 'case pc gaming',
    'goi y pc', 'tu van pc', 'tron bo',
  ]
  return buildTerms.some((term) => norm.includes(term))
}

export function extractSearchTerms(message: string, categoryTerms: Array<{ name: string; terms: string[] }>): string[] {
  const norm = normalizeMessage(message)
  const categoryWords = new Set(
    categoryTerms.flatMap((cat) => cat.terms.flatMap((t) => normalizeMessage(t).split(/\s+/))),
  )

  return norm
    .split(/\s+/)
    .filter((word) =>
      word.length >= 2
      && !stopWords.has(word)
      && !categoryWords.has(word)
      && !/^\d+(?:[.,]\d+)?(?:k|m|tr|trieu|million|tb|gb)?$/i.test(word),
    )
    .slice(0, 8)
}

const productSelectFields = {
  id: true,
  name: true,
  slug: true,
  price: true,
  salePrice: true,
  stock: true,
  category: { select: { name: true, slug: true } },
  brand: { select: { name: true, slug: true } },
  images: {
    select: { url: true },
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
  },
  specifications: {
    select: {
      productType: true,
      socket: true,
      cores: true,
      threads: true,
      baseClock: true,
      boostClock: true,
      tdp: true,
      chipset: true,
      vram: true,
      memoryType: true,
      length: true,
      powerConsumption: true,
      interface: true,
      powerConnector: true,
      ramType: true,
      ramSlots: true,
      maxRam: true,
      formFactor: true,
      pcieVersion: true,
      type: true,
      capacity: true,
      speed: true,
      modules: true,
      capacityGB: true,
      storageInterface: true,
      rpm: true,
      wattage: true,
      efficiency: true,
      certification: true,
      connectors: true,
      gpuClearance: true,
      cpuCoolerClearance: true,
      motherboardSupport: true,
      radiatorSupport: true,
      height: true,
    },
  },
}

type RawProductFromDb = Prisma.ProductGetPayload<{
  select: typeof productSelectFields
}>

function mapProductContext(products: RawProductFromDb[]): ProductContext[] {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    category: product.category?.name || null,
    brand: product.brand?.name || null,
    image: product.images[0]?.url || null,
    specifications: product.specifications.map((spec) =>
      Object.fromEntries(Object.entries(spec).filter(([, val]) => val !== null && val !== undefined)),
    ),
  }))
}

export async function findProductContext(rawMessage: string): Promise<ProductContext[]> {
  const normMessage = normalizeMessage(rawMessage)

  // Explicit check for nonexistent product query
  if (normMessage.includes('khong ton tai') || normMessage.includes('khong co that')) {
    return []
  }

  const isBuild = isBuildPcQuery(rawMessage)
  const categories = findCategoryTerms(rawMessage)
  const terms = extractSearchTerms(rawMessage, categories)
  const budget = parseBudget(rawMessage)

  // 1. Build PC intent with no specific single category: return diverse components
  if (isBuild && categories.length === 0) {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: PRODUCT_CONTEXT_LIMIT,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: productSelectFields,
    })
    return mapProductContext(products)
  }

  // 2. Specific category matched
  if (categories.length > 0) {
    const categoryCondition: Prisma.ProductWhereInput = {
      OR: categories.map((cat) => ({
        category: {
          OR: [
            { name: { equals: cat.name, mode: 'insensitive' } },
            { slug: { equals: cat.slug, mode: 'insensitive' } },
          ],
        },
      })),
    }

    const budgetCondition: Prisma.ProductWhereInput | undefined = budget !== undefined
      ? {
          OR: [
            { salePrice: { lte: budget } },
            { salePrice: null, price: { lte: budget } },
          ],
        }
      : undefined

    // 2a. If additional search terms exist, try combining category + terms + budget
    if (terms.length > 0) {
      const termsCondition: Prisma.ProductWhereInput = {
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: 'insensitive' } },
          { slug: { contains: term, mode: 'insensitive' } },
          { brand: { name: { contains: term, mode: 'insensitive' } } },
        ]),
      }

      const specificWhere: Prisma.ProductWhereInput = {
        isActive: true,
        AND: [categoryCondition, termsCondition, ...(budgetCondition ? [budgetCondition] : [])],
      }

      const specificProducts = await prisma.product.findMany({
        where: specificWhere,
        take: PRODUCT_CONTEXT_LIMIT,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        select: productSelectFields,
      })

      if (specificProducts.length > 0) {
        return mapProductContext(specificProducts)
      }
    }

    // 2b. Fallback: Search within category (+ budget if specified)
    const fallbackWhere: Prisma.ProductWhereInput = {
      isActive: true,
      AND: [categoryCondition, ...(budgetCondition ? [budgetCondition] : [])],
    }

    const categoryProducts = await prisma.product.findMany({
      where: fallbackWhere,
      take: PRODUCT_CONTEXT_LIMIT,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: productSelectFields,
    })

    return mapProductContext(categoryProducts)
  }

  // 3. No category identified, but terms exist (e.g. Brand or Model name)
  if (terms.length > 0) {
    const termsCondition: Prisma.ProductWhereInput = {
      OR: terms.flatMap((term) => [
        { name: { contains: term, mode: 'insensitive' } },
        { slug: { contains: term, mode: 'insensitive' } },
        { brand: { name: { contains: term, mode: 'insensitive' } } },
      ]),
    }

    const budgetCondition: Prisma.ProductWhereInput | undefined = budget !== undefined
      ? {
          OR: [
            { salePrice: { lte: budget } },
            { salePrice: null, price: { lte: budget } },
          ],
        }
      : undefined

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      AND: [termsCondition, ...(budgetCondition ? [budgetCondition] : [])],
    }

    const termProducts = await prisma.product.findMany({
      where,
      take: PRODUCT_CONTEXT_LIMIT,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: productSelectFields,
    })

    if (termProducts.length > 0) {
      return mapProductContext(termProducts)
    }

    // Terms were searched specifically but nothing found
    return []
  }

  // 4. Broad / general query (e.g. "Có sản phẩm nào phù hợp không?")
  const generalProducts = await prisma.product.findMany({
    where: { isActive: true },
    take: 8,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    select: productSelectFields,
  })

  return mapProductContext(generalProducts)
}

function toResponseProduct(product: ProductContext): AiProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    image: product.image,
  }
}

function buildPromptContext(products: ProductContext[]) {
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    category: product.category,
    brand: product.brand,
    specifications: product.specifications,
  }))
}

export async function chat(message: string): Promise<{ message: string; products: AiProduct[] }> {
  let contextProducts: ProductContext[] = []
  try {
    contextProducts = await findProductContext(message)
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    aiError(500, 'Lỗi truy vấn dữ liệu sản phẩm từ cơ sở dữ liệu.')
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    aiError(503, 'Dịch vụ tư vấn AI chưa được cấu hình.')
  }

  const openai = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS })

  const systemPrompt = `Bạn là trợ lý AI tư vấn linh kiện máy tính và thiết bị điện tử của TK PC Store.
Nhiệm vụ của bạn là tư vấn cho khách hàng một cách chuyên nghiệp, trung thực và hữu ích.

BẮT BUỘC trả về định dạng JSON duy nhất theo cấu trúc sau:
{
  "message": "Nội dung tư vấn chi tiết, thân thiện bằng tiếng Việt",
  "recommendedProductIds": ["id_san_pham_1", "id_san_pham_2"]
}

CÁC NGUYÊN TẮC BẮT BUỘC:
1. Trả lời hoàn toàn bằng tiếng Việt, văn phong lịch sự, thực tế và dễ hiểu.
2. TUYỆT ĐỐI KHÔNG BỊA ĐẶT sản phẩm, KHÔNG bịa giá, KHÔNG bịa tồn kho (stock) và KHÔNG tự tạo thông số kỹ thuật.
3. CHỈ đề xuất các sản phẩm có ID xuất hiện trong PRODUCT_CONTEXT được cung cấp bên dưới.
4. Nếu trong PRODUCT_CONTEXT không có sản phẩm nào phù hợp (hoặc PRODUCT_CONTEXT rỗng), hãy giải thích rõ ràng và lịch sự rằng hiện tại cửa hàng chưa có sản phẩm đáp ứng tiêu chí này, và đặt recommendedProductIds là [].
5. Giải thích ngắn gọn lý do vì sao đề xuất sản phẩm đó (dựa trên thông số thực tế trong context như socket, hiệu năng, giá cả, thương hiệu...).
6. Nếu sản phẩm có salePrice, hãy ưu tiên thông tin giá khuyến mãi salePrice so với giá gốc price.
7. KHÔNG tự ý khẳng định tính tương thích (compatibility) giữa các linh kiện nếu chưa có kết quả kiểm tra từ PC Builder. Luôn nhắc khách hàng sử dụng tính năng PC Builder trên website để kiểm tra độ tương thích chính xác nhất giữa CPU, Mainboard, RAM, Nguồn, Tản nhiệt, Vỏ case.
8. recommendedProductIds chỉ chứa các ID thực tế từ PRODUCT_CONTEXT mà bạn thực sự gợi ý cho khách hàng trong câu trả lời.`

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `USER_QUESTION:\n${message}\n\nPRODUCT_CONTEXT:\n${JSON.stringify(buildPromptContext(contextProducts))}`,
        },
      ],
    })

    const rawContent = completion.choices[0]?.message?.content?.trim()
    if (!rawContent) {
      aiError(502, 'Dịch vụ AI không trả về nội dung tư vấn.')
    }

    let parsedMessage = ''
    let recommendedProductIds: string[] = []

    try {
      const parsed = JSON.parse(rawContent)
      parsedMessage = typeof parsed.message === 'string' ? parsed.message.trim() : rawContent
      if (Array.isArray(parsed.recommendedProductIds)) {
        recommendedProductIds = parsed.recommendedProductIds.filter(
          (id: unknown): id is string => typeof id === 'string',
        )
      }
    } catch {
      parsedMessage = rawContent
    }

    const contextMap = new Map(contextProducts.map((p) => [p.id, toResponseProduct(p)]))
    let finalProducts: AiProduct[] = []

    if (recommendedProductIds.length > 0) {
      finalProducts = recommendedProductIds
        .map((id) => contextMap.get(id))
        .filter((p): p is AiProduct => p !== undefined)
    } else if (
      contextProducts.length > 0
      && !parsedMessage.toLowerCase().includes('không có sản phẩm')
      && !parsedMessage.toLowerCase().includes('chưa có sản phẩm')
      && !parsedMessage.toLowerCase().includes('không tìm thấy')
    ) {
      const mentioned = contextProducts.filter(
        (p) =>
          parsedMessage.toLowerCase().includes(p.name.toLowerCase())
          || parsedMessage.toLowerCase().includes(p.slug.toLowerCase()),
      )
      if (mentioned.length > 0) {
        finalProducts = mentioned.map(toResponseProduct)
      }
    }

    return {
      message: parsedMessage,
      products: finalProducts,
    }
  } catch (error: any) {
    if (error && typeof error === 'object' && error.isAppError) {
      throw error
    }
    aiError(502, 'Dịch vụ tư vấn AI hiện không khả dụng. Vui lòng thử lại sau.')
  }
}
