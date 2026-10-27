import assert from 'node:assert/strict'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { test } from 'node:test'
import {
  createAuthenticateMiddleware,
  createSameOriginMutationMiddleware,
} from './auth.middleware'

const sessionSecret = 'a'.repeat(43)
const frontendOrigin = 'http://localhost:3000'

function mockRequest(headers: Record<string, string> = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name.toLowerCase(), value]),
  )
  return {
    headers: { cookie: normalizedHeaders.cookie },
    method: 'POST',
    get: (name: string) => normalizedHeaders[name.toLowerCase()],
  } as Request
}

function invoke(handler: RequestHandler, req: Request) {
  return new Promise<unknown>((resolve) => {
    const next: NextFunction = (error) => resolve(error)
    void handler(req, {} as Response, next)
  })
}

function statusOf(error: unknown) {
  assert.ok(error && typeof error === 'object' && 'status' in error)
  return error.status
}

test('protected routes reject missing session cookies even when a Bearer token is sent', async () => {
  let authenticatedSecret = ''
  const req = mockRequest({ authorization: `Bearer ${sessionSecret}` })
  const error = await invoke(
    createAuthenticateMiddleware(async (secret) => {
      authenticatedSecret = secret
      return { userId: 'user-1', role: 'USER' }
    }),
    req,
  )

  assert.equal(statusOf(error), 401)
  assert.equal(authenticatedSecret, '')
})

test('protected routes resolve user identity from a valid session cookie', async () => {
  const req = mockRequest({ cookie: `pc_store_session=${sessionSecret}` })
  const error = await invoke(
    createAuthenticateMiddleware(async (secret) => {
      assert.equal(secret, sessionSecret)
      return { userId: 'user-1', role: 'USER' }
    }),
    req,
  )

  assert.equal(error, undefined)
  assert.equal(req.userId, 'user-1')
  assert.equal(req.userRole, 'USER')
})

test('cookie-authenticated mutations reject untrusted origins', async () => {
  const req = mockRequest({
    cookie: `pc_store_session=${sessionSecret}`,
    origin: 'https://attacker.example',
  })
  const error = await invoke(
    createSameOriginMutationMiddleware(() => new Set([frontendOrigin])),
    req,
  )

  assert.equal(statusOf(error), 403)
})

test('cookie-authenticated mutations allow the configured frontend origin', async () => {
  const req = mockRequest({
    cookie: `pc_store_session=${sessionSecret}`,
    origin: frontendOrigin,
  })
  const error = await invoke(
    createSameOriginMutationMiddleware(() => new Set([frontendOrigin])),
    req,
  )

  assert.equal(error, undefined)
})
