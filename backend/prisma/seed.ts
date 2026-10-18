import prisma from '../src/config/prisma'
import bcrypt from 'bcryptjs'
import {
  psus,
  cases,
  cpuCoolers,
  monitors,
  phase4Brands,
} from './phase4-data'
import {
  mice,
  keyboards,
  headsets,
  mousepads,
  webcams,
  controllers,
  wifiCards,
  printers,
  phase5Categories,
  phase5Brands,
} from './phase5-data'

type NvidiaGpuSeed = {
  name: string
  slug: string
  sku: string
  brandSlug: string
  price: number
  salePrice: number | null
  stock: number
  chipset: string
  vram: number
  memoryType: string
  length: number
  powerConsumption: number
  interface: string
  powerConnector: string
}

const nvidiaGpus: NvidiaGpuSeed[] = [
  { name: 'ASUS Dual GeForce RTX 4060 OC 8GB', slug: 'asus-dual-rtx-4060-oc-8gb', sku: 'GPU-ASUS-RTX4060-DUAL-8G', brandSlug: 'asus', price: 7990000, salePrice: 7690000, stock: 12, chipset: 'RTX 4060', vram: 8, memoryType: 'GDDR6', length: 227, powerConsumption: 115, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'MSI GeForce RTX 4060 Ventus 2X Black 8G OC', slug: 'msi-rtx-4060-ventus-2x-black-8g-oc', sku: 'GPU-MSI-RTX4060-VENTUS2X-8G', brandSlug: 'msi', price: 7890000, salePrice: null, stock: 10, chipset: 'RTX 4060', vram: 8, memoryType: 'GDDR6', length: 199, powerConsumption: 115, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Gigabyte GeForce RTX 4060 Windforce OC 8G', slug: 'gigabyte-rtx-4060-windforce-oc-8g', sku: 'GPU-GIGABYTE-RTX4060-WF-8G', brandSlug: 'gigabyte', price: 8190000, salePrice: 7890000, stock: 8, chipset: 'RTX 4060', vram: 8, memoryType: 'GDDR6', length: 192, powerConsumption: 115, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Zotac Gaming GeForce RTX 4060 Twin Edge OC 8GB', slug: 'zotac-rtx-4060-twin-edge-oc-8gb', sku: 'GPU-ZOTAC-RTX4060-TWINEDGE-8G', brandSlug: 'zotac', price: 8290000, salePrice: null, stock: 7, chipset: 'RTX 4060', vram: 8, memoryType: 'GDDR6', length: 221, powerConsumption: 115, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'ASUS Dual GeForce RTX 4060 Ti OC 8GB', slug: 'asus-dual-rtx-4060-ti-oc-8gb', sku: 'GPU-ASUS-RTX4060TI-DUAL-8G', brandSlug: 'asus', price: 10990000, salePrice: 10490000, stock: 9, chipset: 'RTX 4060 Ti', vram: 8, memoryType: 'GDDR6', length: 227, powerConsumption: 160, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'MSI GeForce RTX 4060 Ti Ventus 2X Black 8G OC', slug: 'msi-rtx-4060-ti-ventus-2x-black-8g-oc', sku: 'GPU-MSI-RTX4060TI-VENTUS2X-8G', brandSlug: 'msi', price: 10890000, salePrice: null, stock: 8, chipset: 'RTX 4060 Ti', vram: 8, memoryType: 'GDDR6', length: 199, powerConsumption: 160, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Gigabyte GeForce RTX 4060 Ti Eagle OC 8G', slug: 'gigabyte-rtx-4060-ti-eagle-oc-8g', sku: 'GPU-GIGABYTE-RTX4060TI-EAGLE-8G', brandSlug: 'gigabyte', price: 11290000, salePrice: 10990000, stock: 6, chipset: 'RTX 4060 Ti', vram: 8, memoryType: 'GDDR6', length: 272, powerConsumption: 160, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Colorful iGame GeForce RTX 4060 Ti NB EX 16GB-V', slug: 'colorful-igame-rtx-4060-ti-nb-ex-16gb', sku: 'GPU-COLORFUL-RTX4060TI-NBEX-16G', brandSlug: 'colorful', price: 13990000, salePrice: null, stock: 5, chipset: 'RTX 4060 Ti', vram: 16, memoryType: 'GDDR6', length: 310, powerConsumption: 165, interface: 'PCIe 4.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Gigabyte GeForce RTX 4070 Windforce OC 12G', slug: 'gigabyte-rtx-4070-windforce-oc-12g', sku: 'GPU-GIGABYTE-RTX4070-WF-12G', brandSlug: 'gigabyte', price: 15490000, salePrice: 14990000, stock: 7, chipset: 'RTX 4070', vram: 12, memoryType: 'GDDR6X', length: 261, powerConsumption: 200, interface: 'PCIe 4.0 x16', powerConnector: '1 x 8-pin' },
  { name: 'Zotac Gaming GeForce RTX 4070 Trinity 12GB', slug: 'zotac-rtx-4070-trinity-12gb', sku: 'GPU-ZOTAC-RTX4070-TRINITY-12G', brandSlug: 'zotac', price: 15990000, salePrice: null, stock: 6, chipset: 'RTX 4070', vram: 12, memoryType: 'GDDR6X', length: 306, powerConsumption: 200, interface: 'PCIe 4.0 x16', powerConnector: '1 x 8-pin' },
  { name: 'ASUS Dual GeForce RTX 4070 SUPER OC 12GB', slug: 'asus-dual-rtx-4070-super-oc-12gb', sku: 'GPU-ASUS-RTX4070S-DUAL-12G', brandSlug: 'asus', price: 17490000, salePrice: 16990000, stock: 8, chipset: 'RTX 4070 SUPER', vram: 12, memoryType: 'GDDR6X', length: 267, powerConsumption: 220, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'MSI GeForce RTX 4070 SUPER Ventus 2X OC 12G', slug: 'msi-rtx-4070-super-ventus-2x-oc-12g', sku: 'GPU-MSI-RTX4070S-VENTUS2X-12G', brandSlug: 'msi', price: 17290000, salePrice: null, stock: 7, chipset: 'RTX 4070 SUPER', vram: 12, memoryType: 'GDDR6X', length: 242, powerConsumption: 220, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Galax GeForce RTX 4070 SUPER EX Gamer 1-Click OC 12GB', slug: 'galax-rtx-4070-super-ex-gamer-12gb', sku: 'GPU-GALAX-RTX4070S-EXGAMER-12G', brandSlug: 'galax', price: 17990000, salePrice: 17490000, stock: 5, chipset: 'RTX 4070 SUPER', vram: 12, memoryType: 'GDDR6X', length: 323, powerConsumption: 220, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'MSI GeForce RTX 4070 Ti SUPER Ventus 3X OC 16G', slug: 'msi-rtx-4070-ti-super-ventus-3x-oc-16g', sku: 'GPU-MSI-RTX4070TIS-VENTUS3X-16G', brandSlug: 'msi', price: 23490000, salePrice: 22990000, stock: 5, chipset: 'RTX 4070 Ti SUPER', vram: 16, memoryType: 'GDDR6X', length: 308, powerConsumption: 285, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'PNY GeForce RTX 4070 Ti SUPER VERTO Overclocked 16GB', slug: 'pny-rtx-4070-ti-super-verto-oc-16gb', sku: 'GPU-PNY-RTX4070TIS-VERTO-16G', brandSlug: 'pny', price: 23990000, salePrice: null, stock: 4, chipset: 'RTX 4070 Ti SUPER', vram: 16, memoryType: 'GDDR6X', length: 305, powerConsumption: 285, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'ASUS TUF Gaming GeForce RTX 4080 SUPER OC 16GB', slug: 'asus-tuf-rtx-4080-super-oc-16gb', sku: 'GPU-ASUS-RTX4080S-TUF-16G', brandSlug: 'asus', price: 29490000, salePrice: 28490000, stock: 3, chipset: 'RTX 4080 SUPER', vram: 16, memoryType: 'GDDR6X', length: 348, powerConsumption: 320, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Gigabyte GeForce RTX 4080 SUPER Aero OC 16G', slug: 'gigabyte-rtx-4080-super-aero-oc-16g', sku: 'GPU-GIGABYTE-RTX4080S-AERO-16G', brandSlug: 'gigabyte', price: 28990000, salePrice: null, stock: 4, chipset: 'RTX 4080 SUPER', vram: 16, memoryType: 'GDDR6X', length: 342, powerConsumption: 320, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'MSI GeForce RTX 4090 SUPRIM X 24G', slug: 'msi-rtx-4090-suprim-x-24g', sku: 'GPU-MSI-RTX4090-SUPRIMX-24G', brandSlug: 'msi', price: 57990000, salePrice: 55990000, stock: 2, chipset: 'RTX 4090', vram: 24, memoryType: 'GDDR6X', length: 336, powerConsumption: 450, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Colorful iGame GeForce RTX 4090 Vulcan OC 24GB-V', slug: 'colorful-igame-rtx-4090-vulcan-oc-24gb', sku: 'GPU-COLORFUL-RTX4090-VULCAN-24G', brandSlug: 'colorful', price: 59990000, salePrice: null, stock: 2, chipset: 'RTX 4090', vram: 24, memoryType: 'GDDR6X', length: 348, powerConsumption: 450, interface: 'PCIe 4.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Gigabyte GeForce RTX 5060 Windforce OC 8G', slug: 'gigabyte-rtx-5060-windforce-oc-8g', sku: 'GPU-GIGABYTE-RTX5060-WF-8G', brandSlug: 'gigabyte', price: 9990000, salePrice: 9690000, stock: 10, chipset: 'RTX 5060', vram: 8, memoryType: 'GDDR7', length: 199, powerConsumption: 145, interface: 'PCIe 5.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'MSI GeForce RTX 5060 Ti 8G Ventus 2X OC Plus', slug: 'msi-rtx-5060-ti-8g-ventus-2x-oc-plus', sku: 'GPU-MSI-RTX5060TI-VENTUS2X-8G', brandSlug: 'msi', price: 11990000, salePrice: null, stock: 8, chipset: 'RTX 5060 Ti', vram: 8, memoryType: 'GDDR7', length: 227, powerConsumption: 180, interface: 'PCIe 5.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'ASUS Prime GeForce RTX 5060 Ti 16GB OC', slug: 'asus-prime-rtx-5060-ti-16gb-oc', sku: 'GPU-ASUS-RTX5060TI-PRIME-16G', brandSlug: 'asus', price: 14990000, salePrice: 14490000, stock: 6, chipset: 'RTX 5060 Ti', vram: 16, memoryType: 'GDDR7', length: 304, powerConsumption: 180, interface: 'PCIe 5.0 x8', powerConnector: '1 x 8-pin' },
  { name: 'Zotac Gaming GeForce RTX 5070 Solid 12GB', slug: 'zotac-rtx-5070-solid-12gb', sku: 'GPU-ZOTAC-RTX5070-SOLID-12G', brandSlug: 'zotac', price: 18490000, salePrice: 17990000, stock: 6, chipset: 'RTX 5070', vram: 12, memoryType: 'GDDR7', length: 304, powerConsumption: 250, interface: 'PCIe 5.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'PNY GeForce RTX 5070 OC Triple Fan 12GB', slug: 'pny-rtx-5070-oc-triple-fan-12gb', sku: 'GPU-PNY-RTX5070-OC-12G', brandSlug: 'pny', price: 18990000, salePrice: null, stock: 5, chipset: 'RTX 5070', vram: 12, memoryType: 'GDDR7', length: 299, powerConsumption: 250, interface: 'PCIe 5.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Gigabyte GeForce RTX 5070 Ti Gaming OC 16G', slug: 'gigabyte-rtx-5070-ti-gaming-oc-16g', sku: 'GPU-GIGABYTE-RTX5070TI-GAMINGOC-16G', brandSlug: 'gigabyte', price: 24990000, salePrice: 23990000, stock: 4, chipset: 'RTX 5070 Ti', vram: 16, memoryType: 'GDDR7', length: 340, powerConsumption: 300, interface: 'PCIe 5.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Palit GeForce RTX 5080 GamingPro 16GB', slug: 'palit-rtx-5080-gamingpro-16gb', sku: 'GPU-PALIT-RTX5080-GAMINGPRO-16G', brandSlug: 'palit', price: 36990000, salePrice: 35990000, stock: 3, chipset: 'RTX 5080', vram: 16, memoryType: 'GDDR7', length: 331, powerConsumption: 360, interface: 'PCIe 5.0 x16', powerConnector: '1 x 16-pin' },
  { name: 'Inno3D GeForce RTX 5090 X3 OC 32GB', slug: 'inno3d-rtx-5090-x3-oc-32gb', sku: 'GPU-INNO3D-RTX5090-X3OC-32G', brandSlug: 'inno3d', price: 79990000, salePrice: null, stock: 1, chipset: 'RTX 5090', vram: 32, memoryType: 'GDDR7', length: 300, powerConsumption: 575, interface: 'PCIe 5.0 x16', powerConnector: '1 x 16-pin' },
]

const protectedSampleSkus = [
  'RYZ-7800X3D', 'MB-AM5-EX', 'RAM-DDR5-16GB', 'GPU-EX-01',
  'PSU-650W', 'CASE-MID', 'COOL-01',
]

async function seedNvidiaGpus() {
  const skuSet = new Set(nvidiaGpus.map((product) => product.sku))
  const slugSet = new Set(nvidiaGpus.map((product) => product.slug))
  if (skuSet.size !== nvidiaGpus.length || slugSet.size !== nvidiaGpus.length) {
    throw new Error('Phase 1B contains duplicate GPU SKU or slug values')
  }

  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: nvidiaGpus.map((product) => product.sku) } },
        { slug: { in: nvidiaGpus.map((product) => product.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of nvidiaGpus) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 1B SKU/slug collision for ${product.sku}; no GPU products were inserted`)
    }
  }

  let addedCount = 0
  for (const product of nvidiaGpus) {
    const existingProduct = occupiedProducts.find((existing) => existing.sku === product.sku)
    if (existingProduct) continue

    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        description: `${product.name} - thông số và giá bán demo.`,
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock,
        category: { connect: { slug: 'gpu' } },
        brand: { connect: { slug: product.brandSlug } },
        specifications: {
          create: {
            productType: 'GPU',
            chipset: product.chipset,
            vram: product.vram,
            memoryType: product.memoryType,
            length: product.length,
            powerConsumption: product.powerConsumption,
            interface: product.interface,
            powerConnector: product.powerConnector,
          },
        },
      },
    })
    addedCount += 1
  }

  const seededProducts = await prisma.product.findMany({
    where: { sku: { in: nvidiaGpus.map((product) => product.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededProducts.length !== nvidiaGpus.length) {
    throw new Error(`Phase 1B expected ${nvidiaGpus.length} NVIDIA GPUs, found ${seededProducts.length}`)
  }

  for (const product of nvidiaGpus) {
    const seededProduct = seededProducts.find((existing) => existing.sku === product.sku)
    const specification = seededProduct?.specifications.find((item) => item.productType === 'GPU')
    if (
      !seededProduct ||
      seededProduct.slug !== product.slug ||
      seededProduct.category?.slug !== 'gpu' ||
      seededProduct.brand?.slug !== product.brandSlug ||
      !specification ||
      specification.chipset !== product.chipset ||
      specification.vram !== product.vram ||
      !specification.memoryType ||
      !specification.length ||
      !specification.powerConsumption ||
      !specification.interface ||
      !specification.powerConnector
    ) {
      throw new Error(`Phase 1B validation failed for ${product.sku}`)
    }
  }

  const expectedChipsets = [
    'RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4070 SUPER',
    'RTX 4070 Ti SUPER', 'RTX 4080 SUPER', 'RTX 4090', 'RTX 5060',
    'RTX 5060 Ti', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090',
  ]
  const seededChipsets = new Set(seededProducts.map((product) =>
    product.specifications.find((item) => item.productType === 'GPU')?.chipset
  ))
  const missingChipsets = expectedChipsets.filter((chipset) => !seededChipsets.has(chipset))
  if (missingChipsets.length > 0) {
    throw new Error(`Phase 1B missing RTX chipsets: ${missingChipsets.join(', ')}`)
  }

  const totalGpuCount = await prisma.product.count({ where: { category: { slug: 'gpu' } } })
  const brandNames = [...new Set(seededProducts.map((product) => product.brand?.name).filter(Boolean))]
  console.log(`Phase 1B: added=${addedCount}, NVIDIA=${seededProducts.length}, GPU total=${totalGpuCount}, brands=${brandNames.join(', ')}`)
}

type MainboardSeed = {
  name: string
  slug: string
  sku: string
  brandSlug: string
  price: number
  salePrice: number | null
  stock: number
  socket: string
  ramType: string
  ramSlots: number
  maxRam: number
  formFactor: string
  pcieVersion: string
}

const mainboards: MainboardSeed[] = [
  // Intel LGA1200 (Budget -> Mainstream -> High-end)
  { name: 'ASUS Prime H510M-K', slug: 'asus-prime-h510m-k', sku: 'MB-ASUS-H510M-K', brandSlug: 'asus', price: 1690000, salePrice: null, stock: 15, socket: 'LGA1200', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'MSI B560M PRO-VDH', slug: 'msi-b560m-pro-vdh', sku: 'MB-MSI-B560M-PRO-VDH', brandSlug: 'msi', price: 2190000, salePrice: 1990000, stock: 12, socket: 'LGA1200', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'Gigabyte B560M Gaming HD', slug: 'gigabyte-b560m-gaming-hd', sku: 'MB-GIGABYTE-B560M-GAMING-HD', brandSlug: 'gigabyte', price: 1890000, salePrice: null, stock: 10, socket: 'LGA1200', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'ASRock Z590 Steel Legend', slug: 'asrock-z590-steel-legend', sku: 'MB-ASROCK-Z590-STEEL-LEGEND', brandSlug: 'asrock', price: 3490000, salePrice: 3190000, stock: 8, socket: 'LGA1200', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'BIOSTAR H510MHP 2.0', slug: 'biostar-h510mhp-2-0', sku: 'MB-BIOSTAR-H510MHP', brandSlug: 'biostar', price: 1390000, salePrice: 1290000, stock: 20, socket: 'LGA1200', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 3.0' },

  // Intel LGA1700 (Budget -> Mainstream -> High-end)
  { name: 'ASUS Prime H610M-K D4', slug: 'asus-prime-h610m-k-d4', sku: 'MB-ASUS-H610M-K-D4', brandSlug: 'asus', price: 1990000, salePrice: 1850000, stock: 20, socket: 'LGA1700', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'MSI PRO H610M-E DDR4', slug: 'msi-pro-h610m-e-ddr4', sku: 'MB-MSI-H610M-E-DDR4', brandSlug: 'msi', price: 1890000, salePrice: null, stock: 18, socket: 'LGA1700', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'Gigabyte B760M GAMING PLUS WIFI D4', slug: 'gigabyte-b760m-gaming-plus-wifi-d4', sku: 'MB-GIGABYTE-B760M-GAMING-PLUS-D4', brandSlug: 'gigabyte', price: 3190000, salePrice: 2990000, stock: 14, socket: 'LGA1700', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'BIOSTAR B760MZ-E PRO DDR4', slug: 'biostar-b760mz-e-pro-ddr4', sku: 'MB-BIOSTAR-B760MZ-E-PRO-DDR4', brandSlug: 'biostar', price: 2390000, salePrice: null, stock: 12, socket: 'LGA1700', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'ASUS TUF GAMING B760M-PLUS WIFI', slug: 'asus-tuf-gaming-b760m-plus-wifi', sku: 'MB-ASUS-TUF-B760M-PLUS-WIFI', brandSlug: 'asus', price: 4390000, salePrice: 4190000, stock: 12, socket: 'LGA1700', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'MSI MAG B760 TOMAHAWK WIFI', slug: 'msi-mag-b760-tomahawk-wifi', sku: 'MB-MSI-B760-TOMAHAWK-WIFI', brandSlug: 'msi', price: 5290000, salePrice: 4990000, stock: 10, socket: 'LGA1700', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'ASRock B760M Pro RS', slug: 'asrock-b760m-pro-rs', sku: 'MB-ASROCK-B760M-PRO-RS', brandSlug: 'asrock', price: 3390000, salePrice: null, stock: 15, socket: 'LGA1700', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'Gigabyte Z790 AORUS ELITE AX', slug: 'gigabyte-z790-aorus-elite-ax', sku: 'MB-GIGABYTE-Z790-AORUS-ELITE-AX', brandSlug: 'gigabyte', price: 6990000, salePrice: 6690000, stock: 8, socket: 'LGA1700', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },

  // Intel LGA1851 (Mainstream -> High-end)
  { name: 'ASRock Z890 Pro RS WiFi', slug: 'asrock-z890-pro-rs-wifi', sku: 'MB-ASROCK-Z890-PRO-RS-WIFI', brandSlug: 'asrock', price: 6590000, salePrice: 6290000, stock: 10, socket: 'LGA1851', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'MSI MAG Z890 TOMAHAWK WIFI', slug: 'msi-mag-z890-tomahawk-wifi', sku: 'MB-MSI-Z890-TOMAHAWK-WIFI', brandSlug: 'msi', price: 8490000, salePrice: null, stock: 8, socket: 'LGA1851', ramType: 'DDR5', ramSlots: 4, maxRam: 256, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'Gigabyte Z890 AORUS MASTER', slug: 'gigabyte-z890-aorus-master', sku: 'MB-GIGABYTE-Z890-AORUS-MASTER', brandSlug: 'gigabyte', price: 16490000, salePrice: 15990000, stock: 4, socket: 'LGA1851', ramType: 'DDR5', ramSlots: 4, maxRam: 256, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'ASUS ROG MAXIMUS Z890 HERO', slug: 'asus-rog-maximus-z890-hero', sku: 'MB-ASUS-ROG-Z890-HERO', brandSlug: 'asus', price: 18990000, salePrice: 17990000, stock: 5, socket: 'LGA1851', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },

  // AMD AM4 (Budget -> Mainstream)
  { name: 'BIOSTAR A520MH 3.0', slug: 'biostar-a520mh-3-0', sku: 'MB-BIOSTAR-A520MH', brandSlug: 'biostar', price: 1250000, salePrice: 1150000, stock: 22, socket: 'AM4', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 3.0' },
  { name: 'ASUS Prime A520M-K', slug: 'asus-prime-a520m-k', sku: 'MB-ASUS-A520M-K', brandSlug: 'asus', price: 1450000, salePrice: null, stock: 18, socket: 'AM4', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 3.0' },
  { name: 'MSI B450M-A PRO MAX II', slug: 'msi-b450m-a-pro-max-ii', sku: 'MB-MSI-B450M-A-PRO-MAX-II', brandSlug: 'msi', price: 1390000, salePrice: null, stock: 16, socket: 'AM4', ramType: 'DDR4', ramSlots: 2, maxRam: 64, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 3.0' },
  { name: 'Gigabyte B550M AORUS ELITE', slug: 'gigabyte-b550m-aorus-elite', sku: 'MB-GIGABYTE-B550M-AORUS-ELITE', brandSlug: 'gigabyte', price: 2690000, salePrice: 2490000, stock: 15, socket: 'AM4', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'ASRock B550M Steel Legend', slug: 'asrock-b550m-steel-legend', sku: 'MB-ASROCK-B550M-STEEL-LEGEND', brandSlug: 'asrock', price: 3190000, salePrice: 2990000, stock: 10, socket: 'AM4', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'MSI MAG B550 TOMAHAWK MAX WIFI', slug: 'msi-mag-b550-tomahawk-max-wifi', sku: 'MB-MSI-B550-TOMAHAWK-MAX', brandSlug: 'msi', price: 3890000, salePrice: null, stock: 12, socket: 'AM4', ramType: 'DDR4', ramSlots: 4, maxRam: 128, formFactor: 'ATX', pcieVersion: 'PCIe 4.0' },

  // AMD AM5 (Budget -> Mainstream -> High-end)
  { name: 'ASRock A620M-HDV/M.2+', slug: 'asrock-a620m-hdv-m2-plus', sku: 'MB-ASROCK-A620M-HDV', brandSlug: 'asrock', price: 2390000, salePrice: 2250000, stock: 14, socket: 'AM5', ramType: 'DDR5', ramSlots: 2, maxRam: 96, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'Gigabyte A620M GAMING X', slug: 'gigabyte-a620m-gaming-x', sku: 'MB-GIGABYTE-A620M-GAMING-X', brandSlug: 'gigabyte', price: 2990000, salePrice: null, stock: 12, socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'MSI PRO B650M-A WIFI', slug: 'msi-pro-b650m-a-wifi', sku: 'MB-MSI-B650M-A-WIFI', brandSlug: 'msi', price: 4290000, salePrice: 3990000, stock: 16, socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'Micro-ATX', pcieVersion: 'PCIe 4.0' },
  { name: 'ASUS TUF GAMING B650-PLUS WIFI', slug: 'asus-tuf-gaming-b650-plus-wifi', sku: 'MB-ASUS-TUF-B650-PLUS-WIFI', brandSlug: 'asus', price: 5490000, salePrice: 5190000, stock: 10, socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
  { name: 'Gigabyte X670E AORUS PRO X', slug: 'gigabyte-x670e-aorus-pro-x', sku: 'MB-GIGABYTE-X670E-AORUS-PRO-X', brandSlug: 'gigabyte', price: 11490000, salePrice: 10890000, stock: 5, socket: 'AM5', ramType: 'DDR5', ramSlots: 4, maxRam: 192, formFactor: 'ATX', pcieVersion: 'PCIe 5.0' },
]

type RamSeed = {
  name: string
  slug: string
  sku: string
  brandSlug: string
  price: number
  salePrice: number | null
  stock: number
  ramType: string
  capacity: number
  speed: number
  modules: number
}

const rams: RamSeed[] = [
  // 10 DDR4
  { name: 'Kingston Fury Beast 8GB DDR4 3200MHz', slug: 'kingston-fury-beast-8gb-ddr4-3200mhz', sku: 'RAM-KINGSTON-FB-8G-3200', brandSlug: 'kingston', price: 550000, salePrice: 490000, stock: 30, ramType: 'DDR4', capacity: 8, speed: 3200, modules: 1 },
  { name: 'Crucial Basics 8GB DDR4 2666MHz', slug: 'crucial-basics-8gb-ddr4-2666mhz', sku: 'RAM-CRUCIAL-BASICS-8G-2666', brandSlug: 'crucial', price: 450000, salePrice: null, stock: 25, ramType: 'DDR4', capacity: 8, speed: 2666, modules: 1 },
  { name: 'Corsair Vengeance LPX 16GB (1x16GB) DDR4 3200MHz', slug: 'corsair-vengeance-lpx-16gb-1x16gb-ddr4-3200mhz', sku: 'RAM-CORSAIR-LPX-16G-3200', brandSlug: 'corsair', price: 950000, salePrice: 890000, stock: 20, ramType: 'DDR4', capacity: 16, speed: 3200, modules: 1 },
  { name: 'Kingston Fury Beast RGB 16GB (2x8GB) DDR4 3200MHz', slug: 'kingston-fury-beast-rgb-16gb-2x8gb-ddr4-3200mhz', sku: 'RAM-KINGSTON-FBRGB-16G-3200', brandSlug: 'kingston', price: 1190000, salePrice: null, stock: 22, ramType: 'DDR4', capacity: 16, speed: 3200, modules: 2 },
  { name: 'Corsair Vengeance RGB PRO 16GB (2x8GB) DDR4 3600MHz', slug: 'corsair-vengeance-rgb-pro-16gb-2x8gb-ddr4-3600mhz', sku: 'RAM-CORSAIR-RGBPRO-16G-3600', brandSlug: 'corsair', price: 1390000, salePrice: 1290000, stock: 18, ramType: 'DDR4', capacity: 16, speed: 3600, modules: 2 },
  { name: 'G.Skill Ripjaws V 16GB (2x8GB) DDR4 3200MHz', slug: 'gskill-ripjaws-v-16gb-2x8gb-ddr4-3200mhz', sku: 'RAM-GSKILL-RIPJAWSV-16G-3200', brandSlug: 'gskill', price: 1050000, salePrice: null, stock: 20, ramType: 'DDR4', capacity: 16, speed: 3200, modules: 2 },
  { name: 'TeamGroup T-Force Vulcan Z 16GB (2x8GB) DDR4 3200MHz', slug: 'teamgroup-tforce-vulcan-z-16gb-2x8gb-ddr4-3200mhz', sku: 'RAM-TEAM-VULCANZ-16G-3200', brandSlug: 'teamgroup', price: 990000, salePrice: 920000, stock: 16, ramType: 'DDR4', capacity: 16, speed: 3200, modules: 2 },
  { name: 'ADATA XPG Spectrix D50 RGB 16GB (2x8GB) DDR4 3200MHz', slug: 'adata-xpg-spectrix-d50-16gb-2x8gb-ddr4-3200mhz', sku: 'RAM-ADATA-D50-16G-3200', brandSlug: 'adata', price: 1150000, salePrice: null, stock: 15, ramType: 'DDR4', capacity: 16, speed: 3200, modules: 2 },
  { name: 'Corsair Vengeance LPX 32GB (2x16GB) DDR4 3200MHz', slug: 'corsair-vengeance-lpx-32gb-2x16gb-ddr4-3200mhz', sku: 'RAM-CORSAIR-LPX-32G-3200', brandSlug: 'corsair', price: 1890000, salePrice: 1750000, stock: 15, ramType: 'DDR4', capacity: 32, speed: 3200, modules: 2 },
  { name: 'G.Skill Ripjaws V 64GB (2x32GB) DDR4 3200MHz', slug: 'gskill-ripjaws-v-64gb-2x32gb-ddr4-3200mhz', sku: 'RAM-GSKILL-RIPJAWSV-64G-3200', brandSlug: 'gskill', price: 3690000, salePrice: 3490000, stock: 8, ramType: 'DDR4', capacity: 64, speed: 3200, modules: 2 },

  // 10 DDR5
  { name: 'Crucial 16GB (1x16GB) DDR5 4800MHz', slug: 'crucial-16gb-1x16gb-ddr5-4800mhz', sku: 'RAM-CRUCIAL-16G-4800-D5', brandSlug: 'crucial', price: 1290000, salePrice: 1190000, stock: 20, ramType: 'DDR5', capacity: 16, speed: 4800, modules: 1 },
  { name: 'Kingston Fury Beast 16GB (1x16GB) DDR5 5200MHz', slug: 'kingston-fury-beast-16gb-1x16gb-ddr5-5200mhz', sku: 'RAM-KINGSTON-FB-16G-5200-D5', brandSlug: 'kingston', price: 1450000, salePrice: null, stock: 18, ramType: 'DDR5', capacity: 16, speed: 5200, modules: 1 },
  { name: 'Corsair Vengeance 32GB (2x16GB) DDR5 5200MHz', slug: 'corsair-vengeance-32gb-2x16gb-ddr5-5200mhz', sku: 'RAM-CORSAIR-VEN-32G-5200-D5', brandSlug: 'corsair', price: 2790000, salePrice: 2590000, stock: 15, ramType: 'DDR5', capacity: 32, speed: 5200, modules: 2 },
  { name: 'Kingston Fury Beast RGB 32GB (2x16GB) DDR5 5600MHz', slug: 'kingston-fury-beast-rgb-32gb-2x16gb-ddr5-5600mhz', sku: 'RAM-KINGSTON-FBRGB-32G-5600-D5', brandSlug: 'kingston', price: 3190000, salePrice: null, stock: 12, ramType: 'DDR5', capacity: 32, speed: 5600, modules: 2 },
  { name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz', slug: 'corsair-vengeance-rgb-32gb-2x16gb-ddr5-6000mhz', sku: 'RAM-CORSAIR-RGB-32G-6000-D5', brandSlug: 'corsair', price: 3490000, salePrice: 3290000, stock: 14, ramType: 'DDR5', capacity: 32, speed: 6000, modules: 2 },
  { name: 'G.Skill Flare X5 32GB (2x16GB) DDR5 6000MHz', slug: 'gskill-flare-x5-32gb-2x16gb-ddr5-6000mhz', sku: 'RAM-GSKILL-FLAREX5-32G-6000-D5', brandSlug: 'gskill', price: 3150000, salePrice: 2990000, stock: 15, ramType: 'DDR5', capacity: 32, speed: 6000, modules: 2 },
  { name: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6400MHz', slug: 'gskill-trident-z5-rgb-32gb-2x16gb-ddr5-6400mhz', sku: 'RAM-GSKILL-TZ5RGB-32G-6400-D5', brandSlug: 'gskill', price: 3790000, salePrice: null, stock: 10, ramType: 'DDR5', capacity: 32, speed: 6400, modules: 2 },
  { name: 'TeamGroup T-Force Delta RGB 32GB (2x16GB) DDR5 6000MHz', slug: 'teamgroup-tforce-delta-rgb-32gb-2x16gb-ddr5-6000mhz', sku: 'RAM-TEAM-DELTA-32G-6000-D5', brandSlug: 'teamgroup', price: 3290000, salePrice: 3090000, stock: 12, ramType: 'DDR5', capacity: 32, speed: 6000, modules: 2 },
  { name: 'ADATA XPG Lancer Blade RGB 32GB (2x16GB) DDR5 6000MHz', slug: 'adata-xpg-lancer-blade-rgb-32gb-2x16gb-ddr5-6000mhz', sku: 'RAM-ADATA-LANCER-32G-6000-D5', brandSlug: 'adata', price: 3190000, salePrice: null, stock: 12, ramType: 'DDR5', capacity: 32, speed: 6000, modules: 2 },
  { name: 'Corsair Dominator Titanium RGB 64GB (2x32GB) DDR5 6000MHz', slug: 'corsair-dominator-titanium-64gb-2x32gb-ddr5-6000mhz', sku: 'RAM-CORSAIR-DOM-64G-6000-D5', brandSlug: 'corsair', price: 7990000, salePrice: 7490000, stock: 6, ramType: 'DDR5', capacity: 64, speed: 6000, modules: 2 },
]

async function seedPhase2MainboardsAndRams() {
  const mbSkuSet = new Set(mainboards.map((p) => p.sku))
  const mbSlugSet = new Set(mainboards.map((p) => p.slug))
  if (mbSkuSet.size !== mainboards.length || mbSlugSet.size !== mainboards.length) {
    throw new Error('Phase 2 contains duplicate Mainboard SKU or slug values')
  }

  const ramSkuSet = new Set(rams.map((p) => p.sku))
  const ramSlugSet = new Set(rams.map((p) => p.slug))
  if (ramSkuSet.size !== rams.length || ramSlugSet.size !== rams.length) {
    throw new Error('Phase 2 contains duplicate RAM SKU or slug values')
  }

  for (const p of mainboards) {
    if (ramSkuSet.has(p.sku) || ramSlugSet.has(p.slug)) {
      throw new Error(`Phase 2 collision between Mainboard and RAM: ${p.sku}`)
    }
  }

  const allPhase2 = [...mainboards, ...rams]
  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: allPhase2.map((p) => p.sku) } },
        { slug: { in: allPhase2.map((p) => p.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of allPhase2) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 2 SKU/slug collision for ${product.sku}; aborting`)
    }
  }

  let addedMbCount = 0
  for (const mb of mainboards) {
    const existing = occupiedProducts.find((p) => p.sku === mb.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: mb.name,
        slug: mb.slug,
        sku: mb.sku,
        description: `${mb.name} - Bo mạch chủ socket ${mb.socket}, hỗ trợ ${mb.ramType}.`,
        price: mb.price,
        salePrice: mb.salePrice,
        stock: mb.stock,
        category: { connect: { slug: 'mainboard' } },
        brand: { connect: { slug: mb.brandSlug } },
        specifications: {
          create: {
            productType: 'MAINBOARD',
            socket: mb.socket,
            ramType: mb.ramType,
            ramSlots: mb.ramSlots,
            maxRam: mb.maxRam,
            formFactor: mb.formFactor,
            pcieVersion: mb.pcieVersion,
          },
        },
      },
    })
    addedMbCount += 1
  }

  let addedRamCount = 0
  for (const ram of rams) {
    const existing = occupiedProducts.find((p) => p.sku === ram.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: ram.name,
        slug: ram.slug,
        sku: ram.sku,
        description: `${ram.name} - Bộ nhớ RAM ${ram.ramType} ${ram.capacity}GB bus ${ram.speed}MHz.`,
        price: ram.price,
        salePrice: ram.salePrice,
        stock: ram.stock,
        category: { connect: { slug: 'ram' } },
        brand: { connect: { slug: ram.brandSlug } },
        specifications: {
          create: {
            productType: 'RAM',
            type: ram.ramType,
            ramType: ram.ramType,
            capacity: ram.capacity,
            speed: ram.speed,
            modules: ram.modules,
          },
        },
      },
    })
    addedRamCount += 1
  }

  const seededMbs = await prisma.product.findMany({
    where: { sku: { in: mainboards.map((p) => p.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededMbs.length !== mainboards.length) {
    throw new Error(`Phase 2 expected ${mainboards.length} Mainboards, found ${seededMbs.length}`)
  }

  for (const mb of mainboards) {
    const p = seededMbs.find((item) => item.sku === mb.sku)
    const spec = p?.specifications.find((item) => item.productType === 'MAINBOARD')
    if (
      !p ||
      p.slug !== mb.slug ||
      p.category?.slug !== 'mainboard' ||
      p.brand?.slug !== mb.brandSlug ||
      !spec ||
      spec.socket !== mb.socket ||
      spec.ramType !== mb.ramType ||
      spec.ramSlots !== mb.ramSlots ||
      spec.maxRam !== mb.maxRam ||
      spec.formFactor !== mb.formFactor ||
      spec.pcieVersion !== mb.pcieVersion
    ) {
      throw new Error(`Phase 2 validation failed for Mainboard ${mb.sku}`)
    }
  }

  const seededRams = await prisma.product.findMany({
    where: { sku: { in: rams.map((p) => p.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededRams.length !== rams.length) {
    throw new Error(`Phase 2 expected ${rams.length} RAMs, found ${seededRams.length}`)
  }

  for (const ram of rams) {
    const p = seededRams.find((item) => item.sku === ram.sku)
    const spec = p?.specifications.find((item) => item.productType === 'RAM')
    if (
      !p ||
      p.slug !== ram.slug ||
      p.category?.slug !== 'ram' ||
      p.brand?.slug !== ram.brandSlug ||
      !spec ||
      spec.type !== ram.ramType ||
      spec.capacity !== ram.capacity ||
      spec.speed !== ram.speed ||
      spec.modules !== ram.modules
    ) {
      throw new Error(`Phase 2 validation failed for RAM ${ram.sku}`)
    }
  }

  const totalMbCount = await prisma.product.count({ where: { category: { slug: 'mainboard' } } })
  const totalRamCount = await prisma.product.count({ where: { category: { slug: 'ram' } } })
  console.log(`Phase 2: Mainboards added=${addedMbCount}, total=${totalMbCount} | RAMs added=${addedRamCount}, total=${totalRamCount}`)
}

type SsdSeed = {
  name: string
  slug: string
  sku: string
  brandSlug: string
  price: number
  salePrice: number | null
  stock: number
  capacityGB: number
  storageInterface: string
}

const ssds: SsdSeed[] = [
  // PCIe 3.0 NVMe (Budget)
  { name: 'Samsung 970 EVO Plus 500GB M.2 NVMe PCIe 3.0', slug: 'samsung-970-evo-plus-500gb-m2-nvme-pcie-30', sku: 'SSD-SAMSUNG-970EVO-500G', brandSlug: 'samsung', price: 1190000, salePrice: null, stock: 25, capacityGB: 500, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'WD Blue SN570 500GB M.2 NVMe PCIe 3.0', slug: 'wd-blue-sn570-500gb-m2-nvme-pcie-30', sku: 'SSD-WD-SN570-500G', brandSlug: 'wd', price: 950000, salePrice: 890000, stock: 20, capacityGB: 500, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'Lexar NM610 PRO 500GB M.2 NVMe PCIe 3.0', slug: 'lexar-nm610-pro-500gb-m2-nvme-pcie-30', sku: 'SSD-LEXAR-NM610PRO-500G', brandSlug: 'lexar', price: 790000, salePrice: null, stock: 22, capacityGB: 500, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'KIOXIA Exceria G2 1TB M.2 NVMe PCIe 3.0', slug: 'kioxia-exceria-g2-1tb-m2-nvme-pcie-30', sku: 'SSD-KIOXIA-EXCERIA-1TB', brandSlug: 'kioxia', price: 1450000, salePrice: 1350000, stock: 18, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'Crucial P3 1TB M.2 NVMe PCIe 3.0', slug: 'crucial-p3-1tb-m2-nvme-pcie-30', sku: 'SSD-CRUCIAL-P3-1TB', brandSlug: 'crucial', price: 1550000, salePrice: null, stock: 20, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'Netac NV3000 500GB M.2 NVMe PCIe 3.0', slug: 'netac-nv3000-500gb-m2-nvme-pcie-30', sku: 'SSD-NETAC-NV3000-500G', brandSlug: 'netac', price: 750000, salePrice: 690000, stock: 30, capacityGB: 500, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },
  { name: 'HIKSEMI WAVE Pro 1TB M.2 NVMe PCIe 3.0', slug: 'hiksemi-wave-pro-1tb-m2-nvme-pcie-30', sku: 'SSD-HIKSEMI-WAVEPRO-1TB', brandSlug: 'hiksemi', price: 1350000, salePrice: null, stock: 25, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 3.0 x4' },

  // PCIe 4.0 NVMe (Mainstream & High-End)
  { name: 'Kingston NV2 1TB M.2 2280 NVMe PCIe 4.0', slug: 'kingston-nv2-1tb-m2-2280-nvme-pcie-40', sku: 'SSD-KINGSTON-NV2-1TB', brandSlug: 'kingston', price: 1690000, salePrice: 1590000, stock: 30, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Kingston KC3000 1TB M.2 NVMe PCIe 4.0', slug: 'kingston-kc3000-1tb-m2-nvme-pcie-40', sku: 'SSD-KINGSTON-KC3000-1TB', brandSlug: 'kingston', price: 2390000, salePrice: 2250000, stock: 15, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'WD Black SN770 1TB M.2 NVMe PCIe 4.0', slug: 'wd-black-sn770-1tb-m2-nvme-pcie-40', sku: 'SSD-WD-SN770-1TB', brandSlug: 'wd', price: 1990000, salePrice: 1890000, stock: 20, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'WD Black SN850X 1TB M.2 NVMe PCIe 4.0', slug: 'wd-black-sn850x-1tb-m2-nvme-pcie-40', sku: 'SSD-WD-SN850X-1TB', brandSlug: 'wd', price: 2690000, salePrice: 2550000, stock: 16, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Samsung 980 PRO 1TB M.2 NVMe PCIe 4.0', slug: 'samsung-980-pro-1tb-m2-nvme-pcie-40', sku: 'SSD-SAMSUNG-980PRO-1TB', brandSlug: 'samsung', price: 2590000, salePrice: 2450000, stock: 18, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Samsung 990 PRO 1TB M.2 NVMe PCIe 4.0', slug: 'samsung-990-pro-1tb-m2-nvme-pcie-40', sku: 'SSD-SAMSUNG-990PRO-1TB', brandSlug: 'samsung', price: 2890000, salePrice: null, stock: 15, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Samsung 990 PRO 2TB M.2 NVMe PCIe 4.0', slug: 'samsung-990-pro-2tb-m2-nvme-pcie-40', sku: 'SSD-SAMSUNG-990PRO-2TB', brandSlug: 'samsung', price: 4790000, salePrice: 4590000, stock: 12, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Crucial T500 1TB M.2 NVMe PCIe 4.0', slug: 'crucial-t500-1tb-m2-nvme-pcie-40', sku: 'SSD-CRUCIAL-T500-1TB', brandSlug: 'crucial', price: 2450000, salePrice: null, stock: 15, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'ADATA XPG GAMMIX S70 BLADE 1TB M.2 PCIe 4.0', slug: 'adata-xpg-gammix-s70-blade-1tb-m2-pcie-40', sku: 'SSD-ADATA-S70BLADE-1TB', brandSlug: 'adata', price: 2190000, salePrice: 2050000, stock: 14, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'TeamGroup T-Force Cardea Z440 Graphene 1TB M.2 PCIe 4.0', slug: 'teamgroup-tforce-cardea-z440-1tb-m2-pcie-40', sku: 'SSD-TEAM-CARDEAZ440-1TB', brandSlug: 'teamgroup', price: 1990000, salePrice: null, stock: 16, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Seagate FireCuda 530 2TB M.2 NVMe PCIe 4.0', slug: 'seagate-firecuda-530-2tb-m2-nvme-pcie-40', sku: 'SSD-SEAGATE-FC530-2TB', brandSlug: 'seagate', price: 4990000, salePrice: 4790000, stock: 10, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Corsair MP600 PRO LPX 2TB M.2 NVMe PCIe 4.0', slug: 'corsair-mp600-pro-lpx-2tb-m2-nvme-pcie-40', sku: 'SSD-CORSAIR-MP600PRO-2TB', brandSlug: 'corsair', price: 4690000, salePrice: null, stock: 12, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'MSI SPATIUM M480 PRO 2TB M.2 NVMe PCIe 4.0', slug: 'msi-spatium-m480-pro-2tb-m2-nvme-pcie-40', sku: 'SSD-MSI-M480PRO-2TB', brandSlug: 'msi', price: 4490000, salePrice: 4290000, stock: 10, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'PNY CS3140 2TB M.2 NVMe PCIe 4.0', slug: 'pny-cs3140-2tb-m2-nvme-pcie-40', sku: 'SSD-PNY-CS3140-2TB', brandSlug: 'pny', price: 4290000, salePrice: null, stock: 12, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Gigabyte AORUS Gen4 7300 2TB M.2 NVMe PCIe 4.0', slug: 'gigabyte-aorus-gen4-7300-2tb-m2-nvme-pcie-40', sku: 'SSD-GIGABYTE-AORUS7300-2TB', brandSlug: 'gigabyte', price: 4590000, salePrice: 4390000, stock: 8, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },
  { name: 'Lexar NM790 4TB M.2 NVMe PCIe 4.0', slug: 'lexar-nm790-4tb-m2-nvme-pcie-40', sku: 'SSD-LEXAR-NM790-4TB', brandSlug: 'lexar', price: 7990000, salePrice: 7590000, stock: 6, capacityGB: 4000, storageInterface: 'M.2 NVMe PCIe 4.0 x4' },

  // PCIe 5.0 NVMe (Flagship)
  { name: 'Crucial T700 1TB M.2 NVMe PCIe 5.0', slug: 'crucial-t700-1tb-m2-nvme-pcie-50', sku: 'SSD-CRUCIAL-T700-1TB', brandSlug: 'crucial', price: 4890000, salePrice: 4690000, stock: 8, capacityGB: 1000, storageInterface: 'M.2 NVMe PCIe 5.0 x4' },
  { name: 'Corsair MP700 PRO 2TB M.2 NVMe PCIe 5.0', slug: 'corsair-mp700-pro-2tb-m2-nvme-pcie-50', sku: 'SSD-CORSAIR-MP700PRO-2TB', brandSlug: 'corsair', price: 8990000, salePrice: 8590000, stock: 5, capacityGB: 2000, storageInterface: 'M.2 NVMe PCIe 5.0 x4' },
]

type HddSeed = {
  name: string
  slug: string
  sku: string
  brandSlug: string
  price: number
  salePrice: number | null
  stock: number
  capacityGB: number
  storageInterface: string
  rpm: number
}

const hdds: HddSeed[] = [
  { name: 'WD Blue 1TB 3.5 inch SATA 3 7200RPM', slug: 'wd-blue-1tb-35-sata3-7200rpm', sku: 'HDD-WD-BLUE-1TB', brandSlug: 'wd', price: 1190000, salePrice: null, stock: 25, capacityGB: 1000, storageInterface: 'SATA 3', rpm: 7200 },
  { name: 'WD Blue 2TB 3.5 inch SATA 3 5400RPM', slug: 'wd-blue-2tb-35-sata3-5400rpm', sku: 'HDD-WD-BLUE-2TB', brandSlug: 'wd', price: 1690000, salePrice: 1590000, stock: 20, capacityGB: 2000, storageInterface: 'SATA 3', rpm: 5400 },
  { name: 'WD Blue 4TB 3.5 inch SATA 3 5400RPM', slug: 'wd-blue-4tb-35-sata3-5400rpm', sku: 'HDD-WD-BLUE-4TB', brandSlug: 'wd', price: 2790000, salePrice: null, stock: 15, capacityGB: 4000, storageInterface: 'SATA 3', rpm: 5400 },
  { name: 'WD Red Plus 4TB 3.5 inch SATA 3 5400RPM NAS', slug: 'wd-red-plus-4tb-35-sata3-5400rpm-nas', sku: 'HDD-WD-REDPLUS-4TB', brandSlug: 'wd', price: 3490000, salePrice: 3290000, stock: 12, capacityGB: 4000, storageInterface: 'SATA 3', rpm: 5400 },
  { name: 'WD Red Plus 8TB 3.5 inch SATA 3 5640RPM NAS', slug: 'wd-red-plus-8tb-35-sata3-5640rpm-nas', sku: 'HDD-WD-REDPLUS-8TB', brandSlug: 'wd', price: 6890000, salePrice: 6590000, stock: 8, capacityGB: 8000, storageInterface: 'SATA 3', rpm: 5640 },
  { name: 'Seagate BarraCuda 1TB 3.5 inch SATA 3 7200RPM', slug: 'seagate-barracuda-1tb-35-sata3-7200rpm', sku: 'HDD-SEAGATE-BARRACUDA-1TB', brandSlug: 'seagate', price: 1150000, salePrice: null, stock: 25, capacityGB: 1000, storageInterface: 'SATA 3', rpm: 7200 },
  { name: 'Seagate BarraCuda 2TB 3.5 inch SATA 3 7200RPM', slug: 'seagate-barracuda-2tb-35-sata3-7200rpm', sku: 'HDD-SEAGATE-BARRACUDA-2TB', brandSlug: 'seagate', price: 1650000, salePrice: 1550000, stock: 20, capacityGB: 2000, storageInterface: 'SATA 3', rpm: 7200 },
  { name: 'Seagate IronWolf 4TB 3.5 inch SATA 3 5400RPM NAS', slug: 'seagate-ironwolf-4tb-35-sata3-5400rpm-nas', sku: 'HDD-SEAGATE-IRONWOLF-4TB', brandSlug: 'seagate', price: 3390000, salePrice: null, stock: 12, capacityGB: 4000, storageInterface: 'SATA 3', rpm: 5400 },
  { name: 'Seagate IronWolf 8TB 3.5 inch SATA 3 7200RPM NAS', slug: 'seagate-ironwolf-8tb-35-sata3-7200rpm-nas', sku: 'HDD-SEAGATE-IRONWOLF-8TB', brandSlug: 'seagate', price: 6990000, salePrice: 6690000, stock: 7, capacityGB: 8000, storageInterface: 'SATA 3', rpm: 7200 },
  { name: 'Toshiba P300 2TB 3.5 inch SATA 3 7200RPM', slug: 'toshiba-p300-2tb-35-sata3-7200rpm', sku: 'HDD-TOSHIBA-P300-2TB', brandSlug: 'toshiba', price: 1590000, salePrice: 1490000, stock: 18, capacityGB: 2000, storageInterface: 'SATA 3', rpm: 7200 },
]

async function seedPhase3Storage() {
  const ssdSkuSet = new Set(ssds.map((p) => p.sku))
  const ssdSlugSet = new Set(ssds.map((p) => p.slug))
  if (ssdSkuSet.size !== ssds.length || ssdSlugSet.size !== ssds.length) {
    throw new Error('Phase 3 contains duplicate SSD SKU or slug values')
  }

  const hddSkuSet = new Set(hdds.map((p) => p.sku))
  const hddSlugSet = new Set(hdds.map((p) => p.slug))
  if (hddSkuSet.size !== hdds.length || hddSlugSet.size !== hdds.length) {
    throw new Error('Phase 3 contains duplicate HDD SKU or slug values')
  }

  for (const p of ssds) {
    if (hddSkuSet.has(p.sku) || hddSlugSet.has(p.slug)) {
      throw new Error(`Phase 3 collision between SSD and HDD: ${p.sku}`)
    }
  }

  const allPhase3 = [...ssds, ...hdds]
  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: allPhase3.map((p) => p.sku) } },
        { slug: { in: allPhase3.map((p) => p.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of allPhase3) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 3 SKU/slug collision for ${product.sku}; aborting`)
    }
  }

  let addedSsdCount = 0
  for (const ssd of ssds) {
    const existing = occupiedProducts.find((p) => p.sku === ssd.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: ssd.name,
        slug: ssd.slug,
        sku: ssd.sku,
        description: `${ssd.name} - Dung lượng ${ssd.capacityGB >= 1000 ? ssd.capacityGB / 1000 + 'TB' : ssd.capacityGB + 'GB'}, chuẩn giao tiếp ${ssd.storageInterface}.`,
        price: ssd.price,
        salePrice: ssd.salePrice,
        stock: ssd.stock,
        category: { connect: { slug: 'ssd' } },
        brand: { connect: { slug: ssd.brandSlug } },
        specifications: {
          create: {
            productType: 'STORAGE',
            capacityGB: ssd.capacityGB,
            storageInterface: ssd.storageInterface,
            interface: ssd.storageInterface,
          },
        },
      },
    })
    addedSsdCount += 1
  }

  let addedHddCount = 0
  for (const hdd of hdds) {
    const existing = occupiedProducts.find((p) => p.sku === hdd.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: hdd.name,
        slug: hdd.slug,
        sku: hdd.sku,
        description: `${hdd.name} - Ổ cứng HDD ${hdd.capacityGB / 1000}TB, tốc độ quay ${hdd.rpm}RPM.`,
        price: hdd.price,
        salePrice: hdd.salePrice,
        stock: hdd.stock,
        category: { connect: { slug: 'hdd' } },
        brand: { connect: { slug: hdd.brandSlug } },
        specifications: {
          create: {
            productType: 'STORAGE',
            capacityGB: hdd.capacityGB,
            storageInterface: hdd.storageInterface,
            interface: hdd.storageInterface,
            rpm: hdd.rpm,
          },
        },
      },
    })
    addedHddCount += 1
  }

  const seededSsds = await prisma.product.findMany({
    where: { sku: { in: ssds.map((p) => p.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededSsds.length !== ssds.length) {
    throw new Error(`Phase 3 expected ${ssds.length} SSDs, found ${seededSsds.length}`)
  }

  for (const ssd of ssds) {
    const p = seededSsds.find((item) => item.sku === ssd.sku)
    const spec = p?.specifications.find((item) => item.productType === 'STORAGE')
    if (
      !p ||
      p.slug !== ssd.slug ||
      p.category?.slug !== 'ssd' ||
      p.brand?.slug !== ssd.brandSlug ||
      !spec ||
      spec.capacityGB !== ssd.capacityGB ||
      spec.storageInterface !== ssd.storageInterface
    ) {
      throw new Error(`Phase 3 validation failed for SSD ${ssd.sku}`)
    }
  }

  const seededHdds = await prisma.product.findMany({
    where: { sku: { in: hdds.map((p) => p.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededHdds.length !== hdds.length) {
    throw new Error(`Phase 3 expected ${hdds.length} HDDs, found ${seededHdds.length}`)
  }

  for (const hdd of hdds) {
    const p = seededHdds.find((item) => item.sku === hdd.sku)
    const spec = p?.specifications.find((item) => item.productType === 'STORAGE')
    if (
      !p ||
      p.slug !== hdd.slug ||
      p.category?.slug !== 'hdd' ||
      p.brand?.slug !== hdd.brandSlug ||
      !spec ||
      spec.capacityGB !== hdd.capacityGB ||
      spec.storageInterface !== hdd.storageInterface ||
      spec.rpm !== hdd.rpm
    ) {
      throw new Error(`Phase 3 validation failed for HDD ${hdd.sku}`)
    }
  }

  const totalSsdCount = await prisma.product.count({ where: { category: { slug: 'ssd' } } })
  const totalHddCount = await prisma.product.count({ where: { category: { slug: 'hdd' } } })
  console.log(`Phase 3: SSDs added=${addedSsdCount}, total=${totalSsdCount} | HDDs added=${addedHddCount}, total=${totalHddCount}`)
}

async function seedPhase4() {
  for (const b of phase4Brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { name: b.name, slug: b.slug },
    })
  }

  const allPhase4 = [...psus, ...cases, ...cpuCoolers, ...monitors]
  const skuSet = new Set(allPhase4.map((p) => p.sku))
  const slugSet = new Set(allPhase4.map((p) => p.slug))
  if (skuSet.size !== allPhase4.length || slugSet.size !== allPhase4.length) {
    throw new Error('Phase 4 contains duplicate SKU or slug values within itself')
  }

  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: allPhase4.map((p) => p.sku) } },
        { slug: { in: allPhase4.map((p) => p.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of allPhase4) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 4 SKU/slug collision for ${product.sku}; aborting`)
    }
  }

  let addedPsuCount = 0
  for (const p of psus) {
    const existing = occupiedProducts.find((item) => item.sku === p.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        description: `${p.name} - Công suất ${p.wattage}W, chuẩn ${p.efficiency}, ${p.extra?.modular ?? 'Nguồn máy tính'}.`,
        price: p.price,
        salePrice: p.salePrice,
        stock: p.stock,
        category: { connect: { slug: 'psu' } },
        brand: { connect: { slug: p.brandSlug } },
        specifications: {
          create: {
            productType: 'PSU',
            wattage: p.wattage,
            efficiency: p.efficiency,
            certification: p.certification,
            connectors: p.connectors,
            formFactor: p.formFactor,
            extra: p.extra,
          },
        },
      },
    })
    addedPsuCount += 1
  }

  let addedCaseCount = 0
  for (const c of cases) {
    const existing = occupiedProducts.find((item) => item.sku === c.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: c.name,
        slug: c.slug,
        sku: c.sku,
        description: `${c.name} - Chuẩn ${c.formFactor}, hỗ trợ GPU dài tới ${c.gpuClearance}mm, tản CPU cao ${c.cpuCoolerClearance}mm.`,
        price: c.price,
        salePrice: c.salePrice,
        stock: c.stock,
        category: { connect: { slug: 'case' } },
        brand: { connect: { slug: c.brandSlug } },
        specifications: {
          create: {
            productType: 'CASE',
            formFactor: c.formFactor,
            motherboardSupport: c.motherboardSupport,
            gpuClearance: c.gpuClearance,
            cpuCoolerClearance: c.cpuCoolerClearance,
            radiatorSupport: c.radiatorSupport,
            extra: c.extra,
          },
        },
      },
    })
    addedCaseCount += 1
  }

  let addedCoolerCount = 0
  for (const cl of cpuCoolers) {
    const existing = occupiedProducts.find((item) => item.sku === cl.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: cl.name,
        slug: cl.slug,
        sku: cl.sku,
        description: `${cl.name} - Chiều cao ${cl.height}mm, công suất giải nhiệt TDP ${cl.tdp}W, tương thích socket ${cl.socket}.`,
        price: cl.price,
        salePrice: cl.salePrice,
        stock: cl.stock,
        category: { connect: { slug: 'cpu-cooler' } },
        brand: { connect: { slug: cl.brandSlug } },
        specifications: {
          create: {
            productType: 'COOLER',
            height: cl.height,
            tdp: cl.tdp,
            socket: cl.socket,
            radiatorSupport: cl.radiatorSupport,
            extra: cl.extra,
          },
        },
      },
    })
    addedCoolerCount += 1
  }

  let addedMonitorCount = 0
  for (const m of monitors) {
    const existing = occupiedProducts.find((item) => item.sku === m.sku)
    if (existing) continue

    await prisma.product.create({
      data: {
        name: m.name,
        slug: m.slug,
        sku: m.sku,
        description: `${m.name} - Kích thước ${m.extra.screenSize}, độ phân giải ${m.extra.resolution}, tần số quét ${m.extra.refreshRate}, tấm nền ${m.extra.panelType}.`,
        price: m.price,
        salePrice: m.salePrice,
        stock: m.stock,
        category: { connect: { slug: 'monitor' } },
        brand: { connect: { slug: m.brandSlug } },
        specifications: {
          create: {
            productType: 'MONITOR',
            extra: m.extra,
          },
        },
      },
    })
    addedMonitorCount += 1
  }

  const seededPsus = await prisma.product.findMany({
    where: { sku: { in: psus.map((p) => p.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededPsus.length !== psus.length) {
    throw new Error(`Phase 4 expected ${psus.length} PSUs, found ${seededPsus.length}`)
  }
  for (const p of psus) {
    const item = seededPsus.find((x) => x.sku === p.sku)
    const spec = item?.specifications.find((s) => s.productType === 'PSU')
    if (
      !item ||
      item.slug !== p.slug ||
      item.category?.slug !== 'psu' ||
      item.brand?.slug !== p.brandSlug ||
      !spec ||
      spec.wattage !== p.wattage ||
      spec.efficiency !== p.efficiency
    ) {
      throw new Error(`Phase 4 validation failed for PSU ${p.sku}`)
    }
  }

  const seededCases = await prisma.product.findMany({
    where: { sku: { in: cases.map((c) => c.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededCases.length !== cases.length) {
    throw new Error(`Phase 4 expected ${cases.length} Cases, found ${seededCases.length}`)
  }
  for (const c of cases) {
    const item = seededCases.find((x) => x.sku === c.sku)
    const spec = item?.specifications.find((s) => s.productType === 'CASE')
    if (
      !item ||
      item.slug !== c.slug ||
      item.category?.slug !== 'case' ||
      item.brand?.slug !== c.brandSlug ||
      !spec ||
      spec.gpuClearance !== c.gpuClearance ||
      spec.cpuCoolerClearance !== c.cpuCoolerClearance
    ) {
      throw new Error(`Phase 4 validation failed for Case ${c.sku}`)
    }
  }

  const seededCoolers = await prisma.product.findMany({
    where: { sku: { in: cpuCoolers.map((cl) => cl.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededCoolers.length !== cpuCoolers.length) {
    throw new Error(`Phase 4 expected ${cpuCoolers.length} Coolers, found ${seededCoolers.length}`)
  }
  for (const cl of cpuCoolers) {
    const item = seededCoolers.find((x) => x.sku === cl.sku)
    const spec = item?.specifications.find((s) => s.productType === 'COOLER')
    if (
      !item ||
      item.slug !== cl.slug ||
      item.category?.slug !== 'cpu-cooler' ||
      item.brand?.slug !== cl.brandSlug ||
      !spec ||
      spec.height !== cl.height ||
      spec.tdp !== cl.tdp
    ) {
      throw new Error(`Phase 4 validation failed for Cooler ${cl.sku}`)
    }
  }

  const seededMonitors = await prisma.product.findMany({
    where: { sku: { in: monitors.map((m) => m.sku) } },
    include: { brand: true, category: true, specifications: true },
  })
  if (seededMonitors.length !== monitors.length) {
    throw new Error(`Phase 4 expected ${monitors.length} Monitors, found ${seededMonitors.length}`)
  }
  for (const m of monitors) {
    const item = seededMonitors.find((x) => x.sku === m.sku)
    const spec = item?.specifications.find((s) => s.productType === 'MONITOR')
    if (
      !item ||
      item.slug !== m.slug ||
      item.category?.slug !== 'monitor' ||
      item.brand?.slug !== m.brandSlug ||
      !spec
    ) {
      throw new Error(`Phase 4 validation failed for Monitor ${m.sku}`)
    }
  }

  const totalPsuCount = await prisma.product.count({ where: { category: { slug: 'psu' } } })
  const totalCaseCount = await prisma.product.count({ where: { category: { slug: 'case' } } })
  const totalCoolerCount = await prisma.product.count({ where: { category: { slug: 'cpu-cooler' } } })
  const totalMonitorCount = await prisma.product.count({ where: { category: { slug: 'monitor' } } })

  console.log(`Phase 4: PSUs added=${addedPsuCount}, total=${totalPsuCount} | Cases added=${addedCaseCount}, total=${totalCaseCount} | Coolers added=${addedCoolerCount}, total=${totalCoolerCount} | Monitors added=${addedMonitorCount}, total=${totalMonitorCount}`)
}

async function seedPhase5() {
  for (const c of phase5Categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { name: c.name, slug: c.slug, description: c.description },
    })
  }

  for (const b of phase5Brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { name: b.name, slug: b.slug },
    })
  }

  const allPhase5 = [
    ...mice,
    ...keyboards,
    ...headsets,
    ...mousepads,
    ...webcams,
    ...controllers,
    ...wifiCards,
    ...printers,
  ]
  const skuSet = new Set(allPhase5.map((p) => p.sku))
  const slugSet = new Set(allPhase5.map((p) => p.slug))
  if (skuSet.size !== allPhase5.length || slugSet.size !== allPhase5.length) {
    throw new Error('Phase 5 contains duplicate SKU or slug values within itself')
  }

  const occupiedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { sku: { in: allPhase5.map((p) => p.sku) } },
        { slug: { in: allPhase5.map((p) => p.slug) } },
      ],
    },
    select: { id: true, sku: true, slug: true },
  })

  for (const product of allPhase5) {
    const skuOwner = occupiedProducts.find((existing) => existing.sku === product.sku)
    const slugOwner = occupiedProducts.find((existing) => existing.slug === product.slug)
    if ((skuOwner || slugOwner) && skuOwner?.id !== slugOwner?.id) {
      throw new Error(`Phase 5 SKU/slug collision for ${product.sku}; aborting`)
    }
  }

  const groups = [
    { items: mice, categorySlug: 'mouse', label: 'Mouse' },
    { items: keyboards, categorySlug: 'keyboard', label: 'Keyboard' },
    { items: headsets, categorySlug: 'headset', label: 'Headset' },
    { items: mousepads, categorySlug: 'mousepad', label: 'Mousepad' },
    { items: webcams, categorySlug: 'webcam', label: 'Webcam' },
    { items: controllers, categorySlug: 'controller', label: 'Controller' },
    { items: wifiCards, categorySlug: 'wifi-card', label: 'WiFi Card' },
    { items: printers, categorySlug: 'printer', label: 'Printer' },
  ]

  let totalAdded = 0
  for (const group of groups) {
    let count = 0
    for (const item of group.items) {
      const existing = occupiedProducts.find((p) => p.sku === item.sku)
      if (existing) continue

      await prisma.product.create({
        data: {
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: item.description,
          price: item.price,
          salePrice: item.salePrice,
          stock: item.stock,
          category: { connect: { slug: group.categorySlug } },
          brand: { connect: { slug: item.brandSlug } },
          specifications: {
            create: {
              productType: item.productType,
              interface: item.interface,
              type: item.type,
              formFactor: item.formFactor,
              speed: item.speed,
              extra: item.extra as any,
            },
          },
        },
      })
      count++
      totalAdded++
    }
    console.log(`Phase 5: Seeded ${count} items for ${group.label} (${group.categorySlug})`)
  }

  console.log(`Phase 5 complete: totalAdded=${totalAdded}`)
}

async function seedCatalogImages() {
  const verifiedExact: Record<string, { url: string; alt: string }> = {
    'RYZ-7800X3D': {
      url: '/images/products/amd_ryzen_7_7800x3d.jpg',
      alt: 'AMD Ryzen 7 7800X3D Gaming Processor',
    },
    'GPU-ASUS-RTX4060-DUAL-8G': {
      url: 'https://dlcdnwebimgs.asus.com/gain/ec0565b6-9765-4b27-9147-f58e6eef7a60/w692',
      alt: 'ASUS Dual GeForce RTX 4060 OC 8GB GDDR6',
    },
    'GPU-MSI-RTX4060-VENTUS2X-8G': {
      url: 'https://storage-asset.msi.com/global/picture/image/feature/vga/NVIDIA/RTX-4060-VENTUS-2X-BLACK-8G/images/msi-rtx4060-ventus-2x-black-8g-kv-mobile.png',
      alt: 'MSI GeForce RTX 4060 Ventus 2X Black 8G OC',
    },
    'PSU-CORSAIR-CV550-550W': {
      url: '/images/products/corsair_cv550.webp',
      alt: 'Corsair CV550 550W 80 Plus Bronze Power Supply',
    },
    'CASE-CORSAIR-4000D-AIRFLOW-BLK': {
      url: '/images/products/corsair_4000d_black.webp',
      alt: 'Corsair 4000D Airflow Mid-Tower Tempered Glass Black Case',
    },
    'RAM-CORSAIR-LPX-16G-3200': {
      url: '/images/products/corsair_lpx_ddr4.webp',
      alt: 'Corsair Vengeance LPX 16GB DDR4 3200MHz Memory Kit',
    },
    'SSD-SAMSUNG-970EVO-500G': {
      url: '/images/products/samsung_970_evo_plus.jpg',
      alt: 'Samsung 970 EVO Plus 500GB M.2 NVMe PCIe 3.0 SSD',
    },
    'MOU-LOGI-GPX-SL2-BK': {
      url: '/images/products/logitech_gpx_superlight2_black.png',
      alt: 'Logitech G Pro X Superlight 2 Lightspeed Wireless Mouse Black',
    },
    'KB-LOGI-GPRO-X-TKL-MG': {
      url: '/images/products/logitech_gpro_x_tkl_magenta.png',
      alt: 'Logitech G PRO X TKL Lightspeed Wireless Keyboard Magenta',
    },
  }

  const allProducts = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, category: { select: { slug: true } } },
  })

  let createdCount = 0
  let updatedCount = 0

  for (const prod of allProducts) {
    const exact = verifiedExact[prod.sku]
    const catSlug = prod.category?.slug || 'cpu'
    const targetUrl = exact ? exact.url : `/images/products/placeholders/${catSlug}.svg`
    const targetAlt = exact ? exact.alt : `${prod.name} - Đang cập nhật hình ảnh chính thức`

    const existing = await prisma.productImage.findFirst({
      where: { productId: prod.id },
      orderBy: { sortOrder: 'asc' },
    })

    if (!existing) {
      await prisma.productImage.create({
        data: {
          productId: prod.id,
          url: targetUrl,
          alt: targetAlt,
          sortOrder: 0,
        },
      })
      createdCount++
    } else if (existing.url !== targetUrl || existing.alt !== targetAlt) {
      await prisma.productImage.update({
        where: { id: existing.id },
        data: {
          url: targetUrl,
          alt: targetAlt,
          sortOrder: 0,
        },
      })
      updatedCount++
    }
  }

  console.log(`Product images synchronized: created=${createdCount}, updated=${updatedCount}, totalProducts=${allProducts.length}`)
}

async function main() {
  const cpusBefore = await prisma.product.findMany({
    where: { category: { slug: 'cpu' } },
    include: { specifications: true },
  })

  const gpusBefore = await prisma.product.findMany({
    where: { category: { slug: 'gpu' } },
    include: { specifications: true },
  })

  const mbsBefore = await prisma.product.findMany({
    where: { category: { slug: 'mainboard' } },
    include: { specifications: true },
  })

  const ramsBefore = await prisma.product.findMany({
    where: { category: { slug: 'ram' } },
    include: { specifications: true },
  })

  const ssdsBefore = await prisma.product.findMany({
    where: { category: { slug: 'ssd' } },
    include: { specifications: true },
  })

  const hddsBefore = await prisma.product.findMany({
    where: { category: { slug: 'hdd' } },
    include: { specifications: true },
  })

  const protectedProductsBefore = await prisma.product.findMany({
    where: { sku: { in: protectedSampleSkus } },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      price: true,
      salePrice: true,
      stock: true,
      categoryId: true,
      brandId: true,
    },
  })

  // create categories
  const categories = [
    'CPU','GPU','Mainboard','RAM','SSD','HDD','PSU','Case','CPU Cooler',
    'Monitor','Mouse','Keyboard'
  ]

  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-')
      }
    })
  }

  for (const c of phase5Categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        name: c.name,
        slug: c.slug,
        description: c.description,
      }
    })
  }

  // create brands
  const brands = [
    { name: 'AMD', slug: 'amd' },
    { name: 'Intel', slug: 'intel' },
    { name: 'ASUS', slug: 'asus' },
    { name: 'MSI', slug: 'msi' },
    { name: 'Gigabyte', slug: 'gigabyte' },
    { name: 'Corsair', slug: 'corsair' },
    { name: 'Kingston', slug: 'kingston' },
    { name: 'Samsung', slug: 'samsung' },
    { name: 'Cooler Master', slug: 'cooler-master' },
    { name: 'Zotac', slug: 'zotac' },
    { name: 'Palit', slug: 'palit' },
    { name: 'Galax', slug: 'galax' },
    { name: 'Colorful', slug: 'colorful' },
    { name: 'PNY', slug: 'pny' },
    { name: 'Inno3D', slug: 'inno3d' },
    { name: 'ASRock', slug: 'asrock' },
    { name: 'BIOSTAR', slug: 'biostar' },
    { name: 'G.Skill', slug: 'gskill' },
    { name: 'TeamGroup', slug: 'teamgroup' },
    { name: 'ADATA', slug: 'adata' },
    { name: 'Crucial', slug: 'crucial' },
    { name: 'Western Digital', slug: 'wd' },
    { name: 'KIOXIA', slug: 'kioxia' },
    { name: 'Lexar', slug: 'lexar' },
    { name: 'Seagate', slug: 'seagate' },
    { name: 'HIKSEMI', slug: 'hiksemi' },
    { name: 'Netac', slug: 'netac' },
    { name: 'Toshiba', slug: 'toshiba' },
    ...phase4Brands,
    ...phase5Brands,
  ]
  for (const b of brands) {
    await prisma.brand.upsert({
      where: { slug: b.slug },
      update: {},
      create: { name: b.name, slug: b.slug }
    })
  }

  if (process.argv.includes('--phase-1b-only')) {
    await seedNvidiaGpus()
    const protectedProductsAfter = await prisma.product.findMany({
      where: { sku: { in: protectedSampleSkus } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        brandId: true,
      },
    })
    if (JSON.stringify(protectedProductsBefore) !== JSON.stringify(protectedProductsAfter)) {
      throw new Error('Phase 1B changed one or more protected sample products')
    }

    const cpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'cpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(cpusBefore) !== JSON.stringify(cpusAfter)) {
      throw new Error('Phase 1B modified existing CPUs')
    }

    console.log(`Protected sample products unchanged: ${protectedProductsAfter.length}`)
    console.log(`Existing CPUs unchanged: ${cpusAfter.length}`)
    return
  }

  if (process.argv.includes('--phase-2-only')) {
    await seedPhase2MainboardsAndRams()
    const protectedProductsAfter = await prisma.product.findMany({
      where: { sku: { in: protectedSampleSkus } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        brandId: true,
      },
    })
    if (JSON.stringify(protectedProductsBefore) !== JSON.stringify(protectedProductsAfter)) {
      throw new Error('Phase 2 changed one or more protected sample products')
    }

    const cpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'cpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(cpusBefore) !== JSON.stringify(cpusAfter)) {
      throw new Error('Phase 2 modified existing CPUs')
    }

    const gpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'gpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(gpusBefore) !== JSON.stringify(gpusAfter)) {
      throw new Error('Phase 2 modified existing GPUs')
    }

    console.log(`Protected sample products unchanged: ${protectedProductsAfter.length}`)
    console.log(`Existing CPUs unchanged: ${cpusAfter.length}`)
    console.log(`Existing GPUs unchanged: ${gpusAfter.length}`)
    return
  }

  if (process.argv.includes('--phase-3-only')) {
    await seedPhase3Storage()
    const protectedProductsAfter = await prisma.product.findMany({
      where: { sku: { in: protectedSampleSkus } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        brandId: true,
      },
    })
    if (JSON.stringify(protectedProductsBefore) !== JSON.stringify(protectedProductsAfter)) {
      throw new Error('Phase 3 changed one or more protected sample products')
    }

    const cpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'cpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(cpusBefore) !== JSON.stringify(cpusAfter)) {
      throw new Error('Phase 3 modified existing CPUs')
    }

    const gpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'gpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(gpusBefore) !== JSON.stringify(gpusAfter)) {
      throw new Error('Phase 3 modified existing GPUs')
    }

    const mbsAfter = await prisma.product.findMany({
      where: { category: { slug: 'mainboard' } },
      include: { specifications: true },
    })
    if (JSON.stringify(mbsBefore) !== JSON.stringify(mbsAfter)) {
      throw new Error('Phase 3 modified existing Mainboards')
    }

    const ramsAfter = await prisma.product.findMany({
      where: { category: { slug: 'ram' } },
      include: { specifications: true },
    })
    if (JSON.stringify(ramsBefore) !== JSON.stringify(ramsAfter)) {
      throw new Error('Phase 3 modified existing RAMs')
    }

    console.log(`Protected sample products unchanged: ${protectedProductsAfter.length}`)
    console.log(`Existing CPUs unchanged: ${cpusAfter.length}`)
    console.log(`Existing GPUs unchanged: ${gpusAfter.length}`)
    console.log(`Existing Mainboards unchanged: ${mbsAfter.length}`)
    console.log(`Existing RAMs unchanged: ${ramsAfter.length}`)
    return
  }

  if (process.argv.includes('--phase-4-only')) {
    await seedPhase4()
    const protectedProductsAfter = await prisma.product.findMany({
      where: { sku: { in: protectedSampleSkus } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        brandId: true,
      },
    })
    if (JSON.stringify(protectedProductsBefore) !== JSON.stringify(protectedProductsAfter)) {
      throw new Error('Phase 4 changed one or more protected sample products')
    }

    const cpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'cpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(cpusBefore) !== JSON.stringify(cpusAfter)) {
      throw new Error('Phase 4 modified existing CPUs')
    }

    const gpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'gpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(gpusBefore) !== JSON.stringify(gpusAfter)) {
      throw new Error('Phase 4 modified existing GPUs')
    }

    const mbsAfter = await prisma.product.findMany({
      where: { category: { slug: 'mainboard' } },
      include: { specifications: true },
    })
    if (JSON.stringify(mbsBefore) !== JSON.stringify(mbsAfter)) {
      throw new Error('Phase 4 modified existing Mainboards')
    }

    const ramsAfter = await prisma.product.findMany({
      where: { category: { slug: 'ram' } },
      include: { specifications: true },
    })
    if (JSON.stringify(ramsBefore) !== JSON.stringify(ramsAfter)) {
      throw new Error('Phase 4 modified existing RAMs')
    }

    const ssdsAfter = await prisma.product.findMany({
      where: { category: { slug: 'ssd' } },
      include: { specifications: true },
    })
    if (JSON.stringify(ssdsBefore) !== JSON.stringify(ssdsAfter)) {
      throw new Error('Phase 4 modified existing SSDs')
    }

    const hddsAfter = await prisma.product.findMany({
      where: { category: { slug: 'hdd' } },
      include: { specifications: true },
    })
    if (JSON.stringify(hddsBefore) !== JSON.stringify(hddsAfter)) {
      throw new Error('Phase 4 modified existing HDDs')
    }

    console.log(`Protected sample products unchanged: ${protectedProductsAfter.length}`)
    console.log(`Existing CPUs unchanged: ${cpusAfter.length}`)
    console.log(`Existing GPUs unchanged: ${gpusAfter.length}`)
    console.log(`Existing Mainboards unchanged: ${mbsAfter.length}`)
    console.log(`Existing RAMs unchanged: ${ramsAfter.length}`)
    console.log(`Existing SSDs unchanged: ${ssdsAfter.length}`)
    console.log(`Existing HDDs unchanged: ${hddsAfter.length}`)
    return
  }

  if (process.argv.includes('--phase-5-only')) {
    await seedPhase5()
    const protectedProductsAfter = await prisma.product.findMany({
      where: { sku: { in: protectedSampleSkus } },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        salePrice: true,
        stock: true,
        categoryId: true,
        brandId: true,
      },
    })
    if (JSON.stringify(protectedProductsBefore) !== JSON.stringify(protectedProductsAfter)) {
      throw new Error('Phase 5 changed one or more protected sample products')
    }

    const cpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'cpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(cpusBefore) !== JSON.stringify(cpusAfter)) {
      throw new Error('Phase 5 modified existing CPUs')
    }

    const gpusAfter = await prisma.product.findMany({
      where: { category: { slug: 'gpu' } },
      include: { specifications: true },
    })
    if (JSON.stringify(gpusBefore) !== JSON.stringify(gpusAfter)) {
      throw new Error('Phase 5 modified existing GPUs')
    }

    const mbsAfter = await prisma.product.findMany({
      where: { category: { slug: 'mainboard' } },
      include: { specifications: true },
    })
    if (JSON.stringify(mbsBefore) !== JSON.stringify(mbsAfter)) {
      throw new Error('Phase 5 modified existing Mainboards')
    }

    const ramsAfter = await prisma.product.findMany({
      where: { category: { slug: 'ram' } },
      include: { specifications: true },
    })
    if (JSON.stringify(ramsBefore) !== JSON.stringify(ramsAfter)) {
      throw new Error('Phase 5 modified existing RAMs')
    }

    const ssdsAfter = await prisma.product.findMany({
      where: { category: { slug: 'ssd' } },
      include: { specifications: true },
    })
    if (JSON.stringify(ssdsBefore) !== JSON.stringify(ssdsAfter)) {
      throw new Error('Phase 5 modified existing SSDs')
    }

    const hddsAfter = await prisma.product.findMany({
      where: { category: { slug: 'hdd' } },
      include: { specifications: true },
    })
    if (JSON.stringify(hddsBefore) !== JSON.stringify(hddsAfter)) {
      throw new Error('Phase 5 modified existing HDDs')
    }

    console.log(`Protected sample products unchanged: ${protectedProductsAfter.length}`)
    console.log(`Existing CPUs unchanged: ${cpusAfter.length}`)
    console.log(`Existing GPUs unchanged: ${gpusAfter.length}`)
    console.log(`Existing Mainboards unchanged: ${mbsAfter.length}`)
    console.log(`Existing RAMs unchanged: ${ramsAfter.length}`)
    console.log(`Existing SSDs unchanged: ${ssdsAfter.length}`)
    console.log(`Existing HDDs unchanged: ${hddsAfter.length}`)
    return
  }

  // create a user (password hashed)
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10)
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      name: 'Seed User',
      email: 'user@example.com',
      password: passwordHash,
      phone: ''
    }
  })

  // create an admin (password hashed)
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { role: 'ADMIN' },
    create: {
      name: 'Admin',
      email: 'admin@example.com',
      password: adminPasswordHash,
      role: 'ADMIN',
      phone: ''
    }
  })

  // sample products minimal
  const ryzen = await prisma.product.upsert({
    where: { sku: 'RYZ-7800X3D' },
    update: {},
    create: {
      name: 'Ryzen 7 7800X3D',
      slug: 'ryzen-7-7800x3d',
      description: 'AMD Ryzen 7 7800X3D',
      price: 3990000,
      salePrice: 3790000,
      stock: 10,
      sku: 'RYZ-7800X3D',
      category: { connect: { slug: 'cpu' } },
      brand: { connect: { slug: 'amd' } },
    }
  })

  // mainboard AM5
  await prisma.product.upsert({
    where: { sku: 'MB-AM5-EX' },
    update: {},
    create: {
      name: 'Mainboard AM5 Example',
      slug: 'mainboard-am5-example',
      description: 'AM5 socket mainboard',
      price: 2490000,
      stock: 5,
      sku: 'MB-AM5-EX',
      category: { connect: { slug: 'mainboard' } },
      brand: { connect: { slug: 'asus' } },
    }
  })

  // RAM DDR5
  await prisma.product.upsert({
    where: { sku: 'RAM-DDR5-16GB' },
    update: {},
    create: {
      name: '16GB DDR5 RAM',
      slug: '16gb-ddr5-ram',
      description: 'DDR5 5200MHz 16GB',
      price: 899000,
      stock: 20,
      sku: 'RAM-DDR5-16GB',
      category: { connect: { slug: 'ram' } },
      brand: { connect: { slug: 'kingston' } },
    }
  })

  // GPU example
  await prisma.product.upsert({
    where: { sku: 'GPU-EX-01' },
    update: {},
    create: {
      name: 'GPU Example',
      slug: 'gpu-example',
      description: 'Sample GPU for seed',
      price: 1299000,
      stock: 7,
      sku: 'GPU-EX-01',
      category: { connect: { slug: 'gpu' } },
      brand: { connect: { slug: 'msi' } },
    }
  })

  // PSU
  await prisma.product.upsert({
    where: { sku: 'PSU-650W' },
    update: {},
    create: {
      name: 'Power Supply 650W',
      slug: 'power-supply-650w',
      description: '650W PSU',
      price: 599000,
      stock: 12,
      sku: 'PSU-650W',
      category: { connect: { slug: 'psu' } },
      brand: { connect: { slug: 'corsair' } },
    }
  })

  // Case
  await prisma.product.upsert({
    where: { sku: 'CASE-MID' },
    update: {},
    create: {
      name: 'Mid Tower Case',
      slug: 'mid-tower-case',
      description: 'ATX Mid Tower Case',
      price: 399000,
      stock: 8,
      sku: 'CASE-MID',
      category: { connect: { slug: 'case' } },
      brand: { connect: { slug: 'cooler-master' } },
    }
  })

  // CPU Cooler
  await prisma.product.upsert({
    where: { sku: 'COOL-01' },
    update: {},
    create: {
      name: 'CPU Cooler Example',
      slug: 'cpu-cooler-example',
      description: 'Air cooler',
      price: 199000,
      stock: 15,
      sku: 'COOL-01',
      category: { connect: { slug: 'cpu-cooler' } },
      brand: { connect: { slug: 'cooler-master' } },
    }
  })

  // Phase 1A: CPU Catalog (24 Intel + 23 AMD, keeping existing 7800X3D intact)
  const newCpus: Array<{
    name: string
    slug: string
    sku: string
    description: string
    brandSlug: 'intel' | 'amd'
    price: number
    salePrice: number | null
    stock: number
    socket: string
    cores: number
    threads: number
    baseClock: number
    boostClock: number
    tdp: number
  }> = [
    // --- INTEL CPUS (24 models, Gen 10 -> Core Ultra, no i9) ---
    {
      name: 'Intel Core i3-10100F',
      slug: 'intel-core-i3-10100f',
      sku: 'CPU-INTEL-10100F',
      description: 'Bộ vi xử lý Intel Core i3-10100F (4 nhân 8 luồng, Turbo 4.3GHz, 6MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 1790000,
      salePrice: 1590000,
      stock: 20,
      socket: 'LGA1200',
      cores: 4,
      threads: 8,
      baseClock: 3.6,
      boostClock: 4.3,
      tdp: 65,
    },
    {
      name: 'Intel Core i3-10105F',
      slug: 'intel-core-i3-10105f',
      sku: 'CPU-INTEL-10105F',
      description: 'Bộ vi xử lý Intel Core i3-10105F (4 nhân 8 luồng, Turbo 4.4GHz, 6MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 1890000,
      salePrice: 1650000,
      stock: 25,
      socket: 'LGA1200',
      cores: 4,
      threads: 8,
      baseClock: 3.7,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-10400F',
      slug: 'intel-core-i5-10400f',
      sku: 'CPU-INTEL-10400F',
      description: 'Bộ vi xử lý Intel Core i5-10400F (6 nhân 12 luồng, Turbo 4.3GHz, 12MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 2690000,
      salePrice: 2390000,
      stock: 18,
      socket: 'LGA1200',
      cores: 6,
      threads: 12,
      baseClock: 2.9,
      boostClock: 4.3,
      tdp: 65,
    },
    {
      name: 'Intel Core i7-10700K',
      slug: 'intel-core-i7-10700k',
      sku: 'CPU-INTEL-10700K',
      description: 'Bộ vi xử lý Intel Core i7-10700K (8 nhân 16 luồng, Turbo 5.1GHz, 16MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 5990000,
      salePrice: 5490000,
      stock: 10,
      socket: 'LGA1200',
      cores: 8,
      threads: 16,
      baseClock: 3.8,
      boostClock: 5.1,
      tdp: 125,
    },
    {
      name: 'Intel Core i5-11400F',
      slug: 'intel-core-i5-11400f',
      sku: 'CPU-INTEL-11400F',
      description: 'Bộ vi xử lý Intel Core i5-11400F (6 nhân 12 luồng, Turbo 4.4GHz, 12MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 2990000,
      salePrice: 2690000,
      stock: 22,
      socket: 'LGA1200',
      cores: 6,
      threads: 12,
      baseClock: 2.6,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-11600K',
      slug: 'intel-core-i5-11600k',
      sku: 'CPU-INTEL-11600K',
      description: 'Bộ vi xử lý Intel Core i5-11600K (6 nhân 12 luồng, Turbo 4.9GHz, 12MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 4590000,
      salePrice: 4190000,
      stock: 12,
      socket: 'LGA1200',
      cores: 6,
      threads: 12,
      baseClock: 3.9,
      boostClock: 4.9,
      tdp: 125,
    },
    {
      name: 'Intel Core i7-11700K',
      slug: 'intel-core-i7-11700k',
      sku: 'CPU-INTEL-11700K',
      description: 'Bộ vi xử lý Intel Core i7-11700K (8 nhân 16 luồng, Turbo 5.0GHz, 16MB Cache, LGA1200)',
      brandSlug: 'intel',
      price: 6890000,
      salePrice: 6290000,
      stock: 10,
      socket: 'LGA1200',
      cores: 8,
      threads: 16,
      baseClock: 3.6,
      boostClock: 5.0,
      tdp: 125,
    },
    {
      name: 'Intel Core i3-12100F',
      slug: 'intel-core-i3-12100f',
      sku: 'CPU-INTEL-12100F',
      description: 'Bộ vi xử lý Intel Core i3-12100F (4 nhân 8 luồng, Turbo 4.3GHz, 12MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 2190000,
      salePrice: 1950000,
      stock: 30,
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClock: 3.3,
      boostClock: 4.3,
      tdp: 58,
    },
    {
      name: 'Intel Core i3-12100',
      slug: 'intel-core-i3-12100',
      sku: 'CPU-INTEL-12100',
      description: 'Bộ vi xử lý Intel Core i3-12100 (4 nhân 8 luồng, Turbo 4.3GHz, 12MB Cache, UHD Graphics 730, LGA1700)',
      brandSlug: 'intel',
      price: 2890000,
      salePrice: 2590000,
      stock: 15,
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClock: 3.3,
      boostClock: 4.3,
      tdp: 60,
    },
    {
      name: 'Intel Core i5-12400F',
      slug: 'intel-core-i5-12400f',
      sku: 'CPU-INTEL-12400F',
      description: 'Bộ vi xử lý Intel Core i5-12400F (6 nhân 12 luồng, Turbo 4.4GHz, 18MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 3390000,
      salePrice: 2990000,
      stock: 35,
      socket: 'LGA1700',
      cores: 6,
      threads: 12,
      baseClock: 2.5,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-12400',
      slug: 'intel-core-i5-12400',
      sku: 'CPU-INTEL-12400',
      description: 'Bộ vi xử lý Intel Core i5-12400 (6 nhân 12 luồng, Turbo 4.4GHz, 18MB Cache, UHD Graphics 730, LGA1700)',
      brandSlug: 'intel',
      price: 3990000,
      salePrice: 3590000,
      stock: 16,
      socket: 'LGA1700',
      cores: 6,
      threads: 12,
      baseClock: 2.5,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-12600K',
      slug: 'intel-core-i5-12600k',
      sku: 'CPU-INTEL-12600K',
      description: 'Bộ vi xử lý Intel Core i5-12600K (10 nhân 16 luồng, Turbo 4.9GHz, 20MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 5290000,
      salePrice: 4890000,
      stock: 14,
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClock: 3.7,
      boostClock: 4.9,
      tdp: 125,
    },
    {
      name: 'Intel Core i7-12700K',
      slug: 'intel-core-i7-12700k',
      sku: 'CPU-INTEL-12700K',
      description: 'Bộ vi xử lý Intel Core i7-12700K (12 nhân 20 luồng, Turbo 5.0GHz, 25MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 7990000,
      salePrice: 7390000,
      stock: 10,
      socket: 'LGA1700',
      cores: 12,
      threads: 20,
      baseClock: 3.6,
      boostClock: 5.0,
      tdp: 125,
    },
    {
      name: 'Intel Core i3-13100F',
      slug: 'intel-core-i3-13100f',
      sku: 'CPU-INTEL-13100F',
      description: 'Bộ vi xử lý Intel Core i3-13100F (4 nhân 8 luồng, Turbo 4.5GHz, 12MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 2490000,
      salePrice: 2250000,
      stock: 20,
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClock: 3.4,
      boostClock: 4.5,
      tdp: 58,
    },
    {
      name: 'Intel Core i5-13400F',
      slug: 'intel-core-i5-13400f',
      sku: 'CPU-INTEL-13400F',
      description: 'Bộ vi xử lý Intel Core i5-13400F (10 nhân 16 luồng, Turbo 4.6GHz, 20MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 4890000,
      salePrice: 4490000,
      stock: 24,
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClock: 2.5,
      boostClock: 4.6,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-13500',
      slug: 'intel-core-i5-13500',
      sku: 'CPU-INTEL-13500',
      description: 'Bộ vi xử lý Intel Core i5-13500 (14 nhân 20 luồng, Turbo 4.8GHz, 24MB Cache, UHD Graphics 770, LGA1700)',
      brandSlug: 'intel',
      price: 5890000,
      salePrice: 5490000,
      stock: 15,
      socket: 'LGA1700',
      cores: 14,
      threads: 20,
      baseClock: 2.5,
      boostClock: 4.8,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-13600K',
      slug: 'intel-core-i5-13600k',
      sku: 'CPU-INTEL-13600K',
      description: 'Bộ vi xử lý Intel Core i5-13600K (14 nhân 20 luồng, Turbo 5.1GHz, 24MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 7990000,
      salePrice: 7490000,
      stock: 12,
      socket: 'LGA1700',
      cores: 14,
      threads: 20,
      baseClock: 3.5,
      boostClock: 5.1,
      tdp: 125,
    },
    {
      name: 'Intel Core i7-13700K',
      slug: 'intel-core-i7-13700k',
      sku: 'CPU-INTEL-13700K',
      description: 'Bộ vi xử lý Intel Core i7-13700K (16 nhân 24 luồng, Turbo 5.4GHz, 30MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 9990000,
      salePrice: 9390000,
      stock: 10,
      socket: 'LGA1700',
      cores: 16,
      threads: 24,
      baseClock: 3.4,
      boostClock: 5.4,
      tdp: 125,
    },
    {
      name: 'Intel Core i3-14100F',
      slug: 'intel-core-i3-14100f',
      sku: 'CPU-INTEL-14100F',
      description: 'Bộ vi xử lý Intel Core i3-14100F (4 nhân 8 luồng, Turbo 4.7GHz, 12MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 2690000,
      salePrice: 2450000,
      stock: 22,
      socket: 'LGA1700',
      cores: 4,
      threads: 8,
      baseClock: 3.5,
      boostClock: 4.7,
      tdp: 58,
    },
    {
      name: 'Intel Core i5-14400F',
      slug: 'intel-core-i5-14400f',
      sku: 'CPU-INTEL-14400F',
      description: 'Bộ vi xử lý Intel Core i5-14400F (10 nhân 16 luồng, Turbo 4.7GHz, 20MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 5290000,
      salePrice: 4890000,
      stock: 20,
      socket: 'LGA1700',
      cores: 10,
      threads: 16,
      baseClock: 2.5,
      boostClock: 4.7,
      tdp: 65,
    },
    {
      name: 'Intel Core i5-14600K',
      slug: 'intel-core-i5-14600k',
      sku: 'CPU-INTEL-14600K',
      description: 'Bộ vi xử lý Intel Core i5-14600K (14 nhân 20 luồng, Turbo 5.3GHz, 24MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 8490000,
      salePrice: 7990000,
      stock: 14,
      socket: 'LGA1700',
      cores: 14,
      threads: 20,
      baseClock: 3.5,
      boostClock: 5.3,
      tdp: 125,
    },
    {
      name: 'Intel Core i7-14700K',
      slug: 'intel-core-i7-14700k',
      sku: 'CPU-INTEL-14700K',
      description: 'Bộ vi xử lý Intel Core i7-14700K (20 nhân 28 luồng, Turbo 5.6GHz, 33MB Cache, LGA1700)',
      brandSlug: 'intel',
      price: 10990000,
      salePrice: 10390000,
      stock: 10,
      socket: 'LGA1700',
      cores: 20,
      threads: 28,
      baseClock: 3.4,
      boostClock: 5.6,
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 5 245K',
      slug: 'intel-core-ultra-5-245k',
      sku: 'CPU-INTEL-U5-245K',
      description: 'Bộ vi xử lý Intel Core Ultra 5 245K (14 nhân 14 luồng, Turbo 5.2GHz, 24MB Cache, LGA1851)',
      brandSlug: 'intel',
      price: 8990000,
      salePrice: null,
      stock: 8,
      socket: 'LGA1851',
      cores: 14,
      threads: 14,
      baseClock: 4.2,
      boostClock: 5.2,
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 7 265K',
      slug: 'intel-core-ultra-7-265k',
      sku: 'CPU-INTEL-U7-265K',
      description: 'Bộ vi xử lý Intel Core Ultra 7 265K (20 nhân 20 luồng, Turbo 5.5GHz, 30MB Cache, LGA1851)',
      brandSlug: 'intel',
      price: 11990000,
      salePrice: null,
      stock: 8,
      socket: 'LGA1851',
      cores: 20,
      threads: 20,
      baseClock: 3.9,
      boostClock: 5.5,
      tdp: 125,
    },

    // --- AMD CPUS (23 models, Ryzen 7 7800X3D is preserved from original seed) ---
    {
      name: 'AMD Ryzen 5 5500',
      slug: 'amd-ryzen-5-5500',
      sku: 'CPU-AMD-R5-5500',
      description: 'Bộ vi xử lý AMD Ryzen 5 5500 (6 nhân 12 luồng, Turbo 4.2GHz, 16MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 2490000,
      salePrice: 2190000,
      stock: 25,
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClock: 3.6,
      boostClock: 4.2,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 5600',
      slug: 'amd-ryzen-5-5600',
      sku: 'CPU-AMD-R5-5600',
      description: 'Bộ vi xử lý AMD Ryzen 5 5600 (6 nhân 12 luồng, Turbo 4.4GHz, 32MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 3290000,
      salePrice: 2890000,
      stock: 30,
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClock: 3.5,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 5600X',
      slug: 'amd-ryzen-5-5600x',
      sku: 'CPU-AMD-R5-5600X',
      description: 'Bộ vi xử lý AMD Ryzen 5 5600X (6 nhân 12 luồng, Turbo 4.6GHz, 32MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 3990000,
      salePrice: 3590000,
      stock: 20,
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClock: 3.7,
      boostClock: 4.6,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 5600G',
      slug: 'amd-ryzen-5-5600g',
      sku: 'CPU-AMD-R5-5600G',
      description: 'Bộ vi xử lý AMD Ryzen 5 5600G (6 nhân 12 luồng, Turbo 4.4GHz, Radeon Vega 7, Socket AM4)',
      brandSlug: 'amd',
      price: 3490000,
      salePrice: 3090000,
      stock: 18,
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClock: 3.9,
      boostClock: 4.4,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 5700X',
      slug: 'amd-ryzen-7-5700x',
      sku: 'CPU-AMD-R7-5700X',
      description: 'Bộ vi xử lý AMD Ryzen 7 5700X (8 nhân 16 luồng, Turbo 4.6GHz, 32MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 4690000,
      salePrice: 4290000,
      stock: 16,
      socket: 'AM4',
      cores: 8,
      threads: 16,
      baseClock: 3.4,
      boostClock: 4.6,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 5700X3D',
      slug: 'amd-ryzen-7-5700x3d',
      sku: 'CPU-AMD-R7-5700X3D',
      description: 'Bộ vi xử lý AMD Ryzen 7 5700X3D (8 nhân 16 luồng, 3D V-Cache 96MB, Turbo 4.1GHz, Socket AM4)',
      brandSlug: 'amd',
      price: 6290000,
      salePrice: 5790000,
      stock: 15,
      socket: 'AM4',
      cores: 8,
      threads: 16,
      baseClock: 3.0,
      boostClock: 4.1,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 7 5800X',
      slug: 'amd-ryzen-7-5800x',
      sku: 'CPU-AMD-R7-5800X',
      description: 'Bộ vi xử lý AMD Ryzen 7 5800X (8 nhân 16 luồng, Turbo 4.7GHz, 32MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 5990000,
      salePrice: 5390000,
      stock: 12,
      socket: 'AM4',
      cores: 8,
      threads: 16,
      baseClock: 3.8,
      boostClock: 4.7,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 9 5900X',
      slug: 'amd-ryzen-9-5900x',
      sku: 'CPU-AMD-R9-5900X',
      description: 'Bộ vi xử lý AMD Ryzen 9 5900X (12 nhân 24 luồng, Turbo 4.8GHz, 64MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 7990000,
      salePrice: 7290000,
      stock: 10,
      socket: 'AM4',
      cores: 12,
      threads: 24,
      baseClock: 3.7,
      boostClock: 4.8,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 9 5950X',
      slug: 'amd-ryzen-9-5950x',
      sku: 'CPU-AMD-R9-5950X',
      description: 'Bộ vi xử lý AMD Ryzen 9 5950X (16 nhân 32 luồng, Turbo 4.9GHz, 64MB Cache, Socket AM4)',
      brandSlug: 'amd',
      price: 9990000,
      salePrice: 9190000,
      stock: 8,
      socket: 'AM4',
      cores: 16,
      threads: 32,
      baseClock: 3.4,
      boostClock: 4.9,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 5 7500F',
      slug: 'amd-ryzen-5-7500f',
      sku: 'CPU-AMD-R5-7500F',
      description: 'Bộ vi xử lý AMD Ryzen 5 7500F (6 nhân 12 luồng, Turbo 5.0GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 4290000,
      salePrice: 3950000,
      stock: 25,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 3.7,
      boostClock: 5.0,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 7600',
      slug: 'amd-ryzen-5-7600',
      sku: 'CPU-AMD-R5-7600',
      description: 'Bộ vi xử lý AMD Ryzen 5 7600 (6 nhân 12 luồng, Turbo 5.1GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 5490000,
      salePrice: 4990000,
      stock: 20,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 3.8,
      boostClock: 5.1,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 7600X',
      slug: 'amd-ryzen-5-7600x',
      sku: 'CPU-AMD-R5-7600X',
      description: 'Bộ vi xử lý AMD Ryzen 5 7600X (6 nhân 12 luồng, Turbo 5.3GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 6190000,
      salePrice: 5690000,
      stock: 15,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 4.7,
      boostClock: 5.3,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 7 7700',
      slug: 'amd-ryzen-7-7700',
      sku: 'CPU-AMD-R7-7700',
      description: 'Bộ vi xử lý AMD Ryzen 7 7700 (8 nhân 16 luồng, Turbo 5.3GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 7690000,
      salePrice: 7190000,
      stock: 14,
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClock: 3.8,
      boostClock: 5.3,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 7700X',
      slug: 'amd-ryzen-7-7700x',
      sku: 'CPU-AMD-R7-7700X',
      description: 'Bộ vi xử lý AMD Ryzen 7 7700X (8 nhân 16 luồng, Turbo 5.4GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 8490000,
      salePrice: 7890000,
      stock: 12,
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClock: 4.5,
      boostClock: 5.4,
      tdp: 105,
    },
    {
      name: 'AMD Ryzen 9 7900X',
      slug: 'amd-ryzen-9-7900x',
      sku: 'CPU-AMD-R9-7900X',
      description: 'Bộ vi xử lý AMD Ryzen 9 7900X (12 nhân 24 luồng, Turbo 5.6GHz, 64MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 10490000,
      salePrice: 9790000,
      stock: 10,
      socket: 'AM5',
      cores: 12,
      threads: 24,
      baseClock: 4.7,
      boostClock: 5.6,
      tdp: 170,
    },
    {
      name: 'AMD Ryzen 9 7950X',
      slug: 'amd-ryzen-9-7950x',
      sku: 'CPU-AMD-R9-7950X',
      description: 'Bộ vi xử lý AMD Ryzen 9 7950X (16 nhân 32 luồng, Turbo 5.7GHz, 64MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 13990000,
      salePrice: 12990000,
      stock: 8,
      socket: 'AM5',
      cores: 16,
      threads: 32,
      baseClock: 4.5,
      boostClock: 5.7,
      tdp: 170,
    },
    {
      name: 'AMD Ryzen 9 7950X3D',
      slug: 'amd-ryzen-9-7950x3d',
      sku: 'CPU-AMD-R9-7950X3D',
      description: 'Bộ vi xử lý AMD Ryzen 9 7950X3D (16 nhân 32 luồng, 3D V-Cache 128MB, Turbo 5.7GHz, Socket AM5)',
      brandSlug: 'amd',
      price: 15990000,
      salePrice: 14990000,
      stock: 6,
      socket: 'AM5',
      cores: 16,
      threads: 32,
      baseClock: 4.2,
      boostClock: 5.7,
      tdp: 120,
    },
    {
      name: 'AMD Ryzen 5 8500G',
      slug: 'amd-ryzen-5-8500g',
      sku: 'CPU-AMD-R5-8500G',
      description: 'Bộ vi xử lý AMD Ryzen 5 8500G (6 nhân 12 luồng, Turbo 5.0GHz, Radeon 740M, Socket AM5)',
      brandSlug: 'amd',
      price: 4790000,
      salePrice: 4390000,
      stock: 15,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 3.5,
      boostClock: 5.0,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 8600G',
      slug: 'amd-ryzen-5-8600g',
      sku: 'CPU-AMD-R5-8600G',
      description: 'Bộ vi xử lý AMD Ryzen 5 8600G (6 nhân 12 luồng, Turbo 5.0GHz, Radeon 760M, NPU AI, Socket AM5)',
      brandSlug: 'amd',
      price: 5990000,
      salePrice: 5490000,
      stock: 15,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 4.3,
      boostClock: 5.0,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 8700G',
      slug: 'amd-ryzen-7-8700g',
      sku: 'CPU-AMD-R7-8700G',
      description: 'Bộ vi xử lý AMD Ryzen 7 8700G (8 nhân 16 luồng, Turbo 5.1GHz, Radeon 780M, NPU AI, Socket AM5)',
      brandSlug: 'amd',
      price: 8890000,
      salePrice: 8190000,
      stock: 10,
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClock: 4.2,
      boostClock: 5.1,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 9600X',
      slug: 'amd-ryzen-5-9600x',
      sku: 'CPU-AMD-R5-9600X',
      description: 'Bộ vi xử lý AMD Ryzen 5 9600X (6 nhân 12 luồng, Turbo 5.4GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 7490000,
      salePrice: 6990000,
      stock: 12,
      socket: 'AM5',
      cores: 6,
      threads: 12,
      baseClock: 3.9,
      boostClock: 5.4,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 9700X',
      slug: 'amd-ryzen-7-9700x',
      sku: 'CPU-AMD-R7-9700X',
      description: 'Bộ vi xử lý AMD Ryzen 7 9700X (8 nhân 16 luồng, Turbo 5.5GHz, 32MB Cache, Socket AM5)',
      brandSlug: 'amd',
      price: 9990000,
      salePrice: 9390000,
      stock: 12,
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClock: 3.8,
      boostClock: 5.5,
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 9800X3D',
      slug: 'amd-ryzen-7-9800x3d',
      sku: 'CPU-AMD-R7-9800X3D',
      description: 'Bộ vi xử lý AMD Ryzen 7 9800X3D (8 nhân 16 luồng, 2nd Gen 3D V-Cache 96MB, Turbo 5.2GHz, Socket AM5)',
      brandSlug: 'amd',
      price: 13490000,
      salePrice: null,
      stock: 8,
      socket: 'AM5',
      cores: 8,
      threads: 16,
      baseClock: 4.7,
      boostClock: 5.2,
      tdp: 120,
    },
  ]

  for (const item of newCpus) {
    const prod = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        salePrice: item.salePrice,
        stock: item.stock,
        category: { connect: { slug: 'cpu' } },
        brand: { connect: { slug: item.brandSlug } },
      },
      create: {
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        salePrice: item.salePrice,
        stock: item.stock,
        sku: item.sku,
        category: { connect: { slug: 'cpu' } },
        brand: { connect: { slug: item.brandSlug } },
      },
    })

    const existingSpec = await prisma.productSpecification.findFirst({
      where: { productId: prod.id },
    })

    const specData = {
      productType: 'CPU',
      socket: item.socket,
      cores: item.cores,
      threads: item.threads,
      baseClock: item.baseClock,
      boostClock: item.boostClock,
      tdp: item.tdp,
    }

    if (existingSpec) {
      await prisma.productSpecification.update({
        where: { id: existingSpec.id },
        data: specData,
      })
    } else {
      await prisma.productSpecification.create({
        data: {
          ...specData,
          productId: prod.id,
        },
      })
    }
  }

  await seedNvidiaGpus()
  await seedPhase2MainboardsAndRams()
  await seedPhase3Storage()
  await seedPhase4()
  await seedPhase5()
  await seedCatalogImages()
  const protectedProductsAfter = await prisma.product.findMany({
    where: { sku: { in: protectedSampleSkus } },
    select: {
      id: true,
      name: true,
      slug: true,
      sku: true,
      description: true,
      price: true,
      salePrice: true,
      stock: true,
      categoryId: true,
      brandId: true,
    },
  })
  const existingProtectedProducts = new Map(protectedProductsBefore.map((product) => [product.sku, product]))
  const changedProtectedProducts = protectedProductsAfter.filter((product) => {
    const before = existingProtectedProducts.get(product.sku)
    return before && JSON.stringify(before) !== JSON.stringify(product)
  })
  if (changedProtectedProducts.length > 0) {
    throw new Error(`Seed changed protected sample products: ${changedProtectedProducts.map((product) => product.sku).join(', ')}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
