import React, { useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE_URL } from '../lib/cart'

export type SelectedAddressData = {
  formattedAddress: string
  province: string
  district: string
  ward: string
  detail: string
  country: string
}

type AddressPrediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

type AddressAutocompleteProps = {
  onSelectAddress: (address: SelectedAddressData) => void
  disabled?: boolean
  initialValue?: string
}

export default function AddressAutocomplete({
  onSelectAddress,
  disabled = false,
  initialValue = '',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(initialValue)
  const [predictions, setPredictions] = useState<AddressPrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isFetchingDetails, setIsFetchingDetails] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const searchAddress = useCallback(async (keyword: string) => {
    if (!keyword.trim() || keyword.trim().length < 2) {
      setPredictions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/addresses/autocomplete?input=${encodeURIComponent(keyword.trim())}`
      )
      if (!response.ok) {
        throw new Error(`Lỗi kết nối máy chủ (${response.status})`)
      }

      const payload = await response.json()
      if (payload.success && payload.data) {
        setProviderConfigured(payload.data.providerConfigured)
        if (payload.data.providerConfigured) {
          setPredictions(payload.data.predictions || [])
          setIsOpen(true)
        } else {
          setPredictions([])
          setIsOpen(false)
        }
      } else {
        setPredictions([])
      }
    } catch (err) {
      setError('Không thể kết nối tìm kiếm địa chỉ tự động. Bạn vẫn có thể nhập tay bên dưới.')
      setPredictions([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setError('')

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (!val.trim()) {
      setPredictions([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      void searchAddress(val)
    }, 300)
  }

  const handleSelectPrediction = async (prediction: AddressPrediction) => {
    setIsFetchingDetails(true)
    setError('')
    setIsOpen(false)
    setQuery(prediction.description)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/addresses/place-details?placeId=${encodeURIComponent(prediction.placeId)}`
      )
      const payload = await response.json()

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || 'Không thể lấy thông tin chi tiết địa chỉ.')
      }

      const data = payload.data
      if (data.parsedAddress) {
        if (!data.parsedAddress.isVietnam) {
          setError('Địa chỉ không thuộc lãnh thổ Việt Nam. Cửa hàng chỉ hỗ trợ giao hàng tại Việt Nam.')
          return
        }

        onSelectAddress(data.parsedAddress)
      } else {
        setError(data.error || 'Không thể phân tích các trường địa chỉ.')
      }
    } catch (err) {
      setError((err as Error).message || 'Lỗi khi tải chi tiết địa chỉ. Vui lòng nhập thủ công.')
    } finally {
      setIsFetchingDetails(false)
    }
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-700">
          Tìm kiếm địa chỉ nhanh (Việt Nam)
        </label>
        {providerConfigured === false && (
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
            Chế độ nhập tay (Google Places chưa cấu hình API key)
          </span>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled || isFetchingDetails}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true)
          }}
          placeholder="Nhập địa chỉ tại Việt Nam (vd: 123 Nguyễn Huệ, Bến Nghé, Quận 1)..."
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-blue-600 focus:ring-1 focus:ring-blue-600 disabled:bg-slate-100"
        />

        {(loading || isFetchingDetails) && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 text-xs text-blue-600">
            <svg
              className="h-4 w-4 animate-spin text-blue-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
            <span>{isFetchingDetails ? 'Đang điền...' : 'Đang tìm...'}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-medium">
          <span>⚠️</span>
          <span>{error}</span>
        </p>
      )}

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Gợi ý địa chỉ tại Việt Nam
          </div>
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-3.5 py-2 text-left text-xs transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
            >
              <div className="font-semibold text-slate-800">{prediction.mainText}</div>
              {prediction.secondaryText && (
                <div className="text-[11px] text-slate-500 truncate">{prediction.secondaryText}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && !loading && predictions.length === 0 && query.trim().length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white p-3 text-center text-xs text-slate-500 shadow-lg">
          Không tìm thấy địa chỉ phù hợp tại Việt Nam. Vui lòng nhập chi tiết vào các ô bên dưới.
        </div>
      )}
    </div>
  )
}
