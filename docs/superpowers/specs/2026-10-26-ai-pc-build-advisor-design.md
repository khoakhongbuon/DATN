# AI PC Build Advisor Design

## Status

Design approved in chat in three sections; awaiting review of this written spec.
This document is local and intentionally uncommitted.

## Goal

Extend the existing PC Store AI chat so customers can request a PC configuration
for a budget and use case. Gemini interprets natural-language needs; the backend
selects only real catalog products, validates compatibility, and calculates
authoritative prices and totals.

The existing chat endpoint and ordinary product-advice behavior remain
backward-compatible. No schema, migration, checkout, payment, deployment, or
provider change is in scope.

## Current state and constraints

- `POST /api/ai/chat` currently accepts one `message` and returns `success`,
  `message`, and `products`. Gemini is already the only AI provider.
- The current AI service searches product context and verifies recommended IDs
  against that result.
- Product data includes `price`, nullable `salePrice`, `stock`, `isActive`,
  category, SKU, images, and typed `ProductSpecification` fields plus `extra`.
- Order and PC Builder pricing use `salePrice ?? price`. Product API validates
  that a provided sale price is non-negative and no greater than list price.
- The existing PC Builder checks CPU/mainboard socket, RAM type/capacity/slots,
  GPU and cooler clearance, PSU wattage/connectors, and PCIe generation.
- `Promotion` has no product/order relation, and no promotion usage was found
  in backend or frontend code. It cannot safely establish product eligibility,
  coupon entry, or stacking. The advisor must not apply it.
- The configured database target is remote. No catalog query will be run during
  design or implementation validation; tests will use deterministic fixtures.
- The working tree contains unrelated tracked and untracked changes. They must
  remain untouched.

## Approaches considered

1. Let Gemini choose product IDs, then validate them. Rejected because model
   selection is hard to constrain and does not reliably optimize a full build.
2. Have Gemini extract the request, then let the backend select, validate, and
   price catalog products. Selected because the model never owns authoritative
   product, compatibility, or price decisions.
3. Have Gemini rank backend-supplied candidates and validate afterward.
   Rejected because it adds coupling and model latency without removing the
   backend's need to search/verify combinations.

## Architecture and data flow

1. The client sends the current `message` and an optional, bounded `history`.
   Old clients that send only `message` remain supported.
2. Gemini returns schema-constrained intent and requirement fields, alongside
   the normal chat answer/product IDs. The backend validates the structure.
3. For ordinary chat, preserve the current product-context lookup and ID
   allow-list behavior.
4. For a PC build, ignore any model-selected product IDs. The build service
   queries categories and a bounded set of their active, in-stock products,
   including specifications and the first product image.
5. The build service ranks candidates and searches a bounded set of
   combinations. It uses the existing compatibility rules through a pure
   reusable checker. Invalid prices and hard incompatibilities are excluded.
6. The backend calculates each line's list price, applied price, and savings,
   plus total, savings, and budget remainder/deficit.
7. Gemini may explain the completed configuration and trade-offs using only the
   backend-selected configuration. The final structured `build` object, not
   model prose, is authoritative for product identity, compatibility, and all
   monetary values.
8. The response retains `success`, `message`, and `products`; `build` is an
   optional addition. Existing clients can continue rendering `products`.

## Requirement interpretation

Gemini extracts:

- budget in VND, or a request for clarification if absent/invalid;
- use case (gaming, office, study, programming, graphics, or a concise custom
  purpose);
- purchase needs and priorities;
- peripherals explicitly requested or excluded;
- already-owned component names/types;
- whether the user needs a clarifying question.

Unless the user says otherwise, the purchase budget covers the complete
recommended purchase: case, CPU, required components, and monitor, keyboard,
and mouse. Already-owned items do not count toward the amount to spend. If an
owned item cannot be matched exactly to catalog data, do not invent its specs
or claim compatibility; ask for its model/specifications and report the
unverified dependency. Do not assume that a CPU includes a stock cooler because
the schema does not record that fact.

## Catalog selection, compatibility, and pricing

- Map real category rows to supported roles using category name/slug and
  `ProductSpecification.productType`; do not create category/product records.
- Query only active products with positive stock. Keep reads bounded by using a
  small category lookup followed by a product query with per-category limits;
  never issue a query per candidate.
- Use only finite, non-negative integer prices. Apply the website rule
  `salePrice ?? price` when the data is valid. Savings are `price - salePrice`
  only for a valid lower sale price; otherwise savings are zero.
- Do not apply `Promotion` records. Their product eligibility, coupon
  submission, and stacking semantics are not represented in the current
  application.
- Score using available catalog specifications and use-case priorities. The
  schema has no benchmark scores, so do not claim measured performance-per-VND
  or assert benchmark-based comparisons.
- Reuse all existing hard compatibility checks without weakening them. Missing
  specifications are “unverified,” not compatible-by-assertion. Hard errors
  disqualify a combination.
- Required roles that have no eligible candidate are reported as unavailable.
  Optional parts are not fabricated.
- If no valid configuration fits the budget, return a valid closest option
  with its exact deficit; never report it as within budget. Include a
  validated alternative only when one exists.
- Totals cover listed products only; do not invent shipping, tax, gifts, or
  additional discounts.

## API and user interface

- Keep `POST /api/ai/chat`; add optional `history` request data with strict
  role, entry-count, and length validation. Limit context to recent successful
  chat turns and exclude greeting/error/retry artifacts.
- Keep response `message` and `products` stable; add optional build status,
  requirements/clarification, selected items, per-item prices/savings,
  totals, budget remainder/deficit, compatibility verification/warnings, and
  optional alternatives.
- Populate `products` from the same backend-verified selected items for older
  clients.
- Extend chatbot response/message types and render a build-specific summary
  only when `build` is present. Ordinary chat continues using existing
  product cards. Build lines link to the real product slug and use the actual
  catalog image when available.
- Clear chat clears context. A retry must not insert the failed prompt twice
  into the conversation history.

## Error handling and safety

- Missing Gemini configuration retains a clear, safe configuration error.
- Gemini provider errors, timeouts, empty responses, and invalid structured
  output use existing safe error patterns and must not crash the server.
- Never log API keys or expose them in API responses.
- Validate all model output. Product IDs from the ordinary chat remain
  allow-listed against returned catalog context; PC-build product selection is
  wholly backend-owned.
- Do not log or expose credentials, `.env` contents, or database connection
  details.

## Files expected to change

- `backend/src/services/ai.service.ts` and
  `backend/src/controllers/ai.controller.ts`: validated history, intent/build
  orchestration, and optional response data.
- `backend/src/services/pc-build.service.ts` (new): bounded catalog access,
  candidate scoring/selection, price calculation, and build result.
- `backend/src/services/pc-builder.service.ts`: extract/reuse the existing
  compatibility evaluation without changing public API behavior.
- `backend/src/services/ai.service.test.ts` and
  `backend/src/services/pc-build.service.test.ts` (new), plus a focused
  PC-builder regression test if extraction requires it.
- `backend/package.json`: ensure the existing test command runs the added
  backend tests.
- `frontend/components/AiChatbot/types.ts`,
  `AiChatbot.tsx`, and `ChatMessage.tsx`; add a build summary component if it
  keeps rendering focused.

No schema or migration files are expected to change.

## Testing

Use injected/fake Gemini and catalog dependencies; do not contact the remote
database or Gemini in unit tests. Cover:

- 10M, 15M, and 20M budgets; gaming, office, programming, and graphics;
- default peripherals, explicit exclusions, and known/unknown owned items;
- valid sale prices, no sale price, invalid/missing prices, and no promotion
  application (including generic/expired/ineligible Promotion records);
- budget totals, valid closest-over-budget results, duplicate exclusion, and
  invalid compatibility;
- active/stock filters, insufficient categories, and bounded candidate reads;
- Gemini missing key, provider error/timeout, empty/malformed structured output,
  and untrusted IDs;
- ordinary chat compatibility and multi-turn history validation.

Run backend `npx tsc --noEmit`, `npm run build`, and `npm test`, plus frontend
`npm run build` because chatbot UI/types change. Report actual command results
and exit codes. Finally inspect scoped diff, `git status`, and `git diff
--check`; do not commit, push, access Render, or deploy.

## Risks and known limitations

- Database category names and current stock/catalog completeness have not been
  observed because the configured database target is remote. Runtime category
  mapping must handle unmatched roles honestly; local data should be checked
  by the user when available.
- No benchmark dataset exists. Ranking is a transparent heuristic based on
  recorded specifications, not a performance benchmark.
- Promotion eligibility cannot be inferred from the current schema or code.
- Some product specifications and peripheral connection details may be
  absent; the response must distinguish verified from unverified compatibility.
- A two-stage build conversation adds Gemini latency, but ordinary chat keeps
  its current single-response flow.
