import { useEffect, useRef, useState } from 'react'
import ChatMessage, { TypingIndicator } from './ChatMessage'
import type { AiChatResponse, ChatMessageItem } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'

const INITIAL_MESSAGE: ChatMessageItem = {
  id: 'greeting',
  role: 'assistant',
  content:
    'Xin chào! Tôi là trợ lý AI của TK. Tôi có thể giúp bạn tìm linh kiện, tư vấn theo ngân sách hoặc giải thích về cấu hình PC.',
  createdAt: 0,
}

const QUICK_SUGGESTIONS = [
  'Tư vấn CPU gaming',
  'Build PC 20 triệu',
  'Tìm SSD 1TB',
  'Tư vấn RAM DDR4',
]

function getChatHistory(messages: ChatMessageItem[]) {
  let totalLength = 0
  return messages
    .filter((message) => message.id !== INITIAL_MESSAGE.id && !message.isError)
    .slice(-8)
    .reverse()
    .filter((message) => {
      if (message.content.length > 2000 || totalLength + message.content.length > 6000) return false
      totalLength += message.content.length
      return true
    })
    .reverse()
    .map(({ role, content }) => ({ role, content }))
}

export default function AiChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_MESSAGE])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when messages update or when loading state changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, isOpen])

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  const sendMessage = async (rawText: string) => {
    const text = rawText.trim()
    if (!text || isLoading) return

    const userMessage: ChatMessageItem = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ message: text, history: getChatHistory(messages) }),
      })

      if (!response.ok) {
        throw new Error('Dịch vụ AI phản hồi không hợp lệ')
      }

      const data = (await response.json()) as AiChatResponse

      if (!data.success) {
        throw new Error(data.message || 'Lỗi xử lý')
      }

      const aiMessage: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        products: Array.isArray(data.products) ? data.products : [],
        build: data.build,
        createdAt: Date.now(),
      }

      setMessages((prev) => [...prev, aiMessage])
    } catch {
      const errorMessage: ChatMessageItem = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Xin lỗi, hiện tại dịch vụ AI chưa khả dụng. Vui lòng thử lại sau.',
        isError: true,
        failedPrompt: text,
        createdAt: Date.now(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const handleClearChat = () => {
    setMessages([INITIAL_MESSAGE])
    setIsLoading(false)
    setInputValue('')
  }

  const handleRetry = (prompt: string) => {
    sendMessage(prompt)
  }

  return (
    <aside
      aria-label="Trợ lý ảo TK AI"
      className="fixed bottom-4 right-4 z-50 sm:bottom-6 sm:right-6"
    >
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 p-3.5 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 sm:px-4 sm:py-3.5"
          aria-label="Mở cửa sổ trợ lý ảo TK AI"
        >
          <div className="relative flex h-6 w-6 items-center justify-center">
            <svg
              className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-300" />
            </span>
          </div>
          <span className="hidden text-sm font-black tracking-wide sm:inline">Tư vấn AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Hộp thoại TK AI Assistant"
          className="flex h-[560px] max-h-[85vh] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 shadow-2xl shadow-blue-950/15 transition-all duration-300 sm:w-[400px]"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-blue-900/20 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 px-4 py-3 text-white shadow-xs">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black backdrop-blur-xs ring-1 ring-white/20"
                aria-hidden="true"
              >
                TK
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black leading-tight tracking-tight">
                  TK AI Assistant
                </h3>
                <p className="truncate text-[11px] font-medium text-blue-200">
                  Trợ lý tư vấn linh kiện và PC
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Clear Chat Button */}
              <button
                type="button"
                onClick={handleClearChat}
                className="rounded-lg p-1.5 text-blue-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Xóa cuộc trò chuyện"
                title="Xóa cuộc trò chuyện"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-blue-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Đóng trợ lý ảo"
                title="Đóng cửa sổ"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </header>

          {/* Messages Container */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-200">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onRetry={handleRetry} />
            ))}

            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions (Shown when only greeting is in chat) */}
          {messages.length === 1 && !isLoading && (
            <div className="border-t border-slate-200/60 bg-white/70 px-4 py-2.5 backdrop-blur-xs">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Gợi ý câu hỏi:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => sendMessage(suggestion)}
                    className="rounded-full border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-600 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Area */}
          <footer className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(inputValue)
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="ai-chat-input" className="sr-only">
                Nhập câu hỏi bạn muốn TK tư vấn
              </label>
              <textarea
                ref={inputRef}
                id="ai-chat-input"
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Bạn muốn TK tư vấn gì?"
                disabled={isLoading}
                className="max-h-24 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <svg
                  className="h-4 w-4 transform rotate-90"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </form>
          </footer>
        </section>
      )}
    </aside>
  )
}
