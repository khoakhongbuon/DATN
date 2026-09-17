# AI Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure, database-grounded Vietnamese AI product-advice endpoint at `POST /api/ai/chat`.

**Architecture:** The controller validates and serializes HTTP data, the service retrieves a bounded Prisma product context and calls OpenAI, and the route only registers the controller. Existing centralized error handling remains the final error boundary.

**Tech Stack:** Express, TypeScript, Prisma, PostgreSQL, official OpenAI Node SDK, existing dotenv configuration.

**Spec:** `docs/superpowers/specs/2026-09-07-ai-backend-foundation-design.md`

## Global Constraints

- Do not modify Prisma schema, migrations, existing APIs, frontend, or database records.
- Use `OPENAI_API_KEY` only on the backend; never expose or log it.
- Validate `message` as a non-empty string with a maximum length of 2,000 characters.
- Return stable `{ success, message, products }` responses for successful chat requests.
- Only recommend products included in the bounded database context.
- Use model `gpt-4o-mini` with a bounded timeout.

---

### Task 1: Add OpenAI dependency and service configuration

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`
- Modify: `backend/.env.example` only if the existing `OPENAI_API_KEY=` entry needs preservation or documentation

**Interfaces:**
- Produces the installed `openai` SDK and the existing environment contract used by Task 2.

- [ ] **Step 1: Confirm the dependency is absent**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
npm ls openai --depth=0
```

Expected: no installed direct dependency, or an existing version that can be reused without a manifest change.

- [ ] **Step 2: Install only the required SDK when absent**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
npm install openai
```

Do not upgrade unrelated packages.

- [ ] **Step 3: Verify no secret was written**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
Select-String -Path package.json,package-lock.json,.env.example -Pattern 'OPENAI_API_KEY='
```

Expected: only the variable name in `.env.example`, with no real value.

---

### Task 2: Implement bounded product context retrieval and OpenAI service

**Files:**
- Create: `backend/src/services/ai.service.ts`

**Interfaces:**
- Consumes: `prisma` from `backend/src/config/prisma.ts` and `OPENAI_API_KEY`.
- Produces: `chat(message: string): Promise<{ message: string; products: AiProduct[] }>` where `AiProduct` contains `id`, `name`, `slug`, `price`, `salePrice`, and nullable `image`.

- [ ] **Step 1: Define typed service output and safe constants**

Define the product response type, a 2,000-character maximum, a bounded product-context limit such as 12, the `gpt-4o-mini` model, and the OpenAI timeout without logging input or secrets.

- [ ] **Step 2: Implement message normalization and bounded query extraction**

Normalize whitespace and case, extract a budget from Vietnamese price expressions, map known category aliases (`cpu`, `gpu`/`vga`, `mainboard`, `ram`, `ssd`, `hdd`, `psu`, `case`, `cooler`), and retain only a small set of meaningful terms for database matching.

- [ ] **Step 3: Query Prisma for relevant products**

Use `findMany` with a bounded `take`, category/product/brand/specification filters, optional budget bounds, and `isActive: true`. Select only product identity, pricing, stock, first image, category, brand, and the typed specification fields needed for advice. If no product matches, return `{ message: explicitNoMatchMessage, products: [] }` without calling OpenAI.

- [ ] **Step 4: Build a redacted, bounded prompt context**

Serialize only the selected product fields and specifications. Instruct the model to answer in Vietnamese, use only supplied products, avoid invented claims, explain recommendations, and flag compatibility uncertainty. Never include environment values or raw request metadata beyond the user question and selected context.

- [ ] **Step 5: Call OpenAI with timeout and safe error mapping**

Construct `new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 15000 })` only when configured. Call `chat.completions.create` with the system instruction, user question, and bounded context using `gpt-4o-mini`. Map missing configuration, provider errors, and timeout failures to safe `{ status, message }` errors without exposing raw details.

- [ ] **Step 6: Run a focused TypeScript check**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
npx tsc --noEmit
```

Expected: PASS.

---

### Task 3: Add controller, route, and app registration

**Files:**
- Create: `backend/src/controllers/ai.controller.ts`
- Create: `backend/src/routes/ai.routes.ts`
- Modify: `backend/src/index.ts`

**Interfaces:**
- Consumes: `chat(message)` from `ai.service.ts`.
- Produces: `POST /api/ai/chat` with `{ success: true, message, products }` or a centralized safe error response.

- [ ] **Step 1: Validate request body in the controller**

Reject missing, non-string, blank, or overlong `req.body.message` with HTTP 400 and a clear message. Do not log the request body.

- [ ] **Step 2: Serialize successful service output**

Call the service and return:

```ts
return res.json({
  success: true,
  message: result.message,
  products: result.products,
})
```

- [ ] **Step 3: Forward service failures**

Wrap the controller in the existing `try/catch` pattern and call `next(error)` so `error.middleware.ts` remains the single response boundary.

- [ ] **Step 4: Register the route**

Create an Express router with `router.post('/chat', controller.chat)` and mount it at `app.use('/api/ai', aiRoutes)` without changing any existing route.

- [ ] **Step 5: Re-run TypeScript**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
npx tsc --noEmit
```

Expected: PASS.

---

### Task 4: Verify runtime behavior without database mutations

**Files:**
- No source changes expected.

- [ ] **Step 1: Verify backend scripts**

Run:

```powershell
cd C:\Users\nguye\pc-store\backend
npm run
```

Use only an existing build script if one is present; otherwise report that the backend has no build script.

- [ ] **Step 2: Start the backend with a real local environment**

Use the existing backend start command and a local `.env` containing the already configured `DATABASE_URL` and `OPENAI_API_KEY`. Never print or commit the key.

- [ ] **Step 3: Test empty input**

Send `POST /api/ai/chat` with `{ "message": "" }`.

Expected: HTTP 400 and a clear validation message.

- [ ] **Step 4: Test a normal question**

Send a Vietnamese general question with a valid message.

Expected: HTTP 200, string `message`, and an array `products`.

- [ ] **Step 5: Test a product question**

Send a question such as `CPU gaming khoảng 5 triệu`.

Expected: recommendations contain only returned database product IDs and truthful price fields.

- [ ] **Step 6: Test no-match behavior**

Send a query containing a deliberately absent product term.

Expected: HTTP 200 with explicit no-match text and `products: []`, without fabricated data.

- [ ] **Step 7: Test provider/configuration error**

Use a separate process environment without a valid key, or a controlled invalid key without changing committed files.

Expected: safe 5xx response; no key, prompt, or raw provider credential appears in the response or logs.

- [ ] **Step 8: Clean up**

Stop only the backend process started for verification. Do not create, update, or delete database records.
