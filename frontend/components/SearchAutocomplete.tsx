import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ProductImageFallback } from './ProductImageFallback'
import { API_BASE_URL } from '../lib/cart'

export type AutocompleteProduct = {
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice?: number | null
  stock: number
  category?: { id: string; name: string; slug: string } | null
  brand?: { id: string; name: string; slug: string } | null
  images?: Array<{ url: string; alt?: string | null; sortOrder?: number | null }>
}

type SearchAutocompleteProps = {
  variant?: 'desktop' | 'mobile' | 'drawer'
  idPrefix?: string
  placeholder?: string
  onNavigate?: () => void
}

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

export function SearchAutocomplete({
  variant = 'desktop',
  idPrefix = 'header-search',
  placeholder = 'Bạn cần tìm gì? (Nhập tên sản phẩm, SKU, hãng...)',
  onNavigate,
}: SearchAutocompleteProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [products, setProducts] = useState<AutocompleteProduct[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef<number>(0)
  const isUserTypingRef = useRef<boolean>(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync with router.query.search when navigating
  useEffect(() => {
    if (typeof router.query.search === 'string') {
      setQuery(router.query.search)
    } else if (!router.query.search) {
      setQuery('')
    }
  }, [router.query.search])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
    }
  }, [closeDropdown])

  // Fetch suggestions with debounce and race-condition safety
  const fetchSuggestions = useCallback(
    (searchKeyword: string) => {
      const trimmed = searchKeyword.trim()
      if (trimmed.length < 2) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
          abortControllerRef.current = null
        }
        setProducts([])
        setTotal(0)
        setIsLoading(false)
        setErrorMessage('')
        closeDropdown()
        return
      }

      // Abort any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      const controller = new AbortController()
      abortControllerRef.current = controller
      const currentRequestId = ++requestIdRef.current

      setIsLoading(true)
      setErrorMessage('')
      setIsOpen(true)
      setSelectedIndex(-1)

      const endpoint = `${API_BASE_URL}/api/products?search=${encodeURIComponent(trimmed)}&limit=8`

      fetch(endpoint, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
        .then(async (res) => {
          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { message?: string }
            throw new Error(errJson.message || 'Không thể tải kết quả gợi ý')
          }
          return res.json() as Promise<{
            success: boolean
            data: AutocompleteProduct[]
            pagination?: { total: number }
          }>
        })
        .then((payload) => {
          if (requestIdRef.current !== currentRequestId) return
          const items = payload.data ?? []
          setProducts(items)
          setTotal(payload.pagination?.total ?? items.length)
          setIsLoading(false)
        })
        .catch((err: Error) => {
          if (err.name === 'AbortError') return
          if (requestIdRef.current !== currentRequestId) return
          setProducts([])
          setTotal(0)
          setIsLoading(false)
          setErrorMessage(err.message || 'Lỗi kết nối khi tải gợi ý')
        })
    },
    [closeDropdown],
  )

  // Handle typing with 300ms debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    isUserTypingRef.current = true

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (val.trim().length < 2) {
      fetchSuggestions(val)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(val)
    }, 300)
  }

  // Clear query button
  const handleClear = () => {
    setQuery('')
    setProducts([])
    setTotal(0)
    setIsLoading(false)
    setErrorMessage('')
    closeDropdown()
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    if (abortControllerRef.current) abortControllerRef.current.abort()
    inputRef.current?.focus()
  }

  // Submit full search
  const navigateToSearch = useCallback(
    (searchVal?: string) => {
      const term = (searchVal !== undefined ? searchVal : query).trim()
      closeDropdown()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()

      if (!term) {
        void router.push('/products')
      } else {
        void router.push(`/products?search=${encodeURIComponent(term)}`)
      }
      onNavigate?.()
    },
    [closeDropdown, onNavigate, query, router],
  )

  // Navigate to product detail
  const navigateToProduct = useCallback(
    (slug: string) => {
      closeDropdown()
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
      void router.push(`/products/${slug}`)
      onNavigate?.()
    },
    [closeDropdown, onNavigate, router],
  )

  // Total selectable items: products + 1 ("Xem tất cả kết quả") if products exist
  const totalOptions = products.length > 0 ? products.length + 1 : 0
  const viewAllIndex = products.length // index for "Xem tất cả"

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      closeDropdown()
      return
    }

    if (!isOpen || totalOptions === 0) {
      if (e.key === 'Enter') {
        e.preventDefault()
        navigateToSearch()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1 >= totalOptions ? 0 : prev + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev <= 0 ? totalOptions - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0 && selectedIndex < products.length) {
        navigateToProduct(products[selectedIndex].slug)
      } else if (selectedIndex === viewAllIndex) {
        navigateToSearch()
      } else {
        navigateToSearch()
      }
    }
  }

  // Handle focus
  const handleFocus = () => {
    if (query.trim().length >= 2) {
      if (products.length > 0 || errorMessage || !isLoading) {
        setIsOpen(true)
      }
      if (products.length === 0 && !isLoading) {
        fetchSuggestions(query)
      }
    }
  }

  // Responsive styling classes
  const inputClass =
    variant === 'drawer'
      ? 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition'
      : variant === 'mobile'
        ? 'w-full rounded-full border border-white/20 bg-white px-4 py-2.5 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:ring-2 focus:ring-blue-300 transition'
        : 'w-full rounded-full border border-white/20 bg-white px-4 py-3 pl-11 pr-11 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none ring-0 focus:border-white focus:ring-2 focus:ring-blue-300 transition'

  const searchBtnClass =
    variant === 'drawer'
      ? 'absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 hover:text-blue-700 transition focus:outline-none'
      : variant === 'mobile'
        ? 'absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 hover:text-blue-700 transition focus:outline-none'
        : 'absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 hover:text-blue-700 transition focus:outline-none'

  const clearBtnClass =
    variant === 'drawer'
      ? 'absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700 text-sm font-bold focus:outline-none'
      : 'absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-700 text-base font-bold focus:outline-none'

  const activeOptionId =
    selectedIndex >= 0 && selectedIndex < products.length
      ? `${idPrefix}-option-${products[selectedIndex].id}`
      : selectedIndex === viewAllIndex
        ? `${idPrefix}-option-view-all`
        : undefined

  return (
    <div
      ref={containerRef}
      className={`relative ${variant === 'desktop' ? 'hidden flex-1 max-w-[720px] md:block' : 'w-full'}`}
    >
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < products.length) {
            navigateToProduct(products[selectedIndex].slug)
          } else {
            navigateToSearch()
          }
        }}
        className="relative"
      >
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-owns={`${idPrefix}-suggestions`}
          className="relative"
        >
          <button
            type="submit"
            aria-label="Tìm kiếm sản phẩm"
            className={searchBtnClass}
          >
            <SearchIcon />
          </button>

          <input
            ref={inputRef}
            type="search"
            name="search"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck="false"
            aria-label="Tìm kiếm sản phẩm"
            aria-autocomplete="list"
            aria-controls={`${idPrefix}-suggestions`}
            aria-activedescendant={activeOptionId}
            className={inputClass}
          />

          {isLoading ? (
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-blue-600">
              <SpinnerIcon className="h-4 w-4 animate-spin" />
            </div>
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Xóa từ khóa tìm kiếm"
              className={clearBtnClass}
            >
              ×
            </button>
          ) : null}
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          id={`${idPrefix}-suggestions`}
          role="listbox"
          aria-label="Gợi ý sản phẩm"
          className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[999] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition-all animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {isLoading && products.length === 0 ? (
            <div className="flex items-center justify-center gap-2.5 p-6 text-sm text-slate-500">
              <SpinnerIcon className="h-5 w-5 animate-spin text-blue-600" />
              <span>Đang tìm sản phẩm phù hợp...</span>
            </div>
          ) : errorMessage ? (
            <div className="p-4 text-center">
              <p className="text-sm font-semibold text-rose-600">{errorMessage}</p>
              <button
                type="button"
                onClick={() => navigateToSearch()}
                className="mt-2 text-xs font-bold text-blue-700 hover:underline"
              >
                Nhấn Enter để mở trang tìm kiếm đầy đủ →
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="p-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <SearchIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Không tìm thấy sản phẩm cho &ldquo;{query.trim()}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Hãy thử kiểm tra lại lỗi chính tả hoặc tìm theo từ khóa tổng quát hơn (VD: SSD, 4090, ASUS).
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Gợi ý sản phẩm ({products.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">Dùng phím ↑ ↓ để chọn</span>
              </div>

              <ul className="max-h-[min(58vh,420px)] divide-y divide-slate-100 overflow-y-auto">
                {products.map((product, index) => {
                  const isSelected = selectedIndex === index
                  const primaryImage = product.images?.[0]?.url
                  const displayPrice = product.salePrice ?? product.price
                  const hasDiscount = product.salePrice && product.salePrice < product.price

                  return (
                    <li
                      key={product.id}
                      id={`${idPrefix}-option-${product.id}`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          closeDropdown()
                          onNavigate?.()
                        }}
                        className={`flex items-center gap-3 p-3 transition ${
                          isSelected
                            ? 'bg-blue-50/90 text-slate-900 border-l-4 border-blue-600 pl-2'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 sm:h-14 sm:w-14">
                          <ProductImageFallback
                            src={primaryImage}
                            name={product.name}
                            categorySlug={product.category?.slug}
                            alt={product.name}
                            className="h-full w-full object-contain p-1"
                            fallbackClassName="text-xs font-bold text-slate-400 select-none"
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {product.brand?.name && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                                {product.brand.name}
                              </span>
                            )}
                            <span className="truncate text-[11px] text-slate-400 font-mono">
                              {product.sku}
                            </span>
                          </div>

                          <p className="mt-0.5 line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-blue-700">
                            {product.name}
                          </p>

                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-black text-blue-700">
                              {formatVND(displayPrice)}
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatVND(product.price)}
                              </span>
                            )}
                            <span
                              className={`ml-auto text-[10px] font-semibold ${
                                product.stock > 0 ? 'text-emerald-600' : 'text-rose-500'
                              }`}
                            >
                              {product.stock > 0 ? `Còn hàng` : 'Hết hàng'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>

              {/* View all footer */}
              <div
                id={`${idPrefix}-option-view-all`}
                role="option"
                aria-selected={selectedIndex === viewAllIndex}
                onMouseEnter={() => setSelectedIndex(viewAllIndex)}
                className={`border-t border-slate-100 bg-slate-50/90 transition ${
                  selectedIndex === viewAllIndex ? 'bg-blue-100/70' : 'hover:bg-blue-50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => navigateToSearch()}
                  className="flex w-full items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-bold text-blue-700 transition"
                >
                  <span>
                    Xem tất cả {total > 0 ? `${total} ` : ''}kết quả cho &ldquo;{query.trim()}&rdquo;
                  </span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

function ArrowRightIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
