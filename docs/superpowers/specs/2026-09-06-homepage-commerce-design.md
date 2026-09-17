# Homepage Commerce Design

## Goal

Complete the TK homepage as a responsive PC/e-commerce storefront using the existing product API without inventing product data.

## Scope

- Keep the existing Pages Router homepage and shared Header/Footer.
- Use CSS gradients and abstract shapes for the hero; do not add image dependencies or unverified assets.
- Fetch products from the existing `GET /api/products` endpoint and render empty/error states when data is unavailable.
- Keep PC Builder copy and compatibility behavior unchanged.
- Add static navigation, brand text, and short editorial UI content only.

## Data and UI

Homepage product sections share a typed product-card presentation. Sale price is `salePrice ?? price`; discount is shown only when both prices are valid and sale price is lower. Product links use `/products/${slug}`.

The homepage order is hero, category shortcuts, Flash Sale, featured products, component tabs, PC Builder, brands, and technology news. Component tabs filter through the existing product list query when selected; no new API is introduced.

## Responsive and accessibility

- Desktop uses a 65–70% hero panel with one or two supporting cards and 4–5 product columns.
- Tablet uses two or three columns.
- Mobile uses a single-column hero and two product columns without horizontal overflow.
- Existing Header/Mega Menu behavior remains intact.
- Interactive elements retain visible focus states and all product images have meaningful alt text.
