import type { ReactNode } from 'react'
import Header from './Header'
import Footer from './Footer'
import AiChatbot from './AiChatbot'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-3 py-2 text-sm font-bold text-blue-700 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Bỏ qua đến nội dung chính
      </a>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      <AiChatbot />
    </div>
  )
}
