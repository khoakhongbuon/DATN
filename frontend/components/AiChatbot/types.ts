export type AiProduct = {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  stock: number
  image: string | null
}

export type ChatRole = 'user' | 'assistant'

export type BuildLine = {
  role: string
  id: string
  name: string
  slug: string
  sku: string
  price: number
  salePrice: number | null
  stock: number
  image: string | null
  listPrice: number
  appliedPrice: number
  savings: number
  owned: boolean
}

export type BuildRecommendation = {
  status: 'recommended' | 'over_budget' | 'insufficient_catalog' | 'needs_clarification' | 'no_compatible_build'
  budgetVnd: number
  items: BuildLine[]
  totalListPrice: number
  totalPayable: number
  totalSavings: number
  remainingBudget: number
  deficit: number
  withinBudget: boolean
  missingRoles: string[]
  verified: string[]
  unverified: string[]
  warnings: string[]
  alternatives: Array<{
    items: BuildLine[]
    totalListPrice: number
    totalPayable: number
    totalSavings: number
    remainingBudget: number
  }>
  clarificationQuestion?: string
}

export type ChatMessageItem = {
  id: string
  role: ChatRole
  content: string
  products?: AiProduct[]
  build?: BuildRecommendation
  isError?: boolean
  failedPrompt?: string
  createdAt: number
}

export type AiChatResponse = {
  success: boolean
  message: string
  products?: AiProduct[]
  build?: BuildRecommendation
}
