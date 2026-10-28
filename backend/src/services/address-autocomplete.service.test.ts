import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import {
  autocompleteAddress,
  getPlaceDetails,
  type PlacesFetchFn,
} from './address-autocomplete.service'

const originalPlacesKey = process.env.GOOGLE_PLACES_API_KEY
const originalMapsKey = process.env.GOOGLE_MAPS_API_KEY

beforeEach(() => {
  delete process.env.GOOGLE_PLACES_API_KEY
  delete process.env.GOOGLE_MAPS_API_KEY
})

afterEach(() => {
  if (originalPlacesKey !== undefined) {
    process.env.GOOGLE_PLACES_API_KEY = originalPlacesKey
  } else {
    delete process.env.GOOGLE_PLACES_API_KEY
  }
  if (originalMapsKey !== undefined) {
    process.env.GOOGLE_MAPS_API_KEY = originalMapsKey
  } else {
    delete process.env.GOOGLE_MAPS_API_KEY
  }
})

test('autocompleteAddress returns providerConfigured=false when API key is missing', async () => {
  const result = await autocompleteAddress('123 Nguyen Hue')
  assert.equal(result.providerConfigured, false)
  assert.deepEqual(result.predictions, [])
})

test('getPlaceDetails returns providerConfigured=false when API key is missing', async () => {
  const result = await getPlaceDetails('ChIJ12345')
  assert.equal(result.providerConfigured, false)
  assert.ok(result.error?.includes('chưa được cấu hình'))
})

test('autocompleteAddress sends languageCode=vi and includedRegionCodes=[vn] and parses predictions', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key-places'

  let capturedUrl = ''
  let capturedInit: RequestInit | undefined

  const mockFetch: PlacesFetchFn = async (url, init) => {
    capturedUrl = url
    capturedInit = init
    return new Response(
      JSON.stringify({
        suggestions: [
          {
            placePrediction: {
              placeId: 'place-hcm-1',
              text: { text: '123 Đường Nguyễn Huệ, Bến Nghé, Quận 1, Hồ Chí Minh, Việt Nam' },
              structuredFormat: {
                mainText: { text: '123 Đường Nguyễn Huệ' },
                secondaryText: { text: 'Bến Nghé, Quận 1, Hồ Chí Minh, Việt Nam' },
              },
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = await autocompleteAddress('123 Nguyen Hue', mockFetch)
  assert.equal(result.providerConfigured, true)
  assert.equal(result.predictions.length, 1)
  assert.equal(result.predictions[0].placeId, 'place-hcm-1')
  assert.equal(result.predictions[0].mainText, '123 Đường Nguyễn Huệ')

  // Verify URL and request payload
  assert.equal(capturedUrl, 'https://places.googleapis.com/v1/places:autocomplete')
  const body = JSON.parse(capturedInit?.body as string)
  assert.equal(body.languageCode, 'vi')
  assert.deepEqual(body.includedRegionCodes, ['vn'])
  assert.equal(body.input, '123 Nguyen Hue')
})

test('autocompleteAddress returns empty predictions for empty or blank input', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key-places'
  const result = await autocompleteAddress('   ')
  assert.equal(result.providerConfigured, true)
  assert.deepEqual(result.predictions, [])
})

test('getPlaceDetails accepts Vietnam place and extracts structured components', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key-places'

  const mockFetch: PlacesFetchFn = async () => {
    return new Response(
      JSON.stringify({
        id: 'place-vn-valid',
        formattedAddress: '123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
        addressComponents: [
          { longText: '123', shortText: '123', types: ['street_number'] },
          { longText: 'Đường Nguyễn Huệ', shortText: 'Đ. Nguyễn Huệ', types: ['route'] },
          { longText: 'Phường Bến Nghé', shortText: 'Bến Nghé', types: ['sublocality_level_1', 'sublocality', 'political'] },
          { longText: 'Quận 1', shortText: 'Q1', types: ['administrative_area_level_2', 'political'] },
          { longText: 'Thành phố Hồ Chí Minh', shortText: 'TP. HCM', types: ['administrative_area_level_1', 'political'] },
          { longText: 'Việt Nam', shortText: 'VN', types: ['country', 'political'] },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = await getPlaceDetails('place-vn-valid', mockFetch)
  assert.equal(result.providerConfigured, true)
  assert.equal(result.error, undefined)
  assert.ok(result.parsedAddress)
  assert.equal(result.parsedAddress.isVietnam, true)
  assert.equal(result.parsedAddress.province, 'Thành phố Hồ Chí Minh')
  assert.equal(result.parsedAddress.district, 'Quận 1')
  assert.equal(result.parsedAddress.ward, 'Phường Bến Nghé')
  assert.equal(result.parsedAddress.detail, '123 Đường Nguyễn Huệ')
})

test('getPlaceDetails rejects a place not in Vietnam', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key-places'

  const mockFetch: PlacesFetchFn = async () => {
    return new Response(
      JSON.stringify({
        id: 'place-foreign',
        formattedAddress: '100 Market St, San Francisco, CA 94105, USA',
        addressComponents: [
          { longText: 'San Francisco', shortText: 'SF', types: ['locality'] },
          { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
          { longText: 'United States', shortText: 'US', types: ['country'] },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const result = await getPlaceDetails('place-foreign', mockFetch)
  assert.equal(result.providerConfigured, true)
  assert.equal(result.parsedAddress, undefined)
  assert.ok(result.error?.includes('không thuộc lãnh thổ Việt Nam'))
})

test('autocompleteAddress and getPlaceDetails handle network loss gracefully', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-key-places'

  const mockFailingFetch: PlacesFetchFn = async () => {
    throw new Error('Network timeout / connection lost')
  }

  const autocompleteResult = await autocompleteAddress('123 Nguyen Hue', mockFailingFetch)
  assert.equal(autocompleteResult.providerConfigured, true)
  assert.deepEqual(autocompleteResult.predictions, [])

  const detailsResult = await getPlaceDetails('place-id', mockFailingFetch)
  assert.equal(detailsResult.providerConfigured, true)
  assert.ok(detailsResult.error?.includes('Lỗi kết nối'))
})
