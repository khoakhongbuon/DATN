# PC Store Authentication Implementation Plan

> **For agentic workers:** Use the inline execution path in this session unless the user explicitly chooses otherwise. Do not commit, push, deploy, or run a migration against any database.

**Goal:** Complete the existing PC Store email/password and Google sign-in flows using revocable server-side sessions in HttpOnly cookies.

**Architecture:** Extend the existing `User` model with nullable password and unique Google subject, and add a database-backed `Session` model storing only a hash of an opaque cookie secret. Keep existing auth routes and middleware boundaries, add verified Google Identity Services login/link endpoints, and migrate existing frontend API callers from localStorage Bearer tokens to credentialed requests through a same-origin Next.js rewrite.

**Tech Stack:** Express, TypeScript, Prisma/PostgreSQL, bcryptjs, `google-auth-library`, `express-rate-limit`, Next.js 14, React 18, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-26-pc-store-auth-design.md`

## Global Constraints

- Do not commit, push, deploy, or connect to/migrate any configured database.
- Create only a local migration artifact; do not run `prisma migrate`, `db push`, or seed commands.
- Do not store reusable session credentials in localStorage or return them in JSON.
- Do not automatically merge or link accounts based on matching email.
- Preserve existing User roles, Cart/Order relations, payment behavior, and AI/Gemini behavior.
- Preserve all unrelated working-tree changes; do not use broad git staging or reset/checkout/clean.
- Do not expose passwords, session secrets, Google ID tokens, API keys, or verifier internals.

---

## File Map

- `backend/prisma/schema.prisma`: make `User.password` optional, add unique nullable `googleSubject`, add `Session` relation/model.
- `backend/prisma/migrations/20261026_add_auth_sessions_and_google_identity/migration.sql`: local-only PostgreSQL DDL matching the schema; never apply it in this task.
- `backend/src/services/auth.service.ts`: email auth, opaque session issue/revoke/lookup, Google identity business rules and public-user selection.
- `backend/src/utils/auth-cookie.ts`: shared cookie name, extraction and consistent set/clear options for controllers and middleware.
- `backend/src/services/google-auth.service.ts`: verify Google ID tokens against configured audience; do not trust profile data from clients.
- `backend/src/controllers/auth.controller.ts`, `backend/src/routes/auth.routes.ts`: cookie lifecycle, Google login/link, logout and endpoint rate-limit wiring.
- `backend/src/middlewares/auth.middleware.ts`: cookie-based session authentication, current role lookup and origin checks for cookie-authenticated mutations.
- `backend/src/index.ts`, `backend/.env.example`, `backend/package.json`, `backend/package-lock.json`: CORS/proxy-compatible configuration, auth variables, required dependencies and test script inclusion. `backend/package.json` and `.env.example` already contain unrelated user changes; integrate without replacing them.
- `backend/src/services/auth.service.test.ts`, `backend/src/middlewares/auth.middleware.test.ts`: automated service and protected-route behavior tests using mocked Prisma and Google verification; no live Google credentials or DB.
- `frontend/next.config.mjs`: same-origin `/api/:path*` rewrite to the backend destination, defaulting to local backend.
- `frontend/lib/auth.tsx`: restore `/me` from cookie, remove token persistence/API, add Google sign-in/link and server logout methods.
- `frontend/lib/cart.ts`: cookie-aware API fetch helper; remove Bearer token storage/header plumbing while retaining user identity and cart behavior.
- `frontend/components/GoogleSignInButton.tsx`: load GIS client script and pass only the credential token to the auth context.
- `frontend/pages/login.tsx`, `frontend/pages/register.tsx`, `frontend/components/Header.tsx`: form UX, safe return URL, Google action, explicit account linking and real logout. `Header.tsx` already has unrelated uncommitted edits; merge narrowly.
- Existing authenticated callers that currently depend on `useAuth().token` or `cartHeaders(token, ...)`: `frontend/pages/cart.tsx`, `checkout.tsx`, `orders/index.tsx`, `orders/[id].tsx`, `orders/payment/momo-return.tsx`, `orders/payment/vnpay-return.tsx`, `products/[slug].tsx`, `admin/index.tsx`, `admin/users/index.tsx`, `admin/brands/index.tsx`, `admin/categories/index.tsx`, `admin/products/index.tsx`, `admin/products/create.tsx`, `admin/products/[id]/edit.tsx`, `admin/orders/index.tsx`, and `admin/orders/[id].tsx`.

## Task 1: Add the database representation without touching a database

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261026_add_auth_sessions_and_google_identity/migration.sql`
- Test: `backend/prisma/schema.prisma` via Prisma validation and client generation

- [ ] Add `googleSubject String? @unique` and change `password String` to `password String?` on `User`; add `sessions Session[]`.
- [ ] Add `Session` with `id`, `userId`, unique `tokenHash`, `expiresAt`, `createdAt`, cascading User relation, and indexes on `userId` and `expiresAt`.
- [ ] Write a matching SQL migration: alter only `User.password` nullability, add the nullable unique subject column/index, create the Session table/indexes/foreign key. Do not invoke any migration apply command.
- [ ] Run `npx prisma validate` and `npx prisma generate` in `backend`; these validate/generate client artifacts without applying a migration.
- [ ] Inspect the generated diff to confirm no existing User, Cart, Order, role, or relation data is deleted or renamed.

## Task 2: Implement and test email auth sessions

**Files:**
- Modify: `backend/src/services/auth.service.ts`
- Create: `backend/src/services/auth.service.test.ts`
- Modify: `backend/package.json`, `backend/package-lock.json` for Google verification and rate limiting; remove JWT packages that no longer have a consumer.

**Interfaces:**
- `register(name, email, password)` and `login(email, password)` return `{ user, sessionSecret, expiresAt }` internally; controllers set the secret in a cookie and never return it in JSON.
- `getMe(userId)` returns a public user only; `createSession(userId)` creates a cryptographically random secret and stores only its SHA-256 hash; `revokeSession(sessionSecret)` removes the matching session.
- `authenticateSession(sessionSecret)` resolves an unexpired session and current user role or rejects it.

- [ ] Add failing Node tests for normalized registration, duplicate email, bcrypt-backed login success, generic failed login, and absent password on a Google-only account.
- [ ] Run the focused test with the current backend Node test command and confirm failures before implementation.
- [ ] Replace JWT session creation with high-entropy opaque secrets, hash before persistence, set explicit expiry, and keep password hashing at bcryptjs cost 12.
- [ ] Ensure login with a null password returns the same safe invalid-credentials error as any incorrect password.
- [ ] Add tests that logout revokes the session, expired sessions are rejected, and no raw session secret appears in a returned public user.
- [ ] Add shared HttpOnly cookie helpers and switch the existing login/register/me middleware path to cookies so the server never serializes the raw session secret.
- [ ] Run `npx tsc --noEmit` and the focused auth service tests.

## Task 3: Add Google verification and safe account linking

**Files:**
- Create: `backend/src/services/google-auth.service.ts`
- Modify: `backend/src/services/auth.service.ts`
- Modify: `backend/src/controllers/auth.controller.ts`
- Modify: `backend/src/routes/auth.routes.ts`
- Create/extend: `backend/src/services/auth.service.test.ts`
- Modify: `backend/.env.example` to add `GOOGLE_CLIENT_ID` without removing existing Gemini or other entries.
- Modify: `backend/package.json`, `backend/package-lock.json` to add `google-auth-library` and `express-rate-limit`, remove unused JWT packages, and include auth tests in the backend test script.

**Interfaces:**
- `verifyGoogleIdToken(idToken: string): Promise<{ subject: string; email: string; name: string }>` verifies signature, configured audience, issuer, expiry, and verified email.
- `googleLogin(idToken)` creates a user/session for a new Google subject, returns the existing-account conflict for an unlinked email collision, or logs into the same Google subject.
- `linkGoogle(userId, idToken)` links only when the verified Google email equals the authenticated user's email and the subject is not owned by another user.

- [ ] Add failing tests for valid/invalid verifier results, missing Google client ID, subject reuse, email collision without auto-link, email mismatch during linking, and subject already linked elsewhere.
- [ ] Run focused tests to confirm failures without making live Google requests.
- [ ] Implement verification with `google-auth-library`; keep the verifier behind a replaceable dependency for deterministic tests.
- [ ] Implement explicit linking and Google login using database uniqueness constraints as the final race-condition guard; never accept client-supplied name/email as authority.
- [ ] Add controller endpoints `POST /google`, protected `POST /google/link`, and `POST /logout`; set/clear HttpOnly cookie consistently. For Google not configured, return a safe, actionable message without affecting password auth.
- [ ] Run focused auth tests and backend typecheck.

## Task 4: Enforce session middleware, rate limits, and route behavior

**Files:**
- Modify: `backend/src/middlewares/auth.middleware.ts`
- Modify: `backend/src/routes/auth.routes.ts`
- Modify: `backend/src/index.ts`
- Create: `backend/src/middlewares/auth.middleware.test.ts`
- Modify: `backend/src/index.ts` and `backend/.env.example` for production proxy trust and frontend origins.

- [ ] Add failing middleware tests for missing cookie, valid session, expired/revoked session, current role lookup, and denied cross-origin mutation.
- [ ] Run focused middleware tests and confirm failures.
- [ ] Parse only the named session cookie; authenticate it against the stored hash and expiry. Do not retain a bearer-token or localStorage fallback.
- [ ] Add rate limits for register, password login, and Google login, with standard safe limit responses and no credential logging.
- [ ] Set cookie options from `NODE_ENV`: HttpOnly always, SameSite Lax, Secure only in production, explicit max-age/path; logout clears exactly the same cookie attributes.
- [ ] Set Express proxy trust to one hop in production so rate limits use the Render client IP, and verify credentialed CORS continues to allow only configured frontend origins plus the existing localhost development origins.
- [ ] Ensure all registration/login/Google account creation assigns `Role.USER`; preserve admin authorization from the database.
- [ ] Run middleware/auth tests, `npx tsc --noEmit`, and `npm run build` in backend.

## Task 5: Migrate frontend auth UX to cookie sessions

**Files:**
- Modify: `frontend/lib/auth.tsx`
- Create: `frontend/components/GoogleSignInButton.tsx`
- Modify: `frontend/pages/login.tsx`, `frontend/pages/register.tsx`, `frontend/components/Header.tsx`
- Modify: `frontend/next.config.mjs`
- Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` only to the relevant frontend environment example if one exists; otherwise document it in the deployment instructions in the final report without creating a secrets file.

- [ ] Update auth state to call `/api/auth/me` with `credentials: 'include'`; remove reads/writes of `tk_auth_token` and never store the session secret.
- [ ] Add `logout()` that calls the backend logout endpoint before clearing in-memory/display state; surface a failure rather than pretending server revocation succeeded.
- [ ] Implement shared GIS button that sends only `credential` to the backend; show a clear configuration message when client ID is absent and accessible loading/error states.
- [ ] Add email validation, required fields, password confirmation and 8–72 character UI validation, show/hide toggles, disabled-submit states, and role=status/alert copy on both forms.
- [ ] Validate `returnUrl` as a local single-slash path; reject absolute/protocol-relative destinations and default to `/`.
- [ ] Add an explicit link-Google action for authenticated users; only show the linked state based on a boolean from `/me`, not the provider subject.
- [ ] Configure Next.js rewrite `/api/:path*` to the backend URL (`BACKEND_API_URL`, local default `http://localhost:4000`). In production set the frontend API base to the Vercel frontend origin so calls remain same-origin and are rewritten; localhost may continue using `http://localhost:4000`.
- [ ] Run frontend `npx tsc --noEmit` and `npm run build`.

## Task 6: Migrate protected API callers and verify behavior

**Files:**
- Modify: `frontend/lib/cart.ts`
- Modify all authenticated callers listed in the File Map; do not alter request bodies or business logic.
- Test: backend auth/middleware tests, frontend typecheck/build, backend typecheck/build/test.

- [ ] Add a shared API fetch helper that always uses `credentials: 'include'` and merges headers without overwriting caller-supplied JSON headers.
- [ ] Update cart, checkout, order, payment-return, product review/cart, and admin requests to use cookie credentials; remove all `token` dependencies and `Authorization: Bearer` headers from those callers.
- [ ] Keep existing API base URL semantics: use the localhost backend origin for local direct calls, and route production calls to the frontend origin where the rewrite proxies them to Render.
- [ ] Preserve user ID ownership parameters and all existing cart/order/payment flows; backend remains authoritative for ownership and role.
- [ ] Run targeted searches to confirm the frontend no longer reads/writes `tk_auth_token` or sends a Bearer auth header.
- [ ] Run backend checks: `npx tsc --noEmit`, `npm run build`, and `npm test` in `backend`.
- [ ] Run frontend checks: `npx tsc --noEmit` and `npm run build` in `frontend`.
- [ ] Review `git status`, auth-scoped diffs, and `git diff --check`; verify unrelated pre-existing changes remain untouched and no secret values were added.
- [ ] Report actual exit codes, any remaining failures, the local migration path (not applied), and manual Google Cloud/Vercel/Render configuration requirements. Do not commit or deploy.
