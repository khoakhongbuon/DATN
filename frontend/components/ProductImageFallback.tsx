import { useState, ImgHTMLAttributes } from 'react'

interface ProductImageFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  src?: string | null
  alt?: string | null
  name: string
  fallbackClassName?: string
}

export function ProductImageFallback({
  src,
  alt,
  name,
  className,
  fallbackClassName,
  ...props
}: ProductImageFallbackProps) {
  const [hasError, setHasError] = useState(false)

  const initials = (name || '').trim().slice(0, 2).toUpperCase() || 'SP'

  if (!src || hasError) {
    return (
      <span
        className={fallbackClassName || 'font-black select-none'}
        aria-hidden="true"
      >
        {initials}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={alt || name}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  )
}
