# Checkout Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an authenticated `/checkout` flow that loads the current cart and owned addresses, creates orders with the existing `{ addressId }` contract, and provides responsive success/error states.

**Architecture:** Keep checkout page-local state and reuse the existing `AuthProvider`, cart types/helpers, and API base configuration. Address requests use the authenticated user's id and Bearer token; order creation sends only `addressId`, while the backend derives cart, prices, stock, and user.

**Tech Stack:** Next.js Pages Router, React, TypeScript, Tailwind CSS, existing Express APIs.

**Spec:** Approved checkout design in conversation.

## Global Constraints

- Frontend only; do not modify backend, API contracts, Prisma, database, or dependencies.
- Preserve Pages Router and existing Homepage, Catalog, Product Detail, Cart, and Header UI.
- Never hard-code userId; never call address/order APIs before authentication is ready.
- Never send paymentMethod because the existing order contract accepts only addressId.
- No fabricated prices, stock, discounts, order ids, or success states.
- Avoid fetch loops; use AbortController and one controlled load effect.

---

### Task 1: Implement authenticated checkout page

**Files:**
- Create: `frontend/pages/checkout.tsx`
- Modify: `frontend/pages/cart.tsx`

**Interfaces:**
- Consumes `useAuth()`, `Cart`, `CartItem`, `API_BASE_URL`, and `cartHeaders`.
- Produces `/checkout`, address form fields matching `recipientName`, `phone`, `province`, `district`, `ward`, `detail`, `isDefault`.

- [ ] Add page-local types for Address, API responses, and address form state.
- [ ] Redirect unauthenticated users to `/login?returnUrl=/checkout` after auth loading resolves.
- [ ] Fetch cart and addresses in one effect keyed only by authenticated user/token, with AbortController and retry support.
- [ ] Render address cards, selected address state, default badge, empty-address CTA, inline add-address form, cart summary, stock validation, and responsive two-column layout.
- [ ] POST new address with exact backend fields, reload addresses, and select the returned address.
- [ ] POST `/api/orders` with JSON `{ addressId }` and Bearer token; show backend errors without clearing checkout state.
- [ ] On success render order code/total/address from the API response and offer `/products`; link to `/orders/<id>` only if that route exists.
- [ ] Run `npx tsc --noEmit`.

### Task 2: Connect cart checkout CTA

**Files:**
- Modify: `frontend/pages/cart.tsx`

**Interfaces:**
- Consumes authenticated cart state already rendered by CartPage.
- Produces a `/checkout` link that is disabled/omitted for empty or unauthenticated carts.

- [ ] Replace the disabled checkout button with a link to `/checkout` only when the authenticated cart has items.
- [ ] Keep the existing empty and unauthenticated states unchanged.
- [ ] Verify no additional cart fetch effect is introduced.

### Task 3: Runtime verification

**Files:** None.

- [ ] Run `npx tsc --noEmit`.
- [ ] Verify unauthenticated `/checkout` redirects without Address/Order requests.
- [ ] Verify authenticated cart/address loading, add-address validation, address selection, and order failure state.
- [ ] Verify successful order uses exactly `{ addressId }` and displays API order data.
- [ ] Verify empty cart, no address, 390px, 768px, 1440px, and 1920px layouts.
- [ ] Verify request counts remain stable and no horizontal overflow exists.
