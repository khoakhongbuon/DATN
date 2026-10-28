import prisma from '../config/prisma'
import {
  evaluateCompatibility,
  type CompatibilityCandidate,
  type CompatibilityResult,
} from './pc-builder.service'

export type BuildRole =
  | 'CPU'
  | 'MAINBOARD'
  | 'RAM'
  | 'STORAGE'
  | 'GPU'
  | 'PSU'
  | 'CASE'
  | 'COOLER'
  | 'MONITOR'
  | 'KEYBOARD'
  | 'MOUSE'

export type BuildCandidate = CompatibilityCandidate & {
  role: BuildRole
  slug: string
  sku: string
  stock: number
  isActive: boolean
  image: string | null
  isFeatured?: boolean
}

export type OwnedBuildComponent = {
  role: BuildRole
  productName: string
}

export type BuildRequirements = {
  budgetVnd: number
  useCase: string
  prioritizedRoles?: BuildRole[]
  requestedRoles?: BuildRole[]
  excludedRoles?: BuildRole[]
  ownedComponents?: OwnedBuildComponent[]
  requiredCpuModel?: string
  requiredGpuModel?: string
}

export type BuildLine = {
  role: BuildRole
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice: number | null
  stock: number
  image: string | null
  listPrice: number
  appliedPrice: number
  savings: number
  owned: boolean
}

export type BuildAlternative = {
  items: BuildLine[]
  totalListPrice: number
  totalPayable: number
  totalSavings: number
  remainingBudget: number
  label?: string
  notes?: string
}

export type BuildRecommendation = {
  status: 'recommended' | 'over_budget' | 'insufficient_catalog' | 'needs_clarification' | 'no_compatible_build'
  budgetVnd: number
  items: BuildLine[]
  totalListPrice: number
  totalPayable: number
  totalSavings: number
  remainingBudget: number
  deficit: number
  withinBudget: boolean
  missingRoles: BuildRole[]
  verified: string[]
  unverified: string[]
  warnings: string[]
  alternatives: BuildAlternative[]
  clarificationQuestion?: string
  requiredCpuMatched?: boolean
  requiredCpuMessage?: string
  budgetExplanation?: string
}

export type BuildDependencies = {
  findCandidates: (
    roles: BuildRole[],
    ownedComponents: OwnedBuildComponent[],
  ) => Promise<BuildCandidate[]>
  evaluateCompatibility?: (products: CompatibilityCandidate[]) => CompatibilityResult
}

const MAX_DATABASE_CANDIDATES_PER_ROLE = 120
const MAX_CANDIDATES_PER_ROLE = 18
const MAX_BUILD_STATES = 96
const CORE_ROLES: BuildRole[] = ['CPU', 'MAINBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE']
const PERIPHERAL_ROLES: BuildRole[] = ['MONITOR', 'KEYBOARD', 'MOUSE']
const DIRECT_ROLE_NAMES = new Set<BuildRole>([
  'CPU', 'MAINBOARD', 'RAM', 'STORAGE', 'GPU', 'PSU', 'CASE', 'COOLER',
])

const categoryTerms: Record<BuildRole, string[]> = {
  CPU: ['cpu', 'processor', 'vi xu ly', 'bo xu ly'],
  MAINBOARD: ['mainboard', 'motherboard', 'bo mach chu'],
  RAM: ['ram', 'memory', 'bo nho'],
  STORAGE: ['ssd', 'hdd', 'storage', 'o cung'],
  GPU: ['gpu', 'vga', 'graphics', 'card man hinh', 'card do hoa'],
  PSU: ['psu', 'power supply', 'bo nguon', 'nguon'],
  CASE: ['case', 'vo may', 'thung may'],
  COOLER: ['cpu cooler', 'cooler', 'heatsink', 'tan nhiet'],
  MONITOR: ['monitor', 'display', 'man hinh'],
  KEYBOARD: ['keyboard', 'ban phim'],
  MOUSE: ['mouse', 'chuot'],
}

type CatalogProduct = {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice: number | null
  stock: number
  isActive: boolean
  isFeatured: boolean
  category: { id: string; name: string; slug: string } | null
  brand: { id: string; name: string; slug: string } | null
  specifications: CompatibilityCandidate['specifications']
  images: Array<{ url: string }>
}

function serviceError(status: number, message: string): never {
  throw { status, message }
}

function normalizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

export function matchesModel(candidate: { name: string; sku?: string }, requestedModel?: string): boolean {
  if (!requestedModel || !requestedModel.trim()) return false
  const normCandidate = normalizeText(candidate.name)
  const normSku = normalizeText(candidate.sku)
  const normRequested = normalizeText(requestedModel)

  if (normCandidate.includes(normRequested) || normSku.includes(normRequested)) return true

  const tokens = normRequested.split(/\s+/).filter((t) => t.length >= 2)
  if (tokens.length > 0 && tokens.every((token) => normCandidate.includes(token) || normSku.includes(token))) {
    return true
  }
  const keyIdentifier = requestedModel.match(/\b([0-9]{4,5}[a-zA-Z]*|[0-9]{3,4}\s*ti|[0-9]{3,4}\s*super)\b/i)
  if (keyIdentifier) {
    const keyNorm = normalizeText(keyIdentifier[0])
    if (normCandidate.includes(keyNorm) || normSku.includes(keyNorm)) return true
  }
  return false
}

function specificationValue(
  product: Pick<BuildCandidate, 'specifications'>,
  key: string,
): unknown {
  const specification = product.specifications?.find((candidate) => candidate && key in candidate)
  return specification
    ? Object.entries(specification).find(([field]) => field === key)?.[1]
    : undefined
}

function resolveBuildRole(product: Pick<BuildCandidate, 'name' | 'category' | 'specifications'>): BuildRole | undefined {
  const direct = normalizeText(specificationValue(product, 'productType')).replace(/\s/g, '')
  if (direct === 'cpu cooler' || direct === 'cpucooler') return 'COOLER'
  const directRole = direct.toUpperCase() as BuildRole
  if (DIRECT_ROLE_NAMES.has(directRole)) return directRole

  const haystack = normalizeText([
    product.category?.name ?? '',
    product.category?.slug ?? '',
    product.name,
  ].join(' '))
  const searchOrder: BuildRole[] = [
    'COOLER', 'MAINBOARD', 'GPU', 'RAM', 'STORAGE', 'PSU',
    'CASE', 'MONITOR', 'KEYBOARD', 'MOUSE', 'CPU',
  ]

  return searchOrder.find((role) =>
    categoryTerms[role].some((term) => haystack.includes(normalizeText(term))),
  )
}

function isValidPrice(product: BuildCandidate): boolean {
  if (!Number.isSafeInteger(product.price) || product.price < 0) return false
  if (product.salePrice === null) return true
  return Number.isSafeInteger(product.salePrice)
    && product.salePrice >= 0
    && product.salePrice <= product.price
}

function productPrice(product: BuildCandidate): number {
  return product.salePrice ?? product.price
}

function makeLine(product: BuildCandidate, owned: boolean): BuildLine {
  const appliedPrice = owned ? 0 : productPrice(product)
  const savings = owned || product.salePrice === null || product.salePrice >= product.price
    ? 0
    : product.price - product.salePrice

  return {
    role: product.role,
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    image: product.image,
    listPrice: owned ? 0 : product.price,
    appliedPrice,
    savings,
    owned,
  }
}

function isRequiredGpu(requirements: BuildRequirements): boolean {
  const useCase = normalizeText(requirements.useCase)
  return requirements.requestedRoles?.includes('GPU') === true
    || requirements.prioritizedRoles?.includes('GPU') === true
    || /\b(gaming|graphics|do hoa|choi game)\b/.test(useCase)
}

function rolesForBuild(requirements: BuildRequirements): BuildRole[] {
  const excluded = new Set(requirements.excludedRoles ?? [])
  const owned = new Set((requirements.ownedComponents ?? []).map(({ role }) => role))
  const roles = [
    ...CORE_ROLES.filter((role) => !owned.has(role)),
    ...PERIPHERAL_ROLES.filter((role) => !excluded.has(role) && !owned.has(role)),
  ]

  if (isRequiredGpu(requirements) && !excluded.has('GPU') && !owned.has('GPU')) {
    roles.push('GPU')
  }
  if (
    requirements.requestedRoles?.includes('COOLER')
    && !excluded.has('COOLER')
    && !owned.has('COOLER')
  ) {
    roles.push('COOLER')
  }

  return roles
}

function requiredOwnedRoles(requirements: BuildRequirements): OwnedBuildComponent[] {
  const roles = new Set<BuildRole>([...CORE_ROLES, ...PERIPHERAL_ROLES])
  if (isRequiredGpu(requirements)) roles.add('GPU')
  if (requirements.requestedRoles?.includes('COOLER')) roles.add('COOLER')
  const excluded = new Set(requirements.excludedRoles ?? [])
  return (requirements.ownedComponents ?? []).filter(
    (item) => roles.has(item.role) && !excluded.has(item.role),
  )
}

function requiredRolesIncludingOwned(requirements: BuildRequirements): BuildRole[] {
  return [...new Set([
    ...rolesForBuild(requirements),
    ...requiredOwnedRoles(requirements).map(({ role }) => role),
  ])]
}

function candidateUtility(product: BuildCandidate, requirements: BuildRequirements): number {
  const numberSpec = (key: string) => {
    const value = specificationValue(product, key)
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      if (Number.isFinite(parsed) && parsed > 0) return parsed
    }
    return 0
  }

  let capability = 1
  switch (product.role) {
    case 'CPU':
      capability += numberSpec('cores') * 4 + numberSpec('threads') * 2 + numberSpec('boostClock') * 3
      break
    case 'GPU':
      capability += numberSpec('vram') * 10 + numberSpec('powerConsumption') / 4
      break
    case 'RAM':
      capability += numberSpec('capacity') * 3 + numberSpec('speed') / 1000
      break
    case 'STORAGE':
      capability += numberSpec('capacityGB') / 200
      if (normalizeText(specificationValue(product, 'storageInterface')).includes('nvme')) {
        capability += 6
      }
      break
    case 'MAINBOARD':
      if (specificationValue(product, 'pcieVersion')?.toString().includes('5.0')) capability += 6
      else if (specificationValue(product, 'pcieVersion')?.toString().includes('4.0')) capability += 3
      break
    case 'PSU':
      capability += numberSpec('wattage') / 80
      break
    case 'COOLER':
      capability += numberSpec('height') / 20
      break
    case 'MONITOR': {
      const extra = specificationValue(product, 'extra')
      if (extra && typeof extra === 'object' && 'resolution' in extra) capability += 2
      break
    }
    default:
      break
  }

  const useCase = normalizeText(requirements.useCase)
  let roleWeight = requirements.prioritizedRoles?.includes(product.role) ? 2 : 1
  if (product.role === 'GPU' && /\b(gaming|graphics|do hoa|choi game)\b/.test(useCase)) {
    roleWeight *= 2.5
  }
  if (product.role === 'CPU' && (useCase.includes('programming') || useCase.includes('gaming'))) {
    roleWeight *= 1.5
  }

  let modelMatchBonus = 0
  if (product.role === 'CPU' && requirements.requiredCpuModel && matchesModel(product, requirements.requiredCpuModel)) {
    modelMatchBonus = 50000
  }
  if (product.role === 'GPU' && requirements.requiredGpuModel && matchesModel(product, requirements.requiredGpuModel)) {
    modelMatchBonus = 50000
  }

  return (capability * roleWeight) + modelMatchBonus
}

function validPurchaseCandidate(product: BuildCandidate): boolean {
  return product.isActive && product.stock > 0 && isValidPrice(product)
}

function shortlistCandidates(
  candidates: BuildCandidate[],
  requirements: BuildRequirements,
  currentStates: BuildState[] = [],
): BuildCandidate[] {
  const valid = candidates.filter(validPurchaseCandidate)
  if (valid.length <= MAX_CANDIDATES_PER_ROLE) return valid

  const selected = new Map<string, BuildCandidate>()

  // 1. Required model match first
  for (const candidate of valid) {
    if (candidate.role === 'CPU' && requirements.requiredCpuModel && matchesModel(candidate, requirements.requiredCpuModel)) {
      selected.set(candidate.id, candidate)
    }
    if (candidate.role === 'GPU' && requirements.requiredGpuModel && matchesModel(candidate, requirements.requiredGpuModel)) {
      selected.set(candidate.id, candidate)
    }
  }

  // 2. Mainboard socket awareness
  if (valid[0]?.role === 'MAINBOARD' && currentStates.length > 0) {
    const activeSockets = new Set<string>()
    for (const state of currentStates) {
      const cpu = state.products.find((p) => p.role === 'CPU')
      if (cpu) {
        const socket = specificationValue(cpu, 'socket')
        if (typeof socket === 'string' && socket.trim()) activeSockets.add(socket.trim().toUpperCase())
      }
    }
    for (const socket of activeSockets) {
      const socketMbs = valid.filter((mb) => {
        const mbSocket = specificationValue(mb, 'socket')
        return typeof mbSocket === 'string' && mbSocket.trim().toUpperCase() === socket
      })
      const sortedByCap = [...socketMbs].sort((a, b) => candidateUtility(b, requirements) - candidateUtility(a, requirements))
      const sortedByPrice = [...socketMbs].sort((a, b) => productPrice(a) - productPrice(b))
      for (const mb of [...sortedByCap.slice(0, 3), ...sortedByPrice.slice(0, 3)]) {
        selected.set(mb.id, mb)
      }
    }
  }

  // 3. RAM type awareness
  if (valid[0]?.role === 'RAM' && currentStates.length > 0) {
    const activeRamTypes = new Set<string>()
    for (const state of currentStates) {
      const mb = state.products.find((p) => p.role === 'MAINBOARD')
      if (mb) {
        const ramType = specificationValue(mb, 'ramType')
        if (typeof ramType === 'string' && ramType.trim()) activeRamTypes.add(ramType.trim().toUpperCase())
      }
    }
    for (const ramType of activeRamTypes) {
      const typeRams = valid.filter((ram) => {
        const type = specificationValue(ram, 'type')
        return typeof type === 'string' && type.trim().toUpperCase().includes(ramType)
      })
      const sortedByCap = [...typeRams].sort((a, b) => candidateUtility(b, requirements) - candidateUtility(a, requirements))
      const sortedByPrice = [...typeRams].sort((a, b) => productPrice(a) - productPrice(b))
      for (const r of [...sortedByCap.slice(0, 3), ...sortedByPrice.slice(0, 3)]) {
        selected.set(r.id, r)
      }
    }
  }

  // 4. Affordable and high capability candidates
  const affordable = valid.filter((c) => productPrice(c) <= requirements.budgetVnd)
  const byCap = [...(affordable.length > 0 ? affordable : valid)].sort(
    (left, right) => candidateUtility(right, requirements) - candidateUtility(left, requirements),
  )
  for (const product of byCap) {
    if (selected.size >= 12) break
    selected.set(product.id, product)
  }
  const byPrice = [...valid].sort((left, right) => productPrice(left) - productPrice(right))
  for (const product of byPrice) {
    if (selected.size >= MAX_CANDIDATES_PER_ROLE) break
    selected.set(product.id, product)
  }

  return [...selected.values()]
}

function isCoreCompatibilityRole(role: BuildRole): boolean {
  return CORE_ROLES.includes(role) || role === 'GPU' || role === 'COOLER'
}

type BuildState = {
  products: BuildCandidate[]
  score: number
  payable: number
  hasRequiredCpu: boolean
}

function pruneStates(
  states: BuildState[],
  budgetVnd?: number,
  hasRequiredCpuReq: boolean = false,
): BuildState[] {
  const budget = budgetVnd ?? Infinity
  const withinBudget = states.filter((s) => s.payable <= budget)
  const overBudget = states.filter((s) => s.payable > budget)

  const scoreSort = (a: BuildState, b: BuildState) => {
    if (hasRequiredCpuReq && a.hasRequiredCpu !== b.hasRequiredCpu) {
      return a.hasRequiredCpu ? -1 : 1
    }
    return b.score - a.score || b.payable - a.payable
  }

  const overBudgetSort = (a: BuildState, b: BuildState) => {
    if (hasRequiredCpuReq && a.hasRequiredCpu !== b.hasRequiredCpu) {
      return a.hasRequiredCpu ? -1 : 1
    }
    return a.payable - b.payable || b.score - a.score
  }

  const retained = new Map<string, BuildState>()

  const sortedWithin = [...withinBudget].sort(scoreSort)
  for (const s of sortedWithin) {
    const key = s.products.map((p) => p.id).sort().join('|')
    retained.set(key, s)
    if (retained.size >= 64) break
  }

  const sortedOver = [...overBudget].sort(overBudgetSort)
  for (const s of sortedOver) {
    const key = s.products.map((p) => p.id).sort().join('|')
    retained.set(key, s)
    if (retained.size >= MAX_BUILD_STATES) break
  }

  if (retained.size === 0) {
    for (const s of [...states].sort(scoreSort)) {
      const key = s.products.map((p) => p.id).sort().join('|')
      retained.set(key, s)
      if (retained.size >= MAX_BUILD_STATES) break
    }
  }

  return [...retained.values()]
}

function statePayable(products: BuildCandidate[], ownedIds: Set<string>): number {
  return products.reduce(
    (total, product) => total + (ownedIds.has(product.id) ? 0 : productPrice(product)),
    0,
  )
}

function evaluateState(
  products: BuildCandidate[],
  evaluate: (products: CompatibilityCandidate[]) => CompatibilityResult,
): CompatibilityResult {
  return evaluate(products.filter((product) => isCoreCompatibilityRole(product.role)))
}

function createResult(
  status: BuildRecommendation['status'],
  budgetVnd: number,
  products: BuildCandidate[] = [],
  ownedIds: Set<string> = new Set(),
  missingRoles: BuildRole[] = [],
  warnings: string[] = [],
  unverified: string[] = [],
  clarificationQuestion?: string,
): BuildRecommendation {
  const items = products.map((product) => makeLine(product, ownedIds.has(product.id)))
  const totals = summarizeBuild(items, budgetVnd)
  const { totalListPrice, totalPayable, totalSavings, remainingBudget } = totals
  const deficit = Math.max(0, totalPayable - budgetVnd)

  return {
    status,
    budgetVnd,
    items,
    totalListPrice,
    totalPayable,
    totalSavings,
    remainingBudget,
    deficit,
    withinBudget: status === 'recommended' && deficit === 0,
    missingRoles,
    verified: [],
    unverified,
    warnings,
    alternatives: [],
    ...(clarificationQuestion ? { clarificationQuestion } : {}),
  }
}

function summarizeBuild(items: BuildLine[], budgetVnd: number) {
  const totalListPrice = items.reduce((total, item) => total + item.listPrice, 0)
  const totalPayable = items.reduce((total, item) => total + item.appliedPrice, 0)
  const totalSavings = items.reduce((total, item) => total + item.savings, 0)
  return {
    totalListPrice,
    totalPayable,
    totalSavings,
    remainingBudget: Math.max(0, budgetVnd - totalPayable),
  }
}

function getCompatibilityNotes(
  products: BuildCandidate[],
  result: CompatibilityResult,
): { verified: string[]; unverified: string[]; warnings: string[] } {
  const verified: string[] = []
  const unverified = [...result.warnings]
  const find = (role: BuildRole) => products.find((product) => product.role === role)
  const cpu = find('CPU')
  const motherboard = find('MAINBOARD')
  const ram = find('RAM')
  const gpu = find('GPU')
  const caseProduct = find('CASE')
  const cooler = find('COOLER')
  const psu = find('PSU')
  const has = (product: BuildCandidate | undefined, field: string) =>
    product && specificationValue(product, field) !== null
      && specificationValue(product, field) !== undefined

  if (cpu && motherboard) {
    if (has(cpu, 'socket') && has(motherboard, 'socket')) verified.push('CPU/mainboard socket')
    else unverified.push('CPU/mainboard socket is unverified because a socket specification is missing.')
  }
  if (motherboard && ram) {
    if (has(motherboard, 'ramType') && has(ram, 'type')) verified.push('Mainboard/RAM type')
    else unverified.push('Mainboard/RAM type is unverified because a memory-type specification is missing.')
  }
  if (gpu && caseProduct) {
    if (has(gpu, 'length') && has(caseProduct, 'gpuClearance')) verified.push('GPU/case clearance')
    else unverified.push('GPU/case clearance is unverified because a size specification is missing.')
  }
  if (cooler && caseProduct) {
    if (has(cooler, 'height') && has(caseProduct, 'cpuCoolerClearance')) verified.push('Cooler/case clearance')
    else unverified.push('Cooler/case clearance is unverified because a height specification is missing.')
  }
  if (psu && (cpu || gpu)) {
    if (has(psu, 'wattage') && (!cpu || has(cpu, 'tdp')) && (!gpu || has(gpu, 'powerConsumption'))) {
      verified.push('Estimated PSU wattage')
    } else {
      unverified.push('Estimated PSU wattage is unverified because a power specification is missing.')
    }
  }

  return {
    verified,
    unverified: [...new Set(unverified)],
    warnings: [...result.warnings, ...result.errors],
  }
}

function buildRoleFromCatalogProduct(product: CatalogProduct): BuildCandidate | undefined {
  const role = resolveBuildRole(product)
  if (!role) return undefined
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    isActive: product.isActive,
    image: product.images[0]?.url ?? null,
    role,
    category: product.category,
    brand: product.brand,
    specifications: product.specifications,
    isFeatured: product.isFeatured,
  }
}

async function findCatalogCandidates(
  roles: BuildRole[],
  ownedComponents: OwnedBuildComponent[],
): Promise<BuildCandidate[]> {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  })
  const categoryIdsByRole = new Map<BuildRole, string[]>()

  for (const category of categories) {
    const role = resolveBuildRole({
      name: '',
      category,
      specifications: [],
    })
    if (!role || !roles.includes(role)) continue
    const ids = categoryIdsByRole.get(role) ?? []
    ids.push(category.id)
    categoryIdsByRole.set(role, ids)
  }

  const candidatesByRole = await Promise.all(roles.map(async (role) => {
    const categoryIds = categoryIdsByRole.get(role) ?? []
    const directType = role === 'COOLER' ? ['COOLER', 'CPU_COOLER'] : [role]
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { categoryId: { in: categoryIds } },
          { specifications: { some: { productType: { in: directType } } } },
        ],
        isActive: true,
        stock: { gt: 0 },
      },
      orderBy: [{ isFeatured: 'desc' }, { price: 'asc' }],
      take: MAX_DATABASE_CANDIDATES_PER_ROLE,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        specifications: true,
        images: {
          select: { url: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: 1,
        },
      },
    })
    return products
      .map((product) => buildRoleFromCatalogProduct(product))
      .filter((product): product is BuildCandidate => product?.role === role)
  }))

  const ownedNames = [...new Set(ownedComponents.map(({ productName }) => productName.trim()).filter(Boolean))]
  const ownedProducts = ownedNames.length === 0
    ? []
    : await prisma.product.findMany({
      where: {
        OR: ownedNames.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } })),
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: ownedNames.length * 3,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        specifications: true,
        images: {
          select: { url: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: 1,
        },
      },
    })

  const exactOwnedProducts = ownedProducts
    .map((product) => buildRoleFromCatalogProduct(product))
    .filter((product): product is BuildCandidate =>
      product !== undefined
      && ownedComponents.some((owned) =>
        owned.role === product.role
        && normalizeText(owned.productName) === normalizeText(product.name),
      ),
    )

  return [...candidatesByRole.flat(), ...exactOwnedProducts]
}

const defaultDependencies: BuildDependencies = {
  findCandidates: findCatalogCandidates,
  evaluateCompatibility,
}

export async function recommendBuild(
  requirements: BuildRequirements,
  dependencies: BuildDependencies = defaultDependencies,
): Promise<BuildRecommendation> {
  if (!Number.isSafeInteger(requirements.budgetVnd) || requirements.budgetVnd <= 0) {
    serviceError(400, 'budgetVnd must be a positive safe integer')
  }

  const roles = rolesForBuild(requirements)
  const ownedComponents = requiredOwnedRoles(requirements)
  let fetchedCandidates: BuildCandidate[]
  try {
    fetchedCandidates = await dependencies.findCandidates(
      requiredRolesIncludingOwned(requirements),
      ownedComponents,
    )
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) throw error
    serviceError(500, 'Lỗi truy vấn dữ liệu sản phẩm để tư vấn cấu hình.')
  }

  const uniqueCandidates = [...new Map(fetchedCandidates.map((candidate) => [candidate.id, candidate])).values()]
  const ownedByRole = new Map<BuildRole, BuildCandidate>()
  const ownedIds = new Set<string>()
  const unmatchedOwned: BuildRole[] = []

  for (const owned of ownedComponents) {
    const matches = uniqueCandidates.filter((candidate) =>
      candidate.role === owned.role
      && normalizeText(candidate.name) === normalizeText(owned.productName),
    )
    if (matches.length !== 1) {
      unmatchedOwned.push(owned.role)
      continue
    }
    ownedByRole.set(owned.role, matches[0])
    ownedIds.add(matches[0].id)
  }

  if (unmatchedOwned.length > 0) {
    const distinctRoles = [...new Set(unmatchedOwned)]
    return createResult(
      'needs_clarification',
      requirements.budgetVnd,
      [],
      new Set(),
      [],
      ['Không thể xác định chính xác linh kiện khách đã có từ dữ liệu catalog.'],
      distinctRoles.map((role) => `${role} đang có chưa xác minh được; cần tên model chính xác.`),
      `Bạn cho biết tên model chính xác của ${distinctRoles.join(', ')} đang có được không?`,
    )
  }

  const missingRoles = roles.filter((role) => {
    if (ownedByRole.has(role)) return false
    const candidates = uniqueCandidates.filter((candidate) =>
      candidate.role === role && validPurchaseCandidate(candidate),
    )
    return candidates.length === 0
  })
  if (missingRoles.length > 0) {
    return createResult(
      'insufficient_catalog',
      requirements.budgetVnd,
      [],
      ownedIds,
      missingRoles,
      [`Catalog hiện không có đủ sản phẩm còn bán cho: ${missingRoles.join(', ')}.`],
      [],
    )
  }

  const hasCpuRequirement = Boolean(requirements.requiredCpuModel)
  let requiredCpuFoundInCatalog = false
  if (requirements.requiredCpuModel) {
    requiredCpuFoundInCatalog = uniqueCandidates.some((c) =>
      c.role === 'CPU' && validPurchaseCandidate(c) && matchesModel(c, requirements.requiredCpuModel),
    )
    if (!requiredCpuFoundInCatalog) {
      return createResult(
        'insufficient_catalog',
        requirements.budgetVnd,
        [],
        ownedIds,
        ['CPU'],
        [`Không tìm thấy sản phẩm CPU phù hợp với yêu cầu "${requirements.requiredCpuModel}" còn hàng trong catalog.`],
        [],
      )
    }
  }

  const selectedOwned = [...ownedByRole.values()]
  const searchRoles = roles
    .filter((role) => !ownedByRole.has(role))
    .sort((left, right) => {
      const order: BuildRole[] = [
        'CPU', 'MAINBOARD', 'RAM', 'GPU', 'CASE', 'PSU', 'STORAGE',
        'COOLER', 'MONITOR', 'KEYBOARD', 'MOUSE',
      ]
      return order.indexOf(left) - order.indexOf(right)
    })
  const evaluate = dependencies.evaluateCompatibility ?? evaluateCompatibility
  let states: BuildState[] = [{
    products: selectedOwned,
    score: selectedOwned.reduce((sum, product) => sum + candidateUtility(product, requirements), 0),
    payable: 0,
    hasRequiredCpu: selectedOwned.some((p) => p.role === 'CPU' && requirements.requiredCpuModel && matchesModel(p, requirements.requiredCpuModel)),
  }]
  let lastCompatibilityErrors: string[] = []

  for (const role of searchRoles) {
    let poolForRole = uniqueCandidates.filter((candidate) => candidate.role === role)
    if (role === 'CPU' && requirements.requiredCpuModel && requiredCpuFoundInCatalog) {
      poolForRole = poolForRole.filter((c) => matchesModel(c, requirements.requiredCpuModel))
    }
    const roleCandidates = shortlistCandidates(
      poolForRole,
      requirements,
      states,
    )
    const nextStates: BuildState[] = []

    for (const state of states) {
      for (const candidate of roleCandidates) {
        if (state.products.some((product) => product.id === candidate.id || product.role === role)) continue
        const products = [...state.products, candidate]
        const compatibility = evaluateState(products, evaluate)
        if (!compatibility.compatible) {
          lastCompatibilityErrors = compatibility.errors
          continue
        }
        const isMatch = candidate.role === 'CPU' && requirements.requiredCpuModel
          ? matchesModel(candidate, requirements.requiredCpuModel)
          : false
        nextStates.push({
          products,
          score: state.score + candidateUtility(candidate, requirements),
          payable: statePayable(products, ownedIds),
          hasRequiredCpu: state.hasRequiredCpu || isMatch,
        })
      }
    }

    if (nextStates.length === 0) {
      return createResult(
        'no_compatible_build',
        requirements.budgetVnd,
        [],
        ownedIds,
        [],
        lastCompatibilityErrors.length > 0
          ? lastCompatibilityErrors
          : [`Không tìm được sản phẩm phù hợp cho vai trò ${role}.`],
        [],
      )
    }
    states = pruneStates(nextStates, requirements.budgetVnd, hasCpuRequirement)
  }

  const completeStates = states
    .filter((state) => requiredRolesIncludingOwned(requirements).every((role) =>
      state.products.some((product) => product.role === role),
    ))
  const withinBudgetStates = completeStates.filter((state) => state.payable <= requirements.budgetVnd)

  let chosen: BuildState | undefined
  if (hasCpuRequirement && requiredCpuFoundInCatalog) {
    const matchedWithin = withinBudgetStates.filter((s) => s.hasRequiredCpu)
    if (matchedWithin.length > 0) {
      chosen = matchedWithin.sort((a, b) => b.score - a.score || b.payable - a.payable)[0]
    } else {
      const matchedOver = completeStates.filter((s) => s.hasRequiredCpu)
      if (matchedOver.length > 0) {
        chosen = matchedOver.sort((a, b) => a.payable - b.payable || b.score - a.score)[0]
      }
    }
  }

  if (!chosen) {
    chosen = withinBudgetStates.length > 0
      ? withinBudgetStates.sort((left, right) =>
        right.score - left.score || left.payable - right.payable,
      )[0]
      : completeStates.sort((left, right) =>
        left.payable - right.payable || right.score - left.score,
      )[0]
  }

  if (!chosen) {
    return createResult(
      'no_compatible_build',
      requirements.budgetVnd,
      [],
      ownedIds,
      [],
      lastCompatibilityErrors.length > 0
        ? lastCompatibilityErrors
        : ['Không tìm được tổ hợp tương thích từ các sản phẩm hiện có.'],
      [],
    )
  }

  const compatibility = evaluateState(chosen.products, evaluate)
  const notes = getCompatibilityNotes(chosen.products, compatibility)
  const status = chosen.payable <= requirements.budgetVnd ? 'recommended' : 'over_budget'

  const customWarnings = [...notes.warnings]
  if (requirements.requiredCpuModel && !requiredCpuFoundInCatalog) {
    customWarnings.unshift(
      `Không tìm thấy CPU "${requirements.requiredCpuModel}" còn hàng trong catalog. Đề xuất phương án thay thế:`,
    )
  } else if (requirements.requiredCpuModel && status === 'over_budget') {
    customWarnings.unshift(
      `Cấu hình yêu cầu CPU ${requirements.requiredCpuModel} có chi phí thấp nhất từ catalog là ${chosen.payable.toLocaleString()} đ (vượt ${(chosen.payable - requirements.budgetVnd).toLocaleString()} đ so với ngân sách ${requirements.budgetVnd.toLocaleString()} đ). Dưới đây là phương án thay thế trong ngân sách:`,
    )
  }

  let budgetExplanation: string | undefined
  const remainingBudget = Math.max(0, requirements.budgetVnd - chosen.payable)
  if (status === 'recommended' && remainingBudget >= 2000000) {
    budgetExplanation = `Cấu hình đã được tối ưu hiệu năng tốt nhất với các linh kiện tương thích hiện có trong catalog. Ngân sách còn dư ${remainingBudget.toLocaleString()} đ có thể dùng để nâng cấp thêm dung lượng ổ cứng NVMe, nâng RAM 64GB hoặc sắm thêm màn hình/gaming gear.`
  }

  const alternativeStates = withinBudgetStates
    .filter((state) => state !== chosen && state.products.some((product, index) =>
      product.id !== chosen.products[index]?.id,
    ))
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map((state) => {
      const items = state.products.map((product) => makeLine(product, ownedIds.has(product.id)))
      return {
        items,
        ...summarizeBuild(items, requirements.budgetVnd),
        label: 'phương án thay thế',
      }
    })

  return {
    ...createResult(
      status,
      requirements.budgetVnd,
      chosen.products,
      ownedIds,
      [],
      customWarnings,
      notes.unverified,
    ),
    verified: notes.verified,
    alternatives: alternativeStates,
    requiredCpuMatched: hasCpuRequirement ? chosen.hasRequiredCpu : undefined,
    budgetExplanation,
  }
}
