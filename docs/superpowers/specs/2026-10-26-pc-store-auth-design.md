# PC Store Authentication Design

## Goal

Complete the existing PC Store authentication flow with email/password and Google sign-in without creating a second user system. Authentication must use revocable server-side sessions in HttpOnly cookies; browser storage must not contain session credentials.

## Current state

- `User` is the sole account model. It has a unique email, required password, role, and relations to addresses, carts, orders, reviews, and PC builds.
- Email registration/login already use bcryptjs and issue a one-hour JWT.
- Protected routes accept only Bearer JWTs. There is no server-side logout, rate limiting, Google provider, or authentication-specific test suite.
- Frontend auth state stores the JWT and user in localStorage. Cart, checkout, order, and admin pages attach that Bearer token to API calls.
- Frontend and backend are separate origins in development (`localhost:3000` and `localhost:4000`). Production frontend/backend may be on Vercel and Render, where cross-site cookies can be blocked.

## Architecture

### Session and email authentication

Keep the existing `User` model and its relationships. Normalize email before lookup/create, preserve bcryptjs hashing, enforce password confirmation/policy in the UI and backend validation, return a generic invalid-credentials response, and rate-limit registration and login.

Add a `Session` model related to `User`, with a unique hash of an opaque random session secret and an explicit expiry. The raw secret is set only in an HttpOnly cookie and is never returned in JSON or stored in localStorage. Authentication middleware hashes the presented cookie secret, rejects missing/expired sessions, and loads the user's current role. Logout deletes the corresponding session record and clears the cookie. The cookie uses `SameSite=Lax`, `HttpOnly`, and `Secure` in production.

The existing `User.password` field becomes nullable so Google-only accounts do not receive a fabricated password. Add a nullable unique `googleSubject` field. Existing password users and order/cart relations remain unchanged. Create a local migration artifact only; do not connect to or migrate any configured database.

### Google identity and account linking

Use Google Identity Services credential flow. The frontend sends only the returned ID token. The backend verifies it with Google's supported auth library against `GOOGLE_CLIENT_ID`, including signature, audience, issuer, expiry, and verified email. The Google `sub` is the provider identifier.

For a new verified Google identity, create one normal `User` and a session. If its verified email matches an existing password account, do not auto-link or create a duplicate; return a clear instruction to sign in to that account first. An authenticated user may explicitly link Google through a protected endpoint; the verified Google email must match the current user's email, and a Google subject already linked elsewhere is rejected.

If Google configuration is absent, email authentication remains usable and the UI explains that Google sign-in is not configured. Tests mock ID-token verification; live Google verification is not claimed without credentials.

### Frontend and deployment

Update the existing auth context, login/register pages, and navbar rather than adding a parallel auth system. Store only non-secret user display data if needed; restore auth state by calling `/api/auth/me` with credentials. Add Google sign-in, form errors/loading/duplicate-submit protection, show/hide password, safe same-site return URL handling, explicit Google-link action for signed-in users, and a real logout request.

Migrate authenticated API calls from localStorage Bearer headers to credentialed requests so cart, checkout, orders, and admin behavior remain protected and functional. Keep the API response envelope compatible where practical, but do not return a reusable session secret in the response body.

For localhost, configure credentialed CORS for the existing localhost origins and use a non-Secure Lax cookie. For production, prefer a same-origin Next.js rewrite/proxy from the Vercel frontend to the Render backend so the browser sees a first-party cookie. Configure the backend's allowed frontend origin, the frontend rewrite destination, `GOOGLE_CLIENT_ID`, and Google authorized JavaScript origins in deployment settings. Do not rely on cross-site third-party cookies.

## Security and failure handling

- Never trust frontend-supplied Google profile fields; accept only a verified ID token.
- Never silently merge accounts by email.
- Never expose passwords, session secrets, Google tokens, API keys, or provider verification details in logs or API responses.
- Protect cookie-authenticated mutations with same-origin/Origin checks in addition to CORS and SameSite.
- Preserve the existing role source of truth in the database; registration and Google account creation always assign `USER`.
- Do not modify payment, order, cart business rules, AI/Gemini behavior, or unrelated working-tree changes.

## Tests

Add backend tests for registration, login success/failure, duplicate email, session expiry/revocation/logout, Google token validation and failure, verified-email collision, explicit linking, and protected routes. Add frontend/type/build checks for the updated auth context and pages. Mock Google verification in automated tests. Run backend and frontend typecheck/build/test commands available in their package manifests. No live Google claim without credentials.

## Scope and constraints

Expected changes are limited to Prisma schema and a local migration artifact; backend auth service/controller/routes/middleware, tests, app CORS/error integration, dependency and environment example updates; and the existing frontend auth context/pages/navbar plus authenticated API callers and deployment proxy configuration as required.

Do not commit, push, deploy, run production migrations, or overwrite unrelated working-tree changes.
