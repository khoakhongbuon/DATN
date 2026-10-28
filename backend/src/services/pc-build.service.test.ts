import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import type {
  BuildCandidate,
  BuildDependencies,
  BuildRequirements,
  BuildRole,
} from './pc-build.service'

const originalDatabaseUrl = process.env.DATABASE_URL
process.env.DATABASE_URL = 'postgresql://localhost:5432/pc_store_unit_test'

type CandidateSpec = Record<string, string | number | null>

const categoryNames: Record<BuildRole, { name: string; slug: string; productType?: string }> = {
  CPU: { name: 'CPU', slug: 'cpu', productType: 'CPU' },
  MAINBOARD: { name: 'Mainboard', slug: 'mainboard', productType: 'MAINBOARD' },
  RAM: { name: 'RAM', slug: 'ram', productType: 'RAM' },
  STORAGE: { name: 'SSD', slug: 'ssd', productType: 'STORAGE' },
  GPU: { name: 'GPU', slug: 'gpu', productType: 'GPU' },
  PSU: { name: 'PSU', slug: 'psu', productType: 'PSU' },
  CASE: { name: 'Case', slug: 'case', productType: 'CASE' },
  COOLER: { name: 'CPU Cooler', slug: 'cpu-cooler', productType: 'COOLER' },
  MONITOR: { name: 'Monitor', slug: 'monitor' },
  KEYBOARD: { name: 'Keyboard', slug: 'keyboard' },
  MOUSE: { name: 'Mouse', slug: 'mouse' },
}

function candidate(
  role: BuildRole,
  id: string,
  price: number,
  specifications: CandidateSpec = {},
  options: {
    salePrice?: number | null
    stock?: number
    isActive?: boolean
    name?: string
  } = {},
): BuildCandidate {
  const category = categoryNames[role]
  return {
    id,
    name: options.name ?? `${category.name} ${id}`,
    slug: `${category.slug}-${id}`,
    sku: `SKU-${id}`,
    price,
    salePrice: options.salePrice ?? null,
    stock: options.stock ?? 5,
    isActive: options.isActive ?? true,
    image: `/images/${id}.png`,
    role,
    category: { id: `category-${role}`, ...category },
    brand: null,
    specifications: [{
      id: `spec-${id}`,
      productId: id,
      ...(category.productType ? { productType: category.productType } : {}),
      ...specifications,
    }],
  }
}

function catalog(): BuildCandidate[] {
  return [
    candidate('CPU', 'cpu-1', 1000000, { socket: 'AM5', cores: 6, threads: 12, boostClock: 4.4, tdp: 65 }),
    candidate('MAINBOARD', 'board-1', 1000000, {
      socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 128, pcieVersion: 'PCIe 4.0',
    }),
    candidate('RAM', 'ram-1', 500000, { type: 'DDR5', capacity: 16, modules: 2, speed: 5600 }),
    candidate('STORAGE', 'ssd-1', 500000, { capacityGB: 1000, storageInterface: 'NVMe' }),
    candidate('PSU', 'psu-1', 500000, { wattage: 650, connectors: '8-pin' }),
    candidate('CASE', 'case-1', 500000, { gpuClearance: 300, cpuCoolerClearance: 160 }),
    candidate('MONITOR', 'monitor-1', 1000000),
    candidate('KEYBOARD', 'keyboard-1', 200000),
    candidate('MOUSE', 'mouse-1', 100000),
    candidate('GPU', 'gpu-basic', 1000000, {
      chipset: 'Entry GPU', vram: 4, length: 240, powerConsumption: 120, interface: 'PCIe 4.0',
    }),
    candidate('GPU', 'gpu-strong', 2000000, {
      chipset: 'Performance GPU', vram: 12, length: 260, powerConsumption: 200, interface: 'PCIe 4.0',
    }),
  ]
}

function dependencies(products: BuildCandidate[] = catalog()): BuildDependencies {
  return { findCandidates: async () => products }
}

function requirements(overrides: Partial<BuildRequirements> = {}): BuildRequirements {
  return { budgetVnd: 10000000, useCase: 'office', ...overrides }
}

async function recommendBuild(
  buildRequirements: BuildRequirements,
  buildDependencies: BuildDependencies = dependencies(),
) {
  const service = await import('./pc-build.service')
  return service.recommendBuild(buildRequirements, buildDependencies)
}

test('recommends a complete office build within 10, 15, and 20 million VND budgets', async () => {
  for (const budgetVnd of [10000000, 15000000, 20000000]) {
    const result = await recommendBuild(requirements({ budgetVnd }))

    assert.equal(result.status, 'recommended')
    assert.equal(result.withinBudget, true)
    assert.ok(result.totalPayable <= budgetVnd)
    assert.ok(result.items.some((item) => item.role === 'MONITOR'))
    assert.ok(result.items.some((item) => item.role === 'KEYBOARD'))
    assert.ok(result.items.some((item) => item.role === 'MOUSE'))
  }
})

test('prioritizes a capable GPU for gaming and graphics but does not force one for office work', async () => {
  for (const useCase of ['gaming', 'graphics']) {
    const result = await recommendBuild(requirements({ useCase }))
    assert.equal(result.status, 'recommended')
    assert.equal(result.items.find((item) => item.role === 'GPU')?.id, 'gpu-strong')
  }

  const office = await recommendBuild(requirements({ useCase: 'office' }))
  assert.equal(office.items.some((item) => item.role === 'GPU'), false)
})

test('can prioritize CPU, RAM, and storage capabilities for programming', async () => {
  const products = catalog().concat([
    candidate('CPU', 'cpu-programming', 1800000, {
      socket: 'AM5', cores: 12, threads: 24, boostClock: 4.8, tdp: 105,
    }),
    candidate('RAM', 'ram-programming', 900000, {
      type: 'DDR5', capacity: 32, modules: 2, speed: 6000,
    }),
    candidate('STORAGE', 'ssd-programming', 900000, {
      capacityGB: 4000, storageInterface: 'NVMe',
    }),
  ])

  const result = await recommendBuild(
    requirements({ useCase: 'programming', budgetVnd: 20000000, prioritizedRoles: ['CPU', 'RAM', 'STORAGE'] }),
    dependencies(products),
  )

  assert.equal(result.status, 'recommended')
  assert.equal(result.items.find((item) => item.role === 'CPU')?.id, 'cpu-programming')
  assert.equal(result.items.find((item) => item.role === 'RAM')?.id, 'ram-programming')
  assert.equal(result.items.find((item) => item.role === 'STORAGE')?.id, 'ssd-programming')
})

test('honors explicit peripheral exclusions and treats exact owned components as zero-cost', async () => {
  const products = catalog().concat([
    candidate('CPU', 'cpu-owned', 1000000, { socket: 'AM5', cores: 6, threads: 12, boostClock: 4.4, tdp: 65 }, {
      name: 'AMD Ryzen 5 Existing',
    }),
  ])
  const result = await recommendBuild(
    requirements({
      excludedRoles: ['MONITOR'],
      ownedComponents: [{ role: 'CPU', productName: 'AMD Ryzen 5 Existing' }],
    }),
    dependencies(products),
  )

  const ownedCpu = result.items.find((item) => item.role === 'CPU')
  assert.equal(ownedCpu?.owned, true)
  assert.equal(ownedCpu?.appliedPrice, 0)
  assert.equal(result.items.some((item) => item.role === 'MONITOR'), false)
  assert.ok(result.items.some((item) => item.role === 'KEYBOARD'))
  assert.ok(result.items.some((item) => item.role === 'MOUSE'))
})

test('asks for clarification rather than guessing an unmatched owned component', async () => {
  const result = await recommendBuild(
    requirements({ ownedComponents: [{ role: 'CPU', productName: 'Unknown CPU model' }] }),
  )

  assert.equal(result.status, 'needs_clarification')
  assert.ok(result.unverified.some((item) => item.includes('CPU')))
})

test('returns the nearest valid over-budget build with an exact deficit', async () => {
  const result = await recommendBuild(requirements({ budgetVnd: 1000000 }))

  assert.equal(result.status, 'over_budget')
  assert.equal(result.withinBudget, false)
  assert.equal(result.totalPayable, 5300000)
  assert.equal(result.deficit, 4300000)
})

test('returns backend-calculated totals for an available alternative build', async () => {
  const products = catalog().concat([
    candidate('CPU', 'cpu-budget', 700000, {
      socket: 'AM5', cores: 4, threads: 8, boostClock: 4, tdp: 65,
    }),
  ])
  const result = await recommendBuild(requirements(), dependencies(products))

  assert.equal(result.alternatives.length, 1)
  assert.ok(result.alternatives[0].items.length > 0)
  assert.ok(result.alternatives[0].totalPayable <= result.budgetVnd)
  assert.equal(
    result.alternatives[0].totalPayable,
    result.alternatives[0].items.reduce((total, item) => total + item.appliedPrice, 0),
  )
})

test('uses only valid sale prices for savings and rejects malformed prices', async () => {
  const products = catalog().map((item) => {
    if (item.role === 'CPU') return { ...item, salePrice: 850000 }
    if (item.role === 'MAINBOARD') return { ...item, salePrice: 2000000 }
    if (item.role === 'RAM') return { ...item, price: -1 }
    return item
  })
  const result = await recommendBuild(requirements(), dependencies(products))

  assert.equal(result.items.some((item) => item.role === 'RAM'), false)
  assert.equal(result.status, 'insufficient_catalog')
  assert.equal(result.items.length, 0)
  assert.ok(result.missingRoles.includes('RAM'))
})

test('does not select inactive or out-of-stock candidates', async () => {
  const products = catalog().map((item) => {
    if (item.role === 'CPU') return { ...item, isActive: false }
    if (item.role === 'MAINBOARD') return { ...item, stock: 0 }
    return item
  })
  const result = await recommendBuild(requirements(), dependencies(products))

  assert.equal(result.status, 'insufficient_catalog')
  assert.equal(result.items.length, 0)
})

test('does not return an incompatible CPU and motherboard combination', async () => {
  const products = catalog().map((item) => (
    item.role === 'MAINBOARD' && item.specifications?.[0]
      ? { ...item, specifications: [{ ...item.specifications[0], socket: 'LGA1700' }] }
      : item
  ))
  const result = await recommendBuild(requirements(), dependencies(products))

  assert.equal(result.status, 'no_compatible_build')
  assert.equal(result.items.length, 0)
  assert.ok(result.warnings.some((warning) => warning.includes('socket')))
})

test('uses salePrice as the only discount source when no eligible catalog promotion exists', async () => {
  const products = catalog().map((item) =>
    item.role === 'CPU' ? { ...item, salePrice: 900000 } : item,
  )
  const result = await recommendBuild(requirements(), dependencies(products))
  const cpu = result.items.find((item) => item.role === 'CPU')

  assert.equal(cpu?.listPrice, 1000000)
  assert.equal(cpu?.appliedPrice, 900000)
  assert.equal(cpu?.savings, 100000)
  assert.equal(result.totalSavings, 100000)
})

function realisticCatalog(): BuildCandidate[] {
  return [
    candidate('CPU', 'cpu-9600x', 7500000, {
      socket: 'AM5', cores: 6, threads: 12, boostClock: 5.4, tdp: 65,
    }, { name: 'AMD Ryzen 5 9600X' }),
    candidate('CPU', 'cpu-13500', 5800000, {
      socket: 'LGA1700', cores: 14, threads: 20, boostClock: 4.8, tdp: 65,
    }, { name: 'Intel Core i5-13500' }),
    candidate('MAINBOARD', 'mb-am5', 3200000, {
      socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 128, pcieVersion: 'PCIe 4.0',
    }, { name: 'Mainboard ASUS TUF Gaming B650M AM5' }),
    candidate('MAINBOARD', 'mb-lga1700', 2500000, {
      socket: 'LGA1700', ramType: 'DDR4', ramSlots: 4, maxRam: 128, pcieVersion: 'PCIe 4.0',
    }, { name: 'Mainboard ASUS Prime B760M LGA1700' }),
    candidate('RAM', 'ram-ddr5-32', 2500000, {
      type: 'DDR5', capacity: 32, modules: 2, speed: 6000,
    }, { name: 'RAM Kingston Fury Beast 32GB DDR5 6000MHz' }),
    candidate('RAM', 'ram-ddr4-16', 900000, {
      type: 'DDR4', capacity: 16, modules: 2, speed: 3200,
    }, { name: 'RAM Kingston Fury Beast 16GB DDR4 3200MHz' }),
    candidate('STORAGE', 'ssd-nvme-1tb', 1800000, {
      capacityGB: 1000, storageInterface: 'NVMe',
    }, { name: 'SSD Samsung 980 1TB NVMe' }),
    candidate('GPU', 'gpu-4060', 7800000, {
      chipset: 'RTX 4060', vram: 8, length: 240, powerConsumption: 115, interface: 'PCIe 4.0',
    }, { name: 'VGA MSI GeForce RTX 4060 Ventus 8GB' }),
    candidate('GPU', 'gpu-4070ti-super', 24000000, {
      chipset: 'RTX 4070 Ti SUPER', vram: 16, length: 305, powerConsumption: 285, interface: 'PCIe 4.0',
    }, { name: 'VGA ASUS TUF Gaming RTX 4070 Ti SUPER 16GB' }),
    candidate('PSU', 'psu-650w', 1200000, {
      wattage: 650, connectors: '8-pin',
    }, { name: 'Nguồn Cooler Master 650W 80 Plus Bronze' }),
    candidate('PSU', 'psu-850w', 3000000, {
      wattage: 850, connectors: '16-pin 12VHPWR',
    }, { name: 'Nguồn Corsair RM850e 850W Gold' }),
    candidate('CASE', 'case-mid', 1000000, {
      gpuClearance: 360, cpuCoolerClearance: 165,
    }, { name: 'Vỏ Case Xigmatek Gaming' }),
    candidate('COOLER', 'cooler-air', 500000, {
      height: 155,
    }, { name: 'Tản nhiệt Thermalright Assassin King' }),
    candidate('MONITOR', 'mon-24', 2500000, {}, { name: 'Màn hình ASUS 24 inch IPS' }),
    candidate('KEYBOARD', 'kb-mech', 400000, {}, { name: 'Bàn phím cơ DareU' }),
    candidate('MOUSE', 'mouse-opt', 200000, {}, { name: 'Chuột Logitech G102' }),
  ]
}

test('selects Ryzen 5 9600X and never switches to i5-13500 when requiredCpuModel is 9600X', async () => {
  const result = await recommendBuild(
    requirements({
      budgetVnd: 20000000,
      useCase: 'office',
      requiredCpuModel: 'Ryzen 5 9600X',
      excludedRoles: ['MONITOR', 'KEYBOARD', 'MOUSE'],
    }),
    dependencies(realisticCatalog()),
  )

  assert.equal(result.status, 'recommended')
  const selectedCpu = result.items.find((item) => item.role === 'CPU')
  assert.equal(selectedCpu?.id, 'cpu-9600x')
  assert.equal(selectedCpu?.name, 'AMD Ryzen 5 9600X')
  assert.ok(result.totalPayable <= 20000000)
  // Ensure compatible AM5 motherboard and DDR5 RAM were picked
  const selectedMb = result.items.find((item) => item.role === 'MAINBOARD')
  assert.equal(selectedMb?.id, 'mb-am5')
  const selectedRam = result.items.find((item) => item.role === 'RAM')
  assert.equal(selectedRam?.id, 'ram-ddr5-32')
})

test('optimizes performance within 50M budget with required Ryzen 5 9600X without leaving massive unspent budget', async () => {
  const result = await recommendBuild(
    requirements({
      budgetVnd: 50000000,
      useCase: 'gaming',
      requiredCpuModel: 'Ryzen 5 9600X',
    }),
    dependencies(realisticCatalog()),
  )

  assert.equal(result.status, 'recommended')
  assert.equal(result.withinBudget, true)
  const selectedCpu = result.items.find((item) => item.role === 'CPU')
  assert.equal(selectedCpu?.id, 'cpu-9600x')
  // Should select the powerful RTX 4070 Ti SUPER
  const selectedGpu = result.items.find((item) => item.role === 'GPU')
  assert.equal(selectedGpu?.id, 'gpu-4070ti-super')
  // Total payable should be substantially utilizing the budget (> 40M VND), not cheaping out
  assert.ok(result.totalPayable >= 40000000, `Expected >= 40M payable, got ${result.totalPayable}`)
  assert.ok(result.totalPayable <= 50000000, `Expected <= 50M payable, got ${result.totalPayable}`)
  assert.equal(result.remainingBudget, 50000000 - result.totalPayable)
})

test('reports over_budget with exact deficit when required CPU configuration exceeds 20M gaming budget', async () => {
  // If gaming with discrete GPU + peripherals exceeds 20M with 9600X
  const result = await recommendBuild(
    requirements({
      budgetVnd: 20000000,
      useCase: 'gaming',
      requiredCpuModel: 'Ryzen 5 9600X',
    }),
    dependencies(realisticCatalog()),
  )

  assert.equal(result.status, 'over_budget')
  assert.equal(result.withinBudget, false)
  const selectedCpu = result.items.find((item) => item.role === 'CPU')
  assert.equal(selectedCpu?.id, 'cpu-9600x')
  assert.ok(result.deficit > 0)
  assert.equal(result.totalPayable - 20000000, result.deficit)
})

test('reports insufficient_catalog when required CPU does not exist in catalog', async () => {
  const result = await recommendBuild(
    requirements({
      budgetVnd: 50000000,
      requiredCpuModel: 'Ryzen 9 9999X NonExistent',
    }),
    dependencies(realisticCatalog()),
  )

  assert.equal(result.status, 'insufficient_catalog')
  assert.ok(result.missingRoles.includes('CPU'))
})

test('reports no_compatible_build when AM5 CPU has no matching socket motherboard in catalog', async () => {
  const incompatibleCatalog = realisticCatalog().filter((c) => c.id !== 'mb-am5')
  const result = await recommendBuild(
    requirements({
      budgetVnd: 50000000,
      requiredCpuModel: 'Ryzen 5 9600X',
    }),
    dependencies(incompatibleCatalog),
  )

  assert.equal(result.status, 'no_compatible_build')
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes('socket')))
})

test('handles candidate with null price or negative price safely', async () => {
  const badPriceCatalog = realisticCatalog().map((c) =>
    c.id === 'cpu-9600x' ? { ...c, price: null as unknown as number } : c,
  )
  const result = await recommendBuild(
    requirements({ requiredCpuModel: 'Ryzen 5 9600X' }),
    dependencies(badPriceCatalog),
  )

  assert.equal(result.status, 'insufficient_catalog')
})

after(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
})
