# Getto — Smart Product Search & Catalogue

React + Tailwind + Zustand frontend, Node/Express backend, PostgreSQL.
Landing page (Men / Women / Kids hero, categories, top products, brand partners, stores), product detail
(Amazon-style gallery, reviews, similar products), stores, advanced search/filter/sort/pagination, cart,
checkout, orders (stock is decremented atomically), responsive with a mobile bottom navigation.

## Quick start

Requirements: Node 20+ and PostgreSQL 14+ (or `docker compose up -d` for the bundled Postgres).

```bash
# 1. Database
docker compose up -d            # or create a DB named getto_catalogue yourself

# 2. Backend
cd backend
cp .env.example .env            # edit DATABASE_URL if needed
npm install
npm run generate                # (optional) regenerate data/products.json  -> 598 products, 2,100+ reviews
npm run db:setup                # create schema (destructive) + load data/products.json
npm run dev                     # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173  (proxies /api -> :4000)
```

### Environment variables
| File | Variable | Default | Purpose |
|---|---|---|---|
| backend/.env | `PORT` | 4000 | API port |
| backend/.env | `DATABASE_URL` | postgres://postgres:postgres@localhost:5432/getto_catalogue | Postgres connection |
| backend/.env | `CORS_ORIGIN` | http://localhost:5173 | Comma-separated allowed origins |
| frontend/.env | `VITE_API_URL` | /api | Set to the full API URL when not using the Vite proxy |

No secrets are committed; `.env` is git-ignored.

### Tests
```bash
cd backend && npm test          # needs the seeded DB (npm run db:setup)
```
Covers: full / partial name search, brand / category / SKU search, case-insensitivity, multi-word AND matching,
LIKE-wildcard escaping, combined filters, price range + every sort, pagination with active criteria, stable pagination
on price ties, empty results, negative / inverted price ranges, bad sort/page/limit, SQL-injection attempts,
product detail / similar / home payloads, and orders (stock decrement, rollback on oversell, cancel restores stock).

## Seed data
`backend/scripts/generateData.js` deterministically builds `backend/data/products.json`
(`{ brands, stores, products[] with nested reviews }`) and `scripts/seed.js` loads it in one transaction.
- **Images:** every product has 4 image URLs. Categories without a custom image pool use category-matched
  LoremFlickr URLs (for example, T-Shirts use the `t-shirt` search term) instead of random photos. To use your own
  images, put URLs in `backend/data/image-pool.json`, e.g. `{ "T-Shirts": ["https://…/a.jpg", "https://…/b.jpg"] }`,
  then run `cd backend && npm run generate && npm run db:update-images`. The image update changes only product image
  columns, preserving orders and other catalogue data. Broken URLs fall back to a placeholder in the UI (`SafeImg`).
- `PER_CATEGORY=40 npm run generate` creates a bigger catalogue.

## API (base `/api`)
Errors are `{ "error": "message", "details": [{ "field", "message" }] }` with 400 (validation), 404, 409 (stock), 500.

### `GET /products` — search, filter, sort, paginate
| Param | Notes |
|---|---|
| `q` | ≤100 chars. Each whitespace-separated word must match name, description, brand, category, audience or SKU (case-insensitive, partial) |
| `audience` | `men` \| `women` \| `kids` |
| `category`, `brand` | comma-separated list (exact match, OR within the list) |
| `storeId` | int |
| `minPrice`, `maxPrice` | ≥ 0, and `minPrice ≤ maxPrice` |
| `minRating` | 0–5 |
| `inStock` | `true` |
| `sort` | `relevance` (default with `q`), `price_asc`, `price_desc`, `rating`, `newest` (default), `name` |
| `page`, `limit` | default 1 / 20, limit ≤ 100 |

```
GET /api/products?q=hoodie&audience=men&minPrice=500&maxPrice=3000&minRating=3&inStock=true&sort=price_asc&page=1
```
```json
{
  "data": [{ "id": 212, "sku": "GT-MHOO-1126", "name": "BlueOak Urban Navy Zip Hoodie", "brand": "BlueOak",
             "audience": "men", "category": "Hoodies & Jackets", "price": 1249, "mrp": 1699, "rating": 4.3,
             "reviewCount": 3, "stock": 21, "image": "https://picsum.photos/…", "createdAt": "2026-03-02T…" }],
  "pagination": { "page": 1, "limit": 20, "total": 37, "totalPages": 2 },
  "sort": "price_asc",
  "didYouMean": null
}
```
Invalid input:
```
GET /api/products?minPrice=-5            -> 400 {"error":"Invalid query parameters","details":[{"field":"minPrice","message":"minPrice cannot be negative"}]}
GET /api/products?minPrice=900&maxPrice=100 -> 400 … "minPrice cannot be greater than maxPrice"
```

### Other endpoints
| Method & path | Description |
|---|---|
| `GET /products/suggest?q=` | Autocomplete (top 6 by name / brand / SKU) |
| `GET /products/:id` | Detail: images[], sizes, colours, store, reviews[], `ratingDistribution` |
| `GET /products/:id/similar` | Up to 8 similar products (same category first) |
| `POST /products/:id/reviews` | `{ userName, rating 1-5, title?, comment }` → updates product rating |
| `GET /home?audience=men` | Hero products, categories, top products, new arrivals, brands, stores |
| `GET /meta/filters?audience=&storeId=` | Category / brand options with counts + price range |
| `GET /stores`, `GET /stores/:id` | Stores |
| `POST /orders` | Place order (below) |
| `GET /orders?clientId=<uuid>` | Orders of this browser (anonymous `clientId` kept in localStorage) |
| `POST /orders/:id/cancel` | `{ clientId }` — cancels and restores stock |

```
POST /api/orders
{ "clientId": "5b8e…uuid", "items": [{ "productId": 12, "qty": 2, "size": "M" }],
  "address": { "name": "Asha", "phone": "9876543210", "line1": "12 MG Road", "city": "Hyderabad", "pincode": "500001" },
  "paymentMethod": "cod" }
-> 201 { "id": 7, "total": 2547, "status": "placed" }
-> 409 { "error": "Only 1 left for \"BlueOak Urban Navy Zip Hoodie\"" }
```
Totals are computed server-side from DB prices (+ ₹49 delivery under ₹999).

## Search implementation
- **Matching:** query is split into ≤6 words; each word becomes `(name ILIKE $n OR description ILIKE $n OR brand ILIKE $n OR category ILIKE $n OR audience ILIKE $n OR sku ILIKE $n)` and all words are AND-ed. `%`, `_`, `\` in user input are escaped so they match literally.
- **Filters** are additional AND clauses, so any combination works together.
- **Relevance:** exact SKU > name prefix > name contains > brand > category, then rating, then id.
- **Stable pagination:** every ORDER BY ends with `p.id`, so ties (many products share a price) never duplicate or skip rows between pages.
- **Safety:** zod validation on every input; values only via `$n` parameters; sort comes from a whitelist (never interpolated).
- **Typo tolerance (bonus):** on zero results, `pg_trgm` similarity suggests a "Did you mean …".
- **Autocomplete, highlighting, URL-persisted filters** are implemented (filters/search/sort/page all live in the URL).
- **Frontend race protection:** each request has an `AbortController` and an `ignore` flag in the effect cleanup, so out-of-date responses are discarded; typing is debounced 350 ms.

## Indexing decisions
- `pg_trgm` GIN indexes on name, description, brand, category, sku → accelerate `ILIKE '%term%'` (btree cannot).
- btree: `(audience, category)`, `brand`, `(price, id)`, `(rating DESC, id)`, `(created_at DESC, id DESC)`, `store_id`; partial index for `stock > 0`.
- Check plans: `EXPLAIN (ANALYZE, BUFFERS) SELECT … WHERE name ILIKE '%hood%' …` — with ~600 rows Postgres may still choose a seq scan (cheaper); the GIN indexes pay off as the table grows.

## Scaling to 100,000+ products
1. Keep trigram indexes for substring search, or move to a `tsvector` generated column + GIN (`websearch_to_tsquery`) with a trigram fallback for typos/partials.
2. Replace `OFFSET` with keyset pagination `(sort_col, id) > ($last, $id)` for deep pages; cap `page`.
3. Replace `COUNT(*)` with a cached/approximate count for unfiltered queries; cache `meta/filters` and `home` (Redis / HTTP cache).
4. Read replicas for search traffic; connection pooling (PgBouncer); move to OpenSearch/Meilisearch if relevance tuning/facets grow.
5. Serve images from a CDN with resized variants.

## Known limitations
- No authentication: orders are tied to an anonymous `clientId` in localStorage (clearing storage loses order history). Payment is cash-on-delivery only.
- Stock is per product, not per size/colour.
- Substring search with ≥6 words ignores the extra words; typo tolerance only runs when there are zero results.
- The relevance score is a simple heuristic.
- Seed images are placeholders unless you provide your own URLs.
- Backend tests are integration tests against a real, seeded Postgres (no mocked DB).
