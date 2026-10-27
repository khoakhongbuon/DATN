import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type { CompatibilityCandidate } from './pc-builder.service'

const originalDatabaseUrl = process.env.DATABASE_URL
process.env.DATABASE_URL = 'postgresql://localhost:5432/pc_store_unit_test'

type Spec = Record<string, string | number | null>

function product(
  id: string,
  productType: string,
  specifications: Spec = {},
  price = 100000,
  salePrice: number | null = null,
): CompatibilityCandidate {
  return {
    id,
    name: `${productType} ${id}`,
    price,
    salePrice,
    category: { id: `category-${productType}`, name: productType, slug: productType.toLowerCase() },
    brand: null,
    specifications: [{
      id: `spec-${id}`,
      productId: id,
      productType,
      ...specifications,
    }],
  }
}

async function evaluateCompatibility(products: CompatibilityCandidate[]) {
  const service = await import('./pc-builder.service')
  return service.evaluateCompatibility(products)
}

test('reports mismatched CPU and motherboard sockets as a hard error', async () => {
  const result = await evaluateCompatibility([
    product('cpu-1', 'CPU', { socket: 'AM5' }),
    product('board-1', 'MAINBOARD', { socket: 'LGA1700' }),
  ])

  assert.equal(result.compatible, false)
  assert.match(result.errors.join(' '), /CPU socket/)
})

test('rejects incompatible RAM type, module count, and capacity', async () => {
  const result = await evaluateCompatibility([
    product('board-1', 'MAINBOARD', { ramType: 'DDR5', ramSlots: 1, maxRam: 16 }),
    product('ram-1', 'RAM', { type: 'DDR4', modules: 2, capacity: 32 }),
  ])

  assert.equal(result.compatible, false)
  assert.match(result.errors.join(' '), /Mainboard RAM type/)
  assert.match(result.errors.join(' '), /exceed the motherboard RAM slots/)
  assert.match(result.errors.join(' '), /exceeds motherboard max RAM/)
})

test('rejects a GPU or cooler that exceeds the case clearance', async () => {
  const result = await evaluateCompatibility([
    product('gpu-1', 'GPU', { length: 350, powerConsumption: 250 }),
    product('cooler-1', 'COOLER', { height: 170 }),
    product('case-1', 'CASE', { gpuClearance: 320, cpuCoolerClearance: 160 }),
  ])

  assert.equal(result.compatible, false)
  assert.match(result.errors.join(' '), /GPU length/)
  assert.match(result.errors.join(' '), /CPU cooler height/)
})

test('rejects a PSU that is materially below the recommended wattage', async () => {
  const result = await evaluateCompatibility([
    product('cpu-1', 'CPU', { tdp: 200 }),
    product('gpu-1', 'GPU', { powerConsumption: 250 }),
    product('psu-1', 'PSU', { wattage: 500 }),
  ])

  assert.equal(result.compatible, false)
  assert.equal(result.estimatedPower, 570)
  assert.equal(result.recommendedPSU, 741)
  assert.match(result.errors.join(' '), /PSU wattage/)
})

test('calculates sale-price totals and preserves the component summary', async () => {
  const result = await evaluateCompatibility([
    product('cpu-1', 'CPU', { socket: 'AM5' }, 1000000, 850000),
    product('storage-1', 'STORAGE', { capacityGB: 1000 }, 500000),
  ])

  assert.equal(result.compatible, true)
  assert.equal(result.totalPrice, 1350000)
  assert.equal(result.summary.selectedComponents, 2)
  assert.deepEqual(result.summary.types, ['CPU', 'STORAGE'])
  assert.equal(result.components[0].unitPrice, 850000)
  assert.equal(result.components[0].salePrice, 850000)
})

test('reports missing specifications, unknown connectors, and PCIe generation differences', async () => {
  const gpu = product('gpu-1', 'GPU', {
    powerConsumption: 200,
    powerConnector: '8-pin',
    interface: 'PCIe 5.0',
  })
  const motherboard = product('board-1', 'MAINBOARD', { pcieVersion: 'PCIe 4.0' })
  const psu = product('psu-1', 'PSU', { wattage: 600 })
  const noSpecification = product('cpu-1', 'CPU')
  noSpecification.specifications = []

  const result = await evaluateCompatibility([gpu, motherboard, psu, noSpecification])

  assert.equal(result.compatible, true)
  assert.ok(result.warnings.some((warning) => warning.includes('no specification data')))
  assert.ok(result.warnings.some((warning) => warning.includes('connector compatibility')))
  assert.ok(result.warnings.some((warning) => warning.includes('PCIe generation differs')))
})

test('correctly distinguishes CPU and Cooler even when productType is missing or slug contains cpu', async () => {
  const coolerWithoutProductType: CompatibilityCandidate = {
    id: 'cooler-missing-type',
    name: 'Thermalright Peerless Assassin 120 SE',
    price: 800000,
    salePrice: null,
    category: { id: 'cat-cooler', name: 'CPU Cooler', slug: 'cpu-cooler' },
    brand: null,
    specifications: [{ id: 'spec-c1', productId: 'cooler-missing-type', height: 155 }],
  }

  const coolerByName: CompatibilityCandidate = {
    id: 'cooler-name',
    name: 'DeepCool AK620 CPU Air Cooler',
    price: 1200000,
    salePrice: null,
    category: null,
    brand: null,
    specifications: [{ id: 'spec-c2', productId: 'cooler-name', height: 160 }],
  }

  const cpuWithoutProductType: CompatibilityCandidate = {
    id: 'cpu-missing-type',
    name: 'Intel Core i5-13400F Processor',
    price: 4500000,
    salePrice: null,
    category: { id: 'cat-cpu', name: 'CPU', slug: 'cpu' },
    brand: null,
    specifications: [{ id: 'spec-cpu1', productId: 'cpu-missing-type', socket: 'LGA1700', tdp: 65 }],
  }

  const result = await evaluateCompatibility([coolerWithoutProductType, coolerByName, cpuWithoutProductType])
  const types = result.components.map((c) => ({ id: c.id, type: c.type }))

  assert.deepEqual(types, [
    { id: 'cooler-missing-type', type: 'COOLER' },
    { id: 'cooler-name', type: 'COOLER' },
    { id: 'cpu-missing-type', type: 'CPU' },
  ])
})

test('evaluates GPU and PSU connector compatibility accurately (Rule R9)', async () => {
  // 1. 16-pin GPU with legacy 8-pin PSU -> Requires adapter warning
  const gpu16Pin = product('gpu-16pin', 'GPU', {
    powerConsumption: 285,
    powerConnector: '1 x 16-pin (12VHPWR)',
  })
  const psu8Pin = product('psu-8pin', 'PSU', {
    wattage: 850,
    connectors: '2 x 8-pin PCIe',
  })
  const result1 = await evaluateCompatibility([gpu16Pin, psu8Pin])
  assert.ok(
    result1.warnings.some((w) => w.includes('16-pin (12VHPWR)') && w.includes('adapter')),
    'Should warn that 16-pin GPU on 8-pin PSU requires adapter',
  )

  // 2. 16-pin GPU with ATX 3.0 PSU having native 16-pin -> Compatible, no warning
  const psu16Pin = product('psu-16pin', 'PSU', {
    wattage: 850,
    connectors: '1 x 24-pin, 2 x 8-pin, 4 x 8-pin, 1 x 16-pin, 1 x 12vhpwr, 8 x sata',
  })
  const result2 = await evaluateCompatibility([gpu16Pin, psu16Pin])
  assert.ok(
    !result2.warnings.some((w) => w.includes('16-pin')),
    'Native 16-pin PSU should not trigger adapter warning',
  )

  // 3. 8-pin GPU with sufficient 8-pin PSU -> Compatible, no warning
  const gpu8Pin = product('gpu-8pin', 'GPU', {
    powerConsumption: 160,
    powerConnector: '1 x 8-pin',
  })
  const result3 = await evaluateCompatibility([gpu8Pin, psu8Pin])
  assert.ok(
    !result3.warnings.some((w) => w.includes('connector')),
    'Matching 8-pin GPU and PSU should be compatible without warnings',
  )

  // 4. GPU needing 3x 8-pin with PSU offering only 2x 8-pin -> Warning
  const gpu3x8Pin = product('gpu-3x8pin', 'GPU', {
    powerConsumption: 350,
    powerConnector: '3 x 8-pin',
  })
  const result4 = await evaluateCompatibility([gpu3x8Pin, psu8Pin])
  assert.ok(
    result4.warnings.some((w) => w.includes('3 x 8-pin') && w.includes('2 x 8-pin')),
    'Should warn when PSU has fewer 8-pin cables than GPU requires',
  )

  // 5. Missing connector specifications on PSU -> Warning
  const psuNoConnectors = product('psu-no-conn', 'PSU', { wattage: 750 })
  const result5 = await evaluateCompatibility([gpu8Pin, psuNoConnectors])
  assert.ok(
    result5.warnings.some((w) => w.includes('connector compatibility')),
    'Missing PSU connectors should warn that compatibility cannot be verified',
  )
})

after(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
})
