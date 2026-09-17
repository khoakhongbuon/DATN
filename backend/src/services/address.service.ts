import prisma from '../config/prisma'

type AddressInput = {
  recipientName: unknown
  phone: unknown
  province: unknown
  district: unknown
  ward: unknown
  detail: unknown
  isDefault?: unknown
}

function serviceError(status: number, message: string): never {
  throw { status, message }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    serviceError(400, `${field} is required`)
  }
  return value.trim()
}

function parseDefault(value: unknown): boolean {
  if (value === undefined) return false
  if (typeof value !== 'boolean') serviceError(400, 'isDefault must be a boolean')
  return value
}

function validateAddressInput(input: AddressInput, partial = false) {
  const data: Record<string, unknown> = {}
  const fields = ['recipientName', 'phone', 'province', 'district', 'ward', 'detail'] as const

  for (const field of fields) {
    if (partial && input[field] === undefined) continue
    data[field] = requiredText(input[field], field)
  }

  if (input.isDefault !== undefined) data.isDefault = parseDefault(input.isDefault)
  return data
}

async function ensureUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) serviceError(404, 'User not found')
}

async function getOwnedAddress(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } })
  if (!address) serviceError(404, 'Address not found')
  return address
}

export async function listAddresses(userId: string) {
  await ensureUser(userId)
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getAddress(userId: string, addressId: string) {
  await ensureUser(userId)
  return getOwnedAddress(userId, addressId)
}

export async function createAddress(userId: string, input: AddressInput) {
  await ensureUser(userId)
  const data = validateAddressInput(input)

  return prisma.$transaction(async (transaction) => {
    if (data.isDefault === true) {
      await transaction.address.updateMany({ where: { userId }, data: { isDefault: false } })
    }

    return transaction.address.create({
      data: {
        userId,
        recipientName: data.recipientName as string,
        phone: data.phone as string,
        province: data.province as string,
        district: data.district as string,
        ward: data.ward as string,
        detail: data.detail as string,
        isDefault: data.isDefault === true,
      },
    })
  })
}

export async function updateAddress(userId: string, addressId: string, input: AddressInput) {
  await getOwnedAddress(userId, addressId)
  const data = validateAddressInput(input, true)

  return prisma.$transaction(async (transaction) => {
    if (data.isDefault === true) {
      await transaction.address.updateMany({
        where: { userId, id: { not: addressId } },
        data: { isDefault: false },
      })
    }

    return transaction.address.update({
      where: { id: addressId },
      data,
    })
  })
}

export async function deleteAddress(userId: string, addressId: string) {
  await getOwnedAddress(userId, addressId)
  await prisma.address.delete({ where: { id: addressId } })
}
