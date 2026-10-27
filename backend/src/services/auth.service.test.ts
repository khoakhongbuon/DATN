import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type {
  AuthRepository,
  AuthSessionRecord,
  AuthUserRecord,
} from './auth.service'
import { createAuthService } from './auth.service'

class MemoryAuthRepository implements AuthRepository {
  users: AuthUserRecord[] = []
  sessions: AuthSessionRecord[] = []

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null
  }

  async findUserById(id: string) {
    return this.users.find((user) => user.id === id) ?? null
  }

  async findUserByGoogleSubject(subject: string) {
    return this.users.find((user) => user.googleSubject === subject) ?? null
  }

  async createUser(data: Pick<AuthUserRecord, 'name' | 'email' | 'password' | 'role'> & { googleSubject?: string | null }) {
    const user: AuthUserRecord = {
      id: `user-${this.users.length + 1}`,
      ...data,
      googleSubject: data.googleSubject ?? null,
      phone: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    this.users.push(user)
    return user
  }

  async updateGoogleSubject(id: string, googleSubject: string) {
    const user = this.users.find((item) => item.id === id)
    assert.ok(user)
    user.googleSubject = googleSubject
    return user
  }

  async createSession(data: Pick<AuthSessionRecord, 'userId' | 'tokenHash' | 'expiresAt'>) {
    const session: AuthSessionRecord = {
      id: `session-${this.sessions.length + 1}`,
      ...data,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }
    this.sessions.push(session)
    return session
  }

  async findSessionByHash(tokenHash: string) {
    const session = this.sessions.find((item) => item.tokenHash === tokenHash)
    if (!session) return null
    const user = this.users.find((item) => item.id === session.userId)
    if (!user) return null
    return { ...session, user: { role: user.role } }
  }

  async deleteSessionByHash(tokenHash: string) {
    this.sessions = this.sessions.filter((item) => item.tokenHash !== tokenHash)
  }
}

function createTestService(
  now: Date,
  verifyGoogleToken: (idToken: string) => Promise<{ subject: string; email: string; name: string | null }> =
    async () => ({ subject: 'google-subject', email: 'google@example.com', name: 'Google User' }),
) {
  const repository = new MemoryAuthRepository()
  const service = createAuthService({
    repository,
    hashPassword: (password) => bcrypt.hash(password, 4),
    comparePassword: bcrypt.compare,
    now: () => now,
    verifyGoogleToken,
  })
  return { repository, service }
}

test('registration normalizes email, hashes the password, and creates a revocable session', async () => {
  const { repository, service } = createTestService(new Date('2026-01-01T00:00:00.000Z'))

  const result = await service.register('  Linh Nguyen ', '  Linh@Example.com ', 'correct-horse')

  assert.equal(result.user.name, 'Linh Nguyen')
  assert.equal(result.user.email, 'linh@example.com')
  assert.equal(result.user.role, Role.USER)
  assert.equal('password' in result.user, false)
  assert.notEqual(repository.users[0].password, 'correct-horse')
  assert.equal(repository.sessions.length, 1)
  assert.notEqual(repository.sessions[0].tokenHash, result.session.secret)
  assert.equal(result.session.expiresAt.toISOString(), '2026-01-08T00:00:00.000Z')
})

test('registration rejects an already registered normalized email', async () => {
  const { repository, service } = createTestService(new Date())
  await repository.createUser({
    name: 'Existing',
    email: 'existing@example.com',
    password: await bcrypt.hash('password-123', 4),
    role: Role.USER,
  })

  await assert.rejects(
    service.register('Other', ' EXISTING@example.com ', 'password-456'),
    (error: unknown) => {
      assert.deepEqual(error, { status: 409, message: 'Email already registered' })
      return true
    },
  )
})

test('login accepts the correct password and uses one generic error for invalid credentials', async () => {
  const { repository, service } = createTestService(new Date())
  await repository.createUser({
    name: 'Linh',
    email: 'linh@example.com',
    password: await bcrypt.hash('correct-horse', 4),
    role: Role.USER,
  })

  const result = await service.login('LINH@example.com', 'correct-horse')
  assert.equal(result.user.email, 'linh@example.com')
  assert.equal(repository.sessions.length, 1)

  await assert.rejects(
    service.login('linh@example.com', 'wrong-password'),
    (error: unknown) => {
      assert.deepEqual(error, { status: 401, message: 'Invalid email or password' })
      return true
    },
  )
  await assert.rejects(
    service.login('missing@example.com', 'wrong-password'),
    (error: unknown) => {
      assert.deepEqual(error, { status: 401, message: 'Invalid email or password' })
      return true
    },
  )
})

test('login refuses Google-only users without revealing their account type', async () => {
  const { repository, service } = createTestService(new Date())
  const user = await repository.createUser({
    name: 'Google User',
    email: 'google@example.com',
    password: null,
    role: Role.USER,
  })
  user.googleSubject = 'google-subject'

  await assert.rejects(
    service.login('google@example.com', 'any-password'),
    (error: unknown) => {
      assert.deepEqual(error, { status: 401, message: 'Invalid email or password' })
      return true
    },
  )
})

test('logout revokes the opaque session and expired sessions are rejected', async () => {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const { repository, service } = createTestService(now)
  const registered = await service.register('Linh', 'linh@example.com', 'correct-horse')

  assert.equal((await service.authenticateSession(registered.session.secret)).userId, registered.user.id)
  await service.revokeSession(registered.session.secret)
  await assert.rejects(service.authenticateSession(registered.session.secret))

  const secondSession = await service.createSession(registered.user.id)
  now.setTime(new Date('2026-01-08T00:00:00.000Z').getTime())
  await assert.rejects(service.authenticateSession(secondSession.secret))
  assert.equal(repository.sessions.length, 1)
})

test('Google login creates a normal user and a session from the verified identity', async () => {
  const { repository, service } = createTestService(new Date())

  const result = await service.googleLogin('verified-id-token')

  assert.equal(result.user.email, 'google@example.com')
  assert.equal(result.user.name, 'Google User')
  assert.equal(result.user.role, Role.USER)
  assert.equal(result.user.googleLinked, true)
  assert.equal(repository.users[0].password, null)
  assert.equal(repository.users[0].googleSubject, 'google-subject')
  assert.equal(repository.sessions.length, 1)
})

test('Google login does not auto-link an existing password account by email', async () => {
  const { repository, service } = createTestService(new Date())
  const existing = await repository.createUser({
    name: 'Password account',
    email: 'google@example.com',
    password: await bcrypt.hash('password-123', 4),
    role: Role.USER,
  })

  await assert.rejects(
    service.googleLogin('verified-id-token'),
    (error: unknown) => {
      assert.deepEqual(error, {
        status: 409,
        message: 'This email already has an account. Sign in with email and password, then link Google from your account.',
      })
      return true
    },
  )
  assert.equal(existing.googleSubject, null)
  assert.equal(repository.sessions.length, 0)
})

test('Google linking requires the signed-in email and rejects subjects owned by another user', async () => {
  const { repository, service } = createTestService(new Date(), async (token) => ({
    subject: token === 'other-subject' ? 'subject-owned-by-another-user' : 'google-subject',
    email: token === 'wrong-email' ? 'different@example.com' : 'google@example.com',
    name: 'Google User',
  }))
  const user = await repository.createUser({
    name: 'Google User',
    email: 'google@example.com',
    password: await bcrypt.hash('password-123', 4),
    role: Role.USER,
  })

  await assert.rejects(service.linkGoogle(user.id, 'wrong-email'))

  await repository.createUser({
    name: 'Another user',
    email: 'another@example.com',
    password: null,
    role: Role.USER,
    googleSubject: 'subject-owned-by-another-user',
  })
  await assert.rejects(service.linkGoogle(user.id, 'other-subject'))

  const linked = await service.linkGoogle(user.id, 'verified-id-token')
  assert.equal(linked.googleLinked, true)
  assert.equal(user.googleSubject, 'google-subject')
})
