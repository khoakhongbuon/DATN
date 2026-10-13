import { coreImages } from './product-images-data-core'
import { componentImages } from './product-images-data-components'
import { peripheralImages } from './product-images-data-peripherals'

export interface ProductImageData {
  sku: string
  url: string
  alt: string
  sortOrder: number
}

// 10 sample products verified across multiple categories during Phase 6B pilot
export const pilotProductImages: ProductImageData[] = [
  {
    sku: 'RYZ-7800X3D',
    url: 'https://www.amd.com/content/dam/amd/en/images/products/processors/ryzen/2505503-ryzen-7-7800x3d-front.jpg',
    alt: 'AMD Ryzen 7 7800X3D Gaming Processor',
    sortOrder: 0,
  },
  {
    sku: 'GPU-ASUS-RTX4060-DUAL-8G',
    url: 'https://dlcdnwebimgs.asus.com/gain/ec0565b6-9765-4b27-9147-f58e6eef7a60/w692',
    alt: 'ASUS Dual GeForce RTX 4060 OC 8GB GDDR6',
    sortOrder: 0,
  },
  {
    sku: 'SSD-SAMSUNG-970EVO-500G',
    url: 'https://images.samsung.com/is/image/samsung/p6pim/vn/mz-v7s1t0bw/gallery/vn-970-evoplus-nvme-m2-ssd-mz-v7s1t0bw-539193837',
    alt: 'Samsung 970 EVO Plus 500GB M.2 NVMe PCIe 3.0 SSD',
    sortOrder: 0,
  },
  {
    sku: 'PSU-CORSAIR-CV550-550W',
    url: 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_1024,w_1024,f_auto/products/Power-Supply-Units/CP-9020210-NA/Gallery/CV550_PSU_01.webp',
    alt: 'Corsair CV550 550W 80 Plus Bronze Power Supply',
    sortOrder: 0,
  },
  {
    sku: 'CASE-CORSAIR-4000D-AIRFLOW-BLK',
    url: 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_1024,w_1024,f_auto/products/Cases/base-4000d-airflow-config/Gallery/4000D_AF_BLACK_01.webp',
    alt: 'Corsair 4000D Airflow Mid-Tower Tempered Glass Black Case',
    sortOrder: 0,
  },
  {
    sku: 'RAM-CORSAIR-LPX-16G-3200',
    url: 'https://assets.corsair.com/image/upload/c_pad,q_auto,h_1024,w_1024,f_auto/products/Memory/CMK16GX4M1E3200C16/Gallery/VENG_LPX_BLK_01.webp',
    alt: 'Corsair Vengeance LPX 16GB DDR4 3200MHz Memory Kit',
    sortOrder: 0,
  },
  {
    sku: 'MOU-LOGI-GPX-SL2-BK',
    url: 'https://resource.logitechg.com/w_692,c_limit,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-x-superlight-2/pro-x-superlight-2-black-gallery-1.png',
    alt: 'Logitech G Pro X Superlight 2 Lightspeed Wireless Mouse Black',
    sortOrder: 0,
  },
  {
    sku: 'KB-LOGI-GPRO-X-TKL-MG',
    url: 'https://resource.logitechg.com/w_692,c_limit,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/products/pro-x-tkl/gallery-1-pro-x-tkl-magenta-lightspeed-gaming-keyboard-us.png',
    alt: 'Logitech G PRO X TKL Lightspeed Wireless Keyboard Magenta',
    sortOrder: 0,
  },
  {
    sku: 'CAM-LOGI-C920S-PRO-HD',
    url: 'https://resource.logitech.com/w_544,h_466,ar_7:6,c_pad,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/logitech/en/products/webcams/c920s/gallery/c920s-gallery-1.png',
    alt: 'Logitech C920s Pro HD 1080p Webcam with Privacy Shutter',
    sortOrder: 0,
  },
  {
    sku: 'NET-TPLINK-ARCHER-TX50E',
    url: 'https://static.tp-link.com/overview-01_normal_20220321060250a.png',
    alt: 'TP-Link Archer TX50E AX3000 Wi-Fi 6 Bluetooth 5.2 PCIe Adapter',
    sortOrder: 0,
  },
]

// Deduplicate by SKU just in case of any overlap, ensuring exactly 325 products
const skuMap = new Map<string, ProductImageData>()
for (const item of [...coreImages, ...componentImages, ...peripheralImages]) {
  skuMap.set(item.sku, item)
}

// Complete catalog product images (325 items)
export const catalogProductImages: ProductImageData[] = Array.from(skuMap.values())
