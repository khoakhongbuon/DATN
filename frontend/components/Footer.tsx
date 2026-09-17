import Link from 'next/link'

const footerSections = [
  {
    title: 'GIỚI THIỆU VỀ CHÚNG TÔI',
    items: ['Về chúng tôi', 'Thông tin liên hệ', 'Tin tức', 'Tuyển dụng', 'Hệ thống cửa hàng'],
  },
  {
    title: 'HỖ TRỢ KHÁCH HÀNG',
    items: ['Hướng dẫn mua hàng trực tuyến', 'Hướng dẫn thanh toán', 'Gửi yêu cầu bảo hành', 'Góp ý, Khiếu nại'],
  },
  {
    title: 'CHÍNH SÁCH CHUNG',
    items: [
      'Chính sách, quy định chung',
      'Chính sách vận chuyển',
      'Chính sách bảo hành',
      'Dịch vụ tính phí',
      'Chính sách nhập lại tín phí',
      'Chính sách cho doanh nghiệp',
      'Chính sách bảo mật',
    ],
  },
  {
    title: 'THÔNG TIN KHUYẾN MẠI',
    items: ['Thông tin khuyến mại', 'Sản phẩm khuyến mại', 'Sản phẩm bán chạy', 'Sản phẩm mới', 'Sản phẩm nổi bật'],
  },
]

const socialLinks = [
  { label: 'Instagram', className: 'bg-gradient-to-br from-pink-500 to-orange-500', href: '#' },
  { label: 'Facebook', className: 'bg-gradient-to-br from-blue-600 to-indigo-700', href: '#' },
  { label: 'TikTok', className: 'bg-gradient-to-br from-slate-900 to-slate-700', href: '#' },
  { label: 'Youtube', className: 'bg-gradient-to-br from-red-500 to-red-700', href: '#' },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f5f7fb] text-slate-700">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-base font-black uppercase tracking-[0.04em] text-slate-900">{section.title}</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item}>
                    <Link href="#" className="transition hover:text-blue-600">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-6 border-t border-slate-200 pt-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-700 text-lg font-black text-white shadow-md shadow-blue-200">
              TK
            </div>
            <p className="text-2xl font-black tracking-[0.08em] text-slate-900">TK</p>
          </div>

          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <Link
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm transition hover:scale-105 ${social.className}`}
              >
                {social.label.slice(0, 1)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
