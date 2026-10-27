import Link from 'next/link'
import ProductCard from './ProductCard'
import type { BuildRecommendation, ChatMessageItem } from './types'

const BUILD_ROLE_LABELS: Record<string, string> = {
  CPU: 'Bộ xử lý',
  MAINBOARD: 'Bo mạch chủ',
  RAM: 'RAM',
  STORAGE: 'Lưu trữ',
  GPU: 'Card đồ họa',
  PSU: 'Nguồn',
  CASE: 'Vỏ máy',
  COOLER: 'Tản nhiệt',
  MONITOR: 'Màn hình',
  KEYBOARD: 'Bàn phím',
  MOUSE: 'Chuột',
}

const BUILD_STATUS_LABELS: Record<BuildRecommendation['status'], string> = {
  recommended: 'Phù hợp ngân sách',
  over_budget: 'Vượt ngân sách',
  insufficient_catalog: 'Catalog chưa đủ linh kiện',
  needs_clarification: 'Cần làm rõ thông tin',
  no_compatible_build: 'Chưa tìm được cấu hình tương thích',
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function BuildSummary({ build }: { build: BuildRecommendation }) {
  return (
    <section
      aria-label="Cấu hình PC được tư vấn"
      className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
          Cấu hình đề xuất
        </h4>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-blue-800">
          {BUILD_STATUS_LABELS[build.status]}
        </span>
      </div>

      {build.items.length > 0 && (
        <ul className="space-y-2">
          {build.items.map((item) => (
            <li key={`${item.role}-${item.id}`} className="flex gap-2.5 rounded-lg bg-white p-2">
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-md bg-slate-50 object-contain"
                  loading="lazy"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500"
                >
                  PC
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {BUILD_ROLE_LABELS[item.role] ?? item.role}
                  {item.owned && <span className="ml-1.5 normal-case text-emerald-700">Đã có</span>}
                </p>
                <Link
                  href={`/products/${encodeURIComponent(item.slug)}`}
                  className="line-clamp-2 text-xs font-semibold text-slate-800 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {item.name}
                </Link>
                {item.owned ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700">Không tính vào chi phí mua</p>
                ) : (
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-bold text-blue-700">{formatPrice(item.appliedPrice)}</span>
                    {item.savings > 0 && (
                      <>
                        <span className="text-slate-400 line-through">{formatPrice(item.listPrice)}</span>
                        <span className="text-emerald-700">Tiết kiệm {formatPrice(item.savings)}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {build.items.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-blue-200 pt-2 text-xs">
          <dt className="text-slate-600">Tổng giá niêm yết</dt>
          <dd className="text-right font-medium text-slate-800">{formatPrice(build.totalListPrice)}</dd>
          <dt className="text-slate-600">Tổng thanh toán</dt>
          <dd className="text-right font-bold text-blue-800">{formatPrice(build.totalPayable)}</dd>
          <dt className="text-slate-600">Tiết kiệm từ giá bán</dt>
          <dd className="text-right font-medium text-emerald-700">{formatPrice(build.totalSavings)}</dd>
          <dt className="text-slate-600">Ngân sách</dt>
          <dd className="text-right font-medium text-slate-800">{formatPrice(build.budgetVnd)}</dd>
          <dt className="text-slate-600">
            {build.withinBudget ? 'Còn lại' : build.status === 'over_budget' ? 'Cần thêm' : 'Trạng thái ngân sách'}
          </dt>
          <dd className="text-right font-medium text-slate-800">
            {build.withinBudget
              ? formatPrice(build.remainingBudget)
              : build.status === 'over_budget'
                ? formatPrice(build.deficit)
                : 'Chưa xác định'}
          </dd>
        </dl>
      )}

      {build.verified.length > 0 && (
        <div className="text-xs">
          <h5 className="font-semibold text-slate-700">Đã kiểm tra tương thích</h5>
          <ul className="mt-1 list-inside list-disc text-slate-600">
            {build.verified.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
      {(build.unverified.length > 0 || build.warnings.length > 0) && (
        <div className="text-xs text-amber-800">
          <h5 className="font-semibold">Chưa xác minh / lưu ý</h5>
          <ul className="mt-1 list-inside list-disc">
            {[...new Set([...build.unverified, ...build.warnings])].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {build.alternatives.some((alternative) => alternative.items.length > 0) && (
        <div className="border-t border-blue-200 pt-2">
          <h5 className="text-xs font-semibold text-slate-700">Phương án thay thế trong ngân sách</h5>
          {build.alternatives.filter((alternative) => alternative.items.length > 0).map((alternative, index) => (
            <div key={index} className="mt-2 rounded-lg bg-white p-2.5">
              <ul className="space-y-1 text-xs text-slate-700">
                {alternative.items.map((item) => (
                  <li key={`${item.role}-${item.id}`}>
                    <span className="font-medium">{BUILD_ROLE_LABELS[item.role] ?? item.role}:</span>{' '}
                    <Link
                      href={`/products/${encodeURIComponent(item.slug)}`}
                      className="hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {item.name}
                    </Link>
                    {!item.owned && <span> — {formatPrice(item.appliedPrice)}</span>}
                    {item.owned && <span className="text-emerald-700"> — Đã có</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-semibold text-blue-800">
                Tổng thanh toán: {formatPrice(alternative.totalPayable)}
                {' · '}Còn lại: {formatPrice(alternative.remainingBudget)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

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

            {message.build && <BuildSummary build={message.build} />}

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
