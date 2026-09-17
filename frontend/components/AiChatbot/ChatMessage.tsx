import ProductCard from './ProductCard'
import type { ChatMessageItem } from './types'

type ChatMessageProps = {
  message: ChatMessageItem
  onRetry?: (prompt: string) => void
}

export default function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end pl-10">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-blue-600 px-4 py-2.5 text-sm font-normal text-white shadow-sm">
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start pr-4">
      {/* AI Message Bubble */}
      <div className="flex items-start gap-2 max-w-full">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-[10px] font-black text-white shadow-xs"
          aria-hidden="true"
        >
          TK
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={`rounded-2xl rounded-tl-xs p-3.5 text-sm leading-relaxed shadow-xs ${
              message.isError
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-slate-200/90 bg-white text-slate-800'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>

            {message.isError && message.failedPrompt && onRetry && (
              <div className="mt-3 pt-2 border-t border-red-200/60 flex items-center justify-between">
                <span className="text-xs text-red-600 font-medium">Gửi lại câu hỏi vừa rồi?</span>
                <button
                  type="button"
                  onClick={() => onRetry(message.failedPrompt!)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  aria-label="Thử lại gửi câu hỏi"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Thử lại</span>
                </button>
              </div>
            )}
          </div>

          {/* Recommended Products Carousel/List */}
          {message.products && message.products.length > 0 && (
            <div className="mt-3 w-full">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Sản phẩm đề xuất ({message.products.length}):
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-200">
                {message.products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-[10px] font-black text-white shadow-xs"
        aria-hidden="true"
      >
        TK
      </div>

      <div className="rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-600 shadow-xs">
        <div className="flex items-center gap-2">
          <span>TK AI đang suy nghĩ...</span>
          <span className="flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-600" />
          </span>
        </div>
      </div>
    </div>
  )
}

