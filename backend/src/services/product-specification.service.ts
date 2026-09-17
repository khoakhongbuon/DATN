import prisma from '../config/prisma'

const specFields: Record<string, string> = {
  productType: 'string',
  socket: 'string',
  cores: 'int',
  threads: 'int',
  baseClock: 'float',
  boostClock: 'float',
  tdp: 'int',
  chipset: 'string',
  vram: 'int',
  memoryType: 'string',
  length: 'int',
  powerConsumption: 'int',
  interface: 'string',
  powerConnector: 'string',
  ramType: 'string',
  ramSlots: 'int',
  maxRam: 'int',
  formFactor: 'string',
  pcieVersion: 'string',
  type: 'string',
  capacity: 'int',
  speed: 'int',
  modules: 'int',
  capacityGB: 'int',
  storageInterface: 'string',
  rpm: 'int',
  wattage: 'int',
  efficiency: 'string',
  certification: 'string',
  connectors: 'string',
  gpuClearance: 'int',
  cpuCoolerClearance: 'int',
  motherboardSupport: 'string',
  radiatorSupport: 'string',
  height: 'int',
  extra: 'json',
}

function sanitizeInput(input: any) {
  const out: any = {}
  for (const key of Object.keys(specFields)) {
    if (input[key] === undefined) continue
    const t = specFields[key]
    const v = input[key]
    if (t === 'int') {
      const n = Number(v)
      if (!Number.isFinite(n)) throw { status: 400, message: `${key} must be a number` }
      out[key] = Math.trunc(n)
    } else if (t === 'float') {
      const n = Number(v)
      if (!Number.isFinite(n)) throw { status: 400, message: `${key} must be a number` }
      out[key] = n
    } else if (t === 'json') {
      out[key] = v
    } else {
      out[key] = String(v)
    }
  }
  return out
}

export async function ensureProductExists(productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId } })
  return !!p
}

export async function listSpecifications(productId: string) {
  const exists = await ensureProductExists(productId)
  if (!exists) throw { status: 404, message: 'Product not found' }
  return prisma.productSpecification.findMany({ where: { productId } })
}

export async function getSpecification(productId: string, specificationId: string) {
  const spec = await prisma.productSpecification.findUnique({ where: { id: specificationId } })
  if (!spec || spec.productId !== productId) throw { status: 404, message: 'Specification not found' }
  return spec
}

export async function createSpecification(productId: string, input: any) {
  const exists = await ensureProductExists(productId)
  if (!exists) throw { status: 404, message: 'Product not found' }

  const data = sanitizeInput(input)
  data.productId = productId

  return prisma.productSpecification.create({ data })
}

export async function updateSpecification(productId: string, specificationId: string, input: any) {
  const spec = await prisma.productSpecification.findUnique({ where: { id: specificationId } })
  if (!spec || spec.productId !== productId) throw { status: 404, message: 'Specification not found' }

  const data = sanitizeInput(input)
  return prisma.productSpecification.update({ where: { id: specificationId }, data })
}

export async function deleteSpecification(productId: string, specificationId: string) {
  const spec = await prisma.productSpecification.findUnique({ where: { id: specificationId } })
  if (!spec || spec.productId !== productId) throw { status: 404, message: 'Specification not found' }
  await prisma.productSpecification.delete({ where: { id: specificationId } })
  return true
}
