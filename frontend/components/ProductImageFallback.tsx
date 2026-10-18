import { useState, ImgHTMLAttributes } from 'react'

interface ProductImageFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  src?: string | null
  alt?: string | null
  name: string
  categorySlug?: string | null
  fallbackClassName?: string
}

export function ProductImageFallback({
  src,
  alt,
  name,
  categorySlug,
  className,
  fallbackClassName,
  ...props
}: ProductImageFallbackProps) {
  const [hasError, setHasError] = useState(false)
  const [svgFallbackError, setSvgFallbackError] = useState(false)

  const initials = (name || '').trim().slice(0, 2).toUpperCase() || 'SP'
  const fallbackSvgUrl = categorySlug ? `/images/products/placeholders/${categorySlug}.svg` : null

  // If primary image missing or failed
  if (!src || hasError) {
    if (fallbackSvgUrl && !svgFallbackError) {
      return (
        <img
          src={fallbackSvgUrl}
          alt={alt || name}
          className={className}
          onError={() => setSvgFallbackError(true)}
          {...props}
        />
      )
    }

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

