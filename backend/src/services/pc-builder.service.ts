import prisma from '../config/prisma'

export type ComponentType = 'CPU' | 'MAINBOARD' | 'RAM' | 'GPU' | 'STORAGE' | 'PSU' | 'CASE' | 'COOLER'

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

  const categoryName = normalizeText(product?.category?.name)?.toLowerCase() ?? ''
  const categorySlug = normalizeText(product?.category?.slug)?.toLowerCase() ?? ''
  const haystack = `${categoryName} ${categorySlug} ${normalizeText(product?.name)?.toLowerCase() ?? ''}`

  if (haystack.includes('cpu')) return 'CPU'
  if (haystack.includes('mainboard') || haystack.includes('motherboard')) return 'MAINBOARD'
  if (haystack.includes('ram') || haystack.includes('memory')) return 'RAM'
  if (haystack.includes('gpu') || haystack.includes('graphics')) return 'GPU'
  if (haystack.includes('ssd') || haystack.includes('hdd') || haystack.includes('storage')) return 'STORAGE'
  if (haystack.includes('psu') || haystack.includes('power supply')) return 'PSU'
  if (haystack.includes('case')) return 'CASE'
  if (haystack.includes('cooler') || haystack.includes('heatsink') || haystack.includes('fan')) return 'COOLER'

  return 'STORAGE'
}

function getComponentPrice(product: any): number {
  const unitPrice = product?.salePrice ?? product?.price ?? 0
  return Number.isFinite(unitPrice) ? Number(unitPrice) : 0
}

function parseConnectorTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+\-x]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => token.includes('pin') || token.includes('x') || token.includes('8') || token.includes('6') || token.includes('12v') || token.includes('cable'))
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
    if (gpuPowerConnector && psuConnectors) {
      const gpuTokens = parseConnectorTokens(gpuPowerConnector)
      const psuTokens = parseConnectorTokens(psuConnectors)
      const overlap = gpuTokens.some((token) => psuTokens.includes(token))
      if (!overlap) {
        warnings.push('GPU/PSU connector compatibility could not be fully verified from the available specification data.')
      }
    } else if (gpuPowerConnector || psuConnectors) {
      warnings.push('GPU/PSU connector compatibility cannot be fully verified.')
    }
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
