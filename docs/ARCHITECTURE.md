# Architecture

How the Belims storefront is put together. Start at the root [README](../README.md); operations and hosting live in [OPERATIONS.md](OPERATIONS.md).

---

## System overview

```
Browser ──► www.belims.co.za (Cloudflare proxy) ──► Vercel (static Vite build, `frontend/`)
                                   │
                                   └─ /api/*  ── Vercel rewrite ──► cms.belims.co.za/wp-json/*
                                      (preview belims.vercel.app → staging CMS wordpress-1482444-6707114.cloudwaysapps.com)
                                                                     (Cloudflare → Cloudways: WordPress + WooCommerce
                                                                      + Global Site Settings plugin)
Product/media images ──► cms.belims.co.za/cdn-cgi/image/… (Cloudflare Image Transformations, AVIF/WebP)
```

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 3, single-page app in [`frontend/`](../frontend). React Router v7.
- **Backend:** headless WordPress/WooCommerce at `cms.belims.co.za` (Cloudways). Custom REST API under `belims/v1` from the [Global Site Settings plugin](../wp-content/plugins/global-site-settings/README.md).
- **Auth:** Firebase (phone + Google) verified server-side by the plugin; WordPress user/session via `belims/v1/users/*`.
- **Payments:** PayFast (plugin endpoints) — an order is marked paid only by a verified ITN; the browser return just redirects. **Shipping:** BobGo (uAfrica plugin + `belims/v1/shipping/calculate`). **Catalogue:** FTG sync into WooCommerce.

## Repository layout (`app/public`)

| Path | What it is |
| --- | --- |
| [`frontend/`](../frontend) | Storefront source; Vercel root directory |
| [`frontend/App.tsx`](../frontend/App.tsx) | Routes, global state (cart, products, auth, fulfilment), app shell |
| [`frontend/components/`](../frontend/components) | UI components (pages, sections, drawers, modals) |
| [`frontend/services/`](../frontend/services) | API clients — `wooCommerceService.ts` (products, categories, `cachedGetJson`, `fetchEcommercePolicies`), `authService.ts`, `firebaseService.ts`, `bobGoService.ts`, `paymentService.ts`, `shippingAddress.ts`, `wishlistService.ts`, `dealService.ts`, `tracking.ts`, `storageService.ts`, `geminiService.ts` |
| [`frontend/utils/`](../frontend/utils) | `price.ts` (purchasability/price helpers), `product.ts` (URLs/slugs), `image.ts` + `cmsImageUrl.ts` (Cloudflare transform URLs) |
| [`frontend/src/lib/`](../frontend/src/lib) | Shared fulfilment context (`fulfillmentContext.ts`, `fulfillmentSummary.ts`, `pickupSummary.ts`) |
| [`frontend/src/features/chatbot/`](../frontend/src/features/chatbot) | Chatbot module (currently not mounted) |
| [`frontend/build/homepagePlugin.ts`](../frontend/build/homepagePlugin.ts) | Vite plugin that bakes CMS homepage content into the build |
| [`frontend/api/google-reviews.ts`](../frontend/api/google-reviews.ts) | Vercel serverless function (Google Places reviews) |
| [`frontend/vercel.json`](../frontend/vercel.json) | `/api/*` rewrite (host `belims.vercel.app` → staging CMS, else production CMS), SPA fallback (`/app.html`), cache headers |
| [`frontend/vite.config.ts`](../frontend/vite.config.ts) | Dev server (port 3000, `/api` proxy), plugins, dev mocks |
| [`frontend/public/`](../frontend/public) | Static assets (`images/`, `brands/` logos, favicon) |
| [`wp-content/plugins/global-site-settings/`](../wp-content/plugins/global-site-settings) | Custom CMS plugin (REST API, admin dashboard, integrations) |
| [`wp-content/plugins/belims-ai-product-descriptions/`](../wp-content/plugins/belims-ai-product-descriptions) | Gemini product-description generator (WP admin) |
| [`wp-content/mu-plugins/belims-image-sizes.php`](../wp-content/mu-plugins/belims-image-sizes.php) | Skips WP image sub-sizes (originals served via Cloudflare) |
| [`wp-content/plugins/deploy.sh`](../wp-content/plugins/deploy.sh) | Plugin deploy script (see [OPERATIONS](OPERATIONS.md#cms-plugin-deploys)) |

> Third-party WordPress core/plugins (`wp-admin/`, `wp-includes/`, WooCommerce, ACF, etc.) are vendored — never edit them.

## Routes

Defined in [`App.tsx`](../frontend/App.tsx):

| Path | Page |
| --- | --- |
| `/` | Home (`HomePage` → HeroBanner, ShopByCategory, FeaturedGrid, CollageGrid, DealsSection, CategoryGrid, TradeDeals, PopularCategories, BrandStrip) — or `ComingSoon` when `VITE_COMING_SOON=true` |
| `/shop`, `/shop/:categorySlug` | `Archive` (filters, sort, chips, mobile filter drawer) |
| `/brands/:brandSlug` | `Archive` filtered to one brand (`product_brand` slug, e.g. `/brands/bostik`); title = brand name. `/shop?brand=` still works |
| `/product/*` | `SingleProduct` (URL = category path + `{slug}-{id}`, see `utils/product.ts`) |
| `/cart` | `CartPage` |
| `/checkout` | `Checkout` (details → fulfilment → payment) |
| `/order-confirmation` | `OrderConfirmation` (PayFast return; needs `order_id` + `order_key`) |
| `/login`, `/register` | `AuthPage` |
| `/account`, `/account/:tab` | `AccountPage` (dashboard, orders, addresses, payment, details, wishlist) |
| `/wishlist` | `WishlistPage` |
| `/track-order` | `TrackOrderPage` |
| `/delivery-details/add-address` | `DeliveryDetailsAddAddress` |
| `/admin/order-preview`, `/admin/account-preview` | Internal previews |

## Data flow

- **API base:** `getApiBaseUrl()` → `/api` (rewritten to `cms.belims.co.za/wp-json` by Vercel in production and by the Vite proxy locally).
- **Request cache:** `cachedGetJson()` in `wooCommerceService.ts` dedupes concurrent GETs and caches them in memory (TTL). It retries once on challenge pages, cut-off bodies, 403/429/5xx, and when no response starts within 25 s. Use it for any shared read (e.g. `fetchEcommercePolicies()`).
- **Edge cache:** Cloudflare caches `/api/belims/v1/(products|categories|ecommerce-policies)*` when the origin sends `Cache-Control: public, s-maxage=…` (see [OPERATIONS](OPERATIONS.md#cloudflare-belimscoza-free-plan)).
- **Products:** the homepage rails load first from `fetchHomeProducts()` (`GET /products/home`, ~55 KB) and fall back to the full catalogue; the full listing (`fetchProducts`) and featured (`fetchFeaturedProducts`) load in parallel on mount; unpurchasable items (backorder, zero price, out of stock) are filtered with `isProductPurchasable` (`utils/price.ts`).
- **Homepage hero:** fetched from `GET /belims/v1/homepage` **at build time** by `homepagePlugin` (falls back to `content/homepage.fallback.json`), exposed as `virtual:homepage`, LCP image preloaded in `index.html`; other routes use `app.html` (no preload). The build also emits `homepage-version.json` for the CMS live-version check.
- **Orders & CORS:** checkout sends `frontend_origin` (saved on the order) so PayFast returns the customer to the storefront they ordered on; order and payment-status reads pass the order key. The CMS allows CORS from www, preview and `localhost:3000` at the same time.
- **Client storage:** delivery address (`shippingAddress.ts`), pickup store, fulfilment context (`src/lib/fulfillmentContext.ts`), auth token, wishlist, cart — all `localStorage`.

## Images

- **CMS media** is WebP; the storefront requests it through Cloudflare: `cmsImage(src, width)` / `cmsSrcSet(src, widths)` in [`utils/image.ts`](../frontend/utils/image.ts) → `/cdn-cgi/image/width=…,quality=80,format=auto,fit=scale-down/…`. Gated by `VITE_CF_IMAGE_TRANSFORMS=true`.
- Product cards use `CARD_IMAGE_WIDTHS` / `CARD_IMAGE_SIZES`.
- **Static images** in `frontend/public/images` ship pre-sized WebP variants (e.g. `-640.webp`, `-1080.webp`, `-360.webp`) referenced via `srcSet`.
- **Brand logos** are self-hosted in `frontend/public/brands/{slug}.svg` (map in `BrandStrip.tsx`); unmapped brands render a text badge.

## Environment variables (`frontend`)

| Variable | Used for | Where set |
| --- | --- | --- |
| `VITE_COMING_SOON` | Show `ComingSoon` on `/` | Vercel **Production only** |
| `VITE_CF_IMAGE_TRANSFORMS` | Enable Cloudflare image URLs | Production + Preview |
| `VITE_FIREBASE_*` (6) | Firebase client config | All environments |
| `VITE_GOOGLE_MAPS_API_KEY` | Address autocomplete / geolocation | Vercel + `.env.local` |
| `VITE_CMS_URL` | Override CMS origin for the Vite proxy/build plugin (default `https://cms.belims.co.za`) | Optional, local |
| `GOOGLE_PLACES_API_KEY` | `api/google-reviews.ts` (server-side) | Vercel |

`VITE_*` values are **inlined at build time** — changing one requires a new build. Template: [`frontend/.env.example`](../frontend/.env.example).

## Design system

- Tokens: CSS variables in [`frontend/index.css`](../frontend/index.css) (`--color-primary` etc., Nexvo palette), mapped to Tailwind in [`frontend/tailwind.config.js`](../frontend/tailwind.config.js) (`primary`, `surface`, `text-secondary`, `border`…). Prefer tokens over hex.
- Typography audit: [`belims-headless/docs/typography-migration.md`](../../../docs/typography-migration.md) (parent repo, not in this repo on GitHub).
- The Nexvo (Shopify theme) migration rules and section status are archived in [archive/frontend/NEXVO-MIGRATION.md](archive/frontend/NEXVO-MIGRATION.md).
- Shared primitives: `Drawer`/`SidePanel`/`BottomDrawer`, `Spinner` (`data-icon="inline-start|inline-end"`), `Skeleton`, `Toast`, `Pill`.

## Category tree

The live WooCommerce category tree snapshot (Feb 2026) is archived at [archive/frontend/CATEGORY-LIST.md](archive/frontend/CATEGORY-LIST.md); the source of truth is `GET /belims/v1/categories`.
