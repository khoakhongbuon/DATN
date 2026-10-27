import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import prisma from '../config/prisma'
import { verifyGoogleIdToken, type GoogleIdentity } from './google-auth.service'

export type AuthUserRecord = {
  id: string
  name: string | null
  email: string
  password: string | null
  googleSubject: string | null
  phone: string | null
  role: Role
  createdAt: Date
  updatedAt: Date
}

export type AuthSessionRecord = {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  createdAt: Date
}

export type PublicAuthUser = Omit<AuthUserRecord, 'password' | 'googleSubject'> & {
  googleLinked: boolean
}

export type AuthSessionResult = {
  user: PublicAuthUser
  session: { secret: string; expiresAt: Date }
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>
  findUserById(id: string): Promise<AuthUserRecord | null>
  findUserByGoogleSubject(subject: string): Promise<AuthUserRecord | null>
  createUser(data: Pick<AuthUserRecord, 'name' | 'email' | 'password' | 'role'> & { googleSubject?: string | null }): Promise<AuthUserRecord>
  updateGoogleSubject(id: string, googleSubject: string): Promise<AuthUserRecord>
  createSession(data: Pick<AuthSessionRecord, 'userId' | 'tokenHash' | 'expiresAt'>): Promise<AuthSessionRecord>
  findSessionByHash(tokenHash: string): Promise<(AuthSessionRecord & { user: { role: Role } }) | null>
  deleteSessionByHash(tokenHash: string): Promise<void>
}

type AuthServiceDependencies = {
  repository: AuthRepository
  hashPassword: (password: string) => Promise<string>
  comparePassword: (password: string, hash: string) => Promise<boolean>
  verifyGoogleToken: (idToken: string) => Promise<GoogleIdentity>
  now?: () => Date
  createSecret?: () => string
}

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function authError(status: number, message: string): never {
  throw { status, message }
}

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'code' in error
    && error.code === 'P2002',
  )
}

function normalizeEmail(email: unknown): string {
  if (typeof email !== 'string') authError(400, 'A valid email is required')
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    authError(400, 'A valid email is required')
  }
  return normalizedEmail
}

function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    authError(400, 'Password must be between 8 and 72 characters')
  }
}

function hashSessionSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex')
}

function publicUser(user: AuthUserRecord): PublicAuthUser {
  const { password: _password, googleSubject, ...userData } = user
  return { ...userData, googleLinked: Boolean(googleSubject) }
}

export function createAuthService({
  repository,
  hashPassword,
  comparePassword,
  verifyGoogleToken,
  now = () => new Date(),
  createSecret = () => randomBytes(32).toString('base64url'),
}: AuthServiceDependencies) {
  async function createSession(userId: string) {
    const secret = createSecret()
    const expiresAt = new Date(now().getTime() + SESSION_TTL_MS)
    await repository.createSession({
      userId,
      tokenHash: hashSessionSecret(secret),
      expiresAt,
    })
    return { secret, expiresAt }
  }

  async function register(name: unknown, email: unknown, password: unknown): Promise<AuthSessionResult> {
    if (typeof name !== 'string' || name.trim() === '') authError(400, 'Name is required')
    const normalizedEmail = normalizeEmail(email)
    validatePassword(password)

    if (await repository.findUserByEmail(normalizedEmail)) {
      authError(409, 'Email already registered')
    }

    let user: AuthUserRecord
    try {
      user = await repository.createUser({
        name: name.trim(),
        email: normalizedEmail,
        password: await hashPassword(password),
        role: Role.USER,
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) authError(409, 'Email already registered')
      throw error
    }

    return { user: publicUser(user), session: await createSession(user.id) }
  }

  async function login(email: unknown, password: unknown): Promise<AuthSessionResult> {
    const normalizedEmail = normalizeEmail(email)
    if (typeof password !== 'string' || password.length === 0) {
      authError(400, 'Password is required')
    }

    const user = await repository.findUserByEmail(normalizedEmail)
    const passwordMatches = user?.password
      ? await comparePassword(password, user.password)
      : false
    if (!user || !passwordMatches) authError(401, 'Invalid email or password')

    return { user: publicUser(user), session: await createSession(user.id) }
  }

  async function googleLogin(idToken: string): Promise<AuthSessionResult> {
    const identity = await verifyGoogleToken(idToken)
    const email = normalizeEmail(identity.email)
    const linkedUser = await repository.findUserByGoogleSubject(identity.subject)
    if (linkedUser) {
      return { user: publicUser(linkedUser), session: await createSession(linkedUser.id) }
    }

    if (await repository.findUserByEmail(email)) {
      authError(
        409,
        'This email already has an account. Sign in with email and password, then link Google from your account.',
      )
    }

    let user: AuthUserRecord
    try {
      user = await repository.createUser({
        name: identity.name,
        email,
        password: null,
        googleSubject: identity.subject,
        role: Role.USER,
      })
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        authError(409, 'Google account is already registered. Sign in with that account or contact support.')
      }
      throw error
    }

    return { user: publicUser(user), session: await createSession(user.id) }
  }

  async function linkGoogle(userId: string, idToken: string) {
    const identity = await verifyGoogleToken(idToken)
    const user = await repository.findUserById(userId)
    if (!user) authError(401, 'Authentication required')
    if (normalizeEmail(identity.email) !== normalizeEmail(user.email)) {
      authError(403, 'The verified Google email must match your account email')
    }

    if (user.googleSubject && user.googleSubject !== identity.subject) {
      authError(409, 'A different Google account is already linked')
    }

    const subjectOwner = await repository.findUserByGoogleSubject(identity.subject)
    if (subjectOwner && subjectOwner.id !== user.id) {
      authError(409, 'This Google account is already linked to another account')
    }

    const updatedUser = user.googleSubject
      ? user
      : await repository.updateGoogleSubject(user.id, identity.subject)
    return publicUser(updatedUser)
  }

  async function getMe(userId: string): Promise<PublicAuthUser> {
    const user = await repository.findUserById(userId)
    if (!user) authError(401, 'Authentication required')
    return publicUser(user)
  }

  async function authenticateSession(secret: string) {
    if (typeof secret !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(secret)) {
      authError(401, 'Authentication required')
    }
    const session = await repository.findSessionByHash(hashSessionSecret(secret))
    if (!session || session.expiresAt.getTime() <= now().getTime()) {
      authError(401, 'Authentication required')
    }
    return { userId: session.userId, role: session.user.role }
  }

  async function revokeSession(secret: string | undefined) {
    if (!secret) return
    await repository.deleteSessionByHash(hashSessionSecret(secret))
  }

  return {
    register,
    login,
    googleLogin,
    linkGoogle,
    getMe,
    createSession,
    authenticateSession,
    revokeSession,
  }
}

const repository: AuthRepository = {
  findUserByEmail: (email) => prisma.user.findUnique({ where: { email } }),
  findUserById: (id) => prisma.user.findUnique({ where: { id } }),
  findUserByGoogleSubject: (googleSubject) => prisma.user.findUnique({ where: { googleSubject } }),
  createUser: (data) => prisma.user.create({ data }),
  updateGoogleSubject: (id, googleSubject) => prisma.user.update({
    where: { id },
    data: { googleSubject },
  }),
  createSession: (data) => prisma.session.create({ data }),
  findSessionByHash: (tokenHash) => prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { role: true } } },
  }),
  deleteSessionByHash: async (tokenHash) => {
    await prisma.session.deleteMany({ where: { tokenHash } })
  },
}

const authService = createAuthService({
  repository,
  hashPassword: (password) => bcrypt.hash(password, 12),
  comparePassword: (password, hash) => bcrypt.compare(password, hash),
  verifyGoogleToken: verifyGoogleIdToken,
})

export const {
  register,
  login,
  googleLogin,
  linkGoogle,
  getMe,
  createSession,
  authenticateSession,
  revokeSession,
} = authService
