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

export type ChatMessageItem = {
  id: string
  role: ChatRole
  content: string
  products?: AiProduct[]
  isError?: boolean
  failedPrompt?: string
  createdAt: number
}

export type AiChatResponse = {
  success: boolean
  message: string
  products?: AiProduct[]
}

