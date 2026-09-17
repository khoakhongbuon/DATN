# Homepage Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the TK homepage with API-backed product sections, responsive commerce layout, and static hero/brand/editorial content.

**Architecture:** Extend the existing Pages Router homepage in `frontend/pages/index.tsx` with typed product-card and section data. Keep one existing product fetch path, derive sale/featured/component views from the returned products, and use graceful empty states instead of fabricated inventory. Preserve shared Header, Footer, and PC Builder behavior.

**Tech Stack:** Next.js 14 Pages Router, React 18, TypeScript, Tailwind CSS 3.4.

**Spec:** `docs/superpowers/specs/2026-09-06-homepage-commerce-design.md`

## Global Constraints

- Work only in `C:\Users\nguye\pc-store`.
- Frontend only; do not modify backend, API, Prisma, database, schema, Pages Router, or dependencies.
- Product data, prices, stock, and images come only from existing API responses.
- Do not add unverified image assets or fake countdown/product data.
- Preserve TK-only branding and current Header/Mega Menu.
- Verify `npx tsc --noEmit` and responsive overflow after implementation.

---

### Task 1: Refactor homepage product data and shared cards

**Files:**
- Modify: `frontend/pages/index.tsx`

**Interfaces:**
- Consume the existing `Product` and `ProductResponse` shapes and `/api/products`.
- Produce typed product-card rendering used by Flash Sale, featured products, and component sections.

- [ ] **Step 1: Define typed product helpers**

Add helpers for `displayPrice`, valid discount percentage, stock label, and product detail URL. Treat `salePrice` as a sale only when it is lower than `price`.

- [ ] **Step 2: Expand the existing API request**

Fetch enough current products for homepage sections through the existing `/api/products` endpoint. Preserve the current error behavior and use an empty list when the endpoint is unavailable.

- [ ] **Step 3: Render one shared product card**

Render API image URL when present, otherwise a visual placeholder; include product name, sale/original pricing, valid discount badge, stock state, and a detail link using the product slug.

- [ ] **Step 4: Run type-check**

Run `cd C:\Users\nguye\pc-store\frontend; npx tsc --noEmit`.

### Task 2: Build hero and category shortcut sections

**Files:**
- Modify: `frontend/pages/index.tsx`

- [ ] **Step 1: Replace the hero content**

Use a 65–70% gradient hero with abstract CSS shapes, Vietnamese CTA labels, and supporting cards for components, laptops, monitors, and gear without claiming unverified promotions.

- [ ] **Step 2: Expand category data**

Add CPU, VGA/GPU, Mainboard, RAM, SSD, HDD, PSU, Case, cooler, monitor, keyboard, and mouse links to `/products?search=...` with existing inline SVG icon style.

- [ ] **Step 3: Verify responsive layout**

Use one-column mobile hero, two-column mobile category grid, and desktop hero proportions without creating horizontal overflow.

### Task 3: Add API-backed product sections

**Files:**
- Modify: `frontend/pages/index.tsx`

- [ ] **Step 1: Add Flash Sale presentation**

Render a static “Hôm nay / Ưu đãi nổi bật” label and the shared cards. Do not run a fake countdown.

- [ ] **Step 2: Add featured products**

Render four or five API products on desktop, three on tablet, and two on mobile with loading, empty, and error-shaped fallbacks.

- [ ] **Step 3: Add component tabs**

Add CPU, VGA, Mainboard, RAM, SSD, PSU, Case, and cooler tabs. Derive each tab’s displayed products by matching API product name/category text; if no products match, show a clear empty state.

- [ ] **Step 4: Verify catalog links**

Ensure every product card links to the existing product detail route and every category/tab link remains within the existing catalog route.

### Task 4: Complete lower homepage sections and validation

**Files:**
- Modify: `frontend/pages/index.tsx`
- Modify if needed: `frontend/styles/globals.css`

- [ ] **Step 1: Preserve and restyle PC Builder**

Keep the current Vietnamese copy, compatibility labels, and CTA while giving the section stronger visual hierarchy.

- [ ] **Step 2: Add brands and editorial cards**

Add text-only brand cards for the requested brands and four short technology editorial cards with a “Xem tất cả →” link.

- [ ] **Step 3: Run validation**

Run `npx tsc --noEmit`, load homepage at 1440px, 1920px, tablet, and mobile widths, inspect Header/Mega Menu, Product Catalog, Product Detail, and PC Builder, and assert `scrollWidth === clientWidth` at each responsive width.

- [ ] **Step 4: Search forbidden text**

Search frontend source for `DDR44`, old compatibility labels, and prohibited brand names; confirm no matches.
