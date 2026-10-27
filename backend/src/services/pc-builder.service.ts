import type { ProductSpecification } from '@prisma/client'
import prisma from '../config/prisma'

export type ComponentType = 'CPU' | 'MAINBOARD' | 'RAM' | 'GPU' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER'

export type CompatibilitySpecification = Partial<ProductSpecification> & {
  id: string
  productId: string
}

export type CompatibilityCandidate = {
  id: string
  name: string
  price: number
  salePrice: number | null
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
  specifications?: CompatibilitySpecification[]
}

export type CompatibilityResult = {
  compatible: boolean
  components: Array<{
    id: string
    name: string
    type: ComponentType
    price: number
    salePrice: number | null
    unitPrice: number
    category?: { id: string; name: string; slug: string } | null
    brand?: { id: string; name: string; slug: string } | null
    specifications: Record<string, unknown>
  }>
  totalPrice: number
  estimatedPower: number
  recommendedPSU: number
  warnings: string[]
  errors: string[]
  summary: {
    selectedComponents: number
    types: string[]
  }
}

function serviceError(status: number, message: string): never {
  throw { status, message }
}

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned.length > 0 ? cleaned : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function parseComparableText(value: unknown): string {
  return normalizeText(value)?.toLowerCase().replace(/\s+/g, '') ?? ''
}

function extractSpec(product: any, key: string): unknown {
  const spec = product?.specifications?.find((item: any) => item && key in item)
  if (spec) return spec[key]
  return undefined
}

function resolveComponentType(product: any): ComponentType {
  const direct = normalizeText(extractSpec(product, 'productType'))?.toUpperCase()
  if (direct && ['CPU', 'MAINBOARD', 'RAM', 'GPU', 'STORAGE', 'PSU', 'CASE', 'COOLER'].includes(direct)) {
    return direct as ComponentType
  }

  const categorySlug = normalizeText(product?.category?.slug)?.toLowerCase() ?? ''
  if (categorySlug === 'cpu-cooler' || categorySlug === 'cooler' || categorySlug === 'cooling') return 'COOLER'
  if (categorySlug === 'cpu' || categorySlug === 'processor') return 'CPU'
  if (categorySlug === 'mainboard' || categorySlug === 'motherboard') return 'MAINBOARD'
  if (categorySlug === 'ram' || categorySlug === 'memory') return 'RAM'
  if (categorySlug === 'gpu' || categorySlug === 'vga' || categorySlug === 'graphics-card') return 'GPU'
  if (['ssd', 'hdd', 'storage', 'o-cung'].includes(categorySlug)) return 'STORAGE'
  if (categorySlug === 'psu' || categorySlug === 'power-supply' || categorySlug === 'nguon') return 'PSU'
  if (categorySlug === 'case' || categorySlug === 'chassis' || categorySlug === 'vo-case') return 'CASE'

  const categoryName = normalizeText(product?.category?.name)?.toLowerCase() ?? ''
  const productName = normalizeText(product?.name)?.toLowerCase() ?? ''
  const haystack = `${categoryName} ${categorySlug} ${productName}`

  // Ưu tiên kiểm tra cooler trước cpu để tránh slug hoặc tên chứa 'cpu-cooler' / 'cpu cooler' bị nhận nhầm thành CPU
  if (
    haystack.includes('cooler') ||
    haystack.includes('heatsink') ||
    haystack.includes('tản nhiệt') ||
    haystack.includes('tan nhiet') ||
    haystack.includes('aio') ||
    haystack.includes('cooling') ||
    haystack.includes('fan')
  ) {
    return 'COOLER'
  }

  if (
    haystack.includes('cpu') ||
    haystack.includes('processor') ||
    haystack.includes('core i') ||
    haystack.includes('ryzen')
  ) {
    return 'CPU'
  }

  if (haystack.includes('mainboard') || haystack.includes('motherboard') || haystack.includes('bo mạch')) return 'MAINBOARD'
  if (haystack.includes('ram') || haystack.includes('memory') || haystack.includes('ddr4') || haystack.includes('ddr5')) return 'RAM'
  if (haystack.includes('gpu') || haystack.includes('graphics') || haystack.includes('geforce') || haystack.includes('radeon') || haystack.includes('rtx') || haystack.includes('gtx') || haystack.includes('vga')) return 'GPU'
  if (haystack.includes('ssd') || haystack.includes('hdd') || haystack.includes('storage') || haystack.includes('nvme') || haystack.includes('ổ cứng')) return 'STORAGE'
  if (haystack.includes('psu') || haystack.includes('power supply') || haystack.includes('nguồn')) return 'PSU'
  if (haystack.includes('case') || haystack.includes('chassis') || haystack.includes('vỏ')) return 'CASE'

  return 'STORAGE'
}

function getComponentPrice(product: any): number {
  const unitPrice = product?.salePrice ?? product?.price ?? 0
  return Number.isFinite(unitPrice) ? Number(unitPrice) : 0
}

export type ParsedGpuConnectors = {
  raw: string
  isKnown: boolean
  requires16Pin: boolean
  count16Pin: number
  count8Pin: number
  count6Pin: number
}

export type ParsedPsuConnectors = {
  raw: string
  isKnown: boolean
  has16Pin: boolean
  count16Pin: number
  pcie8PinCount: number
  pcie6PinCount: number
  totalPcieCount: number
}

export function parseGpuPowerConnector(rawText?: string): ParsedGpuConnectors {
  if (!rawText || !rawText.trim()) {
    return { raw: '', isKnown: false, requires16Pin: false, count16Pin: 0, count8Pin: 0, count6Pin: 0 }
  }
  const text = rawText.toLowerCase().trim()
  const has16Pin = text.includes('16-pin') || text.includes('16 pin') || text.includes('12vhpwr') || text.includes('12v-2x6')

  let count16Pin = 0
  if (has16Pin) {
    const match16 = text.match(/(\d+)\s*x\s*(?:16[\s-]*pin|12vhpwr|12v-2x6)/)
    count16Pin = match16 ? parseInt(match16[1], 10) : 1
  }

  let count8Pin = 0
  const match8 = text.match(/(\d+)\s*x\s*8[\s-]*pin/)
  if (match8) {
    count8Pin = parseInt(match8[1], 10)
  } else if (!has16Pin && text.includes('8-pin')) {
    count8Pin = 1
  }

  let count6Pin = 0
  const match6 = text.match(/(\d+)\s*x\s*6[\s-]*pin/)
  if (match6) {
    count6Pin = parseInt(match6[1], 10)
  } else if (!has16Pin && text.includes('6-pin')) {
    count6Pin = 1
  }

  const isKnown = has16Pin || count8Pin > 0 || count6Pin > 0
  return {
    raw: rawText,
    isKnown,
    requires16Pin: has16Pin,
    count16Pin,
    count8Pin,
    count6Pin,
  }
}

export function parsePsuConnectors(rawText?: string): ParsedPsuConnectors {
  if (!rawText || !rawText.trim()) {
    return { raw: '', isKnown: false, has16Pin: false, count16Pin: 0, pcie8PinCount: 0, pcie6PinCount: 0, totalPcieCount: 0 }
  }
  const text = rawText.toLowerCase().trim()
  const has16Pin = text.includes('16-pin') || text.includes('16 pin') || text.includes('12vhpwr') || text.includes('12v-2x6')
  let count16Pin = 0
  if (has16Pin) {
    const match16 = text.match(/(\d+)\s*x\s*(?:16[\s-]*pin|12vhpwr|12v-2x6)/)
    count16Pin = match16 ? parseInt(match16[1], 10) : 1
  }

  const segments = text.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
  let pcie8PinCount = 0
  let pcie6PinCount = 0
  const eightPinMatches: number[] = []

  for (const seg of segments) {
    if (seg.includes('24-pin') || seg.includes('sata') || seg.includes('molex')) continue

    if (seg.includes('pcie') || seg.includes('pci-e') || seg.includes('vga') || seg.includes('gpu')) {
      const match8 = seg.match(/(\d+)\s*x\s*(?:8|6\+2)[\s-]*pin/)
      if (match8) {
        pcie8PinCount += parseInt(match8[1], 10)
      } else if (seg.includes('8-pin') || seg.includes('6+2-pin')) {
        pcie8PinCount += 1
      }
      const match6 = seg.match(/(\d+)\s*x\s*6[\s-]*pin/)
      if (match6) {
        pcie6PinCount += parseInt(match6[1], 10)
      }
      continue
    }

    if (seg.includes('6+2') || seg.includes('6+2-pin')) {
      const match = seg.match(/(\d+)\s*x\s*6\+2[\s-]*pin/)
      pcie8PinCount += match ? parseInt(match[1], 10) : 1
      continue
    }

    if (seg.includes('8-pin')) {
      const match = seg.match(/(\d+)\s*x\s*8[\s-]*pin/)
      const count = match ? parseInt(match[1], 10) : 1
      eightPinMatches.push(count)
    }
  }

  if (pcie8PinCount === 0 && eightPinMatches.length > 0) {
    if (eightPinMatches.length === 1) {
      pcie8PinCount = eightPinMatches[0]
    } else {
      for (let i = 1; i < eightPinMatches.length; i++) {
        pcie8PinCount += eightPinMatches[i]
      }
    }
  }

  const isKnown = has16Pin || pcie8PinCount > 0 || pcie6PinCount > 0
  return {
    raw: rawText,
    isKnown,
    has16Pin,
    count16Pin,
    pcie8PinCount,
    pcie6PinCount,
    totalPcieCount: pcie8PinCount + pcie6PinCount,
  }
}

export function evaluateGpuPsuConnectors(gpuPowerConnector?: string, psuConnectors?: string): string[] {
  const warnings: string[] = []
  const gpu = parseGpuPowerConnector(gpuPowerConnector)
  const psu = parsePsuConnectors(psuConnectors)

  if (!gpu.isKnown || !psu.isKnown) {
    warnings.push('GPU/PSU connector compatibility could not be fully verified from the available specification data.')
    return warnings
  }

  if (gpu.requires16Pin) {
    if (!psu.has16Pin) {
      warnings.push(
        'GPU requires a 16-pin (12VHPWR) power connector, but PSU does not have a native 16-pin cable; an adapter (e.g. multi 8-pin PCIe to 16-pin) or an ATX 3.0 / PCIe 5.0 PSU is required.',
      )
    }
    return warnings
  }

  if (gpu.count8Pin > 0) {
    if (psu.pcie8PinCount < gpu.count8Pin) {
      warnings.push(
        `GPU requires ${gpu.count8Pin} x 8-pin PCIe power connector(s), but PSU only provides ${psu.pcie8PinCount} x 8-pin PCIe connector(s).`,
      )
    }
  }

  return warnings
}

function getSingleSpec(product: any, field: string): unknown {
  return extractSpec(product, field)
}

function compareSocket(cpuValue: string | undefined, mbValue: string | undefined): boolean {
  if (!cpuValue || !mbValue) return true
  return parseComparableText(cpuValue) === parseComparableText(mbValue)
}

function compareRamType(mainboardValue: string | undefined, ramValue: string | undefined): boolean {
  if (!mainboardValue || !ramValue) return true
  return parseComparableText(mainboardValue) === parseComparableText(ramValue)
}

function parsePcieVersion(value: string | undefined): number | undefined {
  if (!value) return undefined
  const match = value.toLowerCase().match(/(\d+(?:\.\d+)?)/)
  if (!match) return undefined
  return Number(match[1])
}

const SYSTEM_OVERHEAD_WATTS = 120
const SAFETY_MARGIN_FACTOR = 1.3

export function evaluateCompatibility(selected: CompatibilityCandidate[]): CompatibilityResult {
  const components = selected.map((product) => {
    const type = resolveComponentType(product)
    const unitPrice = getComponentPrice(product)
    const specifications: Record<string, unknown> = {}
    for (const spec of product.specifications ?? []) {
      for (const [key, value] of Object.entries(spec)) {
        if (key !== 'id' && key !== 'productId') {
          specifications[key] = value
        }
      }
    }
    return {
      id: product.id,
      name: product.name,
      type,
      price: product.price,
      salePrice: product.salePrice,
      unitPrice,
      category: product.category,
      brand: product.brand,
      specifications,
    }
  })

  components.forEach((component) => {
    if (!component.specifications || Object.keys(component.specifications).length === 0) {
      component.specifications = {}
    }
  })

  const warnings: string[] = []
  const errors: string[] = []

  for (const component of components) {
    if (Object.keys(component.specifications).length === 0) {
      warnings.push(`${component.name} has no specification data available for compatibility checks.`)
    }
  }

  const cpu = selected.find((product) => resolveComponentType(product) === 'CPU')
  const mainboard = selected.find((product) => resolveComponentType(product) === 'MAINBOARD')
  const ramProducts = selected.filter((product) => resolveComponentType(product) === 'RAM')
  const gpu = selected.find((product) => resolveComponentType(product) === 'GPU')
  const caseProduct = selected.find((product) => resolveComponentType(product) === 'CASE')
  const cooler = selected.find((product) => resolveComponentType(product) === 'COOLER')
  const psu = selected.find((product) => resolveComponentType(product) === 'PSU')
  const storageProducts = selected.filter((product) => resolveComponentType(product) === 'STORAGE')

  if (cpu && mainboard) {
    const cpuSocket = normalizeText(getSingleSpec(cpu, 'socket'))
    const mbSocket = normalizeText(getSingleSpec(mainboard, 'socket'))
    if (!compareSocket(cpuSocket, mbSocket)) {
      errors.push(`CPU socket (${cpuSocket ?? 'unknown'}) is incompatible with motherboard socket (${mbSocket ?? 'unknown'})`)
    }
  }

  if (mainboard && ramProducts.length > 0) {
    const mainboardRamType = normalizeText(getSingleSpec(mainboard, 'ramType'))
    const ramTypes = ramProducts.map((ram) => normalizeText(getSingleSpec(ram, 'type')))
    if (mainboardRamType && ramTypes.some((ramType) => ramType && parseComparableText(ramType) !== parseComparableText(mainboardRamType))) {
      errors.push(`Mainboard RAM type (${mainboardRamType}) is incompatible with selected RAM type(s)`)
    }

    const mainboardRamSlots = asNumber(getSingleSpec(mainboard, 'ramSlots'))
    const ramModuleCount = ramProducts.reduce((sum, ram) => sum + (asNumber(getSingleSpec(ram, 'modules')) ?? 1), 0)
    if (typeof mainboardRamSlots === 'number' && ramModuleCount > mainboardRamSlots) {
      errors.push(`Selected RAM modules (${ramModuleCount}) exceed the motherboard RAM slots (${mainboardRamSlots})`)
    }

    const mainboardMaxRam = asNumber(getSingleSpec(mainboard, 'maxRam'))
    const totalRamCapacity = ramProducts.reduce((sum, ram) => sum + (asNumber(getSingleSpec(ram, 'capacity')) ?? 0), 0)
    if (typeof mainboardMaxRam === 'number' && totalRamCapacity > mainboardMaxRam) {
      errors.push(`Total RAM capacity (${totalRamCapacity} GB) exceeds motherboard max RAM (${mainboardMaxRam} GB)`) 
    }
  }

  if (gpu && caseProduct) {
    const gpuLength = asNumber(getSingleSpec(gpu, 'length'))
    const caseGpuClearance = asNumber(getSingleSpec(caseProduct, 'gpuClearance'))
    if (typeof gpuLength === 'number' && typeof caseGpuClearance === 'number' && gpuLength > caseGpuClearance) {
      errors.push(`GPU length (${gpuLength} mm) exceeds case GPU clearance (${caseGpuClearance} mm)`) 
    }
  }

  if (cooler && caseProduct) {
    const coolerHeight = asNumber(getSingleSpec(cooler, 'height'))
    const caseCoolerClearance = asNumber(getSingleSpec(caseProduct, 'cpuCoolerClearance'))
    if (typeof coolerHeight === 'number' && typeof caseCoolerClearance === 'number' && coolerHeight > caseCoolerClearance) {
      errors.push(`CPU cooler height (${coolerHeight} mm) exceeds case cooler clearance (${caseCoolerClearance} mm)`) 
    }
  }

  const cpuTdp = cpu ? asNumber(getSingleSpec(cpu, 'tdp')) ?? 0 : 0
  const gpuPower = gpu ? asNumber(getSingleSpec(gpu, 'powerConsumption')) ?? 0 : 0
  const estimatedPower = Math.ceil(cpuTdp + gpuPower + SYSTEM_OVERHEAD_WATTS)
  const recommendedPSU = Math.ceil(estimatedPower * SAFETY_MARGIN_FACTOR)

  if (psu) {
    const psuWattage = asNumber(getSingleSpec(psu, 'wattage'))
    if (typeof psuWattage === 'number') {
      if (psuWattage < recommendedPSU) {
        const diff = recommendedPSU - psuWattage
        if (diff > 120) {
          errors.push(`PSU wattage (${psuWattage} W) is below the recommended minimum (${recommendedPSU} W)`) 
        } else {
          warnings.push(`PSU wattage (${psuWattage} W) is slightly below the recommended minimum (${recommendedPSU} W); consider a stronger PSU`) 
        }
      }
    } else {
      warnings.push('PSU wattage is unavailable; power recommendation could not be fully verified.')
    }
  } else if (estimatedPower > 0) {
    warnings.push('No PSU selected; power recommendation is based on current components only.')
  }

  const gpuPowerConnector = normalizeText(getSingleSpec(gpu, 'powerConnector'))
  const psuConnectors = normalizeText(getSingleSpec(psu, 'connectors'))
  if (gpu && psu) {
    const connectorWarnings = evaluateGpuPsuConnectors(gpuPowerConnector, psuConnectors)
    warnings.push(...connectorWarnings)
  }

  if (mainboard && gpu) {
    const boardPcie = parsePcieVersion(normalizeText(getSingleSpec(mainboard, 'pcieVersion')))
    const gpuInterface = parsePcieVersion(normalizeText(getSingleSpec(gpu, 'interface')))
    if (typeof boardPcie === 'number' && typeof gpuInterface === 'number' && boardPcie !== gpuInterface) {
      warnings.push(`PCIe generation differs between motherboard (${boardPcie}.0) and GPU (${gpuInterface}.0); compatibility is usually backward compatible but should be verified.`)
    }
  }

  if (selected.length === 0) {
    warnings.push('No components selected.')
  }

  const types = Array.from(new Set(components.map((component) => component.type)))
  const result: CompatibilityResult = {
    compatible: errors.length === 0,
    components: components.map((component) => ({
      id: component.id,
      name: component.name,
      type: component.type,
      price: component.price,
      salePrice: component.salePrice,
      unitPrice: component.unitPrice,
      category: component.category,
      brand: component.brand,
      specifications: component.specifications,
    })),
    totalPrice: components.reduce((sum, component) => sum + component.unitPrice, 0),
    estimatedPower,
    recommendedPSU,
    warnings,
    errors,
    summary: {
      selectedComponents: selected.length,
      types,
    },
  }

  return result
}

export async function checkCompatibility(configuration: { productIds: unknown }): Promise<CompatibilityResult> {
  const ids = configuration?.productIds
  if (!Array.isArray(ids)) {
    serviceError(400, 'productIds must be an array')
  }

  if (ids.length === 0) {
    serviceError(400, 'productIds cannot be empty')
  }

  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length !== ids.length) {
    serviceError(400, 'Duplicate productIds are not allowed')
  }

  const normalizedIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0)
  if (normalizedIds.length !== ids.length) {
    serviceError(400, 'productIds must contain valid strings')
  }

  const products = await prisma.product.findMany({
    where: { id: { in: normalizedIds }, isActive: true },
    include: {
      category: true,
      brand: true,
      specifications: true,
    },
  })

  const productMap = new Map(products.map((product) => [product.id, product]))
  const missingIds = normalizedIds.filter((id) => !productMap.has(id))
  if (missingIds.length > 0) {
    serviceError(404, `Product not found: ${missingIds[0]}`)
  }

  const selected = normalizedIds.map((productId) => {
    const product = productMap.get(productId)
    if (!product) serviceError(404, `Product not found: ${productId}`)
    return product
  })

  return evaluateCompatibility(selected)
}
