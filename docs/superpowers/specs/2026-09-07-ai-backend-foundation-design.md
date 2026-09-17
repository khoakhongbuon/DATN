# AI Backend Foundation Design

## Goal

Add a backend-only `POST /api/ai/chat` endpoint that answers Vietnamese product-advice questions using a small, database-backed product context and OpenAI, without exposing secrets or changing existing APIs.

## Scope

- Add AI service, controller, and route files under `backend/src`.
- Mount the new route from `backend/src/index.ts`.
- Add the official `openai` dependency only if it is not already installed.
- Use the existing `OPENAI_API_KEY` environment variable.
- Read existing Product, Category, Brand, ProductSpecification, price, salePrice, stock, and image data.
- Do not modify Prisma schema, migrations, existing routes, frontend, or database records.

## API Contract

`POST /api/ai/chat`

Request:

```json
{
  "message": "CPU gaming khoảng 5 triệu"
}
```

Response:

```json
{
  "success": true,
  "message": "Tư vấn bằng tiếng Việt...",
  "products": [
    {
      "id": "product-id",
      "name": "Product name",
      "slug": "product-slug",
      "price": 5000000,
      "salePrice": null,
      "image": null
    }
  ]
}
```

`message` must be a non-empty string no longer than 2,000 characters. Invalid input returns HTTP 400. Product lookup, OpenAI, and timeout failures return safe error messages through the existing centralized error middleware. No API key, database credential, prompt, or password is returned or logged.

## Context Retrieval

The service normalizes the question and extracts a bounded set of search terms, category aliases, and an optional budget. It queries Prisma with product name/slug/category/brand and relevant typed specification fields, includes only a small number of matching products, and selects product identity, pricing, stock, one image, category, brand, and typed specification data. The prompt receives only this bounded context.

If no relevant products are found, the endpoint returns a successful response with an explicit no-match message and `products: []`; it never invents a product or price.

## OpenAI Integration

Use the official OpenAI Node SDK with `OPENAI_API_KEY` and a bounded request timeout. The model is `gpt-4o-mini`. The system instructions require Vietnamese responses, database-only recommendations, truthful price/stock/specification claims, practical reasoning, and no unverified compatibility claims. Compatibility questions should be redirected to PC Builder or described as uncertain unless the supplied context contains sufficient compatibility data.

## Error and Security Boundaries

- Validate request input before database access.
- Do not log message contents, prompts, product context, API keys, or database credentials.
- Do not expose raw OpenAI or Prisma errors in HTTP responses.
- Keep business logic in the service, HTTP parsing/serialization in the controller, and route registration in the route module.
- Preserve the existing error middleware and all existing APIs.

## Verification

- Run `npx tsc --noEmit` in `backend`.
- Run the existing backend build command if one exists; otherwise report that no build script exists.
- Start the backend with an environment containing a real key only outside source control.
- Exercise normal chat, product lookup, no-match, empty message, and provider/database error paths without creating database records.
