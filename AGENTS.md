# AGENTS.md — PC Store Graduation Project

## 1. Project Identity

This is the main project for the graduation thesis.

Project root:

C:\Users\nguye\pc-store

IMPORTANT:

- Always work inside `pc-store`.
- Do NOT switch to or modify `electronics-store`.
- `pc-store` is the authoritative project.
- Before modifying files, verify the current working directory is:
  `C:\Users\nguye\pc-store`

The project is an e-commerce website for:

"Xây dựng website tư vấn và bán linh kiện máy tính, thiết bị điện tử"

The website is intended to provide functionality similar to computer hardware stores such as Hoàng Hà PC and An Phát PC.

---

# 2. Technology Stack

## Frontend

- Next.js
- React
- TypeScript
- Modern responsive UI
- E-commerce interface

Important:

- Do not upgrade Next.js, React, or other major dependencies unless explicitly requested.
- TypeScript currently uses the working version configured in `frontend/package.json`.
- Before changing frontend configuration, inspect the existing configuration first.

## Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt/bcryptjs for password hashing

## Database

- PostgreSQL
- Prisma schema:

`backend/prisma/schema.prisma`

---

# 3. Critical Project Rules

These rules MUST be followed unless the user explicitly requests otherwise.

## NEVER modify database schema automatically

Do NOT modify:

`backend/prisma/schema.prisma`

unless the user explicitly asks for a schema change.

Do NOT:

- add models
- remove models
- rename fields
- change relations
- change enums
- change constraints

without explicit approval.

## NEVER create migrations automatically

Do NOT create Prisma migrations unless explicitly requested.

Do NOT run:

`prisma migrate reset`

Do NOT reset the database.

Do NOT delete seeded data.

Do NOT run destructive database commands without explicit approval.

---

# 4. Existing API Stability

The following APIs have already been implemented and tested.

Do NOT break or rewrite them when implementing a new PHASE.

## Category API

- GET /api/categories
- GET /api/categories/:id
- GET /api/categories/slug/:slug
- POST /api/categories
- PUT /api/categories/:id
- DELETE /api/categories/:id

Category delete guard must remain intact.

---

## Brand API

- GET /api/brands
- GET /api/brands/:id
- GET /api/brands/slug/:slug
- POST /api/brands
- PUT /api/brands/:id
- DELETE /api/brands/:id

Brand delete guard must remain intact.

---

## Product API

- GET /api/products
- GET /api/products/:id
- GET /api/products/slug/:slug
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id

Product supports:

- pagination
- search
- category filtering
- brand filtering
- price filtering
- sorting

Do not rewrite Product API unless explicitly requested.

---

## Product Image API

- GET /api/products/:productId/images
- GET /api/products/:productId/images/:imageId
- POST /api/products/:productId/images
- PUT /api/products/:productId/images/:imageId
- DELETE /api/products/:productId/images/:imageId

Current implementation stores image metadata only.

Do NOT automatically add:

- Cloudinary
- S3
- file upload
- image hosting
- storage services

unless explicitly requested.

---

## Product Specification API

ProductSpecification already exists in the current project schema.

Do NOT assume a generic `key/value` structure.

Use the actual typed fields in `schema.prisma`.

ProductSpecification supports fields for:

- CPU
- GPU
- Mainboard
- RAM
- Storage
- PSU
- Case
- Cooler

---

## Cart API

- GET /api/cart/:userId
- POST /api/cart/:userId/items
- PUT /api/cart/:userId/items/:itemId
- DELETE /api/cart/:userId/items/:itemId
- DELETE /api/cart/:userId/items

Cart behavior:

- adding the same product increases quantity
- duplicate CartItem must not be created
- quantity must be a positive integer
- quantity cannot exceed stock
- cart is cleared after successful order creation
- cart is preserved if order transaction fails

---

## Authentication API

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Authentication rules:

- JWT required for protected endpoints
- passwords are hashed
- never expose password/passwordHash
- never log passwords
- never log JWT secrets
- client cannot select privileged role during registration
- invalid/expired tokens must be rejected

---

## Address API

- GET /api/users/:userId/addresses
- GET /api/users/:userId/addresses/:addressId
- POST /api/users/:userId/addresses
- PUT /api/users/:userId/addresses/:addressId
- DELETE /api/users/:userId/addresses/:addressId

Rules:

- JWT required
- userId must match authenticated user
- users cannot access another user's addresses
- ownership violations return 403
- missing address returns 404
- default address logic must remain intact

---

## Order API

- POST /api/orders
- GET /api/orders
- GET /api/orders/:id
- PUT /api/orders/:id/cancel

Order creation rules:

1. user comes from JWT
2. address must belong to user
3. cart must exist and contain items
4. product must exist
5. stock must be sufficient
6. price comes from database
7. salePrice is preferred when available
8. address is snapshotted into Order
9. product name and price are snapshotted into OrderItem
10. stock is decremented transactionally
11. cart items are cleared after successful order

Client must NOT be trusted for:

- userId
- total
- product price
- stock

Order creation uses a Prisma transaction.

---

## Payment API

- POST /api/orders/:orderId/payment
- GET /api/orders/:orderId/payment
- PUT /api/orders/:orderId/payment/cancel

Payment methods:

- COD
- VNPAY
- MOMO

Payment statuses:

- PENDING
- PAID
- FAILED
- REFUNDED

Rules:

- amount comes from Order.total
- user ownership must be checked
- duplicate payment must be prevented
- do not integrate real payment gateways unless explicitly requested
- do not modify Order status automatically unless explicitly requested

---

## PC Builder API

- POST /api/pc-builder/check

The PC Builder checks compatibility between components.

Existing compatibility rules include:

- CPU socket vs Mainboard socket
- Mainboard RAM type vs RAM type
- total RAM capacity vs Mainboard maxRam
- RAM module count vs ramSlots
- GPU length vs Case GPU clearance
- Cooler height vs Case CPU cooler clearance
- estimated power consumption
- recommended PSU wattage
- GPU/PSU connector warnings
- PCIe compatibility warnings

Price calculation:

`product.salePrice ?? product.price`

Do not remove or weaken existing compatibility rules.

---

# 5. Backend Architecture

When implementing new APIs, prefer:

```text
service
   ↓
controller
   ↓
routes
   ↓
index / app registration