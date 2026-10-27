# AI PC Build Advisor Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking. Do not commit; the user requested a local diff for review.

**Goal:** Add Gemini-assisted, catalog-backed PC build recommendations with backend-owned product selection, compatibility checks, and price totals while preserving regular chat.

**Architecture:** Gemini returns validated intent and requirements; a backend build service queries bounded Prisma candidates, chooses compatible products, and calculates totals. The chat endpoint adds optional bounded history and an optional structured build response; existing `message`/`products` behavior remains available for ordinary chat and older clients.

**Tech Stack:** TypeScript, Express, Prisma, PostgreSQL, `@google/genai`, Next.js/React, Node built-in test runner.

**Spec:** [../specs/2026-10-26-ai-pc-build-advisor-design.md](../specs/2026-10-26-ai-pc-build-advisor-design.md)

## Global Constraints

- Do not modify `backend/prisma/schema.prisma` or create migrations.
- Do not change order, payment, product APIs, provider choice, Render configuration, or deployment.
- Keep Gemini as the only provider; read only the existing Gemini configuration and never log credentials.
- The backend owns all selected product IDs, compatibility decisions, and monetary totals.
- Select only real active, in-stock catalog products; never invent products, specifications, prices, stock, discounts, or URLs.
- Apply `salePrice ?? price` only when catalog prices are valid; do not apply `Promotion` records because no product eligibility or application flow exists.
- Preserve all existing PC Builder compatibility rules and normal chatbot behavior.
- Preserve unrelated tracked and untracked working-tree changes; do not commit or push.
- Do not query the configured remote database during implementation or tests.

---

## File and Interface Map

- `backend/src/services/pc-builder.service.ts`: expose a pure compatibility evaluator and have the current database-backed check delegate to it.
- `backend/src/services/pc-builder.service.test.ts` (new): lock down the extracted evaluator's existing hard errors and warnings.
- `backend/src/services/pc-build.service.ts` (new): build request/result types, bounded candidate repository, role ranking, combination search, price arithmetic, and honest no-fit/insufficient-catalog results.
- `backend/src/services/pc-build.service.test.ts` (new): inject product fixtures and exercise selection, price, compatibility, and catalog limits without Prisma or Gemini.
- `backend/src/services/ai.service.ts`: validate structured intent, preserve general chat, orchestrate build selection and explanation, and pass bounded history.
- `backend/src/services/ai.service.test.ts`: cover intent routing, Gemini failures/invalid output, history, and ordinary-chat regression.
- `backend/src/controllers/ai.controller.ts`: validate optional history and return the optional `build` field without changing existing response properties.
- `backend/package.json`: include all compiled service test files in `npm test`.
- `frontend/components/AiChatbot/types.ts`: define optional history and build response types.
- `frontend/components/AiChatbot/AiChatbot.tsx`: send bounded successful conversation history and transfer optional build data to the message.
- `frontend/components/AiChatbot/ChatMessage.tsx`: render structured builds without changing ordinary product-card rendering.
- `frontend/components/AiChatbot/PcBuildCard.tsx` (new): render build items, roles, real links/images, line prices/savings, totals, verification notes, and alternatives.
- `docs/superpowers/specs/2026-10-26-ai-pc-build-advisor-design.md`: approved design; do not change unless implementation uncovers a design contradiction.

## Task 1: Extract and Lock Existing Compatibility Rules

**Files:**
- Modify: `backend/src/services/pc-builder.service.ts`
- Create: `backend/src/services/pc-builder.service.test.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Produce `evaluateCompatibility(products: CompatibilityCandidate[]): CompatibilityResult`, where each candidate has `id`, `name`, `price`, `salePrice`, optional `category`/`brand`, and `specifications: Record<string, unknown>[]`.
- Keep `checkCompatibility({ productIds })` as the public DB lookup/validation entry point; it loads active products and delegates to `evaluateCompatibility`.
- The builder will pass only core components to this evaluator; it will not pass monitor/keyboard/mouse through the existing classifier.

- [ ] **Step 1: Add failing compatibility tests**

Create fixtures for one matched CPU/mainboard socket, one mismatch, mismatched RAM type, excessive RAM modules/capacity, GPU/case clearance, cooler clearance, insufficient PSU, missing specifications, connector uncertainty, and PCIe-generation warning. Assert the exact compatible/errors/warnings behavior the current API already provides.

```ts
test('reports a CPU and motherboard socket mismatch as a hard error', () => {
  const result = evaluateCompatibility([cpu({ socket: 'AM5' }), mainboard({ socket: 'LGA1700' })])
  assert.equal(result.compatible, false)
  assert.match(result.errors.join(' '), /CPU socket/)
})
```

- [ ] **Step 2: Run the focused test and confirm it fails because the pure function is absent**

Run from `backend`: `npm test`

Expected before implementation: TypeScript/test failure that `evaluateCompatibility` is not exported.

- [ ] **Step 3: Extract the pure evaluator**

Move the existing mapping and compatibility checks into `evaluateCompatibility`. Keep `checkCompatibility` input validation, uniqueness validation, Prisma query, missing-product behavior, and response contract unchanged; after loading its products, return `evaluateCompatibility(selected)`.

- [ ] **Step 4: Add the compiled test to the existing runner and verify**

Change `backend/package.json` test script to run `dist/services/ai.service.test.js`, `dist/services/pc-builder.service.test.js`, and `dist/services/pc-build.service.test.js` after its existing build step.

Run from `backend`: `npm test`

Expected: all AI baseline tests and the new compatibility regression tests pass.

## Task 2: Implement a Bounded, Testable Build Selector

**Files:**
- Create: `backend/src/services/pc-build.service.ts`
- Create: `backend/src/services/pc-build.service.test.ts`
- Modify: `backend/src/services/pc-builder.service.ts` only if a type adjustment is required to consume the evaluator from Task 1.

**Interfaces:**
- `BuildRole` covers CPU, MAINBOARD, RAM, STORAGE, GPU, PSU, CASE, COOLER, MONITOR, KEYBOARD, and MOUSE.
- `BuildRequirements` contains positive integer `budgetVnd`, a normalized/custom `useCase`, prioritized roles, explicitly excluded roles, and already-owned roles as `{ role, productName }`. The backend, not the model, defaults to buying MONITOR, KEYBOARD, and MOUSE unless the customer explicitly excludes or already owns them. CPU, MAINBOARD, RAM, STORAGE, PSU, and CASE are required; COOLER is not assumed necessary because the catalog cannot establish whether a boxed CPU includes one.
- `BuildLine` contains `role`, the real product (`id`, `name`, `slug`, `price`, `salePrice`, `stock`, `image`), `listPrice`, `appliedPrice`, `savings`, and `owned`.
- `BuildRecommendation` contains status (`recommended`, `over_budget`, `insufficient_catalog`, or `needs_clarification`), budget, lines, list/payable/saving totals, remainder/deficit, verified/unverified checks, warnings, and zero or more validated alternatives.
- `BuildCatalogRepository.findCandidates()` returns category-grouped active, in-stock catalog products and complete specification/image data. Resolve roles with one category lookup and issue at most one product query per matched role category (a fixed maximum of 11), cap each role at 12 candidates, and never issue a query per candidate.
- `recommendBuild(requirements, dependencies)` is pure relative to the injected repository and compatibility evaluator so fixtures can test the full selection policy.

- [ ] **Step 1: Add failing price, stock, and incomplete-catalog tests**

Test that an inactive or zero-stock product cannot be selected, invalid prices cannot become zero-cost items, no missing category is fabricated, and an empty/undersized catalog reports the missing role. Verify the repository caps candidate count and does not query once per product.

```ts
test('does not recommend an inactive or out-of-stock candidate', async () => {
  const result = await recommendBuild(requirements, repository([inactive(cpu()), outOfStock(mainboard())]))
  assert.equal(result.status, 'insufficient_catalog')
  assert.equal(result.items.length, 0)
})
```

- [ ] **Step 2: Run the focused test and confirm the service is missing**

Run from `backend`: `npm test`

Expected before implementation: TypeScript/test failure for missing build service exports.

- [ ] **Step 3: Implement role classification and bounded Prisma retrieval**

Resolve supported category rows using normalized category name/slug aliases. Fetch only active products with `stock > 0`, include category/specifications and the first sorted image, and cap results per category before grouping by role. Reject malformed/non-integer/negative prices; do not trust model-supplied IDs.

- [ ] **Step 4: Add failing role/budget/peripheral/ownership tests**

Cover 10,000,000, 15,000,000, and 20,000,000 VND; gaming, office, programming, and graphics priorities; default monitor/keyboard/mouse even when the model omits them; explicit user exclusions; and exact/ambiguous/unmatched owned product names. Assert owned items cost zero in the purchase total and unmatched items are reported unverified rather than guessed.

- [ ] **Step 5: Implement bounded candidate scoring and combination search**

Use role-specific available specification fields and the parsed use case to rank candidates; prioritize GPU capability for graphics/gaming, CPU/RAM/storage capability for programming, and value/capacity for office/study. Apply the 12-candidate-per-role cap and a maximum 64 partial combinations at each search stage. Enforce one item per role, stock/valid price, budget, and hard compatibility. Keep only combinations with all required roles; compute a best valid over-budget option when none fits. Do not claim benchmark-based performance because no benchmark field exists.

- [ ] **Step 6: Add failing arithmetic and promotion-isolation tests**

Assert every selected line's list/applied/savings values; totals; remaining/deficit; sale price equality to the actual website rule; and no added value from generic, expired, ineligible, or stackable `Promotion` fixtures. Do not add a promotion repository/query.

- [ ] **Step 7: Implement authoritative price/result construction**

For each new purchase, use `salePrice ?? price` after validation, calculate savings as `price - salePrice` only for a valid lower sale price, and sum integer line values in the backend. Exclude shipping, gifts, and unrelated promotion amounts. Mark `withinBudget` only when payable total is at most budget. Return a validated alternative only when it passes the same constraints.

- [ ] **Step 8: Verify build-service tests**

Run from `backend`: `npm test`

Expected: existing tests and all build-service fixture tests pass; Prisma is never contacted by tests.

## Task 3: Add Structured Gemini Intent and Multi-Turn Chat Handling

**Files:**
- Modify: `backend/src/services/ai.service.ts`
- Modify: `backend/src/controllers/ai.controller.ts`
- Modify: `backend/src/services/ai.service.test.ts`

**Interfaces:**
- Add `ChatHistoryEntry = { role: 'user' | 'assistant'; content: string }`. Accept at most the last 8 entries, at most 2,000 characters per entry, and at most 6,000 history characters total.
- Add `ChatOptions = { history?: ChatHistoryEntry[]; dependencies?: AiChatDependencies }` to preserve dependency injection without exposing test-only parameters to Express.
- Extend `AiChatResult` with `build?: BuildRecommendation`; keep `message` and `products`.
- Extend `AiChatDependencies` with the build catalog/recommendation dependency while retaining existing product-context and Gemini fakes.

- [ ] **Step 1: Add failing structured-intent and ordinary-chat regression tests**

Test a valid `general` output still returns only IDs found in product context; a valid build output routes to the builder and ignores all model product IDs; missing/invalid budget asks a concise clarification; malformed JSON/schema returns a safe error; and provider rejection/timeout is logged without key material.

- [ ] **Step 2: Add failing history tests**

Assert the current message remains the latest prompt, only validated recent user/assistant turns are included, history has at most 8 entries/2,000 characters each/6,000 characters total, malformed roles/text are rejected, and old calls without history behave unchanged.

- [ ] **Step 3: Run `npm test` and confirm the new behavior fails**

Run from `backend`: `npm test`

Expected before implementation: failures for unrecognized intent/history and absent build result.

- [ ] **Step 4: Extend the Gemini structured schema and validate model output**

Require an intent enum, response message, recommended IDs, and build requirement fields with explicit null/empty defaults. Validate parsed fields and ranges before use. On general chat, preserve the current catalog context and ID allow-list. On build chat, never use `recommendedProductIds` to select products.

- [ ] **Step 5: Orchestrate build and explanation**

Call `recommendBuild` only after a valid build intent. For successful or over-budget build results, request a short Vietnamese explanation using only the already-selected build details; keep all authoritative line prices/totals/compatibility in the separate backend result. For clarification or insufficient catalog, return the reason without asking Gemini to invent substitutes.

- [ ] **Step 6: Validate request history and preserve response fields**

In `ai.controller.ts`, accept absent history or a bounded array of `{role,content}` entries, reject invalid/oversized entries with HTTP 400, and return `{ success: true, message, products, ...(build ? { build } : {}) }`. Keep current `message` validation and old request/response compatibility.

- [ ] **Step 7: Verify AI service tests**

Run from `backend`: `npm test`

Expected: general-chat regression, intent routing, history, Gemini failure, malformed structured output, and unknown-ID tests pass.

## Task 4: Render Verified Builds and Preserve Existing Chat UI

**Files:**
- Modify: `frontend/components/AiChatbot/types.ts`
- Modify: `frontend/components/AiChatbot/AiChatbot.tsx`
- Modify: `frontend/components/AiChatbot/ChatMessage.tsx`
- Create: `frontend/components/AiChatbot/PcBuildCard.tsx`

**Interfaces:**
- `AiChatResponse` retains `success`, `message`, optional `products`, and adds optional `build`.
- `ChatMessageItem` adds optional typed build data and continues using the current product type.
- `PcBuildCard` accepts one `BuildRecommendation` and renders server-provided data only.

- [ ] **Step 1: Extend frontend types without changing ordinary chat fields**

Mirror the backend statuses, build items, exact integer price fields, totals, compatibility notes, and optional alternatives. Add optional history to the client request type if a request type is defined locally.

- [ ] **Step 2: Send only recent successful turns**

Build history from recent `messages`, omit the greeting and failed/error messages, cap it to the server limit, and send it beside `message`. Keep retry from sending the same failed prompt twice. Keep clear-chat behavior resetting the history with the greeting.

- [ ] **Step 3: Add focused build summary rendering**

Render role and ownership labels; actual ProductCard/image/slug link for catalog products; list/applied/savings amounts; totals, budget remainder/deficit; verified and unverified notes; and only server-returned alternatives. Use a dedicated build component and do not reconstruct prices from text.

- [ ] **Step 4: Keep ordinary chat rendering unchanged**

In `ChatMessage`, render `PcBuildCard` when `build` exists. Otherwise render the existing product list exactly as before; retain error/retry behavior.

- [ ] **Step 5: Verify the frontend build**

Run from `frontend`: `npm run build`

Expected: Next.js production build and TypeScript checks complete successfully without new dependencies.

## Task 5: End-to-End Validation and Diff Review

**Files:**
- No additional files unless a focused fix is required by validation.

- [ ] **Step 1: Run backend type-check**

Run from `backend`: `npx tsc --noEmit`

Record the real exit code and output.

- [ ] **Step 2: Run backend production build**

Run from `backend`: `npm run build`

Record the real exit code and output.

- [ ] **Step 3: Run the complete backend test script**

Run from `backend`: `npm test`

Record the real exit code and test totals; do not infer success from an earlier build.

- [ ] **Step 4: Run frontend production build**

Run from `frontend`: `npm run build`

Record the real exit code and output.

- [ ] **Step 5: Inspect scope and whitespace**

Run from repository root: `git --no-pager diff --check`, `git --no-pager status --short`, and `git --no-pager diff --` for only files changed by this task. Verify unrelated existing changes remain present and no schema/env/credential changes were made.

- [ ] **Step 6: Report the local diff and verified limits**

List changed files and purpose, explain sale-price and promotion handling, describe catalog-data and benchmark limits, state actual command outcomes, and note manual local catalog/category verification required because the configured DB target is remote. Do not commit, push, alter Render, or deploy.

## Self-Review

- Schema and production-data constraints are covered by the global constraints and no-remote-query validation.
- Gemini is responsible for intent/explanation only; backend-owned IDs, compatibility, and arithmetic are explicit.
- Default peripherals, already-owned equipment, missing specifications, invalid prices, no-fit budgets, and optional alternatives are assigned to Task 2 and UI details to Task 4.
- Promotion tests verify non-application, consistent with the schema/code findings.
- Existing PC Builder behavior is protected by Task 1 regression tests.
- Existing chat compatibility, history validation, missing keys, provider failures, invalid structured output, and unknown IDs are covered by Task 3.
- Backend and frontend commands, diff checks, and no-commit requirement are explicit in Task 5.
