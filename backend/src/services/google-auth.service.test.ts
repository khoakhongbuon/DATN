import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createGoogleTokenVerifier } from './google-auth.service'

const validPayload = {
  sub: 'google-subject',
  email: 'person@example.com',
  email_verified: true,
  name: 'Person',
  iss: 'https://accounts.google.com',
}

test('Google verifier checks the configured audience and returns only verified identity fields', async () => {
  let received: { idToken: string; audience: string } | undefined
  const verify = createGoogleTokenVerifier({
    verifyIdToken: async (options) => {
      received = options
      return { getPayload: () => validPayload }
    },
  }, () => 'google-client-id')

  const identity = await verify('opaque-google-token')

  assert.deepEqual(received, {
    idToken: 'opaque-google-token',
    audience: 'google-client-id',
  })
  assert.deepEqual(identity, {
    subject: 'google-subject',
    email: 'person@example.com',
    name: 'Person',
  })
})

test('Google verifier gives a configuration error when the client ID is missing', async () => {
  const verify = createGoogleTokenVerifier({
    verifyIdToken: async () => ({ getPayload: () => validPayload }),
  }, () => undefined)

  await assert.rejects(verify('opaque-google-token'), (error: unknown) => {
    assert.deepEqual(error, {
      status: 503,
      message: 'Google sign-in is not configured. Please use email and password.',
    })
    return true
  })
})

test('Google verifier rejects invalid, unverified, or incorrectly issued credentials safely', async () => {
  const verifyRejected = createGoogleTokenVerifier({
    verifyIdToken: async () => { throw new Error('private verifier detail') },
  }, () => 'google-client-id')
  await assert.rejects(verifyRejected('invalid'), (error: unknown) => {
    assert.deepEqual(error, { status: 401, message: 'Google credential could not be verified' })
    return true
  })

  for (const payload of [
    { ...validPayload, email_verified: false },
    { ...validPayload, iss: 'https://attacker.example' },
    { ...validPayload, sub: '' },
    { ...validPayload, email: '' },
  ]) {
    const verify = createGoogleTokenVerifier({
      verifyIdToken: async () => ({ getPayload: () => payload }),
    }, () => 'google-client-id')
    await assert.rejects(verify('opaque-google-token'), (error: unknown) => {
      assert.deepEqual(error, { status: 401, message: 'Google credential could not be verified' })
      return true
    })
  }
})
