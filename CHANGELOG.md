# Changelog

## 2026-10-01 — Static image right-sizing + shared ecommerce-policies request (Lighthouse follow-up)

### Images
- `CollageGrid`: `srcSet` (640 / 1080 / original) + per-tile `sizes`; new `-640.webp` / `-1080.webp` variants (q78) beside each `public/images/development` original. Per-tile `imageWidth` keeps descriptors accurate (rotary_01 = 1280w).
- `PopularCategories`: `bosch-impact-kit.jpg` / `Makita-Saws.jpg` → `-360.webp` (62KB → 19KB, 58KB → 10KB).
- Logos: `belims-logo-dark|white.png` → 400w `.webp` (12.1KB → 7.0KB, 11.1KB → 4.9KB) in Header, Footer, AuthPage, Checkout, ComingSoon. PNGs retained — still referenced by `global-site-settings/assets/css/admin.css`.

### ecommerce-policies
- New `fetchEcommercePolicies()` in `services/wooCommerceService.ts` (via `cachedGetJson`) — dedupes the homepage's two concurrent requests (App + DeliveryLocationModal); also adopted by SingleProduct, Checkout, DeliveryDetailsAddAddress.
- An `override_origin` Cloudflare rule was trialled and reverted within ~1 min — it cached Imunify360's 200 `text/html` challenge page.
- **Global Site Settings 2.8.1:** `class-ecommerce-settings.php` `get_policies()` now returns `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=300`. (`class-ecommerce-policies.php` is not loaded — the live route is in `class-ecommerce-settings.php`.) Deployed to CMS (2 files; server backup `~/gss-backup-20261001172913`).
- Cloudflare "API catalogue" rule (respect-origin) extended to `/api/belims/v1/ecommerce-policies`. Verified: JSON → `HIT` (~0.2s); Imunify challenge (`private, no-store`) → `BYPASS`, never cached.

---

## 2026-10-01 — Static asset cache headers (GTmetrix "Add Expires headers")

### frontend/vercel.json — `headers`
- `/assets/*` (Vite content-hashed JS/CSS): `public, max-age=31536000, immutable`.
- `/images/*`, `/brands/*`, `/favicon.svg` (unhashed): `public, max-age=604800, stale-while-revalidate=86400` — rename files to bust cache.
- HTML documents unchanged (`max-age=0, must-revalidate`) so deploys propagate immediately.
- Compression: HTML/JS/CSS/SVG/JSON already served Brotli/gzip; raster images intentionally uncompressed — no change.

---

## 2026-10-01 — Global Site Settings 2.8.0: CMS-editable homepage hero

### CMS (plugin)
- ACF `group_belims_homepage`: Flexible Content `homepage_sections` with a Hero layout (title, description, button, desktop + optional mobile image, alt, show toggle).
- `includes/class-homepage.php`: `GET /belims/v1/homepage`; on save of changed content, schedules the Vercel deploy hook 60s later (debounced); publish-now + hook-URL AJAX; live-version check via storefront `homepage-version.json`.
- Site Settings → **Homepage** tab (`admin-homepage-tab.php`, `assets/js/homepage-tools.js`); dashboard tile + endpoint row.

### Storefront
- `frontend/build/homepagePlugin.ts`: fetches homepage at build (fallback `content/homepage.fallback.json`), `virtual:homepage` module, hero preload injected into `index.html` only; writes `app.html` (no preload) + `homepage-version.json`.
- `vercel.json`: SPA routes rewrite to `/app.html` (homepage keeps `index.html`).
- `HeroBanner.tsx`: renders from `virtual:homepage` with `<picture>` (optional mobile image) and responsive Cloudflare URLs identical to the preload.
- `utils/cmsImageUrl.ts`: shared pure URL builder; `utils/image.ts` now uses it.
- `index.html`: static hero preload removed (now injected per build).

### Verified locally
- Local CMS: endpoint payload, debounced deploy scheduling (no duplicate on unchanged save), admin tab renders.
- Builds: CMS content path, fallback path (prod 404), transforms + mobile preload/srcset parity (unit check).
- Lighthouse desktop (local preview): 99 — LCP 0.8s, single hero request, LCP discovery passes.

### Production rollout
- Storefront: commit `70f422e7`; on Vercel `/` serves the hero preload, `/shop` and `/product/*` serve `app.html` without it.
- Vercel Deploy Hook "CMS Homepage" (branch `vercel`) created and saved in CMS (masked).
- CMS: plugin 2.8.0 deployed; hero image imported (attachment 5564, Global folder); Hero seeded with the existing content; published via hook.
- Verified: hook build `source: cms`, version `617b6034004a`; Homepage tab status in sync; preload uses Cloudflare AVIF (1280w = 63.8KB).

---

## 2026-10-01 — Homepage LCP + font loading (Lighthouse follow-up)

- `HeroBanner.tsx`: hero image now self-hosted (`/images/development/home-banner-placeholder.webp`, 1260×739, 71KB) instead of the Shopify demo store; `loading="eager"`, `fetchPriority="high"`, explicit width/height. Shopify demo hero video (~5MB) and its idle-load/Play logic removed.
- `index.html`: hero image preloaded; unused Inter + Sora fonts removed; Archivo loaded via non-blocking preload (`display=swap`, `<noscript>` fallback); dead AI Studio import map removed.
- `index.css`: Archivo `@import` removed (moved to `index.html`).
- Local Lighthouse desktop (vite preview): Performance 99 — FCP 0.6s, LCP 0.7s, TBT 10ms, CLS 0.001; LCP discovery passes. Production baseline before: 96.

---

## 2026-10-01 — Global Site Settings 2.7.2: phone sign-in account matching

### class-firebase-phone-auth.php
- `find_user_by_phone()`: matches `billing_phone` ignoring spaces, dashes, brackets and "+", and accepts the local SA format (`+27821234567` ⇄ `0821234567`); oldest account wins when a number is shared. Falls back to the account a previous phone sign-in created (`phone_<digits>`) so an edited billing phone no longer causes `existing_user_login` lockouts.
- Account lookup/creation failures are logged (`error_log`) and return a generic message instead of raw WordPress errors.
- Verified on production (read-only): all 8 stored billing phones (3 formats) resolve to an account; unknown numbers resolve to none. 5 of 8 numbers are shared by several accounts — the oldest is used.

---

## 2026-10-01 — Global Site Settings 2.7.1: Firebase sign-in security fix

### Account-takeover vulnerability closed (production)
- **Issue:** `BELIMS_FIREBASE_API_KEY` was not set on production, so `/auth/firebase-phone` and `/auth/firebase-google` skipped token verification and issued a WordPress JWT for whatever phone/email the client sent (any customer — or admin, by email — could be impersonated). Both endpoints also fell back to client-supplied phone/email when a verified token lacked that field.
- **Fix:**
  - `BELIMS_FIREBASE_API_KEY` added to production `wp-config.php` (Belims Firebase web key, matched to the storefront bundle). Backup: `private_html/belims-img/wp-config.php.bak-20261001`.
  - `class-firebase-phone-auth.php` / `class-firebase-google-auth.php`: fail closed when the key is missing; identify accounts only by the Firebase-verified phone/email; unused client fields removed.
- **Verified:** bogus tokens return 401 `INVALID_ID_TOKEN` on both endpoints; no user or JWT created. Dashboard Firebase Auth card now reports Active.

---

## 2026-10-01 — Global Site Settings 2.7.0: dashboard + navigation refactor

### 1. Navigation (sidebar) — each feature listed once
- Settings: Branding · **Store Details** (renamed from Ecommerce) · CORS & Security · WooCommerce (last two restored to the sidebar).
- Integrations: **FTG Sync** (was "Products") · **BobGo Shipping** (was "Shipping") · **Firebase Auth** (new) · **AI Services** (added to sidebar).
- Tools: **Media Management** (was "Media"). Payment Gateways and PayFast Testing removed from sidebar and dashboard (tabs kept in DOM).

### 2. Dashboard
- Integrations row: FTG Sync, BobGo Shipping, Firebase Auth, AI Services (Payment Gateway card removed). Firebase card now opens its own tab; badge reads "Not verified" when the server API key is missing.
- Settings row: Branding, Store Details, CORS & Security, WooCommerce only (integrations no longer duplicated).
- Quick Tools: Clear Cache only (FTG Sync + Check Assa Abloy Count removed, with their dashboard-only JS). Unused PayFast dashboard variables removed.

### 3. Firebase Auth tab (new, read-only)
- Shows API key / JWT secret status and endpoints; warns when server-side token verification is off.
- ⚠ Open security issue: `BELIMS_FIREBASE_API_KEY` is not set on production, so phone sign-in trusts the client-supplied phone number. Fix deferred by request; documented in plugin README → Known Constraints.

### 4. Store Details
- Google Maps API Key masked after save (`AIzaSyDn••••••••`) with an Edit button.

### 5. Docs
- Plugin README navigation table + constraints; `userguide.md` rewritten for the new structure (Branding and Store Details fields taken from the live screens).

---

## 2026-10-01 — Global Site Settings 2.6.0: Media tab (image optimiser + Products folder)

### 1. includes/class-image-optimizer.php — new
- Bulk PNG/JPEG → WebP conversion (same logic as the one-off WP-CLI run) as an Action Scheduler background queue; Start / Pause / Resume, progress + log.
- Auto-convert new uploads toggle (Media Library uploads + FTG sync image imports).
- Archive Old Originals: dry run / move unreferenced PNG/JPEG out of uploads.
- Assign Product Images → Products folder (featured, gallery, uploaded-to-product); re-runnable.

### 2. Site Settings → Media tab
- `includes/admin-media-tab.php` + `assets/js/media-tools.js`; nav item under Tools.

### 3. FTG sync
- Imported product images are added to Media → Folders → Products; converted to WebP when auto-convert is on.

### 4. Media Folders
- `Belims_Media_Folders::assign_to()` helper (adds folder, keeps existing ones).

---

## 2026-10-01 — Global Site Settings 2.5.0: FTG sync eligibility + Media Folders

### 1. FTG sync — only pull complete products
- New `get_missing_required_fields()` in `class-ftg-sync-endpoint.php`: requires stock quantity > 0, selling price > 0 and ≥1 web category.
- Applied to bulk sync (skipped with `reason: Missing stock, price, …` in `skipped_items`) and single-SKU sync (returns `Skipped: FTG product is missing …`).
- Existing CMS products that fail are left untouched (not updated, not unpublished).

### 2. Media → Folders
- New `includes/class-media-folders.php`: hierarchical `media_folder` taxonomy on attachments with admin page, list-view column + filter, attachment folder field.
- New `assets/js/media-folders.js`: folder dropdown in Media Library grid / media modal (server-side filter via `ajax_query_attachments_args`).
- Seeds Global, Products, Brands, Campaigns once (`belims_media_folders_seeded`).
- Plugin version 2.4.0 → 2.5.0; README updated.

---

## 2026-10-01 — CMS media library converted to WebP + unused sub-sizes dropped (production)

### 1. wp-content/mu-plugins/belims-image-sizes.php — new must-use plugin
- Unsets `medium_large`, `large`, `1536x1536`, `2048x2048` via `intermediate_image_sizes_advanced`; the headless frontend consumes originals through Cloudflare Image Transformations.
- Kept: `thumbnail`, `medium`, `woocommerce_thumbnail`, `woocommerce_single`, `woocommerce_gallery_thumbnail` (WP admin, Woo admin/emails).
- Deployed to `cms.belims.co.za` (`applications/uhkkwupuum/public_html/wp-content/mu-plugins/`).

### 2. Bulk PNG/JPEG → WebP conversion (one-off, WP-CLI)
- Script: `private_html/belims-img/convert-webp.php` (server only). Imagick WebP q80, method 6, metadata stripped; attachment repointed (`_wp_attached_file`, `post_mime_type = image/webp`), sub-sizes regenerated.
- Result: **1,988 attachments converted, 720.8MB → 80.8MB (−89%)**, 0 errors.
- Skipped: WooCommerce email header image (WebP unsupported in Outlook desktop).
- DB audit beforehand: images referenced by attachment ID only (no URLs in post content / postmeta / termmeta), so no search-replace was required.
- Old PNG/JPEG files left in place so cached API responses (Cloudflare 5 min, browser 4h) keep resolving. Archive step pending — see follow-ups.
- Verified: `/products/287` API returns `.webp`; file served `image/webp`; Cloudflare transform returns AVIF (79KB total → 13.5KB at 480w).

### Follow-ups
- Run `archive-old.php` (dry-run, then `--run`) ≥4h after conversion to move unreferenced PNG/JPEG into `private_html/belims-img/archive/`.
- Enhance the converter: see project notes (convert-on-upload, archive automation, resumable batches).

---

## 2026-10-01 — Image load performance (HAR audit follow-up)

### 1. App.tsx — featured products fetched concurrently
- `fetchFeaturedProducts()` no longer waits for the full catalogue `fetchProducts()`; both fire on mount.
- `isLoadingProducts` now clears as soon as the catalogue resolves (previously also waited ~1s for featured).

### 2. utils/image.ts — Cloudflare Image Transformations helper
- `cmsImage(src, width)` rewrites `cms.belims.co.za` URLs to `/cdn-cgi/image/width=…,quality=80,format=auto,fit=scale-down/…`; other hosts pass through unchanged.
- `cmsSrcSet(src, widths)` + `CARD_IMAGE_WIDTHS` (320/480/640/800) / `CARD_IMAGE_SIZES`.
- Gated by `VITE_CF_IMAGE_TRANSFORMS === "true"` (documented in `.env.example`); default off — `/cdn-cgi/image/` currently 404s until Transformations is enabled on the zone.
- Applied to `ProductCard` and `NexvoProductCard` (main + hover images).

### 3. BrandStrip.tsx — self-hosted brand logos
- Removed the worldvectorlogo guess-chain (`getWorldVectorLogoCandidates`, `onError` retry state) — it produced ~20 × 404s per homepage load.
- Logos now served from `frontend/public/brands/*.svg` via a slug-keyed `BRAND_LOGOS` map; unmapped CMS brands render the existing text badge with zero image requests.
- Mapped: Assa Abloy, Dulux, Yale (+ fallback-list Bosch, Makita, DeWalt, Stanley, Einhell, Ryobi).
- Dropped incorrect matches previously shown live: `fast.svg` / `hard.svg` were Russian ФАСТ / ХАРД marks; `union.svg` unverified.
- Still need official artwork: Alcolin, Bostik, FAST, HARD, Hillaldam, Ingco, Lasher, Ruwag, Sika, Union.

### 4. Cloudflare (dashboard, manual)
- Cache Rule required for `www.belims.co.za/api/belims/v1/(products|categories)*` — origin already sends `public, s-maxage=300, stale-while-revalidate=300` but Cloudflare reports `DYNAMIC` (JSON not cache-eligible by default).

---

## 2026-10-01 — Order Confirmation redesign + shared Spinner + motion

### 1. OrderConfirmation.tsx — success state redesign
- New layout: tinted check badge → "Order Confirmed!" heading + subtitle → order card → "What's Next?" → Continue Shopping (`/shop`) / Need Help? (`/track-order`).
- Order card: `Order #` + "Placed on" date (`M/D/YYYY`), primary "View Order Details" toggle, divider, 3-column Processing / Shipping / Estimated Delivery row.
- Estimated delivery = order date + `ESTIMATED_DELIVERY_DAYS` (5); falls back to "To be confirmed".
- "View Order Details" expands the existing `OrderDetailsView` receipt inline (`aria-expanded` / `aria-controls`); line items, totals and billing preserved for guest checkouts.
- Uses Nexvo tokens (`primary`, `border`, `text-secondary`); soft tint via `color-mix` (no tint token exists yet).
- Loading/error fallback, payment polling and post-payment account creation unchanged.

### 2. OrderConfirmation.tsx — motion loading spinner
- Replaced lucide `Loader` with a `motion.div` ring (50px, 4px `border-border` track, `border-t-primary` arc, linear 360° rotation / 1.5s, infinite), `role="status"`.
- Based on motion.dev "Loading circle spinner" example; inline `<style>` dropped (`.container` clashes with Tailwind; `--divider` / `--hue-1` undefined).

### 3. OrderDetailsView.tsx — `summaryOnly` prop
- Optional, default `false`. When `true`, renders only the order summary column inside a `<div>` (no thank-you panel, page chrome or nested `<main>`).
- `AdminOrderPreview` unaffected.

### 4. Spinner.tsx — new shared loading spinner
- Wraps lucide `Loader2` with `animate-spin`, `role="status"`, `aria-label`; accepts `data-icon="inline-start" | "inline-end"`.
- Button content wrappers consume it via `[&>[data-icon=inline-start]]:-ml-0.5 [&>[data-icon=inline-end]]:-mr-0.5`.
- Applied to async add-to-cart buttons: QuickView, SingleProduct (×2), ComparisonModal. Synchronous ATC buttons (ProductCard, NexvoProductCard, WishlistPage, AccountPage) intentionally unchanged.

### 5. Dependencies
- Added `motion@^13.4.6`.

---

## 2026-09-26 — Checkout fulfilment step + register form + PHP parse fix

### 1. AuthPage.tsx — single-step register with required mobile number
- Collapsed multi-step registration to a single form: First name + Last name (2-col grid) → Email → Password → Mobile number.
- Mobile number field is `required`; uses existing `regDialCode` / `regLocalPhone` / `buildRegPhone()` state.
- Removed: `registerStep` state, `handleRegisterStep1`, progress bar, and step 2 JSX entirely.

### 2. Checkout.tsx — post-registration auto-populate + shipping advance
- Auto-populate effect now always sets personal details (name, email, phone) from user profile on login, regardless of whether a WooCommerce address exists.
- If WooCommerce profile has an address, address fields are also pre-filled and step advances to shipping automatically.

### 3. Checkout.tsx — Fulfilment step redesign
- Delivery/Pickup toggle moved from details step to shipping/fulfilment step as radio-card buttons (Truck / Store icons).
- "Delivery Details" section only renders when delivery is selected; pickup section unchanged.
- Address source of truth: localStorage Address Pill no longer pre-fills checkout address — first-time users always start with an empty form.

### 4. Checkout.tsx — address form updated to match spec
- Fields reordered: Street Address → Complex/Building → Postal Code | Suburb (2-col grid) → City/Town | Province (2-col grid) → Type of Address radio → action buttons.
- Removed "Address Label" text input; replaced with "Type of Address" radio: Home (All day delivery) / Work (Delivery between 10 AM – 5 PM).
- Added `suburb` field to `CustomerDetails` interface and initial state.
- "Use current location" button moved from beside Street Address to bottom-left of form (outlined, with `MapPin` icon).
- "Save and Deliver Here" dark button added bottom-right; calls `handleSaveAddress()` which fetches shipping rates and collapses form to pill view.
- Shipping method section gated: only renders after address is saved (`addressAutoPopulated && !editingAddress`).

### 5. Geolocation — two-attempt retry pattern
- First attempt: `enableHighAccuracy: false, timeout: 10000, maximumAge: 300000` (fast / cached).
- On `POSITION_UNAVAILABLE` (code 2): retry with `enableHighAccuracy: true, timeout: 30000, maximumAge: 0`.
- Fixes `kCLErrorLocationUnknown` failures on macOS/iOS.

### 6. class-products-endpoint.php — PHP parse fix
- Two `$candidates[] = array(` blocks (lines ~644 and ~697) were truncated mid-edit, missing `'slug'`, `'image'`, `'rating'`, and the closing `);`.
- Both arrays completed to match the full product DTO pattern used elsewhere in the file.
- `php -l` confirms: no syntax errors.

---

## 2026-09-26 — TailGrids card standard + Archive + slider unification

### 1. ProductCard.tsx — TailGrids refactor
- Replaced flexible-height image block with `aspect-square` contained canvas (`bg-[#F8F9FA]`, `group-hover:scale-105`).
- Wishlist button: floating top-right on image, `opacity-0 group-hover:opacity-100`; persists `opacity-100 text-red-500` when active. Wired to `isInWishlist` / `toggleWishlist` from `wishlistService`.
- Badge moved inside image container (top-left); `badgeClass` now uses `bg-deal-sale` token. `getBadgeLabel` gains fallback: shows "SALE" when `sale_price < regular_price` with no active deal.
- Weekly/trade/low-stock marquees removed; daily deal timer kept as compact bottom badge.
- Action row: "Add to Cart" (`ShoppingCart`) + square "Quick View" (`Eye`) button. Out-of-stock shows "Notify me" with status states.
- Category label rendered uppercase above title via `displayCategory`.
- `PRODUCT_CARD_PRESETS` updated: all presets use `imageBlockClassName: "aspect-square w-full"`.
- `flat-horizontal` variant adapts via `sm:flex-row sm:gap-4` on `<article>`; image constrains to `sm:w-48`.

### 2. Archive.tsx — collapsible sidebar + filter service
- Full TailGrids collapsible sidebar: Filter By header card, Product Category (search + view more/less), Price Range (dual-thumb slider + inputs), Availability, Current Offers, Brand, Range, Color — all as rounded-xl cards with `#3758F9` accent and `#F4F7FF` pill badge counts.
- Filter fetch migrated from inline `fetch()` to `fetchProductFilters()` service call with `isMounted` guard.
- `sortBy` expanded: added `"recommended"`, `"name-asc"`, `"name-desc"` options.
- Debug `console.log` and `useWindowWidth` / `categorySliderWidth` removed.
- Product grid: `grid-cols-2 sm:grid-cols-3 xl:grid-cols-4` with list/grid toggle; mobile filter slide-over drawer retained.

### 3. ShopByCategory.tsx — standardised to ProductCard
- Reverted custom inline card to `<ProductCard />` + `<SkeletonProductCard />`.
- Header: title left, tabs centred, nav arrows right.
- Carousel responsive: 2 (mobile) / 3 (tablet) / 5 (desktop) cards via `basis-[calc]`.
- Best-sellers sort uses `maxStock`; product count capped at 16.

### 4. wooCommerceService.ts — filter endpoint
- Added `ProductFiltersData` interface (range, color, brand arrays).
- Added `fetchProductFilters()`: calls `${BASE_URL}/products/filters` via `cachedGetJson`; returns `{ range: [], color: [], brand: [] }` on failure.

### 5. vite.config.ts — consolidated dev mock stubs
- Merged `dev-google-reviews-stub` into single `dev-api-mock-stub` plugin.
- Added mock routes: `/api/belims/v1/products/filters`, `/api/ecommerce-policies`, `/api/wp/v2/product_brand`, `/api/jwt-auth/v1/token`.

### 6. SingleProduct.tsx — Frequently Bought With slider
- Updated from fixed `basis-[calc((100%-1.5rem)/3)]` (3 columns, no breakpoints) to responsive `basis-[calc((100%-1rem)/2)] sm:basis-[calc((100%-2rem)/3)] lg:basis-[calc((100%-4rem)/5)]` — 2 / 3 / 5 cards across mobile / tablet / desktop.

---

## 2026-09-26 — Component standardisation + Auth modal

### 1. Drawer component system
- Created `Drawer.tsx` — canonical reusable right-side drawer primitive. Wraps `BottomDrawer` with a standardised header (title + X close), scrollable body, and optional footer prop. Source of truth for all future right-panel UIs.
- Created `WelcomeDrawer.tsx` — guest-user drawer triggered by the "Sign In · Sign Up" chip in the header. Contains 5 nav links (only Sign In/Sign Up wired), and a placeholder Contact Support section (Live Chat + Email cards).
- `Header.tsx`: unauthenticated account chip now opens `WelcomeDrawer` instead of routing to `/login`. Authenticated flow unchanged.

### 2. AuthModal — inline sign-in/register
- Created `AuthModal.tsx` — centred modal (z-2000, above drawer layer) with Sign In / Create Account tab switcher. Renders `AuthPage` in `layout="modal"` mode.
- `AuthPage.tsx`: added `layout`, `onSwitchMode`, and `onClose` optional props. Modal layout skips full-page chrome; `onSwitchMode` swaps login ↔ register inline; post-success calls `onClose` instead of `navigate("/")`. Page layout unchanged.
- `WelcomeDrawer`: clicking Sign In/Sign Up closes the drawer and opens `AuthModal`. On success, `setCurrentUser` is called and the modal closes.
- `Header.tsx`: added `showToast` prop and threads it to `WelcomeDrawer` → `AuthModal` → `AuthPage`.

### 3. BelimsReviews — moved to Footer
- Removed `<BelimsReviews>` from `SingleProduct.tsx` (was rendering on every product page).
- Added as first section in `Footer.tsx` so reviews appear site-wide, once per page.

### 4. Vite dev mock stub for Google Reviews
- `vite.config.ts`: added `dev-google-reviews-stub` inline Vite plugin. Intercepts `/api/google-reviews` in dev before the proxy, returns 6 mock reviews (`placeRating: 4.8`, `totalRatings: 247`). Component renders in dev without Vercel functions running.

### 5. File corruption recovery (session 2)
- `ShopByCategory.tsx` — `return list.sort()` block inside `best-sellers` useMemo branch was truncated; 6 lines restored from HEAD. Text tokens also updated (`text-grey` → `text-text`, `text-grey-medium` → `text-text-tertiary`).
- `ComparisonModal.tsx` — rating `</span>`, reviews count `<span>`, and `</div>` were deleted; restored from HEAD.
- `SingleProduct.tsx` — 3 imports (`ProductAccordions`, `TradePricingAvailable`, `BelimsReviews`) + `interface SingleProductProps {` opener lost; BelimsReviews JSX block also lost. Both hunks restored from HEAD.
- `api/google-reviews.ts` — `NewApiReview` + `ReviewsPayload` interfaces, `apiKey` guard, `X-Goog-FieldMask` header, full `normalized` map, `payload` construction, and `catch` block were all truncated. Restored via `git checkout HEAD`.

### 6. CookieConsent simplified
- Replaced full bottom-drawer with overlay with a simple fixed bottom banner (max-w-3xl, centred). Single "Okay" CTA + "×" dismiss. No animation state machine. Props interface unchanged.

---

### Next task
Refactor the Account Drawer (authenticated user panel) in `Header.tsx` (lines 1402–1519) to use the new `Drawer` component instead of the ad-hoc `fixed inset-0 z-[9999]` implementation. The panel has a header, scrollable body with nav links / trade block, and a sticky footer with Sign In / Log Out buttons — maps cleanly to `Drawer`'s `title`, `children`, and `footer` props.

---

## 2026-09-26 — Google reviews bugfixes + file corruption recovery

### 1. Google Places API — legacy → Places API (New)
- Initial function called `maps.googleapis.com/maps/api/place/details/json` (legacy). Google returned `REQUEST_DENIED` because the legacy Places API was not enabled on the project.
- Switched to `places.googleapis.com/v1/places/{placeId}` (Places API New) with `X-Goog-Api-Key` + `X-Goog-FieldMask` headers. Response shape changes: `user_ratings_total` → `userRatingCount`, `reviews[].text` → `reviews[].text.text`, `reviews[].time` (unix) → `reviews[].publishTime` (ISO-8601), `reviews[].author_name` → `reviews[].authorAttribution.displayName`.

### 2. Google Places API — HTTP referrer restriction removed
- API key had HTTP referrer restrictions set in Google Cloud Console. Server-to-server calls from Vercel functions have no referrer (`<empty>`), causing `PERMISSION_DENIED` / `API_KEY_HTTP_REFERRER_BLOCKED`.
- Fix: removed HTTP referrer restriction from the key; kept API restriction to Places API (New) only.
- Result: `GET /api/google-reviews` now returns `200` with Vercel CDN caching (`cache=HIT` on subsequent requests).

### 3. Vite proxy — bypass Vercel function routes locally
- `vite.config.ts`: added `bypass()` function to the `/api` proxy. Routes matching `/api/google-reviews` return `false` (clean 404 locally) instead of being proxied to the CMS — which had no such endpoint and returned misleading errors.
- `BelimsReviews.tsx`: added silent `return null` when the fetch returns 404 (local dev without Vercel runtime). All other HTTP errors still show the error state.

### 4. File corruption recovery
- `geminiService.ts:355–360` — `.replace()` chain was truncated, losing the closing `);`, `return` statement, and the `if (!client)` closing `}`. Restored.
- `vite.config.ts` — `rewrite` and `bypass` functions inside the proxy config were deleted, leaving an invalid empty object. Restored.
- `BelimsReviews.tsx` — file was truncated mid-component (missing interface closing brace, component state, and most of the JSX). Full rewrite restored.
- `AccountPage.tsx:934–936` — Display Name `<input>` was missing its closing `/>` and the enclosing `</div>`. Restored.

---

## 2026-09-26 — Google reviews + CategoryGrid pill slider

### 1. Google Reviews — Vercel Serverless Function (`api/google-reviews.ts`)
- New `api/google-reviews.ts` Vercel serverless function. Calls Google Places API server-side using `GOOGLE_PLACES_API_KEY` (sensitive env var — never exposed to the browser bundle).
- Hardcoded Place ID `ChIJE4HCbjw39h4Rfq_ZYEWcvKM` (Belims Hardware). Returns normalised payload: `placeRating`, `totalRatings`, and `reviews[]` (id, reviewer, rating, review text, ISO date, relativeTime, photoUrl, source: "google").
- `Cache-Control: s-maxage=3600, stale-while-revalidate=86400` — Vercel CDN caches for 1 hour; Google API is hit at most once per hour regardless of traffic.
- `@vercel/node` added as devDependency for function request/response types.
- `GOOGLE_PLACES_API_KEY` added to Vercel project (production + preview) as sensitive type via Vercel API.

### 2. BelimsReviews component (`components/BelimsReviews.tsx`)
- New reusable `<BelimsReviews />` component. Fetches from `/api/google-reviews` on mount with `AbortController` cleanup.
- Displays overall star rating + total Google review count in the section header with a "View all on Google" link (desktop inline, mobile below grid).
- Review cards: reviewer avatar (Google photo or initials fallback), star rating, relative time, review text (`line-clamp-5`), Google badge footer.
- States: 3-column skeleton loader (pulse animation), inline error message, empty state, review grid.
- Props: `title` (default "What Our Customers Say"), `limit` (default 5).

### 3. BelimsReviews added to SingleProduct page
- `<BelimsReviews title="What Our Customers Say" />` inserted between the "How About These" related-products section and the "Recently Viewed" section on every product page.

### 4. CategoryGrid — pill slider refactor
- Removed all icon imports (`Anchor`, `Droplet`, `PaintBucket`, `Plug`, `Scissors`, `Settings`, `Zap`, `Hand`, `LucideIcon`) and the large circular tile layout.
- Removed page-dot indicator, `pageCount`/`activePage` state, `ResizeObserver`, and `scrollToPage`.
- Replaced with a compact single-row pill slider: bold "Shop by Category" label left-aligned, inline `<ChevronLeft>` / `<ChevronRight>` scroll buttons, horizontally scrollable `rounded-full border` pill track.
- Section reduced from `py-14` to `py-3` with a `border-b border-border` separator.
- Scroll advances 320 px per arrow click.

---

## 2026-09-26 — Auth page redesign + ProductCard category hidden

### 1. Auth page — social buttons repositioned
- Google and Facebook buttons moved above form fields for both sign-in and registration.
- Layout changed to 2-column inline grid on `sm+` breakpoint (`grid-cols-2`), stacks on mobile.
- "Or continue with" divider repositioned below the buttons.

### 2. Auth page — Login flow restructured
- Sign-in page now loads directly on email + password (removed the single identifier step).
- "Log In with a One-Time Code" button added above the Sign In button (only rendered when Firebase is configured), separated by an `or` divider. Clicking it switches to the phone OTP flow.
- "Don't have an account? Create one." moved from the header subtitle to below the Sign In button.
- "Forgot your password?" link added inline with the Password label (right-aligned), matching checkout form pattern.
- Back links in the OTP flow now return to the password step (not the legacy identifier step).

### 3. Auth page — Forgot password
- `authService.ts`: added `requestPasswordReset(email)` calling `POST /belims/v1/users/forgot-password`.
- New `forgot-password` login step: email input → "Send reset link" → success message replaces button → "← Back to sign in".
- Email pre-filled from whatever was typed in the password step before clicking the forgot link.

### 4. Auth page — Registration 2-step flow
- Registration refactored from a single form to a 2-step flow with a progress bar.
- **Step 1**: Email + Password → "Create Account" button → "Already have an account? Log in here." below.
- **Step 2 (Personal Details)**: First Name (required), Last Name (required), Mobile Number (required) with international dial-code selector (flag + country code `<select>` + numeric input, reusing `DIAL_CODES`). Back button returns to Step 1; "Register" submits.
- Phone stored in E.164 format (`buildRegPhone()` strips leading zero and prepends dial code).
- "Already have an account?" removed from header subtitle; lives below the Step 1 button only.
- Registration API call (`registerUser`) happens on Step 2 submission; errors reset to Step 1.

### 5. Auth page — Checkout-style layout
- Dark left sidebar removed entirely.
- Page wrapper: `min-h-screen flex flex-col bg-neutral-50`.
- Checkout-style `<header>`: Belims logo (linked to `/`) on the left, `<Lock />` + "Secure checkout" on the right — exact markup from `Checkout.tsx`.
- Form card: `rounded-lg border border-neutral-200 bg-white p-6 md:p-8` — matches checkout card.
- All inputs: `h-12 rounded-md border-neutral-200 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10` — checkout `inputClass`.
- All labels: `text-[14px] font-medium text-neutral-950` — checkout `labelClass`.
- Primary buttons: `h-12 rounded-md bg-belims-blue hover:bg-neutral-800` with full focus ring — checkout `primaryButtonClass`.
- Outlined buttons (Back, OTC): `h-12 rounded-md border-neutral-200 bg-white hover:bg-neutral-50`.
- Error/success messages: `rounded-md border-red-200 bg-red-50` / `border-green-200 bg-green-50`.
- Field spacing: `space-y-1.5` per field, `space-y-5` between fields.
- Class constants (`inputClass`, `labelClass`, `primaryButtonClass`, `outlineButtonClass`, `errorClass`, `successClass`, `orDivider`) declared at module level.

### 6. App.tsx — header/footer hidden on auth routes
- `isCheckoutRoute` extended to `["/checkout", "/login", "/register"].includes(pathname)`.
- Suppresses the main `<Header>`, `<Footer>`, `<CartDrawer>`, `<SearchModal>`, `<CompareModal>`, and all other overlays on login and register pages — same behaviour as the checkout page.

### 7. ProductCard — category label hidden
- Removed the `{/* Category / Deal Name */}` block from `ProductCard.tsx`.
- Category, deal name, and custom `categoryText` no longer render on any card variant.

---

## 2026-09-25 — Delivery Details popover + Add Address page

### 1. Delivery Details popover
- New `frontend/components/DeliveryDetailsPopover.tsx` — nudge popover anchored under the header "Delivering to" pill, with two variants: `popover` (desktop, caret pointing up at the pill) and `sheet` (mobile, fixed bottom, dark backdrop, drag handle, close X).
- Copy: "To view **product availability** and **local pricing** for your area, please add your delivery details before you start shopping."
- Buttons: "Do this later" (outline pill) + "Add delivery details" (belims-blue primary pill, underlined).
- Footer link: "Log in to see your saved addresses" → `/login`.
- Escape key and click-outside dismissal.

### 2. Header wiring
- Auto-opens once per session when `!hasDeliveryAddress` and `localStorage.belims_delivery_popover_dismissed !== "1"`, with a 400 ms delay.
- Variant chosen by viewport width: `< 768px` → sheet; `≥ 768px` → popover.
- "Do this later" persists the dismissed flag; primary CTA closes the popover and navigates to `/delivery-details/add-address`.
- Auto-closes when `belims:delivery-address-updated` fires from any surface (checkout, account, single product, add-address page) and a stored address is now present.
- Three delivery triggers switched from `openDeliveryLocationPanel("delivery")` to `openDeliveryPopover`: topbar "Deliver to:" (line 630), desktop address pill (line 663), mobile delivery bar (line 983). Pickup triggers still open `DeliveryLocationModal`.

### 3. `/delivery-details/add-address` page
- New `frontend/components/DeliveryDetailsAddAddress.tsx` mirroring pnp.co.za's layout.
- Two-column grid on `lg+` (form left, OpenStreetMap iframe pinned to selected coords right); stacks on mobile.
- Guest sees "Sign in to see your saved addresses" link; hidden when `getCurrentUser()` resolves.
- Street search: Nominatim autocomplete, 300 ms debounce, min 3 chars, ZA country restriction, dropdown with main / secondary text.
- "Use my current location" — `navigator.geolocation` → Nominatim reverse geocode → `mapNominatimAddress`; falls back to error message on permission denial.
- Optional Complex/Building and Address name fields. Complex/unit is prepended to the street when saved.
- Cancel returns via `navigate(-1)`. Save writes to `deliveryAddressV2` via `saveStoredAddress`, sets `fulfillmentType=delivery`, dispatches `belims:delivery-address-updated` + `belims:fulfillment-changed`, marks popover dismissed, navigates to `/`.
- Route registered in `App.tsx` after `/wishlist`.

### 4. Header account chip — guest routes to `/login`
- Desktop "Sign In · Sign Up" chip in `Header.tsx:832–853` now branches on `currentUser`: guests navigate to `/login`, logged-in users open the account side panel as before.
- No new imports; reuses the existing `useNavigate` hook.

### 5. Checkout — save shipping address on guest account creation
- `Checkout.tsx:978–992` — the `pendingAccountCreation` blob written when a guest ticks "Create an account for faster checkout next time" now includes the customer's `street / city / province / postalCode` under `shippingAddress`.
- `OrderConfirmation.tsx:7,181–194` — after `registerUser()` succeeds and the JWT is set, `saveBillingAddress(address)` and `saveShippingAddress(address)` run via `Promise.allSettled` so an address save failure never blocks the "Account created" success message. Same address written to both billing and shipping meta.

### 6. Delivery popover — saved-address picker + full-address pill
- `DeliveryDetailsPopover.tsx` accepts optional `isLoggedIn`, `savedAddresses`, `onSelectSavedAddress`. When the logged-in user has saved profile addresses the popover renders a list of cards (source chip + street) above the primary CTA; the CTA relabels to "Add new address" and the "Log in…" link is hidden.
- `Header.tsx` derives `savedAddressOptions` from `currentUser.billing` + `currentUser.shipping` (deduped by `line1|city|postcode`), passes it to both popover mounts, and exposes `handleSelectSavedAddress` which converts the WC record into a `ShippingAddress` and runs it through the existing `handleAddressSelect` flow.
- Pill display (`Header.tsx:679`, `753`, `1073`) swapped from postal-code only to `pillAddressLine` — a memoised `"street, city"` string with truncation, falling back to postal code / label.

### 7. Checkout — Personal Details skeleton loader
- `Checkout.tsx` — imports `getAuthToken`; `isInitializingCheckout` is seeded synchronously from `getAuthToken() !== null` so guests never see the skeleton.
- Personal Details field grid (email, first/last name, phone) is replaced with animated grey skeleton bars while `initializeFromSavedLocation()` is in flight; flag flips false in `.finally()`.
- "Create an account for faster checkout next time" checkbox and its expanded fields are also gated on `!isInitializingCheckout` so they don't flash briefly for logged-in users before the auth check resolves.

### 8. Register form field order
- `AuthPage.tsx:498–522` — swapped Password and Phone. Register form now reads: First name → Last name → Email → Phone → Password.

### 9. `/delivery-details/add-address` — rewrite to Woolworths two-step flow
- Full rewrite of `DeliveryDetailsAddAddress.tsx`. Dropped the two-column form + OSM iframe + Complex/Building + Address-name fields.
- New two-step layout with pagination dots and close ×:
  - **Step 1 — Confirm your address:** centered heading + copy, single search input with magnifier icon (swaps to a circular clear × once an address is selected), Nominatim autocomplete dropdown, saved-address cards for logged-in users (source chip + street) or "To see your saved addresses **Sign In**" hint for guests, `CONFIRM ADDRESS` button bottom-right (disabled until an address is picked).
  - **Step 2 — Confirm Your Option:** back ← arrow, selected street with an **Edit** link, two large tiles — **Delivery** (default, `Truck` icon, "Delivered to your door") and **Click & Collect** (`ShoppingBag` icon, "Collect from a nearby store"). C&C reveals a store dropdown fed by the existing `/ecommerce-policies` `store_locations` endpoint. `CONFIRM DELIVERY` / `CONFIRM COLLECTION` bottom-right.
- Delivery save: `saveStoredAddress`, `fulfillmentType=delivery`, dispatches `belims:delivery-address-updated` + `belims:fulfillment-changed`, marks popover dismissed, navigates to `/`.
- Collection save: same address save + writes `selectedPickupStore`, `pickupStoreSelected=true`, `fulfillmentType=pickup`, dispatches `belims:pickup-store-updated`.

### 10. Account → add/edit address routes through `/delivery-details/add-address`
- `AccountPage.tsx` — removed the `DeliveryLocationModal` mount and the `isDeliveryModalOpen` / `editingAddressType` / `handleAddressSelect` scaffolding that only served the address side panel.
- `handleAddNewAddress(type, mode="add")` now navigates to `/delivery-details/add-address?context=account&type={billing|shipping}&mode={add|edit}`. The two Edit call sites pass `"edit"`.
- `DeliveryDetailsAddAddress.tsx` reads `context`, `type`, `mode` from `useSearchParams`. In `context=account` mode the page shows a single-step layout (no stepper dots, no back arrow, no Delivery/Click&Collect tiles), the heading and subtitle reflect add vs edit, and the primary CTA becomes **Save address**. In edit mode the selected address is prefilled from the requested billing or shipping profile on mount.
- Save calls `saveBillingAddress` or `saveShippingAddress`, dispatches `user-updated`, and returns to `/account/addresses`. Close × also returns to `/account/addresses`. The default two-step flow (no `context` param) is unchanged.

### 11. Nominatim autocomplete — street numbers + admin cruft stripped
- `DeliveryDetailsAddAddress.tsx` — new `extractLeadingNumber()` pulls the leading digits (+ optional letter) from the user's query; new `formatSuggestionLabel()` builds `{house_number || leading} {road}, {suburb}, {city}, {country}` from Nominatim's structured `address` fields instead of the raw `display_name`.
- Ward / Metropolitan / Local / District Municipality tokens are stripped from the suburb slot; the leading number is only prepended when a `road` field exists (fixes orphan "5, uMhlathuze Local Municipality" results).
- `handleSelectSuggestion` also prepends the number to the mapped `street` and rebuilds `label`, so the persisted address carries the house number, not just the display label.
- Result: `"5 durnford"` returns readable `"5 Durnford Road, Durban, South Africa"` instead of the previous `"Durnford Road, eThekwini Ward 28, Durban, eThekwini Metropolitan Municipality, KwaZulu-Natal, 4023, South Africa"`.

### 12. Add-address flow — manual fields + chip-row saved addresses
- `DeliveryDetailsAddAddress.tsx` — added Checkout-style manual editing on the add-address page: Street address (with `MapPin` icon), City, Province `<select>` populated from the `PROVINCES` constant, Postal code (`inputMode="numeric"`).
- New `patchAddress(patch)` helper merges partial field updates into `selectedAddress` (initialising defaults when null) and rebuilds `label`. Suggestion picks, chip picks, and manual typing all funnel through the same state, so the persisted address matches what the user sees.
- `canConfirm` memo requires street + city + province before enabling Confirm/Save — prevents half-filled saves.
- Saved-addresses list replaced with a horizontal chip row (`Billing · Hillcrest`, `Shipping · Durban North`, …). Active chip fills belims-blue, others outline. Wraps on narrow screens with a separator line below.
- Applies to both the default two-step flow and the `?context=account` single-step flow.

### 13. ProductCard hover + QuickView — Add-to-cart adds silently, Buy Now → /checkout
- `ProductCard.tsx` — the hover "Add to cart" button no longer defaults to opening QuickView. Default `onClick` now calls `addWithPriceMode(isTradeSpecial ? "trade" : "retail")` directly; the `quickViewButtonAction?.onClick` escape hatch is preserved for consumers that need a custom action. Dropped `aria-controls`/`aria-haspopup="dialog"` since the button no longer opens a dialog.
- `handleQuickViewAddToCart` now closes QuickView after adding so the user isn't stranded in the modal. `handleQuickViewBuyNow` no longer double-adds (removed the extra `onBuyNow?.(product)` call that was firing on top of the qty loop) — adds the requested quantity, closes QuickView, then navigates to `/checkout`, mirroring the SingleProduct Buy Now behaviour.
- `QuickView.tsx` — modal now portalled to `document.body` via `ReactDOM.createPortal`. Fix root: QuickView was rendered as a sibling of ProductCard's outer div, so clicks inside it bubbled up through ancestor `<Link>` wrappers that some parent grids apply, routing Add-to-cart and Buy-Now to the single product URL. Belt-and-braces: added `stopPropagation` on the outer wrapper and on both action click handlers.

### 14. SingleProduct — Perfect Match With bundle grid + delivery tile routing + rates sidepanel
- `SingleProduct.tsx` — inserted a new section after `FulfillmentBlock` titled **Perfect Match With**. Only renders when `product.bundleCandidates.length > 0`. 3-column grid of the first three items: rounded gray image tile (click routes to product page), product name (2-line clamp), price (sale in red + strikethrough `regular_price` when discounted), full-width black pill button (**Add** silently for in-stock, **View** navigates to product page for out-of-stock). The existing cross-sell "Perfect Match With" slider now returns null when bundle candidates exist so only one section with that heading renders; it remains as fallback when there are no candidates.
- `FulfillmentTiles.tsx` + `FulfillmentBlock.tsx` — new optional `onAddDeliveryAddress` prop threaded from `SingleProduct.tsx` as `navigate("/delivery-details/add-address")`. The no-address delivery tile now navigates there directly instead of opening `DeliveryLocationModal`.
- Delivery-set delivery tile no longer expands rates inline (`deliveryExpanded` state removed). Clicking the tile opens a portalled sidepanel: **right-slide drawer on desktop (md+), bottom sheet on mobile** — same responsive pattern as `DeliveryDetailsPopover`. `ReactDOM.createPortal` to `document.body` at `z-[9999]` puts it above the sticky Header (`z-[1200]`) and immune to transformed ancestors. Styling matches the account side panel: red brand header (Truck icon + "Delivery options" + address subtitle + close ×), soft body with the existing radio-select rate list, white footer with a Change-address underline link and a full-width red accent "Done" pill. Header rounds top corners on mobile only. Escape / backdrop / Done all dismiss.

## 2026-09-24 — Account, Checkout, Routing, and UX session

### 1. AccountPage typography audit
- Audited `AccountPage.tsx` against the Nexvo design system (`tailwind.config.js` + `index.css`).
- Replaced all `font-extrabold` (weight 800, outside design system) with `font-bold` (700).
- Replaced bare `text-3xl`, `text-xl`, `text-2xl` (Tailwind defaults) with design-system tokens: `text-h4`, `text-h6`, `text-lg`.
- Fixed h3/h4 stat card labels and address card headings that had no explicit size class, causing them to inherit Nexvo base CSS heading sizes (2.8rem / 2.2rem). Applied `text-sm font-semibold uppercase tracking-wider` to stat labels and `text-base font-bold` to address card headings.
- Matched section heading weights to `SingleProduct.tsx` reference: `text-lg` sections use `font-semibold` (not bold).
- Replaced all `text-[10px]` and `text-[11px]` arbitrary values with `text-xs` design-system token.

### 2. Address management — Remove and Name
- **Remove addresses**: Added inline confirmation flow (no browser `confirm()`) with Edit / Remove buttons on each address card.
  - Saved Delivery: clears localStorage via `saveStoredAddress(null)`.
  - Billing / Shipping: new `clearBillingAddress()` and `clearShippingAddress()` functions in `authService.ts` that send empty fields to the WordPress `PUT /users/me` endpoint independently.
- **Address naming**: Added `pendingAddress` + `pendingAddressName` state to `DeliveryLocationModal.tsx`. Both search suggestion clicks and GPS detection now route through a "Confirm address" name step before final save. The custom name is stored as the address `label` in localStorage.
- Saved Delivery card title now shows the custom label if one was set.

### 3. Account sidebar routing
- Replaced query-param tab switching (`?tab=`) with path-based routing.
- `App.tsx`: added `/account/:tab` route alongside `/account`.
- `AccountPage.tsx`: swapped `useSearchParams` for `useNavigate` + `useParams`. `activeTab` derived directly from URL (validated against `VALID_TABS`, defaults to `"dashboard"`). Nav buttons now call `navigate("/account/{tab}")`.
- Supported paths: `/account`, `/account/dashboard`, `/account/orders`, `/account/addresses`, `/account/payment`, `/account/details`.

### 4. Header account side panel overhaul
- Replaced "Account" + Dashboard and "Extra Links" sections (Track Order, Cards & Accounts, Pay Credit Card Bill, Discount Benefits) with the five account sidebar items: Dashboard, Orders, Addresses, Payment Methods, Account Details — all pointing to `/account/{tab}` paths.
- Contractor/Trade block condition changed from `!currentUser || !roles.includes("contractor")` to `!currentUser` — block now only shows to guests.
- Updated copy: "Are you a Contractor?" → "Let's get started"; "Register for Trade Deals" → "Let's get started".
- Added "Sign in or create a profile now for access to the widest range of products all in one place, saving you time and money." above Sign In / Create Account buttons in the non-authenticated footer.

### 5. Product URL routing — full category path
- Created `utils/product.ts` with `slugify()`, `buildProductUrl()`, and `extractProductIdFromSlug()`.
- `buildProductUrl()` generates `/product/[cat1]/[cat2]/[cat3]/[product-slug]-[id]` from breadcrumbs + product slug + ID.
- Route changed from `/product/:id` to `/product/*` in `App.tsx`; `ProductPage` extracts ID from the last segment suffix, supporting both new and legacy `/product/2446` URLs.
- Updated all 9 navigation call sites: `App.tsx`, `SingleProduct.tsx`, `ProductCard.tsx`, `NexvoProductCard.tsx`, `QuickView.tsx`, `Header.tsx`, `DealsSection.tsx`, `SearchModal.tsx`, `ShopByCategory.tsx`.

### 6. Buy Now → direct checkout
- `SingleProduct.tsx`: `handleBuyNowAction` now calls `navigate("/checkout")` instead of `onBuyNow(product)`, eliminating a double-add bug (cart was being populated twice) and skipping the cart drawer entirely.
- Applies to both the main buy-box button and the sticky bottom CTA bar.

### 7. Checkout — guest login panel
- Added inline Sign In form to the checkout Personal Details step for unauthenticated users.
- Hidden by default; shown by clicking "Sign In" button right-aligned on the Delivery/Pickup toggle row.
- On successful login: auto-fills first name, last name, email, phone, and billing/shipping address; closes the panel.
- Fixed nested `<form>` DOM error: the login form and the delivery toggle are now siblings rendered before the main checkout form, not inside it.
- "Create an account for faster checkout next time" checkbox hidden when user is already logged in.

### 8. Checkout — Use current location
- Added "Use current location" link beside the Street address label on the Shipping Address step, visible only when address fields are empty.
- Uses `navigator.geolocation` → Nominatim reverse geocode → `mapNominatimAddress` / `normalizeProvince` to fill `address`, `city`, `province`, `postalCode`.
- Shows inline error on permission denial or geocoding failure.

### 9. Scroll and navigation fixes
- **Scroll-to-top on route change**: Added `ScrollToTop` component in `App.tsx` using `useLayoutEffect` on `pathname` + `hash`. Fires before paint; hash links scroll to anchor, all other navigations reset to top instantly.
- **Product page scroll anchor bug**: `FulfillmentTiles.tsx` was calling `deliveryPanelRef.current?.focus()` on mount when `selectedType === "delivery"`, causing the browser to scroll the panel into view. Fixed with `{ preventScroll: true }`.

## 2026-09-10 — Coming Soon page and environment gating

### 1. Coming Soon splash page
- Added `frontend/components/ComingSoon.tsx` with logo, contact CTAs, and copyright.
- Replaced initial "B" icon with `/images/belims-logo-white.png`.
- Removed `<h1>` heading from Coming Soon page.
- Reduced logo height from `h-20` to `h-12`.

### 2. Environment-gated production splash
- Root route now shows `ComingSoon` only when `VITE_COMING_SOON=true`.
- Preview deployments show the full site; production shows the splash.

### 3. App shell isolation
- Hidden on Coming Soon: `Header`, `Footer`, `CartDrawer`, `SearchModal`, `StoreLocator`, `ComparisonModal`, `PriceMatchModal`, `OnboardingWizard`, `PaintAssistant`, `CookieConsent`, and `MobileBottomNav`.

## 2026-09-09 — Frontend hardening, filter UX, and archive restructure

### 1. Inventory / pricing guards
- **Block backorder and zero-price products from purchase flows**
  - Added `isProductPurchasable`, `isValidPrice`, and `getEffectivePrice` helpers in `frontend/utils/price.ts`.
  - Guarded `addToCart` in `frontend/App.tsx` so backorder and invalid/zero-price products cannot be added to cart.
  - Updated `SingleProduct.tsx` Add to Cart / Buy Now buttons and click handlers to disable when the product is not purchasable.
  - Updated `ProductCard.tsx` `addWithPriceMode`, `handleQuickViewAddToCart`, and `handleQuickViewBuyNow` to use the same guard.
  - Filtered unpurchasable products out of `DealsSection.tsx` tab products and `hasAnyDeals`, and `TradeDeals.tsx` hand tools grid.
  - `BundlePanel.tsx` now filters out zero-price bundle candidates and adds selected valid items individually instead of showing an alert.

- **Hide out-of-stock products from shop and listings**
  - Filtered `fetchProducts()` and `fetchFeaturedProducts()` results in `frontend/App.tsx` via `isProductPurchasable`.
  - Filtered category-scoped and search-scoped products in `frontend/components/Archive.tsx` via `isProductPurchasable`.
  - This ensures `/shop`, category pages, search results, and featured grids exclude backorder / zero-price / out-of-stock items.

### 2. Archive sidebar and mobile filter panel
- **Removed Back Order Availability filter**
  - Removed `filterBackOrder` state and UI from desktop sidebar and mobile filter panel.
  - Removed backorder logic from `filteredProducts` computation and availability counts.

- **Fixed price filter behavior**
  - Desktop min/max inputs are now editable numeric fields with validation.
  - Added `parsePrice` helper that strips non-numeric input and clamps to valid bounds.
  - Range slider stays synced with inputs; inputs stay synced with slider via `useEffect`.
  - Added 300ms debounced URL persistence via `useSearchParams` (`price_min`, `price_max`).
  - Values clamp to catalogue bounds on blur.

- **Fixed sidebar scrollbar / divider**
  - Removed `sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto` from the sidebar container.
  - Sidebar now scrolls naturally with the page instead of creating a broken internal scroll area.

- **Added active filter chips + Clear all**
  - Added active filter chips bar above the product grid showing all active filters.
  - Chips include: In Stock, Deal types, Ranges, Colors, Brands, and Price range.
  - Each chip has an X that updates the canonical filter state.
  - "Clear all" button resets all filters including price range and sort.

- **Removed category/sale pills carousel**
  - Removed the category slider / pill section that appeared below the breadcrumb on the archive page.

- **Expanded mobile filter panel**
  - Added all desktop sidebar filters to the mobile filter drawer: Categories, Price, Availability, Current Offers, Brand, Range, Color.
  - Increased mobile filter panel z-index to `z-[1300]` so it appears above the sticky header.

- **Restructured archive toolbar layout**
  - Moved sort/filter toolbar above the sidebar+grid layout, spanning full width below the breadcrumb.
  - Toolbar now contains: product count, grid/list view toggles, mobile Filters button, and Sort by dropdown.
  - Breadcrumb section now has a `border-b border-gray-100` separator to match Checkers Category Hero style.

### 3. Header and navigation
- **Linked "Track Your Order" to `/track-order`**
  - Changed top bar "Track Your Order" from a button to a `<Link to="/track-order">`.
  - Changed account panel "Track Order" from a button to a `<Link to="/track-order">`.

- **Removed Help Center**
  - Removed "Help Center" link from the top bar utility menu.
  - Removed "Help Center" from the mobile menu "Help & Settings" section.

### 4. AI assistant removal
- Removed `BelimsChatbot` global mount and `AiAssistant` modal from `frontend/App.tsx`.
- Removed `isAiAssistantOpen` state, chatbot callbacks, and all related props from App.
- Removed "AI Helper" button from `frontend/components/Header.tsx` services panel.
- Components remain on disk but are no longer imported or rendered.

### 5. Vercel / build config
- Added `strictPort: true` to `frontend/vite.config.ts` to prevent Vite from drifting off port 3000, which is required by the WP CORS allowlist.

### 6. Fulfillment tiles redesign
- Redesigned `frontend/components/FulfillmentTiles.tsx` with a card-based pickup/delivery layout.
- Added expandable delivery options accordion with fastest/cheapest markers.
- Added hover animations and arrow swipe effects matching the CategoryGrid style.

### 7. Home page section order
- Moved `<CategoryGrid />` from the top of the home page to directly above `<DealsSection />`.
- Current order: HeroBanner → ShopByCategory → FeaturedGrid → CollageGrid → DealsSection → CategoryGrid → TradeDeals → PopularCategories.

## Commits
- `a5dcc78` frontend: swap DealsSection and CategoryGrid order on home page
- `9128234` frontend: match Checkers category hero style for archive breadcrumbs and toolbar
- `8ac1ea4` frontend: link Track Order to /track-order and remove Help Center
- `bb2b5fd` frontend: remove category pills and expand mobile filter panel
- `5e98f39` frontend: hide AI assistant, remove backorder filter, fix price filter and sidebar
- `8d5aef3` frontend: filter out backorder/zero-price products from shop listings
- `dbe41ae` frontend: block backorder/zero-price products and hide out-of-stock from shop
- `868249a` frontend: update FulfillmentTiles and Vercel port config
