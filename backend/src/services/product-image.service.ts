import prisma from '../config/prisma'

export async function ensureProductExists(productId: string) {
  const p = await prisma.product.findUnique({ where: { id: productId } })
  return !!p
}

export async function getImages(productId: string) {
  const exists = await ensureProductExists(productId)
  if (!exists) throw { status: 404, message: 'Product not found' }

  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [ { sortOrder: 'asc' }, { id: 'asc' } ],
  })
}

export async function getImage(productId: string, imageId: string) {
  const img = await prisma.productImage.findUnique({ where: { id: imageId } })
  if (!img || img.productId !== productId) throw { status: 404, message: 'Image not found' }
  return img
}

export async function createImage(productId: string, data: { url: string; alt?: string | null; sortOrder?: number }) {
  const exists = await ensureProductExists(productId)
  if (!exists) throw { status: 404, message: 'Product not found' }

  if (!data.url) throw { status: 400, message: 'url is required' }
  const payload: any = { url: data.url, alt: data.alt ?? null, sortOrder: data.sortOrder ?? 0, productId }

  return prisma.productImage.create({ data: payload })
}

export async function updateImage(productId: string, imageId: string, updates: { url?: string; alt?: string | null; sortOrder?: number }) {
  const img = await prisma.productImage.findUnique({ where: { id: imageId } })
  if (!img || img.productId !== productId) throw { status: 404, message: 'Image not found' }

  const data: any = {}
  if (updates.url !== undefined) data.url = updates.url
  if (updates.alt !== undefined) data.alt = updates.alt
  if (updates.sortOrder !== undefined) data.sortOrder = updates.sortOrder

  return prisma.productImage.update({ where: { id: imageId }, data })
}

export async function deleteImage(productId: string, imageId: string) {
  const img = await prisma.productImage.findUnique({ where: { id: imageId } })
  if (!img || img.productId !== productId) throw { status: 404, message: 'Image not found' }

  await prisma.productImage.delete({ where: { id: imageId } })
  return true
}
