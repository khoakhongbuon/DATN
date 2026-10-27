import assert from 'node:assert/strict'
import type { CookieOptions, Request, Response } from 'express'
import { Role } from '@prisma/client'
import { test } from 'node:test'
import { createAuthController } from './auth.controller'

const sessionSecret = 's'.repeat(43)
const expiresAt = new Date('2026-01-08T00:00:00.000Z')
const publicUser = {
  id: 'user-1',
  name: 'Linh Nguyen',
  email: 'linh@example.com',
  phone: null,
  role: Role.USER,
  googleLinked: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}
const authResult = { user: publicUser, session: { secret: sessionSecret, expiresAt } }

function makeController() {
  let revokedSecret: string | undefined
  const controller = createAuthController({
    register: async () => authResult,
    login: async () => authResult,
    googleLogin: async () => authResult,
    linkGoogle: async () => ({ ...publicUser, googleLinked: true }),
    getMe: async () => publicUser,
    revokeSession: async (secret) => { revokedSecret = secret },
  })
  return { controller, getRevokedSecret: () => revokedSecret }
}

function mockResponse() {
  const state: {
    status?: number
    body?: unknown
    cookie?: { name: string; value: string; options?: CookieOptions }
    clearedCookie?: { name: string; options?: CookieOptions }
  } = {}

  const response = {
    status(statusCode: number) {
      state.status = statusCode
      return response
    },
    json(body: unknown) {
      state.body = body
      return response
    },
    cookie(name: string, value: string, options?: CookieOptions) {
      state.cookie = { name, value, options }
      return response
    },
    clearCookie(name: string, options?: CookieOptions) {
      state.clearedCookie = { name, options }
      return response
    },
  } as Response

  return { response, state }
}

function mockRequest(body: unknown = {}, cookie?: string, userId?: string) {
  return {
    body,
    userId,
    headers: { cookie },
  } as Request
}

test('register sets an HttpOnly session cookie and omits the secret from JSON', async () => {
  const { controller } = makeController()
  const { response, state } = mockResponse()

  await controller.register(mockRequest(), response, () => undefined)

  assert.equal(state.status, 201)
  assert.deepEqual(state.cookie, {
    name: 'pc_store_session',
    value: sessionSecret,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    },
  })
  assert.deepEqual(state.body, { success: true, data: { user: publicUser } })
  assert.equal(JSON.stringify(state.body).includes(sessionSecret), false)
})

test('Google login accepts only the credential field and creates the same cookie session', async () => {
  const { controller } = makeController()
  const { response, state } = mockResponse()

  await controller.googleLogin(mockRequest({ credential: 'verified-id-token' }), response, () => undefined)

  assert.equal(state.cookie?.name, 'pc_store_session')
  assert.deepEqual(state.body, { success: true, data: { user: publicUser } })
})

test('logout revokes the presented cookie session and clears the cookie', async () => {
  const { controller, getRevokedSecret } = makeController()
  const { response, state } = mockResponse()

  await controller.logout(mockRequest({}, `pc_store_session=${sessionSecret}`), response, () => undefined)

  assert.equal(getRevokedSecret(), sessionSecret)
  assert.equal(state.clearedCookie?.name, 'pc_store_session')
  assert.equal(state.clearedCookie?.options?.httpOnly, true)
  assert.equal(state.clearedCookie?.options?.sameSite, 'lax')
  assert.deepEqual(state.body, { success: true })
})
