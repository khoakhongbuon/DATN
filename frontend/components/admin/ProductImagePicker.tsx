import { useRef, useState, type ChangeEvent } from 'react'

export type ProductImageItem = {
  id?: string
  url: string
  alt?: string | null
  sortOrder?: number | null
  isNew?: boolean
  file?: File
}

type ProductImagePickerProps = {
  images: ProductImageItem[]
  onChange: (images: ProductImageItem[]) => void
  onDeleteExisting?: (imageId: string) => Promise<void>
  onSaveExisting?: (image: ProductImageItem) => Promise<void>
  disabled?: boolean
  maxSizeMB?: number
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = '.jpg, .jpeg, .png, .webp'

export function ProductImagePicker({
  images,
  onChange,
  onDeleteExisting,
  onSaveExisting,
  disabled = false,
  maxSizeMB = 5,
}: ProductImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [altInput, setAltInput] = useState('')
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [processingFiles, setProcessingFiles] = useState(false)

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Định dạng tệp "${file.name}" không hợp lệ. Chỉ chấp nhận JPG/JPEG, PNG, WebP.`
    }
    const maxBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxBytes) {
      const actualMB = (file.size / (1024 * 1024)).toFixed(1)
      return `Tệp "${file.name}" dung lượng ${actualMB}MB vượt quá giới hạn tối đa ${maxSizeMB}MB.`
    }
    return null
  }

  const handleFilesSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList || fileList.length === 0) return

    setErrorMessage('')
    setProcessingFiles(true)

    const newItems: ProductImageItem[] = []
    const filesArray = Array.from(fileList)

    for (const file of filesArray) {
      const error = validateFile(file)
      if (error) {
        setErrorMessage(error)
        setProcessingFiles(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      // Convert file to Base64 data URL for instant client-side preview
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh từ máy'))
        reader.readAsDataURL(file)
      })

      newItems.push({
        url: dataUrl,
        alt: file.name.replace(/\.[^/.]+$/, ''),
        sortOrder: images.length + newItems.length,
        isNew: true,
        file,
      })
    }

    onChange([...images, ...newItems])
    setProcessingFiles(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleReplaceFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || replacingIndex === null) return

    setErrorMessage('')
    const error = validateFile(file)
    if (error) {
      setErrorMessage(error)
      if (replaceInputRef.current) replaceInputRef.current.value = ''
      setReplacingIndex(null)
      return
    }

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })

    const targetItem = images[replacingIndex]
    const updated: ProductImageItem = {
      ...targetItem,
      url: dataUrl,
      file,
      isNew: true,
    }

    const nextList = [...images]
    nextList[replacingIndex] = updated
    onChange(nextList)

    if (onSaveExisting && targetItem.id) {
      void onSaveExisting(updated)
    }

    setReplacingIndex(null)
    if (replaceInputRef.current) replaceInputRef.current.value = ''
  }

  const handleAddFromUrl = () => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setErrorMessage('')

    const newItem: ProductImageItem = {
      url: trimmed,
      alt: altInput.trim() || null,
      sortOrder: images.length,
      isNew: true,
    }

    onChange([...images, newItem])
    setUrlInput('')
    setAltInput('')
    setShowUrlForm(false)
  }

  const handleRemove = async (index: number) => {
    const target = images[index]
    if (target.id && onDeleteExisting) {
      try {
        await onDeleteExisting(target.id)
      } catch (err) {
        setErrorMessage((err as Error).message || 'Không thể xóa ảnh khỏi hệ thống.')
        return
      }
    }

    const next = images.filter((_, idx) => idx !== index)
    // Recompute sortOrders
    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx }))
    onChange(reordered)
  }

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= images.length) return

    const next = [...images]
    const temp = next[index]
    next[index] = next[targetIndex]
    next[targetIndex] = temp

    const reordered = next.map((item, idx) => ({ ...item, sortOrder: idx }))
    onChange(reordered)
  }

  const handleAltChange = (index: number, newAlt: string) => {
    const next = [...images]
    next[index] = { ...next[index], alt: newAlt }
    onChange(next)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const triggerReplace = (index: number) => {
    setReplacingIndex(index)
    replaceInputRef.current?.click()
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-base font-bold text-slate-900">Hình ảnh sản phẩm</h4>
          <p className="text-xs text-slate-500">
            Chọn ảnh từ máy tính (JPG, PNG, WebP tối đa {maxSizeMB}MB) hoặc nhập URL ảnh trực tiếp.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={disabled || processingFiles}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:bg-slate-300"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{processingFiles ? 'Đang xử lý...' : '+ Chọn ảnh từ máy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUrlForm((prev) => !prev)}
            disabled={disabled}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            {showUrlForm ? 'Đóng URL' : '+ Thêm bằng URL'}
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS}
        onChange={handleReplaceFileSelected}
        className="hidden"
      />

      {/* Error banner */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => setErrorMessage('')} className="ml-2 font-black">×</button>
        </div>
      )}

      {/* Expandable URL input form */}
      {showUrlForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 space-y-3">
          <p className="text-xs font-bold text-blue-900">Nhập đường dẫn ảnh trực tiếp (URL / CDN)</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.webp hoặc /images/products/..."
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              placeholder="Mô tả alt (tùy chọn)"
              className="sm:w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddFromUrl}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
            >
              Thêm URL
            </button>
          </div>
        </div>
      )}

      {/* Images gallery / preview list */}
      {images.length === 0 ? (
        <div
          onClick={triggerFileInput}
          className="group cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-8 text-center transition hover:border-blue-400 hover:bg-blue-50/30"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm group-hover:text-blue-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-6 w-6">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700 group-hover:text-blue-700">
            Bấm để chọn ảnh từ máy tính
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Định dạng JPG, PNG, WebP dung lượng tối đa 5MB mỗi ảnh
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((item, index) => (
            <div
              key={item.id || `temp-${index}`}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xs"
            >
              {/* Thumbnail preview */}
              <div className="relative aspect-square w-full bg-slate-100">
                <img
                  src={item.url}
                  alt={item.alt || `Product image ${index + 1}`}
                  className="h-full w-full object-contain p-1"
                />

                {/* Primary Badge */}
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs">
                    Ảnh chính
                  </span>
                )}

                {/* New Badge */}
                {item.isNew && (
                  <span className="absolute right-1.5 top-1.5 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    Mới
                  </span>
                )}
              </div>

              {/* Alt text and Actions */}
              <div className="flex flex-1 flex-col justify-between p-2 space-y-2">
                <input
                  type="text"
                  value={item.alt ?? ''}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  placeholder="Mô tả alt..."
                  className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none focus:border-blue-500"
                />

                <div className="flex items-center justify-between gap-1 text-[11px]">
                  {/* Order controls */}
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      title="Chuyển lên trước"
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      title="Chuyển xuống sau"
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Replace and Delete buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => triggerReplace(index)}
                      title="Thay thế bằng ảnh khác"
                      className="rounded px-1.5 py-0.5 font-semibold text-blue-700 hover:bg-blue-100"
                    >
                      Đổi
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(index)}
                      title="Xóa ảnh"
                      className="rounded px-1.5 py-0.5 font-semibold text-red-700 hover:bg-red-100"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
