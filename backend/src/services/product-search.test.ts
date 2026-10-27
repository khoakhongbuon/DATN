import test from 'node:test'
import assert from 'node:assert/strict'
import {
  removeVietnameseTones,
  normalizeSearchKeyword,
  buildSearchCondition,
  getProducts,
} from './product.service'

test('removeVietnameseTones normalizes Vietnamese diacritics', () => {
  assert.equal(removeVietnameseTones('Màn hình'), 'Man hinh')
  assert.equal(removeVietnameseTones('Bo mạch chủ'), 'Bo mach chu')
  assert.equal(removeVietnameseTones('Card màn hình'), 'Card man hinh')
  assert.equal(removeVietnameseTones('Đồ họa'), 'Do hoa')
})

test('normalizeSearchKeyword lowercases and trims extra spaces', () => {
  assert.equal(normalizeSearchKeyword('  Màn   Hình   '), 'man hinh')
  assert.equal(normalizeSearchKeyword('MONITOR'), 'monitor')
})

test('buildSearchCondition maps "Màn hình", "man hinh", and "Monitor" to monitor category', () => {
  const condManHinh = buildSearchCondition('Màn hình')
  const condManHinhNoTone = buildSearchCondition('man hinh')
  const condMonitor = buildSearchCondition('Monitor')

  assert.ok(condManHinh?.OR?.some((item: any) => item.category?.slug === 'monitor'))
  assert.ok(condManHinhNoTone?.OR?.some((item: any) => item.category?.slug === 'monitor'))
  assert.ok(condMonitor?.OR?.some((item: any) => item.category?.slug === 'monitor'))
})

test('buildSearchCondition differentiates "card màn hình" as GPU, not monitor', () => {
  const condGpu = buildSearchCondition('card màn hình')
  assert.ok(condGpu?.OR?.some((item: any) => item.category?.slug === 'gpu'))
  assert.ok(!condGpu?.OR?.some((item: any) => item.category?.slug === 'monitor'))
})

test('buildSearchCondition handles compound query "màn hình asus"', () => {
  const condCompound = buildSearchCondition('màn hình asus')
  assert.ok(condCompound?.OR)
  const compoundBranch = condCompound.OR.find((item: any) => item.AND)
  assert.ok(compoundBranch, 'Expected compound branch with AND condition')
  assert.equal(compoundBranch.AND[0].category.slug, 'monitor')
})

test('search integration: "Màn hình", "man hinh", and "Monitor" return matching monitors', async () => {
  const [res1, res2, res3] = await Promise.all([
    getProducts({ search: 'Màn hình' }),
    getProducts({ search: 'man hinh' }),
    getProducts({ search: 'Monitor' }),
  ])

  assert.ok(res1.data.length > 0, 'Expected "Màn hình" to find products')
  assert.ok(res2.data.length > 0, 'Expected "man hinh" to find products')
  assert.ok(res3.data.length > 0, 'Expected "Monitor" to find products')

  // Verify all returned products in res1 are monitors
  res1.data.forEach((p) => {
    assert.equal(p.category?.slug, 'monitor', `Expected product ${p.name} to have category monitor`)
  })
})

test('search integration: unrelated keyword returns empty list', async () => {
  const res = await getProducts({ search: 'tukhongtontai_xyz123abc' })
  assert.equal(res.data.length, 0)
  assert.equal(res.pagination?.total, 0)
})

test('search integration: preserves pagination and brand filtering', async () => {
  const resAsus = await getProducts({ search: 'Màn hình', brandSlug: 'asus', limit: 2 })
  assert.ok(resAsus.data.length > 0)
  assert.ok(resAsus.data.length <= 2)
  resAsus.data.forEach((p) => {
    assert.equal(p.category?.slug, 'monitor')
    assert.equal(p.brand?.slug, 'asus')
  })
})

test('category + brand filter: Laptop + ASUS returns 0 and does not leak other ASUS products', async () => {
  const res = await getProducts({ categorySlug: 'laptop', brandSlug: 'asus' })
  assert.equal(res.data.length, 0)
  assert.equal(res.pagination.total, 0)
})

test('category + brand filter: Laptop + Lenovo returns 0 and does not leak other Lenovo products', async () => {
  const res = await getProducts({ categorySlug: 'laptop', brandSlug: 'lenovo' })
  assert.equal(res.data.length, 0)
  assert.equal(res.pagination.total, 0)
})

test('category + brand filter: VGA + ASUS returns only GPUs from ASUS', async () => {
  const res = await getProducts({ categorySlug: 'gpu', brandSlug: 'asus' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.equal(p.category?.slug, 'gpu', `Product ${p.name} must be in gpu category`)
    assert.equal(p.brand?.slug, 'asus', `Product ${p.name} must be brand asus`)
  })
})

test('category + brand filter: Màn hình + Samsung returns only Monitors from Samsung, never SSDs', async () => {
  const res = await getProducts({ categorySlug: 'monitor', brandSlug: 'samsung' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.equal(p.category?.slug, 'monitor', `Product ${p.name} must be in monitor category`)
    assert.equal(p.brand?.slug, 'samsung', `Product ${p.name} must be brand samsung`)
  })
})

test('category + brand filter: SSD/HDD + Samsung returns only storage devices from Samsung, never monitors', async () => {
  const res = await getProducts({ categorySlug: 'ssd,hdd', brandSlug: 'samsung' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.ok(p.category?.slug === 'ssd' || p.category?.slug === 'hdd', `Product ${p.name} must be storage category`)
    assert.equal(p.brand?.slug, 'samsung', `Product ${p.name} must be brand samsung`)
  })
})

test('category + brand filter: CPU + Intel returns only CPUs from Intel', async () => {
  const res = await getProducts({ categorySlug: 'cpu', brandSlug: 'intel' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.equal(p.category?.slug, 'cpu', `Product ${p.name} must be CPU category`)
    assert.equal(p.brand?.slug, 'intel', `Product ${p.name} must be brand intel`)
  })
})

test('category + brand filter: PC Gaming + ASUS returns 0 and does not leak components', async () => {
  const res = await getProducts({ categorySlug: 'pc-gaming', brandSlug: 'asus' })
  assert.equal(res.data.length, 0)
  assert.equal(res.pagination.total, 0)
})

test('category + brand filter: Mainboard + ASUS returns only Mainboards from ASUS', async () => {
  const res = await getProducts({ categorySlug: 'mainboard', brandSlug: 'asus' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.equal(p.category?.slug, 'mainboard', `Product ${p.name} must be Mainboard category`)
    assert.equal(p.brand?.slug, 'asus', `Product ${p.name} must be brand asus`)
  })
})

test('category + brand filter: RAM + Corsair returns only RAMs from Corsair, never PSUs or Cases', async () => {
  const res = await getProducts({ categorySlug: 'ram', brandSlug: 'corsair' })
  assert.ok(res.data.length > 0)
  res.data.forEach((p) => {
    assert.equal(p.category?.slug, 'ram', `Product ${p.name} must be RAM category`)
    assert.equal(p.brand?.slug, 'corsair', `Product ${p.name} must be brand corsair`)
  })
})

test('category + brand filter: case-insensitive category and brand slugs match accurately', async () => {
  const [res1, res2, res3] = await Promise.all([
    getProducts({ categorySlug: 'Monitor', brandSlug: 'Samsung' }),
    getProducts({ categorySlug: 'gpu', brandSlug: 'ASUS' }),
    getProducts({ categorySlug: 'Cpu', brandSlug: 'Intel' }),
  ])
  assert.ok(res1.data.length > 0)
  res1.data.forEach((p) => {
    assert.equal(p.category?.slug, 'monitor')
    assert.equal(p.brand?.slug, 'samsung')
  })
  assert.ok(res2.data.length > 0)
  res2.data.forEach((p) => {
    assert.equal(p.category?.slug, 'gpu')
    assert.equal(p.brand?.slug, 'asus')
  })
  assert.ok(res3.data.length > 0)
  res3.data.forEach((p) => {
    assert.equal(p.category?.slug, 'cpu')
    assert.equal(p.brand?.slug, 'intel')
  })
})

