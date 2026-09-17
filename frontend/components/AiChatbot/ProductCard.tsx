import Link from 'next/link'
import type { AiProduct } from './types'

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function ProductCard({ product }: { product: AiProduct }) {
  const hasSale = typeof product.salePrice === 'number' && product.salePrice < product.price
  const displayPrice = hasSale ? (product.salePrice as number) : product.price
  const discountPercent =
    hasSale && product.price > 0
      ? Math.round(((product.price - (product.salePrice as number)) / product.price) * 100)
      : 0

  const inStock = product.stock > 0

  return (
    <div className="flex w-44 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:w-48">
      {/* Product Image / Initials */}
      <div className="relative flex h-28 w-full items-center justify-center bg-slate-50 p-2 sm:h-32">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 text-lg font-black text-blue-700">
            {product.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        {discountPercent > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            -{discountPercent}%
          </span>
        )}

        <span
          className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
            inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}
        >
          {inStock ? `Còn ${product.stock}` : 'Hết hàng'}
        </span>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col p-3">
        <h4 className="line-clamp-2 min-h-[32px] text-xs font-semibold text-slate-800" title={product.name}>
          {product.name}
        </h4>

        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-black text-blue-700">
            {formatPrice(displayPrice)}
          </span>
          {hasSale && (
            <span className="text-[11px] text-slate-400 line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <Link
            href={`/products/${encodeURIComponent(product.slug)}`}
            className="flex w-full items-center justify-center rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`Xem sản phẩm ${product.name}`}
          >
            <span>Xem sản phẩm</span>
            <svg
              className="ml-1 h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}

