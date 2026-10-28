export type AddressPrediction = {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export type ParsedAddressComponents = {
  formattedAddress: string
  province: string
  district: string
  ward: string
  detail: string
  country: string
  isVietnam: boolean
}

export type AutocompleteResult = {
  providerConfigured: boolean
  predictions: AddressPrediction[]
}

export type PlaceDetailsResult = {
  providerConfigured: boolean
  parsedAddress?: ParsedAddressComponents
  error?: string
}

export type PlacesFetchFn = (url: string, init?: RequestInit) => Promise<Response>

function isVietnamCountry(countryCode?: string, countryName?: string): boolean {
  if (!countryCode && !countryName) return false
  const code = (countryCode || '').trim().toUpperCase()
  const name = (countryName || '').trim().toLowerCase()
  return code === 'VN' || name === 'việt nam' || name === 'vietnam' || name === 'viet nam'
}

export async function autocompleteAddress(
  input: string,
  fetchFn: PlacesFetchFn = fetch,
): Promise<AutocompleteResult> {
  const apiKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  if (!apiKey) {
    return { providerConfigured: false, predictions: [] }
  }

  const trimmedInput = input.trim()
  if (!trimmedInput) {
    return { providerConfigured: true, predictions: [] }
  }

  try {
    const response = await fetchFn('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: trimmedInput,
        includedRegionCodes: ['vn'],
        languageCode: 'vi',
      }),
    })

    if (!response.ok) {
      console.error('Google Places Autocomplete error status:', response.status)
      return { providerConfigured: true, predictions: [] }
    }

    const data = await response.json() as {
      suggestions?: Array<{
        placePrediction?: {
          place?: string
          placeId?: string
          text?: { text?: string }
          structuredFormat?: {
            mainText?: { text?: string }
            secondaryText?: { text?: string }
          }
        }
      }>
    }

    const suggestions = data.suggestions ?? []
    const predictions: AddressPrediction[] = []

    for (const item of suggestions) {
      const pred = item.placePrediction
      if (!pred) continue
      const placeId = pred.placeId || pred.place?.replace(/^places\//, '') || ''
      const description = pred.text?.text || ''
      const mainText = pred.structuredFormat?.mainText?.text || description
      const secondaryText = pred.structuredFormat?.secondaryText?.text || ''

      if (placeId && description) {
        predictions.push({
          placeId,
          description,
          mainText,
          secondaryText,
        })
      }
    }

    return { providerConfigured: true, predictions }
  } catch (error) {
    console.error('Google Places Autocomplete network error:', error)
    return { providerConfigured: true, predictions: [] }
  }
}

export async function getPlaceDetails(
  placeId: string,
  fetchFn: PlacesFetchFn = fetch,
): Promise<PlaceDetailsResult> {
  const apiKey = (process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim()
  if (!apiKey) {
    return { providerConfigured: false, error: 'Google Places API chưa được cấu hình.' }
  }

  const cleanPlaceId = placeId.trim().replace(/^places\//, '')
  if (!cleanPlaceId) {
    return { providerConfigured: true, error: 'Mã địa điểm không hợp lệ.' }
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}?languageCode=vi`
    const response = await fetchFn(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,addressComponents',
      },
    })

    if (!response.ok) {
      return { providerConfigured: true, error: `Không thể lấy chi tiết địa chỉ (Status ${response.status}).` }
    }

    const data = await response.json() as {
      id?: string
      formattedAddress?: string
      addressComponents?: Array<{
        longText?: string
        shortText?: string
        types?: string[]
      }>
    }

    const components = data.addressComponents ?? []
    let countryCode = ''
    let countryName = ''
    let province = ''
    let district = ''
    let ward = ''
    let streetNumber = ''
    let route = ''

    for (const comp of components) {
      const types = comp.types ?? []
      if (types.includes('country')) {
        countryCode = comp.shortText ?? ''
        countryName = comp.longText ?? ''
      } else if (types.includes('administrative_area_level_1')) {
        province = comp.longText ?? ''
      } else if (types.includes('administrative_area_level_2')) {
        district = comp.longText ?? ''
      } else if (
        types.includes('sublocality_level_1')
        || types.includes('sublocality')
        || types.includes('ward')
        || types.includes('administrative_area_level_3')
      ) {
        if (!ward) ward = comp.longText ?? ''
      } else if (types.includes('street_number')) {
        streetNumber = comp.longText ?? ''
      } else if (types.includes('route')) {
        route = comp.longText ?? ''
      }
    }

    const isVietnam = isVietnamCountry(countryCode, countryName)
    if (!isVietnam) {
      return {
        providerConfigured: true,
        error: 'Địa chỉ được chọn không thuộc lãnh thổ Việt Nam. Cửa hàng chỉ hỗ trợ giao hàng tại Việt Nam.',
      }
    }

    let detail = [streetNumber, route].filter(Boolean).join(' ').trim()
    const formattedAddress = data.formattedAddress ?? ''
    if (!detail && formattedAddress) {
      // Parse detail from formattedAddress if street_number/route were not separated
      const parts = formattedAddress.split(',').map((p) => p.trim())
      if (parts.length > 3) {
        detail = parts.slice(0, parts.length - 3).join(', ')
      } else {
        detail = parts[0] || ''
      }
    }

    return {
      providerConfigured: true,
      parsedAddress: {
        formattedAddress,
        province,
        district,
        ward,
        detail,
        country: countryName || 'Việt Nam',
        isVietnam: true,
      },
    }
  } catch (error) {
    console.error('Google Places Details network error:', error)
    return {
      providerConfigured: true,
      error: 'Lỗi kết nối khi lấy chi tiết địa chỉ. Vui lòng nhập tay địa chỉ.',
    }
  }
}
