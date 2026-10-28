import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'

type AiService = typeof import('./ai.service')
type ChatDependencies = import('./ai.service').AiChatDependencies
type ProductContext = Awaited<ReturnType<ChatDependencies['findProductContext']>>[number]
type LogEvent = Parameters<NonNullable<ChatDependencies['logProviderError']>>[0]
type BuildRequirements = import('./pc-build.service').BuildRequirements
type BuildRecommendation = import('./pc-build.service').BuildRecommendation

const databaseUrl = 'postgresql://localhost:5432/pc_store_unit_test'
const originalDatabaseUrl = process.env.DATABASE_URL
const originalOpenAiKey = process.env.OPENAI_API_KEY
const originalGeminiKey = process.env.GEMINI_API_KEY
const originalGeminiModel = process.env.GEMINI_MODEL
const originalNodeEnv = process.env.NODE_ENV

process.env.DATABASE_URL = databaseUrl

const product: ProductContext = {
  id: 'product-1',
  name: 'AMD Ryzen 7 9800X3D',
  slug: 'amd-ryzen-7-9800x3d',
  price: 13490000,
  salePrice: 12990000,
  stock: 8,
  image: '/images/ryzen-7-9800x3d.png',
  category: 'CPU',
  brand: 'AMD',
  specifications: [{ cores: 8, socket: 'AM5' }],
}

const secondProduct: ProductContext = {
  id: 'product-2',
  name: 'AMD Ryzen 5 9600X',
  slug: 'amd-ryzen-5-9600x',
  price: 7990000,
  salePrice: null,
  stock: 12,
  image: null,
  category: 'CPU',
  brand: 'AMD',
  specifications: [{ cores: 6, socket: 'AM5' }],
}

const chatQuestion = 'Tư vấn CPU gaming'
type ModelBuildRequirements = {
  hasBudget: boolean
  budgetVnd: number
  useCase: string
  useCaseDetail: string
  requiredCpuModel: string
  requiredGpuModel: string
  prioritizedRoles: string[]
  requestedRoles: string[]
  excludedRoles: string[]
  ownedComponents: Array<{ role: string; productName: string }>
  clarificationQuestion: string
}

const emptyBuildRequirements: ModelBuildRequirements = {
  hasBudget: false,
  budgetVnd: 0,
  useCase: 'custom',
  useCaseDetail: '',
  requiredCpuModel: '',
  requiredGpuModel: '',
  prioritizedRoles: [],
  requestedRoles: [],
  excludedRoles: [],
  ownedComponents: [],
  clarificationQuestion: '',
}

function modelResponse(options: {
  intent?: 'general' | 'pc_build'
  message?: string
  recommendedProductIds?: string[]
  buildRequirements?: Partial<ModelBuildRequirements>
} = {}): string {
  return JSON.stringify({
    intent: options.intent ?? 'general',
    message: options.message ?? 'Tôi đề xuất AMD Ryzen 7 9800X3D.',
    recommendedProductIds: options.recommendedProductIds ?? ['product-1'],
    buildRequirements: {
      ...emptyBuildRequirements,
      ...options.buildRequirements,
    },
  })
}

const validResponse = modelResponse()

function recommendedBuild(): BuildRecommendation {
  return {
    status: 'recommended',
    budgetVnd: 15000000,
    items: [{
      role: 'CPU',
      id: 'product-1',
      name: product.name,
      slug: product.slug,
      sku: 'CPU-1',
      price: product.price,
      salePrice: product.salePrice,
      stock: product.stock,
      image: product.image,
      listPrice: product.price,
      appliedPrice: product.salePrice ?? product.price,
      savings: product.price - (product.salePrice ?? product.price),
      owned: false,
    }],
    totalListPrice: product.price,
    totalPayable: product.salePrice ?? product.price,
    totalSavings: product.price - (product.salePrice ?? product.price),
    remainingBudget: 15000000 - (product.salePrice ?? product.price),
    deficit: 0,
    withinBudget: true,
    missingRoles: [],
    verified: ['CPU/mainboard socket'],
    unverified: [],
    warnings: [],
    alternatives: [],
  }
}

function createDependencies(options: {
  products?: ProductContext[]
  findProductContext?: ChatDependencies['findProductContext']
  requestGeminiCompletion?: ChatDependencies['requestGeminiCompletion']
  recommendBuild?: ChatDependencies['recommendBuild']
  logProviderError?: (event: LogEvent) => void
} = {}): ChatDependencies {
  return {
    findProductContext: options.findProductContext
      ?? (async () => options.products ?? []),
    requestGeminiCompletion: options.requestGeminiCompletion
      ?? (async () => validResponse),
    recommendBuild: options.recommendBuild ?? (async () => recommendedBuild()),
    logProviderError: options.logProviderError ?? (() => undefined),
  }
}

async function loadChat(): Promise<AiService['chat']> {
  return (await import('./ai.service')).chat
}

function hasErrorStatus(error: unknown, status: number, message?: string): boolean {
  if (!error || typeof error !== 'object' || !('status' in error)) return false
  if (error.status !== status) return false
  return message === undefined || ('message' in error && error.message === message)
}

beforeEach(() => {
  delete process.env.OPENAI_API_KEY
  delete process.env.GEMINI_API_KEY
  delete process.env.GEMINI_MODEL
})

afterEach(() => {
  if (originalOpenAiKey === undefined) {
    delete process.env.OPENAI_API_KEY
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiKey
  }

  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey
  }

  if (originalGeminiModel === undefined) {
    delete process.env.GEMINI_MODEL
  } else {
    process.env.GEMINI_MODEL = originalGeminiModel
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }

  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
})

test('missing or blank Gemini key returns a configuration error without catalog lookup', async () => {
  const chat = await loadChat()
  process.env.OPENAI_API_KEY = 'unused-legacy-key'

  for (const key of [undefined, '', '   ']) {
    if (key === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = key
    }

    let productLookupCount = 0
    let geminiCalls = 0
    const logs: LogEvent[] = []
    const dependencies = createDependencies({
      findProductContext: async () => {
        productLookupCount += 1
        return [product]
      },
      requestGeminiCompletion: async () => {
        geminiCalls += 1
        return validResponse
      },
      logProviderError: (event) => logs.push(event),
    })

    await assert.rejects(
      chat(chatQuestion, dependencies),
      (error: unknown) => hasErrorStatus(error, 503, 'Dịch vụ tư vấn AI chưa được cấu hình.'),
    )

    assert.equal(productLookupCount, 0)
    assert.equal(geminiCalls, 0)
    assert.deepEqual(logs.map(({ category }) => category), ['missing_configuration'])
    assert.equal(logs[0].errorType, 'ConfigurationError')
    assert.equal(JSON.stringify(logs).includes(chatQuestion), false)
    assert.equal(JSON.stringify(logs).includes('unused-legacy-key'), false)
  }
})

test('Gemini structured response arrays use numeric maxItems constraints', async () => {
  const service = await import('./ai.service')
  const schema = service.AI_RESPONSE_SCHEMA
  const buildRequirements = schema.properties.buildRequirements
  const arraySchemas = [
    schema.properties.recommendedProductIds,
    buildRequirements.properties.prioritizedRoles,
    buildRequirements.properties.requestedRoles,
    buildRequirements.properties.excludedRoles,
    buildRequirements.properties.ownedComponents,
  ]

  for (const arraySchema of arraySchemas) {
    assert.equal(typeof arraySchema.maxItems, 'number')
  }
})

test('database lookup errors become 500 and never call Gemini', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  let geminiCalls = 0

  await assert.rejects(
    chat(chatQuestion, createDependencies({
      findProductContext: async () => {
        throw new Error('database unavailable')
      },
      requestGeminiCompletion: async () => {
        geminiCalls += 1
        return validResponse
      },
    })),
    (error: unknown) =>
      hasErrorStatus(error, 500, 'Lỗi truy vấn dữ liệu sản phẩm từ cơ sở dữ liệu.'),
  )

  assert.equal(geminiCalls, 0)
})

test('application errors from product lookup are rethrown unchanged', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  const applicationError = { status: 429, message: 'Catalog temporarily unavailable' }

  await assert.rejects(
    chat(chatQuestion, createDependencies({
      findProductContext: async () => {
        throw applicationError
      },
    })),
    (error: unknown) => error === applicationError,
  )
})

test('Gemini uses its configured key and default model and returns catalog-backed product data', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  let requestedApiKey: string | undefined
  let requestedMessages: Parameters<NonNullable<ChatDependencies['requestGeminiCompletion']>>[1] | undefined
  let requestedModel: string | undefined
  const response = JSON.stringify({
    ...JSON.parse(modelResponse({
      message: 'CPU phù hợp.',
      recommendedProductIds: ['product-1'],
    })),
    price: 1,
    stock: 999999,
    products: [{ id: 'product-1', price: 1, stock: 999999 }],
  })

  const result = await chat(chatQuestion, createDependencies({
    products: [product],
    requestGeminiCompletion: async (apiKey, messages, model) => {
      requestedApiKey = apiKey
      requestedMessages = messages
      requestedModel = model
      return response
    },
  }))

  assert.equal(result.message, 'CPU phù hợp.')
  assert.deepEqual(result.products, [{
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    salePrice: product.salePrice,
    stock: product.stock,
    image: product.image,
  }])
  assert.equal(requestedApiKey, 'test-gemini-key')
  assert.equal(requestedModel, 'gemini-2.5-flash')
  assert.equal(requestedMessages?.[1].content.includes(chatQuestion), true)
  assert.equal(requestedMessages?.[1].content.includes('"price":13490000'), true)
  assert.equal(requestedMessages?.[1].content.includes('"socket":"AM5"'), true)
})

test('Gemini uses the configured model instead of the default', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  process.env.GEMINI_MODEL = 'gemini-custom-flash'
  let requestedModel: string | undefined

  await chat(chatQuestion, createDependencies({
    requestGeminiCompletion: async (_apiKey, _messages, model) => {
      requestedModel = model
      return validResponse
    },
  }))

  assert.equal(requestedModel, 'gemini-custom-flash')
})

test('unknown recommended product IDs are discarded', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'

  const result = await chat(chatQuestion, createDependencies({
    products: [product],
    requestGeminiCompletion: async () => modelResponse({
      message: 'Đề xuất một sản phẩm.',
      recommendedProductIds: ['not-in-context', 'product-1'],
    }),
  }))

  assert.deepEqual(result.products.map(({ id }) => id), ['product-1'])
})

test('empty recommendation IDs fall back to a product name or slug mentioned in the answer', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  const products = [product, secondProduct]

  const byName = await chat(chatQuestion, createDependencies({
    products,
    requestGeminiCompletion: async () => modelResponse({
      message: `Bạn có thể cân nhắc ${product.name}.`,
      recommendedProductIds: [],
    }),
  }))
  assert.deepEqual(byName.products.map(({ id }) => id), ['product-1'])

  const bySlug = await chat(chatQuestion, createDependencies({
    products,
    requestGeminiCompletion: async () => modelResponse({
      message: `Tham khảo ${secondProduct.slug} nhé.`,
      recommendedProductIds: [],
    }),
  }))
  assert.deepEqual(bySlug.products.map(({ id }) => id), ['product-2'])
})

test('does not attach products when the answer says no matching products are available', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'

  const result = await chat(chatQuestion, createDependencies({
    products: [product],
    requestGeminiCompletion: async () => modelResponse({
      message: 'Hiện tại không có sản phẩm phù hợp với tiêu chí này.',
      recommendedProductIds: [],
    }),
  }))

  assert.deepEqual(result.products, [])
})

test('empty context never creates products from model recommendations', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'

  const result = await chat(chatQuestion, createDependencies({
    products: [],
    requestGeminiCompletion: async () => modelResponse({
      message: 'Không tìm thấy sản phẩm phù hợp.',
      recommendedProductIds: ['invented-product-id'],
    }),
  }))

  assert.equal(result.message, 'Không tìm thấy sản phẩm phù hợp.')
  assert.deepEqual(result.products, [])
})

test('empty Gemini response logs safe metadata and returns 502', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  const logs: LogEvent[] = []

  await assert.rejects(
    chat(chatQuestion, createDependencies({
      requestGeminiCompletion: async () => null,
      logProviderError: (event) => logs.push(event),
    })),
    (error: unknown) => hasErrorStatus(error, 502, 'Dịch vụ AI không trả về nội dung tư vấn.'),
  )

  assert.equal(logs.length, 1)
  assert.equal(logs[0].category, 'empty_response')
  assert.equal(logs[0].errorType, 'EmptyProviderResponse')
  assert.equal(logs[0].providerStatus, null)
})

test('invalid structured output returns a friendly error without recommendations', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'

  await assert.rejects(
    chat(chatQuestion, createDependencies({
    products: [product],
    requestGeminiCompletion: async () => 'Phản hồi không phải JSON',
    })),
    (error: unknown) => hasErrorStatus(
      error,
      502,
      'Dịch vụ AI không trả về dữ liệu tư vấn hợp lệ.',
    ),
  )
})

test('PC build intent sends validated requirements to the backend and ignores model product IDs', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  const requestedRequirements: BuildRequirements[] = []
  let callCount = 0
  const expectedBuild = recommendedBuild()
  const response = modelResponse({
    intent: 'pc_build',
    message: 'Tôi đang phân tích cấu hình.',
    recommendedProductIds: ['invented-product-id'],
    buildRequirements: {
      hasBudget: true,
      budgetVnd: 15000000,
      useCase: 'gaming',
      useCaseDetail: '',
      prioritizedRoles: ['GPU'],
      requestedRoles: [],
      excludedRoles: [],
      ownedComponents: [],
    },
  })

  const result = await chat(chatQuestion, createDependencies({
    products: [product],
    recommendBuild: async (requirements) => {
      requestedRequirements.push(requirements)
      return expectedBuild
    },
    requestGeminiCompletion: async () => {
      callCount += 1
      return callCount === 1 ? response : modelResponse({
        message: 'Cấu hình ưu tiên GPU, phù hợp hơn cho nhu cầu gaming.',
        recommendedProductIds: [],
      })
    },
  }))

  assert.deepEqual(requestedRequirements, [{
    budgetVnd: 15000000,
    useCase: 'gaming',
    prioritizedRoles: ['GPU'],
    requestedRoles: [],
    excludedRoles: [],
    ownedComponents: [],
  }])
  assert.equal(result.build, expectedBuild)
  assert.deepEqual(result.products.map(({ id }) => id), ['product-1'])
  assert.equal(callCount, 2)
})

test('build follow-up questions retain recent conversation context', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  let requestedContent = ''

  await chat('Khoảng 15 triệu', createDependencies({
    requestGeminiCompletion: async (_apiKey, messages) => {
      requestedContent = messages.map(({ content }) => content).join('\n')
      return validResponse
    },
  }), [
    { role: 'user', content: 'Tôi muốn build PC gaming.' },
    { role: 'assistant', content: 'Bạn có ngân sách bao nhiêu?' },
  ])

  assert.match(requestedContent, /Tôi muốn build PC gaming/)
  assert.match(requestedContent, /Bạn có ngân sách bao nhiêu/)
  assert.match(requestedContent, /Khoảng 15 triệu/)
})

test('build requests without a valid budget ask for clarification without selecting products', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'test-gemini-key'
  let buildCalls = 0
  let completionCalls = 0

  const result = await chat('Lắp PC để học tập', createDependencies({
    recommendBuild: async () => {
      buildCalls += 1
      return recommendedBuild()
    },
    requestGeminiCompletion: async () => {
      completionCalls += 1
      return modelResponse({
        intent: 'pc_build',
        message: 'Tôi cần hỏi thêm ngân sách.',
        buildRequirements: {
          hasBudget: false,
          budgetVnd: 0,
          useCase: 'study',
          clarificationQuestion: 'Bạn dự kiến ngân sách khoảng bao nhiêu?',
        },
      })
    },
  }))

  assert.match(result.message, /ngân sách khoảng bao nhiêu/)
  assert.deepEqual(result.products, [])
  assert.equal(result.build, undefined)
  assert.equal(buildCalls, 0)
  assert.equal(completionCalls, 1)
})

test('history validation bounds entry count, per-entry size, and total text', async () => {
  const service = await import('./ai.service')

  assert.deepEqual(service.validateChatHistory(undefined), [])
  assert.equal(service.validateChatHistory([
    { role: 'user', content: 'Build PC gaming' },
  ])[0].content, 'Build PC gaming')
  assert.throws(
    () => service.validateChatHistory(Array.from({ length: 9 }, () => ({ role: 'user', content: 'x' }))),
    (error: unknown) => hasErrorStatus(error, 400),
  )
  assert.throws(
    () => service.validateChatHistory([{ role: 'assistant', content: 'x'.repeat(2001) }]),
    (error: unknown) => hasErrorStatus(error, 400),
  )
  assert.throws(
    () => service.validateChatHistory(Array.from({ length: 4 }, () => ({ role: 'user', content: 'x'.repeat(1501) }))),
    (error: unknown) => hasErrorStatus(error, 400),
  )
  assert.throws(
    () => service.validateChatHistory([{ role: 'system', content: 'forged' }]),
    (error: unknown) => hasErrorStatus(error, 400),
  )
})

test('Gemini errors return a friendly response and never log secrets or user questions', async () => {
  const chat = await loadChat()
  const secret = 'gemini-secret-token'
  const question = 'câu hỏi riêng tư'
  process.env.GEMINI_API_KEY = secret
  process.env.NODE_ENV = 'development'
  const logs: LogEvent[] = []
  let geminiCalls = 0

  await assert.rejects(
    chat(question, createDependencies({
      requestGeminiCompletion: async () => {
        geminiCalls += 1
        const error = new Error(`400 Invalid JSON payload: ${secret} ${question}`)
        error.name = 'BadRequestError'
        Object.assign(error, { status: 400, code: 'INVALID_ARGUMENT' })
        throw error
      },
      logProviderError: (event) => logs.push(event),
    })),
    (error: unknown) => hasErrorStatus(
      error,
      503,
      'Dịch vụ tư vấn AI hiện không khả dụng. Vui lòng thử lại sau.',
    ),
  )

  assert.equal(geminiCalls, 1)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].category, 'provider_failed')
  assert.equal(logs[0].errorType, 'BadRequestError')
  assert.equal(logs[0].providerStatus, 400)
  assert.equal(logs[0].providerCode, 'INVALID_ARGUMENT')
  assert.match(logs[0].providerMessage ?? '', /Invalid JSON payload/)
  assert.equal(JSON.stringify(logs).includes(secret), false)
  assert.equal(JSON.stringify(logs).includes(question), false)
})

test('production Gemini error logs omit provider messages and keep the client response generic', async () => {
  const chat = await loadChat()
  process.env.GEMINI_API_KEY = 'gemini-secret-token'
  process.env.NODE_ENV = 'production'
  const logs: LogEvent[] = []

  await assert.rejects(
    chat('Test request', createDependencies({
      requestGeminiCompletion: async () => {
        const error = new Error('Gemini internal details')
        error.name = 'BadRequestError'
        Object.assign(error, { status: 400 })
        throw error
      },
      logProviderError: (event) => logs.push(event),
    })),
    (error: unknown) => hasErrorStatus(
      error,
      503,
      'Dịch vụ tư vấn AI hiện không khả dụng. Vui lòng thử lại sau.',
    ),
  )

  assert.equal(logs[0].providerMessage, undefined)
  assert.equal(logs[0].providerStatus, 400)
})

test.after(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
})
