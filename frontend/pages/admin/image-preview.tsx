import Head from 'next/head'
import Link from 'next/link'
import { useState, useMemo, useEffect, useCallback } from 'react'

export interface ImagePreviewItem {
  sku: string
  batchNumber?: number
  batchLabel?: string
  productName: string
  brand: string
  brandSlug?: string
  category: string
  categorySlug?: string
  phase?: string
  directImageUrl: string
  sourcePageUrl?: string
  sourceType?: string
  savedFilename: string
  publicUrl: string
  fileSizeBytes: number
  fileSizeFormatted: string
  dimensions?: { width: number; height: number } | null
  resolutionFormatted: string
  detectedFormat: string
  contentType?: string
  downloadStatus?: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  modelMatchStatus?: 'EXACT_MATCH' | 'UNVERIFIED' | 'CANDIDATE'
  verificationStatus?: 'VERIFIED' | 'CANDIDATE' | 'UNVERIFIED'
  releaseStatus?:
    | 'ALREADY_PUBLISHED'
    | 'READY_FOR_REVIEW'
    | 'DEPLOYED_AND_SYNCED'
    | 'LOCAL_PREVIEW_PENDING'
    | 'READY_FOR_DOWNLOAD'
    | 'NOT_DOWNLOADED'
    | 'UNVERIFIED_PLACEHOLDER'
    | 'PLACEHOLDER'
    | 'UNVERIFIED'
    | string
  unverifiedReason?: string
  matchingEvidence?: string
  modelSpecsMatch?: {
    exactModel?: string
    color?: string
    keyFeatures?: string
    appearanceDetails?: string
  }
  notes?: string
  error?: string
  isReplaced?: boolean
  oldFilename?: string
  oldImageUrl?: string
  rejectionReason?: string
}

export type ManualReviewDecision = 'APPROVED' | 'REJECTED' | 'UNVERIFIED'

export interface ManualReviewRecord {
  decision: ManualReviewDecision
  reviewedAt: string
  note?: string
}

export const TARGET_174_SKUS = [
  "CASE-ASUS-ROG-HYPERION-GR701",
  "CASE-CM-H500P-MESH-ARGB",
  "CASE-CM-MASTERBOX-Q300L",
  "CASE-CORSAIR-3000D-RGB-AIRFLOW-BLK",
  "CASE-CORSAIR-5000D-AIRFLOW-WHT",
  "CASE-DEEPCOOL-CH560-DIGITAL-BLK",
  "CASE-LIANLI-A3-MATX-BLK",
  "CASE-LIANLI-LANCOOL-216-RGB-BLK",
  "CASE-LIANLI-O11-DYNAMIC-EVO-BLK",
  "CASE-MID",
  "CASE-MONTECH-AIR-903-MAX-BLK",
  "CASE-MSI-MAG-FORGE-100R-BLK",
  "CASE-MSI-MAG-PANO-M100R-PZ-BLK",
  "CASE-MSI-MPG-GUNGNIR-300R-BLK",
  "CASE-NZXT-H5-FLOW-RGB-BLK",
  "CASE-NZXT-H7-FLOW-BLK",
  "CASE-NZXT-H9-FLOW-WHT",
  "CASE-XIGMATEK-NYX-AIR-3F",
  "COOL-01",
  "COOL-ASUS-ROG-RYUJIN-III-360",
  "COOL-CORSAIR-ICUE-LINK-TITAN-360",
  "COOL-CORSAIR-NAUTILUS-240-ARGB",
  "COOL-DEEPCOOL-LT720-360-BLK",
  "COOL-MSI-MAG-CORELIQUID-E360-BLK",
  "COOL-NOCTUA-NH-U12S-CHROMAX",
  "COOL-TR-BURST-ASSASSIN-120",
  "COOL-TR-FROZEN-PRISM-360-BLK",
  "COOL-TR-PEERLESS-ASSASSIN-120-SE",
  "CPU-AMD-R5-7500F",
  "CPU-AMD-R5-9600X",
  "CPU-AMD-R7-9800X3D",
  "CPU-INTEL-10100F",
  "CPU-INTEL-10105F",
  "CPU-INTEL-11400F",
  "CPU-INTEL-12100",
  "CPU-INTEL-13100F",
  "CPU-INTEL-U5-245K",
  "CPU-INTEL-U7-265K",
  "EAR-ASUS-DELTA-S-ANIMATE",
  "EAR-COR-HS80-RGB-WL-CB",
  "EAR-HYPERX-CLOUD-II-RD",
  "EAR-HYPERX-CLOUD-III-WL-RD",
  "EAR-LOGI-GPRO-X2-WL-WH",
  "EAR-RAZ-BLACKSHARK-V2-PRO-23-BK",
  "EAR-RAZ-KRAKEN-V3-X",
  "EAR-SS-ARCTIS-NOVA-7-WL-BK",
  "GPU-EX-01",
  "HDD-SEAGATE-BARRACUDA-1TB",
  "HDD-SEAGATE-IRONWOLF-4TB",
  "HDD-SEAGATE-IRONWOLF-8TB",
  "HDD-TOSHIBA-P300-2TB",
  "HDD-WD-BLUE-2TB",
  "HDD-WD-BLUE-4TB",
  "HDD-WD-REDPLUS-4TB",
  "HDD-WD-REDPLUS-8TB",
  "KB-AKKO-3068B-PLUS-BC",
  "KB-AKKO-5075B-PLUS-DRACULA",
  "KB-ASUS-FALCHION-RX-LP",
  "KB-ASUS-SCOPE-II-96-WL",
  "KB-AULA-F75-ICE-BLUE",
  "KB-COR-K70-RGB-PRO-RED",
  "KB-FL-CMK75-DESERT-YELLOW",
  "KB-KEYCHRON-K3-PRO-RED",
  "KB-KEYCHRON-Q1-PRO-CB",
  "KB-LOGI-K120-USB",
  "KB-RAZ-BLACKWIDOW-V4-75-BK",
  "KB-RAZ-HUNTSMAN-V3-PRO-TKL",
  "KB-SS-APEX-PRO-MINI-WL",
  "MB-AM5-EX",
  "MB-ASROCK-A620M-HDV",
  "MB-ASROCK-B760M-PRO-RS",
  "MB-ASROCK-Z590-STEEL-LEGEND",
  "MB-ASROCK-Z890-PRO-RS-WIFI",
  "MB-ASUS-A520M-K",
  "MB-ASUS-H510M-K",
  "MB-ASUS-H610M-K-D4",
  "MB-ASUS-ROG-Z890-HERO",
  "MB-ASUS-TUF-B650-PLUS-WIFI",
  "MB-ASUS-TUF-B760M-PLUS-WIFI",
  "MB-BIOSTAR-A520MH",
  "MB-BIOSTAR-B760MZ-E-PRO-DDR4",
  "MB-BIOSTAR-H510MHP",
  "MB-GIGABYTE-A620M-GAMING-X",
  "MB-GIGABYTE-B550M-AORUS-ELITE",
  "MB-GIGABYTE-B560M-GAMING-HD",
  "MB-GIGABYTE-B760M-GAMING-PLUS-D4",
  "MB-GIGABYTE-X670E-AORUS-PRO-X",
  "MB-GIGABYTE-Z890-AORUS-MASTER",
  "MB-MSI-B450M-A-PRO-MAX-II",
  "MB-MSI-B550-TOMAHAWK-MAX",
  "MB-MSI-B560M-PRO-VDH",
  "MB-MSI-B650M-A-WIFI",
  "MB-MSI-B760-TOMAHAWK-WIFI",
  "MB-MSI-H610M-E-DDR4",
  "MB-MSI-Z890-TOMAHAWK-WIFI",
  "MON-ACER-NITRO-VG240Y-M3-24",
  "MON-AOC-Q27G4-27-2K",
  "MON-ASUS-TUF-VG27AQL3A-27-2K",
  "MON-ASUS-VY249HGE-24-FHD",
  "MON-GIGABYTE-GS24F-2-24-FHD",
  "MON-GIGABYTE-M32U-32-4K",
  "MON-LG-24MR400-B-24-FHD",
  "MON-LG-27GS75Q-B-27-2K",
  "MON-LG-32GR93U-B-32-4K",
  "MON-MSI-G244F-E2-24-FHD",
  "MON-MSI-MAG-323UPF-32-4K",
  "MON-MSI-PRO-MP2412-24-FHD",
  "MON-SAMSUNG-ESSENTIAL-S3-24",
  "MON-SAMSUNG-ODYSSEY-G5-G50D-27",
  "MON-SAMSUNG-ODYSSEY-OLED-G8-32",
  "MON-VIEWSONIC-VA2432-H-24",
  "MON-VIEWSONIC-VX2779-HD-PRO-27",
  "MOU-ASUS-HARPE-ACE-AIMLAB",
  "MOU-ATK-BLAZING-SKY-X1-BK",
  "MOU-COR-SABRE-RGB-PRO",
  "MOU-DARMOSHARK-M3-PRO-WH",
  "MOU-LAMZU-ATLANTIS-OG-V2-4K-BK",
  "MOU-MCHOSE-A5-PRO-MAX",
  "MOU-MSI-CLUTCH-GM51-WL",
  "MOU-PULSAR-X2V2-MED-BK",
  "MOU-RAPOO-M100-SILENT-GR",
  "MOU-RAZ-DAV3-PRO-BK",
  "MOU-RAZ-VIPER-V3-PRO-WH",
  "MOU-SS-PRIME-WIRELESS",
  "MOU-VGN-DRAGONFLY-F1-MOBA-WH",
  "MOU-VXE-DRAGONFLY-R1-PROMAX-BK",
  "MOU-WAIZOWL-OGM-CLOUD-RD",
  "MOU-WLMOUSE-BEAST-X-BK",
  "NET-INTEL-BE200-WIFI7-KIT",
  "PAD-ARTISAN-FX-HAYATE-OTSU-SOFT-XL",
  "PAD-ARTISAN-FX-ZERO-XSOFT-XL",
  "PSU-650W",
  "PSU-ANTEC-NEOECO-750G-750W",
  "PSU-ASUS-ROG-LOKI-850P-850W",
  "PSU-ASUS-ROG-STRIX-1000G-AURA-1000W",
  "PSU-ASUS-TUF-650B-650W",
  "PSU-ASUS-TUF-750G-750W",
  "PSU-BEQUIET-PURE-POWER-12M-750W",
  "PSU-BEQUIET-PURE-POWER-12M-850W",
  "PSU-CM-MWE-BRONZE-500W-V2",
  "PSU-CM-MWE-BRONZE-650W-V2",
  "PSU-CM-MWE-GOLD-750-V2",
  "PSU-CM-MWE-GOLD-850-V2-ATX3",
  "PSU-CM-V850-SFX-GOLD-ATX3",
  "PSU-CORSAIR-CV650-650W",
  "PSU-CORSAIR-SF750-750W",
  "PSU-DEEPCOOL-PK550D-550W",
  "PSU-DEEPCOOL-PX850G-850W",
  "PSU-FSP-HYDRO-G-PRO-750W-ATX3",
  "PSU-FSP-HYDRO-G-PRO-850W-ATX3",
  "PSU-FSP-HYDRO-K-PRO-600W",
  "PSU-FSP-HYDRO-PTM-PRO-1000W-ATX3",
  "PSU-MSI-MAG-A550BN-550W",
  "PSU-MSI-MAG-A650BN-650W",
  "PSU-MSI-MAG-A850GL-850W",
  "PSU-MSI-MEG-AI1000P-1000W",
  "PSU-SEASONIC-B12-BC-650W",
  "PSU-SEASONIC-FOCUS-GX-750W-ATX3",
  "PSU-SEASONIC-VERTEX-GX-1000W-ATX3",
  "PSU-TT-TOUGHPOWER-GF-A3-850W",
  "RAM-DDR5-16GB",
  "SSD-CORSAIR-MP700PRO-2TB",
  "SSD-CRUCIAL-T700-1TB",
  "SSD-GIGABYTE-AORUS7300-2TB",
  "SSD-HIKSEMI-WAVEPRO-1TB",
  "SSD-KINGSTON-KC3000-1TB",
  "SSD-KIOXIA-EXCERIA-1TB",
  "SSD-LEXAR-NM610PRO-500G",
  "SSD-LEXAR-NM790-4TB",
  "SSD-MSI-M480PRO-2TB",
  "SSD-NETAC-NV3000-500G",
  "SSD-PNY-CS3140-2TB",
  "SSD-TEAM-CARDEAZ440-1TB",
  "SSD-WD-SN570-500G"
]

export const BATCH_174_RANGES = [
  { batch: 1, label: 'Lô 1', range: '1 - 50', count: 50 },
  { batch: 2, label: 'Lô 2', range: '51 - 100', count: 50 },
  { batch: 3, label: 'Lô 3', range: '101 - 150', count: 50 },
  { batch: 4, label: 'Lô 4', range: '151 - 174', count: 24 },
]

export const TARGET_22_SKUS = [
  'COOL-ARCTIC-LIQUID-FREEZER-III-240',
  'COOL-DEEPCOOL-AG400-ARGB',
  'COOL-DEEPCOOL-AK620-ZERO-DARK',
  'COOL-NOCTUA-NH-D15-CHROMAX',
  'CPU-AMD-R5-5500',
  'CPU-AMD-R5-5600',
  'CPU-AMD-R5-7600X',
  'CPU-AMD-R7-5700X3D',
  'CPU-AMD-R7-9700X',
  'CPU-AMD-R9-7900X',
  'CPU-INTEL-13400F',
  'CPU-INTEL-13600K',
  'CPU-INTEL-14400F',
  'CPU-INTEL-13700K',
  'CPU-INTEL-14100F',
  'MON-AOC-24G4-24-FHD',
  'MON-ASUS-TUF-VG279Q3A-27-FHD',
  'MOU-LOGI-MX-MASTER-3S',
  'PSU-CORSAIR-RM750E-750W',
  'SSD-ADATA-S70BLADE-1TB',
  'SSD-CRUCIAL-P3-1TB',
  'SSD-CRUCIAL-T500-1TB',
]

const LOCAL_STORAGE_REVIEW_KEY = 'pc_store_manual_image_reviews_v1'

const BATCH_RANGES = [
  { batch: 1, label: 'Lô 1', range: '1 - 50', count: 50 },
  { batch: 2, label: 'Lô 2', range: '51 - 100', count: 50 },
  { batch: 3, label: 'Lô 3', range: '101 - 150', count: 50 },
  { batch: 4, label: 'Lô 4', range: '151 - 200', count: 50 },
  { batch: 5, label: 'Lô 5', range: '201 - 250', count: 50 },
  { batch: 6, label: 'Lô 6', range: '251 - 300', count: 50 },
  { batch: 7, label: 'Lô 7', range: '301 - 325', count: 25 },
]

export default function ImagePreviewPage() {
  const [items, setItems] = useState<ImagePreviewItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<number | 'ALL'>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('TARGET_174') // Default to the 22 target SKUs
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL')
  const [manualFilter, setManualFilter] = useState<'ALL' | 'UNVERIFIED' | 'APPROVED' | 'REJECTED'>('ALL')
  const [activeModalItem, setActiveModalItem] = useState<ImagePreviewItem | null>(null)
  const [copiedSku, setCopiedSku] = useState<string | null>(null)
  const [copiedJson, setCopiedJson] = useState(false)
  const [modalNote, setModalNote] = useState('')

  // Manual reviews stored in localStorage
  const [manualReviews, setManualReviews] = useState<Record<string, ManualReviewRecord>>({})

  // Load manual reviews from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_REVIEW_KEY)
        if (saved) {
          const parsed = JSON.parse(saved)
          setManualReviews(parsed)
        }
      } catch (err) {
        console.error('Failed to load manual reviews from localStorage:', err)
      }
    }
  }, [])

  // Load master catalog preview data
  useEffect(() => {
    fetch('/images-preview-data.json')
      .then((res) => res.json())
      .then((data: ImagePreviewItem[]) => {
        setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load preview data:', err)
        setLoading(false)
      })
  }, [])

  // Handler to set decision for a SKU
  const handleSetDecision = useCallback(
    (sku: string, decision: ManualReviewDecision, note?: string) => {
      setManualReviews((prev) => {
        const next: Record<string, ManualReviewRecord> = {
          ...prev,
          [sku]: {
            decision,
            reviewedAt: new Date().toISOString(),
            note: note !== undefined ? note : prev[sku]?.note,
          },
        }
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_REVIEW_KEY, JSON.stringify(next))
          } catch (err) {
            console.error('Failed to save to localStorage:', err)
          }
        }
        return next
      })
    },
    []
  )

  // Reset all reviews
  const handleResetAllReviews = () => {
    if (
      typeof window !== 'undefined' &&
      window.confirm('Bạn có chắc muốn đặt lại toàn bộ tiến độ duyệt 22 sản phẩm về UNVERIFIED?')
    ) {
      setManualReviews({})
      localStorage.removeItem(LOCAL_STORAGE_REVIEW_KEY)
    }
  }

  const is174Mode = selectedStatus === 'TARGET_174'
  const is22Mode = selectedStatus === 'TARGET_22'

  const activeTargetSkus = useMemo(() => {
    if (is22Mode) return TARGET_22_SKUS
    if (is174Mode) return TARGET_174_SKUS
    return TARGET_174_SKUS
  }, [is22Mode, is174Mode])

  // Target items list
  const targetItems = useMemo(() => {
    return items.filter((i) => activeTargetSkus.includes(i.sku))
  }, [items, activeTargetSkus])

  // Decision counts for target SKUs
  const approvedCount = useMemo(() => {
    return activeTargetSkus.filter((sku) => manualReviews[sku]?.decision === 'APPROVED').length
  }, [manualReviews, activeTargetSkus])

  const rejectedCount = useMemo(() => {
    return activeTargetSkus.filter((sku) => manualReviews[sku]?.decision === 'REJECTED').length
  }, [manualReviews, activeTargetSkus])

  const unverifiedCount = useMemo(() => {
    return activeTargetSkus.length - approvedCount - rejectedCount
  }, [activeTargetSkus, approvedCount, rejectedCount])

  const activeBatchRanges = useMemo(() => {
    return is174Mode ? BATCH_174_RANGES : BATCH_RANGES
  }, [is174Mode])

  // All categories from data
  const categories = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.category) set.add(item.category)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [items])

  // All brands from data
  const brands = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => {
      if (item.brand) set.add(item.brand)
    })
    return ['ALL', ...Array.from(set).sort()]
  }, [items])

  // Multi-faceted filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter by Batch
      if (selectedBatch !== 'ALL' && item.batchNumber !== selectedBatch) {
        return false
      }

      // Filter by Category
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false
      }

      // Filter by Brand
      if (selectedBrand !== 'ALL' && item.brand !== selectedBrand) {
        return false
      }

      // Filter by Status Preset
      if (selectedStatus === 'TARGET_174') {
        if (!TARGET_174_SKUS.includes(item.sku)) return false
      } else if (selectedStatus === 'TARGET_22') {
        if (!TARGET_22_SKUS.includes(item.sku)) return false
      } else if (selectedStatus === 'REPLACED_V2') {
        if (!item.isReplaced) return false
      } else if (selectedStatus === 'READY_FOR_REVIEW') {
        const isReview =
          item.releaseStatus === 'READY_FOR_REVIEW' ||
          item.releaseStatus === 'LOCAL_PREVIEW_PENDING'
        if (!isReview) return false
      } else if (selectedStatus === 'ALREADY_PUBLISHED') {
        const isPublished =
          item.releaseStatus === 'ALREADY_PUBLISHED' ||
          item.releaseStatus === 'DEPLOYED_AND_SYNCED'
        if (!isPublished) return false
      } else if (selectedStatus === 'CANDIDATE') {
        if (item.verificationStatus !== 'CANDIDATE') return false
      } else if (selectedStatus === 'UNVERIFIED') {
        const isUnverified =
          item.verificationStatus === 'UNVERIFIED' ||
          item.releaseStatus === 'PLACEHOLDER' ||
          item.releaseStatus === 'UNVERIFIED' ||
          item.releaseStatus === 'NOT_DOWNLOADED' ||
          item.releaseStatus === 'UNVERIFIED_PLACEHOLDER'
        if (!isUnverified) return false
      }

      // Filter by Manual Review Decision
      if (manualFilter !== 'ALL') {
        const decision = manualReviews[item.sku]?.decision || 'UNVERIFIED'
        if (decision !== manualFilter) return false
      }

      // Filter by Search Query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchSku = item.sku.toLowerCase().includes(q)
        const matchName = item.productName.toLowerCase().includes(q)
        const matchBrand = item.brand.toLowerCase().includes(q)
        const matchCategory = item.category.toLowerCase().includes(q)
        const matchModel = item.modelSpecsMatch?.exactModel?.toLowerCase().includes(q) || false
        if (!matchSku && !matchName && !matchBrand && !matchCategory && !matchModel) {
          return false
        }
      }

      return true
    })
  }, [
    items,
    selectedBatch,
    selectedStatus,
    selectedCategory,
    selectedBrand,
    manualFilter,
    manualReviews,
    search,
  ])

  // Group filtered items into review sections
  const readyForReviewItems = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          i.releaseStatus === 'READY_FOR_REVIEW' ||
          i.releaseStatus === 'LOCAL_PREVIEW_PENDING'
      ),
    [filteredItems]
  )

  const alreadyPublishedItems = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          i.releaseStatus === 'ALREADY_PUBLISHED' ||
          i.releaseStatus === 'DEPLOYED_AND_SYNCED'
      ),
    [filteredItems]
  )

  const candidateItems = useMemo(
    () => filteredItems.filter((i) => i.verificationStatus === 'CANDIDATE'),
    [filteredItems]
  )

  const placeholderItems = useMemo(
    () =>
      filteredItems.filter(
        (i) =>
          (i.verificationStatus === 'UNVERIFIED' ||
            i.releaseStatus === 'PLACEHOLDER' ||
            i.releaseStatus === 'UNVERIFIED' ||
            i.releaseStatus === 'NOT_DOWNLOADED' ||
            i.releaseStatus === 'UNVERIFIED_PLACEHOLDER') &&
          i.verificationStatus !== 'CANDIDATE'
      ),
    [filteredItems]
  )

  const copySku = (sku: string) => {
    navigator.clipboard.writeText(sku)
    setCopiedSku(sku)
    setTimeout(() => setCopiedSku(null), 2000)
  }

  // JSON export payload builder
  const buildExportPayload = useCallback(() => {
    return {
      system: 'PC Store Image Pipeline',
      task: is174Mode ? 'Duyệt thủ công 174 sản phẩm bổ sung ảnh' : 'Duyệt thủ công 22 ảnh thay thế',
      exportedAt: new Date().toISOString(),
      totalTargetSkus: activeTargetSkus.length,
      summary: {
        total: activeTargetSkus.length,
        approved: approvedCount,
        rejected: rejectedCount,
        unverified: unverifiedCount,
        completionRate: `${Math.round(((approvedCount + rejectedCount) / activeTargetSkus.length) * 100)}%`,
      },
      reviews: activeTargetSkus.map((sku) => {
        const item = items.find((i) => i.sku === sku)
        const rec = manualReviews[sku]
        return {
          sku,
          productName: item?.productName || sku,
          brand: item?.brand || '',
          category: item?.category || '',
          replacementImageUrl: item?.publicUrl || '',
          replacementFilename: item?.savedFilename || '',
          oldImageUrl: item?.oldImageUrl || null,
          oldFilename: item?.oldFilename || null,
          rejectionReasonOld: item?.rejectionReason || null,
          partNumber: item?.modelSpecsMatch?.exactModel || '',
          sourcePageUrl: item?.sourcePageUrl || null,
          directImageUrl: item?.directImageUrl || null,
          matchingEvidence: item?.matchingEvidence || null,
          detectedFormat: item?.detectedFormat || '',
          fileSizeFormatted: item?.fileSizeFormatted || '',
          reviewStatus: rec?.decision || 'UNVERIFIED',
          reviewedAt: rec?.reviewedAt || null,
          reviewerNote: rec?.note || null,
        }
      }),
    }
  }, [items, manualReviews, approvedCount, rejectedCount, unverifiedCount])

  // Download JSON
  const handleExportJson = () => {
    const payload = buildExportPayload()
    const jsonStr = JSON.stringify(payload, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pc_store_manual_reviews_${is174Mode ? '174' : '22'}_skus_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    const payload = buildExportPayload()
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2500)
  }

  // Navigation inside modal (follows currently active filtered list, falling back to targetItems)
  const currentNavList = useMemo(() => {
    return filteredItems.length > 0 ? filteredItems : targetItems
  }, [filteredItems, targetItems])

  const modalIndex = useMemo(() => {
    if (!activeModalItem) return -1
    return currentNavList.findIndex((i) => i.sku === activeModalItem.sku)
  }, [activeModalItem, currentNavList])

  const handlePrevModalItem = useCallback(() => {
    if (modalIndex > 0) {
      setActiveModalItem(currentNavList[modalIndex - 1])
    }
  }, [modalIndex, currentNavList])

  const handleNextModalItem = useCallback(() => {
    if (modalIndex >= 0 && modalIndex < currentNavList.length - 1) {
      setActiveModalItem(currentNavList[modalIndex + 1])
    }
  }, [modalIndex, currentNavList])

  // Sync modal note when activeModalItem changes
  useEffect(() => {
    if (activeModalItem) {
      setModalNote(manualReviews[activeModalItem.sku]?.note || '')
    }
  }, [activeModalItem, manualReviews])

  // Keyboard shortcut listener for active modal
  useEffect(() => {
    if (!activeModalItem) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      if (e.key === 'a' || e.key === 'A' || e.key === '1') {
        e.preventDefault()
        handleSetDecision(activeModalItem.sku, 'APPROVED')
      } else if (e.key === 'r' || e.key === 'R' || e.key === '2') {
        e.preventDefault()
        handleSetDecision(activeModalItem.sku, 'REJECTED')
      } else if (e.key === 'u' || e.key === 'U' || e.key === '3') {
        e.preventDefault()
        handleSetDecision(activeModalItem.sku, 'UNVERIFIED')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevModalItem()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextModalItem()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setActiveModalItem(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeModalItem, handleSetDecision, handlePrevModalItem, handleNextModalItem])

  const totalCatalog = items.length
  const totalPublished = items.filter(
    (i) => i.releaseStatus === 'ALREADY_PUBLISHED' || i.releaseStatus === 'DEPLOYED_AND_SYNCED'
  ).length
  const totalReadyForReview = items.filter(
    (i) => i.releaseStatus === 'READY_FOR_REVIEW' || i.releaseStatus === 'LOCAL_PREVIEW_PENDING'
  ).length
  const totalCandidate = items.filter((i) => i.verificationStatus === 'CANDIDATE').length
  const totalDownloadFailed = items.filter((i) => i.releaseStatus === 'DOWNLOAD_FAILED').length
  const totalPlaceholder = items.filter(
    (i) =>
      (i.verificationStatus === 'UNVERIFIED' ||
        i.releaseStatus === 'PLACEHOLDER' ||
        i.releaseStatus === 'UNVERIFIED' ||
        i.releaseStatus === 'NOT_DOWNLOADED' ||
        i.releaseStatus === 'UNVERIFIED_PLACEHOLDER') &&
      i.releaseStatus !== 'DOWNLOAD_FAILED'
  ).length
  const totalReplaced = items.filter((i) => i.isReplaced).length

  // Batch navigation handlers
  const handlePrevBatch = () => {
    if (selectedBatch === 'ALL' || selectedBatch === 1) {
      setSelectedBatch(activeBatchRanges.length)
    } else {
      setSelectedBatch((prev) => (typeof prev === 'number' ? prev - 1 : 1))
    }
  }

  const handleNextBatch = () => {
    if (selectedBatch === 'ALL' || selectedBatch === activeBatchRanges.length) {
      setSelectedBatch(1)
    } else {
      setSelectedBatch((prev) => (typeof prev === 'number' ? prev + 1 : activeBatchRanges.length))
    }
  }

  return (
    <>
      <Head>
        <title>
          {is174Mode
            ? 'Duyệt Thủ Công 174 Sản Phẩm Bổ Sung Ảnh - PC Store'
            : 'Duyệt Thủ Công 22 Ảnh Thay Thế - PC Store'}
        </title>
        <meta
          name="description"
          content="Giao diện kiểm tra trực quan, so sánh song song và phê duyệt ảnh thay thế thủ công với lưu trữ an toàn localStorage."
        />
      </Head>

      <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-400 border border-indigo-800">
                  MANUAL REVIEW PIPELINE
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  QUY TRÌNH DUYỆT TRỰC QUAN • 174 SẢN PHẨM BỔ SUNG ẢNH (CHIA LÔ TỐI ĐA 50 SKU)
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white mt-2">
                Duyệt Thủ Công & Phê Duyệt Ảnh Thay Thế
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Lưu trữ cục bộ an toàn (`localStorage`) | Đối chiếu model/MPN song song trước khi xác nhận | Không tác động database live
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/products"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
              >
                ← Về Cửa Hàng
              </Link>
              <Link
                href="/admin"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
              >
                Trang Quản Trị
              </Link>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* BẢNG ĐIỀU KHIỂN DUYỆT THỦ CÔNG 22 SẢN PHẨM (MANUAL REVIEW CONSOLE) */}
          {/* ========================================================================= */}
          <div className="bg-slate-800/95 border-2 border-purple-500/60 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-purple-400 animate-pulse" />
                  <h2 className="text-xl font-bold text-white uppercase tracking-wide">
                    {is174Mode
                      ? 'Bảng Điều Khiển Duyệt Thủ Công 174 Sản Phẩm'
                      : 'Bảng Điều Khiển Duyệt Thủ Công 22 Ảnh Thay Thế'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-600">
                    {approvedCount + rejectedCount} / {activeTargetSkus.length} Hoàn Tất
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Mặc định mọi ảnh mới là <strong className="text-slate-400">UNVERIFIED</strong> cho đến khi bạn nhìn ảnh phóng to và bấm duyệt. Mọi thao tác lưu tức thì vào <code className="text-purple-300 font-mono">localStorage</code>.
                </p>
              </div>

              {/* Action Buttons: Export & Reset */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleExportJson}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                  title="Tải file JSON lưu trữ đầy đủ các lựa chọn duyệt của bạn"
                >
                  <span>📥 Xuất File JSON</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  title="Sao chép toàn bộ kết quả duyệt vào bộ nhớ tạm"
                >
                  <span>{copiedJson ? '✓ Đã Sao Chép!' : '📋 Sao Chép JSON'}</span>
                </button>
                <button
                  onClick={handleResetAllReviews}
                  className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-800 transition"
                  title="Xóa tiến độ và đặt lại về UNVERIFIED"
                >
                  🔄 Đặt Lại
                </button>
              </div>
            </div>

            {/* Metrics & Progress Bar */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 border border-slate-700 p-3.5 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block">Tổng SKU Cần Duyệt</span>
                  <div className="text-2xl font-bold text-white mt-1">{activeTargetSkus.length} SKU</div>
                  <span className="text-[11px] text-slate-500 font-mono">{is174Mode ? '174 SKU bổ sung ảnh' : '22 SKU đã thay thế'}</span>
                </div>

                <div className="bg-slate-900/90 border border-emerald-800/80 p-3.5 rounded-xl">
                  <span className="text-xs text-emerald-400 font-medium block flex items-center gap-1">
                    <span>✓ Đã Xác Nhận (APPROVED)</span>
                  </span>
                  <div className="text-2xl font-bold text-emerald-400 mt-1">{approvedCount} SKU</div>
                  <span className="text-[11px] text-emerald-500/80 font-mono">
                    {Math.round((approvedCount / (activeTargetSkus.length || 1)) * 100)}% danh sách
                  </span>
                </div>

                <div className="bg-slate-900/90 border border-rose-800/80 p-3.5 rounded-xl">
                  <span className="text-xs text-rose-400 font-medium block flex items-center gap-1">
                    <span>✗ Bị Từ Chối (REJECTED)</span>
                  </span>
                  <div className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount} SKU</div>
                  <span className="text-[11px] text-rose-500/80 font-mono">Cần tìm candidate khác</span>
                </div>

                <div className="bg-slate-900/90 border border-slate-700 p-3.5 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block flex items-center gap-1">
                    <span>○ Chưa Kiểm Tra (UNVERIFIED)</span>
                  </span>
                  <div className="text-2xl font-bold text-slate-300 mt-1">{unverifiedCount} SKU</div>
                  <span className="text-[11px] text-slate-500 font-mono">Đang chờ bạn mở xem</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 flex">
                <div
                  style={{ width: `${(approvedCount / (activeTargetSkus.length || 1)) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-300 h-full"
                  title={`Approved: ${approvedCount}`}
                />
                <div
                  style={{ width: `${(rejectedCount / (activeTargetSkus.length || 1)) * 100}%` }}
                  className="bg-rose-500 transition-all duration-300 h-full"
                  title={`Rejected: ${rejectedCount}`}
                />
                <div
                  style={{ width: `${(unverifiedCount / (activeTargetSkus.length || 1)) * 100}%` }}
                  className="bg-slate-800 transition-all duration-300 h-full"
                  title={`Unverified: ${unverifiedCount}`}
                />
              </div>
            </div>

            {/* Manual Decision Filter Pills */}
            <div className="flex items-center justify-between pt-2 flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-slate-400 font-medium whitespace-nowrap">Lọc theo kết quả duyệt:</span>
                <button
                  onClick={() => setManualFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    manualFilter === 'ALL'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Tất cả trạng thái ({activeTargetSkus.length})
                </button>
                <button
                  onClick={() => setManualFilter('UNVERIFIED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    manualFilter === 'UNVERIFIED'
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  ○ Chưa kiểm tra ({unverifiedCount})
                </button>
                <button
                  onClick={() => setManualFilter('APPROVED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    manualFilter === 'APPROVED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-emerald-400 hover:bg-slate-700'
                  }`}
                >
                  ✓ Đã duyệt ({approvedCount})
                </button>
                <button
                  onClick={() => setManualFilter('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    manualFilter === 'REJECTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-900 text-rose-400 hover:bg-slate-700'
                  }`}
                >
                  ✗ Đã từ chối ({rejectedCount})
                </button>
              </div>

              {selectedStatus !== 'TARGET_22' && (
                <button
                  onClick={() => setSelectedStatus('TARGET_22')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-700 hover:bg-indigo-900 font-bold transition text-xs flex items-center gap-1"
                >
                  🎯 Quay lại chế độ chỉ xem 22 SKU
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Grid for Catalog */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-slate-400 font-medium">Tổng Catalog</div>
              <div className="text-2xl font-bold text-white mt-1">{totalCatalog} SKU</div>
              <div className="text-xs text-slate-500 mt-1">7 Lô Duyệt (50 SKU/Lô)</div>
            </div>

            <div className="bg-slate-800/80 border border-indigo-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-indigo-400 font-medium">Ứng Viên Chờ Duyệt</div>
              <div className="text-2xl font-bold text-indigo-400 mt-1">{totalReadyForReview} SKU</div>
              <div className="text-xs text-indigo-500 mt-1">
                27 Đã duyệt + {Math.max(0, totalReadyForReview - 27)} Staging mới
              </div>
            </div>

            <div className="bg-slate-800/80 border border-emerald-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-emerald-400 font-medium">Đã Đồng Bộ Live</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{totalPublished} SKU</div>
              <div className="text-xs text-emerald-600 mt-1">7 Gốc + 25 Ngoại vi + 19 RAM</div>
            </div>

            <div className="bg-slate-800/80 border border-amber-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-amber-400 font-medium">Ứng Viên Cần Part No</div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{totalCandidate} SKU</div>
              <div className="text-xs text-amber-600 mt-1">RAM-DDR5-16GB (Generic)</div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 shadow-sm col-span-2 md:col-span-1">
              <div className="text-xs text-slate-400 font-medium">Dùng Placeholder SVG</div>
              <div className="text-2xl font-bold text-slate-300 mt-1">{totalPlaceholder} SKU</div>
              <div className="text-xs text-slate-500 mt-1">231 Backlog + 6 Mẫu Seed</div>
            </div>
          </div>

          {/* Batch Selector Toolbar */}
          <div className="bg-slate-800/90 border border-indigo-500/30 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <h2 className="text-base font-bold text-white uppercase tracking-wide">
                  {is174Mode
                    ? 'Phân Lô 174 Sản Phẩm Cần Duyệt (4 Lô - Tối Đa 50 SKU / Lô)'
                    : 'Phân Lô Toàn Catalog (50 Sản Phẩm Mỗi Lô)'}
                </h2>
                {selectedBatch !== 'ALL' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                    Đang xem: Lô {selectedBatch}
                  </span>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevBatch}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                >
                  ← Lô trước
                </button>
                <button
                  onClick={handleNextBatch}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1"
                >
                  Lô tiếp theo →
                </button>
              </div>
            </div>

            {/* Batch Pill Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedBatch('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border whitespace-nowrap ${
                  selectedBatch === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/50'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span>Toàn Bộ ({is174Mode ? targetItems.length : totalCatalog} SKU)</span>
              </button>

              {activeBatchRanges.map((b) => {
                const isActive = selectedBatch === b.batch
                const batchItems = (is174Mode ? targetItems : items).filter((i) => i.batchNumber === b.batch)
                const reviewCount = batchItems.filter(
                  (i) =>
                    i.releaseStatus === 'READY_FOR_REVIEW' ||
                    i.releaseStatus === 'LOCAL_PREVIEW_PENDING'
                ).length
                const publishedCount = batchItems.filter(
                  (i) =>
                    i.releaseStatus === 'ALREADY_PUBLISHED' ||
                    i.releaseStatus === 'DEPLOYED_AND_SYNCED'
                ).length

                return (
                  <button
                    key={b.batch}
                    onClick={() => setSelectedBatch(b.batch)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition flex flex-col items-start gap-0.5 border whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-900/50'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{b.label}</span>
                      <span className="text-[10px] opacity-80 font-mono">({b.range})</span>
                    </div>
                    <div className="text-[10px] opacity-75 font-mono flex items-center gap-1">
                      {reviewCount > 0 && (
                        <span className="text-amber-300 font-bold">{reviewCount} Chờ</span>
                      )}
                      {reviewCount > 0 && publishedCount > 0 && <span>•</span>}
                      {publishedCount > 0 && (
                        <span className="text-emerald-300">{publishedCount} Live</span>
                      )}
                      {reviewCount === 0 && publishedCount === 0 && <span>Chưa có ảnh</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search box */}
              <div className="w-full lg:w-96 relative">
                <input
                  type="text"
                  placeholder="Tìm theo SKU, tên sản phẩm, hãng, part number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status filter buttons */}
              <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto">
                <button
                  onClick={() => { setSelectedStatus('TARGET_174'); setSelectedBatch('ALL'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                    selectedStatus === 'TARGET_174'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-2 ring-indigo-400'
                      : 'bg-indigo-950/80 text-indigo-300 border-indigo-700 hover:bg-indigo-900'
                  }`}
                >
                  🎯 174 SKU Cần Duyệt ({TARGET_174_SKUS.length})
                </button>
                <button
                  onClick={() => { setSelectedStatus('TARGET_22'); setSelectedBatch('ALL'); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap border ${
                    selectedStatus === 'TARGET_22'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md ring-2 ring-purple-400'
                      : 'bg-purple-950/80 text-purple-300 border-purple-700 hover:bg-purple-900'
                  }`}
                >
                  🎯 22 SKU Đã Duyệt ({TARGET_22_SKUS.length})
                </button>
                <button
                  onClick={() => setSelectedStatus('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'ALL'
                      ? 'bg-slate-100 text-slate-900 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Tất cả ({items.length})
                </button>
                <button
                  onClick={() => setSelectedStatus('READY_FOR_REVIEW')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'READY_FOR_REVIEW'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-900 text-indigo-400 hover:bg-slate-700'
                  }`}
                >
                  🚀 Chờ Duyệt ({totalReadyForReview})
                </button>
                <button
                  onClick={() => setSelectedStatus('REPLACED_V2')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'REPLACED_V2'
                      ? 'bg-purple-600 text-white font-bold ring-2 ring-purple-400'
                      : 'bg-purple-950/80 text-purple-300 border border-purple-700 hover:bg-purple-900'
                  }`}
                >
                  🔄 Tất cả V2 ({totalReplaced})
                </button>
                <button
                  onClick={() => setSelectedStatus('ALREADY_PUBLISHED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'ALREADY_PUBLISHED'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-900 text-emerald-400 hover:bg-slate-700'
                  }`}
                >
                  🌐 Đã Đồng Bộ Live ({totalPublished})
                </button>
                <button
                  onClick={() => setSelectedStatus('CANDIDATE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'CANDIDATE'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-900 text-amber-400 hover:bg-slate-700'
                  }`}
                >
                  ⚠️ Candidate ({totalCandidate})
                </button>
                <button
                  onClick={() => setSelectedStatus('UNVERIFIED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                    selectedStatus === 'UNVERIFIED'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  📁 Placeholder SVG ({totalPlaceholder})
                </button>
                {totalDownloadFailed > 0 && (
                  <button
                    onClick={() => setSelectedStatus('DOWNLOAD_FAILED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                      selectedStatus === 'DOWNLOAD_FAILED'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-slate-900 text-rose-400 hover:bg-slate-700'
                    }`}
                  >
                    ❌ Tải Lỗi ({totalDownloadFailed})
                  </button>
                )}
              </div>
            </div>

            {/* Category and Brand Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Danh mục:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả danh mục ({categories.length - 1} danh mục)</option>
                  {categories
                    .filter((c) => c !== 'ALL')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({items.filter((i) => i.category === cat).length})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Thương hiệu:</label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Tất cả thương hiệu ({brands.length - 1} hãng)</option>
                  {brands
                    .filter((b) => b !== 'ALL')
                    .map((brand) => (
                      <option key={brand} value={brand}>
                        {brand} ({items.filter((i) => i.brand === brand).length})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Counter & Active Filter Summary */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Hiển thị <span className="font-semibold text-slate-200">{filteredItems.length}</span> /{' '}
                {items.length} sản phẩm
              </span>
              {selectedStatus === 'TARGET_22' && (
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700 font-mono font-bold">
                  22 SKU Target
                </span>
              )}
              {manualFilter !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  Duyệt: {manualFilter}
                </span>
              )}
              {selectedBatch !== 'ALL' && (
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  Lô {selectedBatch}
                </span>
              )}
            </div>
            {copiedSku && (
              <div className="text-emerald-400 font-mono animate-fade-in font-bold">
                ✓ Đã sao chép SKU: {copiedSku}
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="text-center py-20 text-slate-400 font-medium">
              Đang tải dữ liệu master inventory...
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 1: NHÓM ỨNG VIÊN CHỜ DUYỆT (READY_FOR_REVIEW) */}
          {/* ========================================================================= */}
          {readyForReviewItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-700/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
                  <h2 className="text-xl font-bold text-white">
                    {selectedStatus === 'TARGET_22'
                      ? `22 Sản Phẩm Đang Chờ Bạn Duyệt Trực Quan (${readyForReviewItems.length} SKU)`
                      : `Nhóm Ứng Viên Chờ Người Dùng Duyệt Phát Hành (${readyForReviewItems.length} SKU)`}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-600">
                    READY_FOR_REVIEW
                  </span>
                </div>
                <span className="text-xs text-indigo-400 font-mono">
                  Nhấp vào ảnh để mở so sánh ảnh cũ vs ảnh mới
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {readyForReviewItems.map((item) => renderProductCard(item))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: NHÓM SẢN PHẨM ĐÃ PHÁT HÀNH & ĐỒNG BỘ LIVE (ALREADY_PUBLISHED) */}
          {/* ========================================================================= */}
          {alreadyPublishedItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <h2 className="text-xl font-bold text-white">
                    Ảnh Thật Đã Phát Hành & Đồng Bộ Live ({alreadyPublishedItems.length} SKU)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-700">
                    ALREADY_PUBLISHED
                  </span>
                </div>
                <span className="text-xs text-emerald-500 font-mono">
                  Đang hoạt động trên Production
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alreadyPublishedItems.map((item) => renderProductCard(item))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: NHÓM ỨNG VIÊN CẦN XÉT DUYỆT RIÊNG (CANDIDATE) */}
          {/* ========================================================================= */}
          {candidateItems.length > 0 && (
            <div className="bg-amber-950/20 border-2 border-amber-600/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-800/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-900 text-amber-200 border border-amber-600 uppercase">
                    Ứng Viên Chờ Bổ Sung MPN
                  </span>
                  <h2 className="text-xl font-bold text-amber-200">
                    Nhóm Candidate Cần Xác Minh Thêm ({candidateItems.length} SKU)
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidateItems.map((item) => renderProductCard(item))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: NHÓM DÙNG PLACEHOLDER SVG */}
          {/* ========================================================================= */}
          {placeholderItems.length > 0 && (
            <div className="space-y-4 opacity-75 hover:opacity-100 transition">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full bg-slate-600" />
                  <h2 className="text-xl font-bold text-slate-300">
                    Sản Phẩm Chưa Thu Thập Ảnh ({placeholderItems.length} SKU)
                  </h2>
                </div>
                <span className="text-xs text-slate-500 font-mono">Đang dùng placeholder SVG</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {placeholderItems.map((item) => renderProductCard(item))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL LIGHTBOX SO SÁNH ẢNH & DUYỆT THỦ CÔNG */}
        {/* ========================================================================= */}
        {activeModalItem && (
          <div
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setActiveModalItem(null)}
          >
            <div
              className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-5xl w-full max-h-[95vh] overflow-y-auto p-6 space-y-5 shadow-2xl my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {modalIndex >= 0 && (
                      <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-600">
                        Sản phẩm {modalIndex + 1} / {targetItems.length}
                      </span>
                    )}
                    {activeModalItem.batchNumber && (
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                        {activeModalItem.batchLabel || `Lô ${activeModalItem.batchNumber}`}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {activeModalItem.brand}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">
                      {activeModalItem.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{activeModalItem.productName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-indigo-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      SKU: {activeModalItem.sku}
                    </span>
                    {activeModalItem.modelSpecsMatch?.exactModel && (
                      <span className="text-xs text-amber-300 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        MPN / Model: {activeModalItem.modelSpecsMatch.exactModel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Previous & Next item shortcuts in target list */}
                  {modalIndex >= 0 && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        onClick={handlePrevModalItem}
                        disabled={modalIndex <= 0}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition"
                        title="Sản phẩm trước (Phím ←)"
                      >
                        ← Trước
                      </button>
                      <button
                        onClick={handleNextModalItem}
                        disabled={modalIndex >= targetItems.length - 1}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 transition"
                        title="Sản phẩm tiếp theo (Phím →)"
                      >
                        Sau →
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setActiveModalItem(null)}
                    className="text-slate-400 hover:text-white text-2xl px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
                    title="Đóng (Phím Esc)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Side-by-side Large Image Comparison Frame */}
              {activeModalItem.isReplaced && activeModalItem.oldImageUrl ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Old Rejected Candidate */}
                  <div className="bg-slate-950 rounded-2xl p-4 flex flex-col items-center border-2 border-rose-900/80 shadow-lg">
                    <span className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      ❌ Ảnh Cũ Đã Hủy (REJECTED)
                    </span>
                    <div className="flex-1 flex items-center justify-center min-h-[300px] w-full bg-slate-900/40 rounded-xl p-3 border border-rose-950">
                      <img
                        src={activeModalItem.oldImageUrl}
                        alt="Ảnh cũ bị từ chối"
                        className="max-h-[300px] max-w-full object-contain opacity-80"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-rose-300 mt-2 line-through block truncate max-w-full">
                      {activeModalItem.oldFilename}
                    </span>
                    <div className="text-[11px] text-slate-300 mt-2 text-left bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60 w-full">
                      <strong className="text-rose-400">Lý do từ chối:</strong> {activeModalItem.rejectionReason}
                    </div>
                  </div>

                  {/* Right Column: New Replacement Candidate */}
                  <div className="bg-slate-950 rounded-2xl p-4 flex flex-col items-center border-2 border-emerald-600/90 shadow-xl">
                    <span className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                      ✅ Ứng Viên Thay Thế Mới (READY_FOR_REVIEW)
                    </span>
                    <div className="flex-1 flex items-center justify-center min-h-[300px] w-full bg-slate-900/40 rounded-xl p-3 border border-emerald-950">
                      <img
                        src={activeModalItem.publicUrl}
                        alt="Ứng viên thay thế V2"
                        className="max-h-[300px] max-w-full object-contain"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-emerald-300 mt-2 font-bold block truncate max-w-full">
                      {activeModalItem.savedFilename}
                    </span>
                    <div className="text-[11px] text-slate-300 mt-2 text-left bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-900/60 w-full">
                      <strong className="text-emerald-400">Căn cứ xác minh:</strong> {activeModalItem.matchingEvidence}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-slate-950 rounded-2xl p-6 flex items-center justify-center min-h-[350px]">
                  <img
                    src={activeModalItem.publicUrl}
                    alt={activeModalItem.productName}
                    className="max-h-[500px] max-w-full object-contain"
                  />
                </div>
              )}

              {/* Technical File Metadata Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
                <div>
                  <span className="text-slate-500">Độ phân giải:</span>
                  <div className="text-slate-200 font-bold">{activeModalItem.resolutionFormatted}</div>
                </div>
                <div>
                  <span className="text-slate-500">Dung lượng:</span>
                  <div className="text-emerald-400 font-bold">{activeModalItem.fileSizeFormatted}</div>
                </div>
                <div>
                  <span className="text-slate-500">Định dạng file:</span>
                  <div className="text-indigo-300 uppercase font-bold">{activeModalItem.detectedFormat}</div>
                </div>
                <div>
                  <span className="text-slate-500">Đường dẫn staging:</span>
                  <div className="text-slate-300 truncate">{activeModalItem.savedFilename || 'Chưa tải (SVG)'}</div>
                </div>
              </div>

              {/* =================================================================== */}
              {/* MANUAL REVIEW DECISION BAR (THAO TÁC DUYỆT TRỰC TIẾP TRONG MODAL) */}
              {/* =================================================================== */}
              {(() => {
                const curDecision = manualReviews[activeModalItem.sku]?.decision || 'UNVERIFIED'
                return (
                  <div className="bg-slate-950 p-4 rounded-2xl border-2 border-indigo-500/50 space-y-3 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-2">
                          <span>Quyết định duyệt trực quan:</span>
                          {curDecision === 'APPROVED' && (
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 shadow animate-fade-in">
                              ✓ ĐÃ XÁC NHẬN (APPROVED)
                            </span>
                          )}
                          {curDecision === 'REJECTED' && (
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-950 text-rose-300 border border-rose-500 shadow animate-fade-in">
                              ✗ ĐÃ TỪ CHỐI (REJECTED)
                            </span>
                          )}
                          {curDecision === 'UNVERIFIED' && (
                            <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              ○ CHƯA DUYỆT (UNVERIFIED)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Lưu ngay vào `localStorage`. Phím tắt: <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200 font-mono">A</kbd> Duyệt, <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200 font-mono">R</kbd> Từ chối, <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-200 font-mono">→</kbd> Tiếp tục.
                        </p>
                      </div>

                      {/* Review Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleSetDecision(activeModalItem.sku, 'APPROVED', modalNote)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow ${
                            curDecision === 'APPROVED'
                              ? 'bg-emerald-600 text-white border-emerald-400 ring-2 ring-emerald-400 shadow-emerald-950'
                              : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          ✓ Xác nhận đúng model (APPROVED)
                        </button>
                        <button
                          onClick={() => handleSetDecision(activeModalItem.sku, 'REJECTED', modalNote)}
                          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border shadow ${
                            curDecision === 'REJECTED'
                              ? 'bg-rose-600 text-white border-rose-400 ring-2 ring-rose-400 shadow-rose-950'
                              : 'bg-rose-950 hover:bg-rose-900 text-rose-300 border-rose-700'
                          }`}
                        >
                          ✗ Từ chối ảnh này (REJECTED)
                        </button>
                        {curDecision !== 'UNVERIFIED' && (
                          <button
                            onClick={() => handleSetDecision(activeModalItem.sku, 'UNVERIFIED')}
                            className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-800 transition"
                            title="Xóa lựa chọn, đưa về Chưa duyệt"
                          >
                            Đặt lại
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Optional Note Input */}
                    <div className="pt-2 border-t border-slate-900 flex items-center gap-2">
                      <label className="text-[11px] text-slate-400 whitespace-nowrap">Ghi chú đối chiếu:</label>
                      <input
                        type="text"
                        placeholder="Nhập ghi chú nhận xét hoặc lý do từ chối (tùy chọn)..."
                        value={modalNote}
                        onChange={(e) => {
                          setModalNote(e.target.value)
                          handleSetDecision(activeModalItem.sku, curDecision, e.target.value)
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                )
              })()}

              {/* Source Links in Modal Footer */}
              <div className="flex items-center justify-between pt-2 text-xs border-t border-slate-800">
                <div className="flex items-center gap-4 flex-wrap">
                  {activeModalItem.sourcePageUrl && (
                    <a
                      href={activeModalItem.sourcePageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
                    >
                      Trang sản phẩm gốc ↗
                    </a>
                  )}
                  {activeModalItem.directImageUrl && (
                    <a
                      href={activeModalItem.directImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-slate-200 hover:underline flex items-center gap-1"
                    >
                      URL ảnh trực tiếp ↗
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {modalIndex >= 0 && modalIndex < targetItems.length - 1 && (
                    <button
                      onClick={handleNextModalItem}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-1"
                    >
                      Duyệt tiếp theo →
                    </button>
                  )}
                  <button
                    onClick={() => setActiveModalItem(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  // =========================================================================
  // Product Card Renderer with Manual Review Actions
  // =========================================================================
  function renderProductCard(item: ImagePreviewItem) {
    const isTarget = is174Mode
      ? TARGET_174_SKUS.includes(item.sku)
      : TARGET_22_SKUS.includes(item.sku)
    const isUnverifiedSeed =
      item.releaseStatus === 'UNVERIFIED' || item.verificationStatus === 'UNVERIFIED'
    const manualDecision: ManualReviewDecision = manualReviews[item.sku]?.decision || 'UNVERIFIED'

    const isReadyForReview =
      item.releaseStatus === 'READY_FOR_REVIEW' ||
      item.releaseStatus === 'LOCAL_PREVIEW_PENDING'
    const isAlreadyPublished =
      item.releaseStatus === 'ALREADY_PUBLISHED' ||
      item.releaseStatus === 'DEPLOYED_AND_SYNCED'
    const isCandidate = item.verificationStatus === 'CANDIDATE'
    const isUnverified =
      !isReadyForReview && !isAlreadyPublished && !isCandidate

    return (
      <div
        key={item.sku}
        className={`flex flex-col bg-slate-800/90 rounded-2xl border-2 transition overflow-hidden shadow-lg ${
          manualDecision === 'APPROVED'
            ? 'border-emerald-500/90 shadow-emerald-950/40 ring-1 ring-emerald-500/30'
            : manualDecision === 'REJECTED'
            ? 'border-rose-500/90 shadow-rose-950/40 ring-1 ring-rose-500/30'
            : isUnverifiedSeed
            ? 'border-amber-800/70 bg-amber-950/10'
            : isTarget
            ? 'border-purple-600/70 hover:border-purple-400 shadow-purple-950/30'
            : isReadyForReview
            ? 'border-indigo-500/70 hover:border-indigo-400 shadow-indigo-950/30'
            : isAlreadyPublished
            ? 'border-emerald-700/70 hover:border-emerald-500 shadow-emerald-950/30'
            : isCandidate
            ? 'border-amber-700/80 bg-amber-950/20 hover:border-amber-500'
            : 'border-slate-700/60 hover:border-slate-600'
        }`}
      >
        {/* Image Frame with Click to Open Modal */}
        <div
          className="relative w-full h-64 bg-slate-950 flex items-center justify-center p-4 border-b border-slate-700/60 group cursor-pointer"
          onClick={() => setActiveModalItem(item)}
        >
          <img
            src={item.publicUrl || '/images/products/placeholders/cpu.svg'}
            alt={item.productName}
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />

          {/* Top-Left Status Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {/* Manual Review Badge */}
            {manualDecision === 'APPROVED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md shadow-emerald-950">
                ✓ ĐÃ DUYỆT (APPROVED)
              </span>
            )}
            {manualDecision === 'REJECTED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-md shadow-rose-950">
                ✗ ĐÃ TỪ CHỐI (REJECTED)
              </span>
            )}
            {manualDecision === 'UNVERIFIED' && isTarget && !isUnverifiedSeed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-500 shadow animate-pulse">
                🎯 CHỜ BẠN DUYỆT
              </span>
            )}
            {isUnverifiedSeed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/95 text-amber-300 border border-amber-600 shadow">
                ○ MẪU SEED (UNVERIFIED)
              </span>
            )}

            {!isTarget && isReadyForReview && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/95 text-indigo-300 border border-indigo-500 shadow">
                🚀 CHỜ DUYỆT
              </span>
            )}
            {isAlreadyPublished && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/95 text-emerald-400 border border-emerald-600 shadow">
                ● ĐÃ ĐỒNG BỘ LIVE
              </span>
            )}
            {isCandidate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/95 text-amber-300 border border-amber-600 shadow">
                ▲ CANDIDATE
              </span>
            )}
            {isUnverified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/95 text-slate-400 border border-slate-700 shadow">
                ○ PLACEHOLDER
              </span>
            )}
          </div>

          {/* Top-Right: Batch & Format */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {item.batchNumber && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/90 text-indigo-300 border border-indigo-700 font-bold">
                Lô {item.batchNumber}
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-900/90 text-slate-300 border border-slate-700 uppercase font-semibold">
              {item.detectedFormat}
            </span>
          </div>

          {/* Hover hint */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <span className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 text-xs font-bold text-white border border-slate-600 shadow-xl">
              🔍 Mở so sánh song song & duyệt
            </span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Category & Brand tags */}
            <div className="flex items-center justify-between text-xs">
              <span className="px-2.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-medium">
                {item.category}
              </span>
              <span className="font-bold text-indigo-400">{item.brand}</span>
            </div>

            {/* Product Name */}
            <h3 className="font-bold text-base text-white line-clamp-2 leading-snug">
              {item.productName}
            </h3>

            {/* SKU with copy */}
            <div className="flex items-center justify-between bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <span className="font-mono text-xs text-slate-300 truncate">{item.sku}</span>
              <button
                onClick={() => copySku(item.sku)}
                className="text-xs text-indigo-400 hover:text-indigo-300 ml-2 whitespace-nowrap font-medium"
              >
                Copy
              </button>
            </div>

            {/* File Technical Stats */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500">File:</span>{' '}
                <span className="font-mono text-slate-300 truncate block">
                  {item.savedFilename || 'Chưa tải (SVG)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Dung lượng:</span>{' '}
                <span className="font-mono text-emerald-400 font-bold block">
                  {item.fileSizeFormatted}
                </span>
              </div>
            </div>

            {/* Model Matching Evidence */}
            {(item.modelSpecsMatch || item.matchingEvidence) && (
              <div className="space-y-2 text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
                {item.modelSpecsMatch?.exactModel && (
                  <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>Part Number:</span>
                    <span className="font-mono text-indigo-300 font-bold">
                      {item.modelSpecsMatch.exactModel}
                    </span>
                  </div>
                )}

                {item.matchingEvidence && (
                  <div className="text-slate-400 leading-relaxed text-[11px] pt-0.5">
                    <span className="text-slate-300 font-medium">Bằng chứng: </span>
                    {item.matchingEvidence}
                  </div>
                )}
              </div>
            )}

            {/* Replaced item notification */}
            {item.isReplaced && item.rejectionReason && (
              <div className="text-xs bg-purple-950/60 border border-purple-800/80 text-purple-200 p-2.5 rounded-xl space-y-1">
                <div className="font-bold text-purple-300 flex items-center gap-1">
                  <span>🔄 Đã thay thế candidate cũ bị REJECTED:</span>
                </div>
                {item.oldFilename && (
                  <div className="text-slate-400 font-mono text-[10px]">
                    File cũ: <span className="line-through text-rose-300">{item.oldFilename}</span>
                  </div>
                )}
                <div className="text-slate-300 text-[11px] leading-tight">
                  {item.rejectionReason}
                </div>
              </div>
            )}
          </div>

          {/* Quick Manual Review Action Bar on Product Card */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 font-medium">Duyệt thủ công:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetDecision(item.sku, 'APPROVED')
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition border flex items-center gap-1 ${
                    manualDecision === 'APPROVED'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow'
                      : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                  }`}
                  title="Xác nhận đúng model"
                >
                  ✓ Duyệt
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleSetDecision(item.sku, 'REJECTED')
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition border flex items-center gap-1 ${
                    manualDecision === 'REJECTED'
                      ? 'bg-rose-600 text-white border-rose-400 shadow'
                      : 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800'
                  }`}
                  title="Từ chối ảnh này"
                >
                  ✗ Từ chối
                </button>
                {manualDecision !== 'UNVERIFIED' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSetDecision(item.sku, 'UNVERIFIED')
                    }}
                    className="px-1.5 py-1 rounded text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700 hover:bg-slate-700 transition"
                    title="Đặt lại về Chưa duyệt"
                  >
                    ○
                  </button>
                )}
              </div>
            </div>

            {/* Source Links */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/80">
              {item.sourcePageUrl ? (
                <a
                  href={item.sourcePageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
                >
                  Trang gốc ↗
                </a>
              ) : (
                <span className="text-slate-500">Chưa có link ngoài</span>
              )}

              <button
                onClick={() => setActiveModalItem(item)}
                className="text-slate-400 hover:text-white font-medium hover:underline text-xs"
              >
                Mở so sánh ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
