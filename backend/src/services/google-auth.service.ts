import { OAuth2Client } from 'google-auth-library'

type GoogleTokenPayload = {
  sub?: unknown
  email?: unknown
  email_verified?: unknown
  name?: unknown
  iss?: unknown
}

type GoogleTokenVerifierClient = {
  verifyIdToken(options: { idToken: string; audience: string }): Promise<{
    getPayload(): GoogleTokenPayload | undefined
  }>
}

export type GoogleIdentity = {
  subject: string
  email: string
  name: string | null
}

function googleAuthError(status: number, message: string): never {
  throw { status, message }
}

export function createGoogleTokenVerifier(
  client: GoogleTokenVerifierClient,
  getClientId: () => string | undefined = () => process.env.GOOGLE_CLIENT_ID,
) {
  return async (idToken: string): Promise<GoogleIdentity> => {
    const clientId = getClientId()?.trim()
    if (!clientId) {
      googleAuthError(503, 'Google sign-in is not configured. Please use email and password.')
    }
    if (typeof idToken !== 'string' || idToken.length === 0 || idToken.length > 8192) {
      googleAuthError(401, 'Google credential could not be verified')
    }

    let payload: GoogleTokenPayload | undefined
    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId })
      payload = ticket.getPayload()
    } catch {
      googleAuthError(401, 'Google credential could not be verified')
    }

    const email = typeof payload?.email === 'string' ? payload.email.trim().toLowerCase() : ''
    if (
      !payload
      || typeof payload.sub !== 'string'
      || payload.sub.length === 0
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || payload.email_verified !== true
      || (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com')
    ) {
      googleAuthError(401, 'Google credential could not be verified')
    }

    return {
      subject: payload.sub,
      email,
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null,
    }
  }
}

export const verifyGoogleIdToken = createGoogleTokenVerifier(new OAuth2Client())
