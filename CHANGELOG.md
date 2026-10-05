# Changelog

All notable changes to the Belims headless storefront (`frontend/`), the CMS plugins (`wp-content/plugins/global-site-settings`, mu-plugins) and the hosting setup (Vercel, Cloudflare, Cloudways). Newest first.

> Start at the root [README.md](README.md). Docs index: [docs/](docs/README.md).

## How to add an entry

1. Add a new `## YYYY-MM-DD — <short title>` section at the **top** (below this block).
2. Group changes under `###` headings by area or file, e.g. `### frontend/components/Header.tsx` or `### Global Site Settings 2.x.y`.
3. Record **what changed and why**, plus how it was **verified** (build, `php -l`, live check, Lighthouse).
4. Note anything done outside the repo — Vercel / Cloudflare / Cloudways / WP options — so it can be traced.
5. Bump the plugin version (`global-site-settings.php` header + `GLOBAL_SITE_SETTINGS_VERSION`) for every plugin change and name the version in the title.
6. Release flow is in [README → Deployment](README.md#deployment-vercel): commit to `main` → verify on https://belims.vercel.app → `git push origin main:vercel`.

---

## 2026-10-05 — Preview (`belims.vercel.app`) reads the staging CMS

Why: test orders from the preview must use Bob Go **Sandbox** and PayFast test mode without touching the production CMS. Staging already has both (Bob Go Smart Shipping on Sandbox, channel = staging domain; PayFast test mode; CORS allows `https://belims.vercel.app`; `headless_frontend_url` = `https://belims.vercel.app`).

### frontend/vercel.json
- `/api/:path*` → staging `https://wordpress-1482444-6707114.cloudwaysapps.com/wp-json/:path*` when the request host is `belims.vercel.app` (`has: [{ type: host }]`); otherwise production `https://cms.belims.co.za/wp-json/:path*`. The file is shared by `main` (preview) and `vercel` (production), so the host condition keeps www on production after every release.
- Preview homepage hero is still baked at build time from the production CMS.
- Docs: OPERATIONS (Vercel rewrites, staging CMS), ARCHITECTURE diagram + config table.

---

## 2026-10-05 — Global Site Settings 2.10.9: server-side product response cache; brand pages fetch only their brand

Why: on 2026-10-05 a local storefront pointed at staging repeatedly requested the full catalogue (dev-mode double effects + retries + several tabs). Each uncached `/products` listing costs 7–10 s CPU (staging and production measured the same: 8.2 s / 9.9 s cold), the server has 2 vCPUs, and abandoned requests kept running — 12–20 concurrent copies saturated staging's PHP pool (load ~22, CPU 100 %, staging 3 GB of 3.82 GB RAM) and slowed production to ~8–10 s per request. Production is normally shielded only by Cloudflare's edge cache; staging (default Cloudways URL) and the Vite proxy have none. Mitigation at the time: stopped the local dev server and killed the stuck staging `SELECT`s (17 + 15, approved) — production back to 1.2 s by 14:27 UTC.

### Global Site Settings 2.10.9
- `includes/class-products-endpoint.php`: `cached_response()` caches the finished `/products`, `/products/home` and `/products/:id` responses in transients (Redis on Cloudways), keyed by route + result-shaping params (`cb` and other params ignored). Version option `belims_products_cache_version` bumped by product/stock/term/ACF/meta/scheduled-sale changes (immediately and at shutdown); stale entries rebuilt by one request under a `wp_cache_add` lock while others get the previous copy; `X-Belims-Cache: HIT|MISS|STALE`.
- README: *Product response cache* section; version 2.10.9 (README / USERGUIDE headers).

### frontend
- `services/wooCommerceService.ts`: `fetchProducts(..., { brand })` → `GET /products?brand=<slug>`.
- `components/Archive.tsx`: brand pages fetch brand-scoped products (like category/search); skeletons follow the scoped list when there is one instead of always waiting for the full catalogue (category pages benefit too).

### Verified (local)
- `php -l`; `npm run build` OK.
- Full listing MISS 2.3 s → HIT 0.08 s; same with `cb=123` and reordered `fields` → HIT; `/products/home` MISS 15.4 s → HIT 0.08 s; brand listing and product detail MISS → HIT (~0.06 s).
- `/brands/bostik` (dev server → local CMS, one tab): 8 products shown 0.66 s after navigation via the brand-scoped request.

### Deployed — staging (2026-10-05, from `3ab2d34a`)
- Backup `~/backups/xnmtexmyyf-gss-2.10.8-20261005-165526.tgz`; 4 server files matched the deployed 2.10.8; uploaded `includes/class-products-endpoint.php`, `global-site-settings.php`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.9 active.
- Full listing MISS 12.9 s → HIT (`cb` ignored); `Belims_Products_Endpoint::bump_cache_version()` → next full listing MISS (13.6 s server time); brand listing MISS → HIT; `/products/home` cold rebuild ~60 s on staging, then HIT. A HIT still costs staging's WordPress bootstrap + network (~2.4–3.7 s from the office; same as `/categories`).

---

## 2026-10-05 — Brands in search + brand archive pages (`/brands/:slug`) — GSS 2.10.8

Why: search had no way to find a brand, and brand links went nowhere — the homepage `BrandStrip` already linked to `/brands/{slug}` (no route), the search dropdown's Brands block never rendered, and `/shop?brand=` and the sidebar Brand filter showed nothing, all because listing products carried no `brand`.

### Global Site Settings 2.10.8
- `includes/class-products-endpoint.php`: listing DTO (and default listing fields) adds `brand` and `brand_slug` from `product_brand`; detail DTO adds `brand_slug`. Version 2.10.8 (README / USERGUIDE headers); README endpoint row.

### frontend
- `services/wooCommerceService.ts`: `DEFAULT_LISTING_FIELDS` + `brand`, `brand_slug`; `types.ts` `Product.brand_slug`.
- `components/SearchResults.tsx`: right column **Brands** — brands whose name matches the query, then brands of matched products (max 8), with logo (`BRAND_LOGOS`, now exported from `BrandStrip.tsx`) or initials, and product count; click → `onBrandSelect(slug)`.
- `components/Header.tsx`: loads brands once via `fetchProductFilters()`; both `SearchResults` instances get `brands` + `handleBrandSelect` → `/brands/:slug` (clears the search).
- `App.tsx`: route `/brands/:brandSlug` → `ArchivePage` (brand name resolved from loaded products; `/shop?brand=` still works). `components/Archive.tsx`: brand filter matches `brand_slug` or name.
- Sidebar Brand filter (already above Range) now appears on `/shop` / category pages with counts.
- Docs: `docs/ARCHITECTURE.md` routes, `docs/FEATURES.md` search + brand archive.

### Verified (local — dev server with `VITE_CMS_URL=http://localhost:10092`)
- `php -l`; `npm run build` OK.
- Search "bostik" → Brands "Bostik · 8" (initials — no logo file); "dulux" → Dulux logo loads, click → `/brands/dulux`, "Dulux Products", 44 products. `/brands/bostik` → 8 Bostik products. `/shop` sidebar: Brand card above Range (Alcolin 26, Assa Abloy 29, Bostik 8, Dulux 44, FAST 580, HARD 320, …); ticking Bostik → 8 products.
- Fixed after review: dropdown brand counts now count the loaded (sellable) products, so they match the brand page (Dulux 44, not the term count 49; brands with none are hidden) — `Header.tsx` `searchBrands`. Archive header now reads "Showing {n} Results" for the filtered set (was "Showing 1-N of {whole catalogue}" on every filtered page — pre-existing) — `Archive.tsx`. Re-checked: `/brands/dulux` "Showing 44 Results", dropdown "Dulux · 44".

### Deployed — GSS 2.10.8 to staging + production (2026-10-05, from `49e05c6d`)
- Staging backup `~/backups/xnmtexmyyf-gss-2.10.7-20261005-144645.tgz`; production backup `~/backups/uhkkwupuum-gss-2.10.7-20261005-144726.tgz`. Both: 4 server files matched the deployed 2.10.7 files; uploaded `includes/class-products-endpoint.php`, `global-site-settings.php`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.8 active.
- Listing returns `brand` / `brand_slug` (staging; production direct and via `belims.vercel.app/api`); detail `stock` + `brand_slug`; login 200, admin 302, products API 200.
- Frontend (search Brands, `/brands/:slug`, counts) ships with the next `main` → `vercel` release.

---

## 2026-10-05 — Global Site Settings 2.10.7: product detail includes stock (pickup no longer "unavailable")

Why: every product page showed "Pickup unavailable — check another store". The page re-fetches the product from `/products/:id?view=detail`, which sent only `in_stock` / `maxStock` — no `stock` — so `FulfillmentBlock` passed `available: undefined` to the pickup (and delivery) tiles (`FulfillmentTiles.tsx` shows pickup only when `available > 0`). Products were in stock (all 1,382 published have quantity > 0). Pre-existing, not caused by 2.10.5/2.10.6.

### Global Site Settings 2.10.7
- `includes/class-products-endpoint.php`: detail DTO adds `stock` (`get_stock_quantity()`) and `stock_status`, matching the listing DTO.
- README endpoint table; version 2.10.7 (README / USERGUIDE headers).
- Note: pickup availability uses total stock — stock isn't tracked per store.

### Verified
- `php -l`; local `GET /products/6199?view=detail` → `stock: 5`, `stock_status: instock`.

### Deployed — staging + production (2026-10-05)
- Staging `xnmtexmyyf`: backup `~/backups/xnmtexmyyf-gss-2.10.6-20261005-140427.tgz`; production `uhkkwupuum`: backup `~/backups/uhkkwupuum-gss-2.10.6-20261005-140503.tgz`. Both: 4 server files matched git `16fc5115`; uploaded `includes/class-products-endpoint.php`, `global-site-settings.php`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.7 active.
- `/products/5418?view=detail` → `stock: 2`, `stock_status: instock` (staging, production direct and via `belims.vercel.app/api`). Login 200, admin 302, products API 200.

---

## 2026-10-05 — Production WP-Cron: Cloudways server cron, `DISABLE_WP_CRON`, stale cron entry removed

Why: the Bob Go plugin's health panel warned that WP-Cron events were past due. The CMS gets little direct traffic (the storefront is on Vercel and many API calls are served from cache), so traffic-driven WP-Cron fell behind; the weekly FTG auto-sync and Bob Go / Action Scheduler jobs depend on it.

### Cloudways / wp-config (production `uhkkwupuum`)
- **Cron Job Manager** (added by the user): every 5 minutes, Wget `https://cms.belims.co.za/wp-cron.php?doing_wp_cron`. First run seen 11:45:01 UTC (`Wget/1.21.3`, 200).
- `wp-config.php`: `DISABLE_WP_CRON` `false` → `true` (changed by the user; `php -l` OK). Not in git.
- Loopback to `wp-cron.php` checked beforehand: HTTP 200 (not blocked).

### WP option `cron` (approved)
- After the switch, Bob Go still reported `external_behind`, overdue by ~254 days: the `cron` option held an **empty** timestamp bucket from 2026-01-24 (`1769289791`). WordPress ignores empty buckets, but Bob Go's `Health::earliest_due_cron_event()` takes `min()` of all timestamps, so it raised a permanent false warning.
- Backup `~/backups/uhkkwupuum-cron-20261005-115025.json`; removed only empty buckets via `_set_cron_array()` (25 → 24 buckets, all 27 events kept). Bob Go `cron_state` now `ok` / `external`.
- Docs: [OPERATIONS → Cloudways](docs/OPERATIONS.md#cloudways--cms).

---

## 2026-10-05 — Global Site Settings 2.10.6 + checkout: real Bob Go shipping rates, no placeholder prices

Why: `POST /belims/v1/shipping/calculate` returned 500 ("BobGo (uAfrica) shipping plugin is not available") on every call since 2026-09-25 — the delivery-rates step at checkout failed on the storefront. On production the **Bob Go Smart Shipping** plugin (`bobgo-shipping` 4.0.58, installed 2026-09-25) replaced the legacy `uafrica-shipping` plugin (now inactive), and the endpoint only looked for `\uAfrica_Shipping\app\Shipping`. Access logs: 200s up to 25 Sep, 500s from 25 Sep onward (not caused by the 2.10.5 release).

### Global Site Settings 2.10.6
- `includes/bobgo-shipping/class-bobgo-rates-endpoint.php`: use `\BobGo_Shipping\app\Shipping`, falling back to the uAfrica class; `service_code` from rate meta `bobgo_service_code` (Bob Go) or `uafrica_service_code` (legacy); error message "Bob Go shipping plugin is not active".
- Same file: the package is now built from the posted `items` (`[{id, quantity}]` → WC cart-style contents via `wc_get_product`, `contents_cost` from current prices) — Bob Go only quotes when the package has products (production dry run: 0 rates empty, 3 rates with one product). Country "South Africa" is normalised to `ZA`.
- `includes/bobgo-shipping/class-bobgo-tracking-endpoint.php`: channel domain from `\BobGo_Shipping\app\Admin::get_api_domain()` (uAfrica fallback) — the uAfrica call was silently skipped, so tracking used the bare site host.
- `includes/bobgo-shipping/admin-bobgo-settings-page.php`, loader comment: plugin name updated.
- README / USERGUIDE: Bob Go Smart Shipping replaces uAfrica; version 2.10.6.

### frontend (checkout)
- **Risk found:** when rates failed or came back empty, `Checkout.tsx` / `SingleProduct.tsx` silently used hard-coded placeholder rates (R75 / R125 / R150, `dev_*` codes) — so checkouts since 2026-09-25 were charged placeholder shipping (real Bob Go quote for one product: R105 / R125 / R180).
- `services/bobGoService.ts`: `getFallbackShipping()` returns placeholders **only on localhost**; elsewhere `[]`, so no rate can be selected and the existing `!selectedShipping` guards block Continue / Pay (decision 2026-10-05: block checkout, no fallback price). Country "South Africa" → `ZA`.
- `components/Checkout.tsx`: the three `getShippingRates()` calls send the cart items (`shippingItems` = `{id, quantity}`); empty-state text asks the customer to contact us if no options appear.
- `components/SingleProduct.tsx`: rate-error message no longer claims estimated options are shown.

### Verified
- `php -l` on the changed PHP files; `npm run build` OK.
- Local CMS: endpoint returns 200 (`rates: []` — no connected Bob Go key locally). Staging/production have `bobgo-shipping` 4.0.58 active and connected.

### Deployed — staging only (2026-10-05, app `xnmtexmyyf`)
- Backup `~/backups/xnmtexmyyf-gss-2.10.5-20261005-132214.tgz`; the 6 server files matched git `c5e8055d`. Uploaded `includes/bobgo-shipping/class-bobgo-rates-endpoint.php`, `class-bobgo-tracking-endpoint.php`, `admin-bobgo-settings-page.php`, `global-site-settings.php`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.6 active.
- `POST /shipping/calculate` with one product (country "South Africa") → 200, 3 rates: Standard R105, Next Day R125, Same Day R180 (`bobgo_*` service codes, delivery dates). Without items → 200 `rates: []`. `wp-login.php` 200, `/wp-admin/` 302, products API 200. No WP options changed (staging GSS BobGo stays Disabled).

### Deployed — production (2026-10-05, app `uhkkwupuum`)
- Backup `~/backups/uhkkwupuum-gss-2.10.5-20261005-132641.tgz`; the 6 server files matched git `4f99a44d`. Same 6 files uploaded; `php -l` OK; GSS 2.10.6 active, env `production`.
- `POST belims.vercel.app/api/belims/v1/shipping/calculate` with one product → 200, 3 live Bob Go rates (R105 / R125 / R180). `wp-login.php` 200, `/wp-admin/` 302, products API 200 direct and via Vercel. Unchanged: FTG on, BobGo on (production), PayFast test mode.
- Storefront checkout still sends no items until the frontend change above is released (`main` → `vercel`).

---

## 2026-10-02 — Global Site Settings 2.10.5: Settings Card toggle (deferred save), simpler status labels, no toggles on Overview cards

Why: The user wants toggles to follow a Settings Card pattern (reference: Vercel "Data Preferences") — state held locally until **Save**, Save disabled until something changes. The Overview cards' FTG / BobGo toggles saved on click (most likely how BobGo got re-enabled on staging) and the status labels had too many variants.

### Global Site Settings 2.10.5
- **Settings Card component:** `belims_settings_card()` (PHP) + SETTINGS CARD block in `admin.js` + `.settings-card*` CSS. Toggle + footer Save (disabled until the toggle differs from the saved value); Save → optional confirm-off dialog → AJAX `belims_save_setting` (whitelist; `manage_options` + nonce) → toast with the server message → `settings-card:saved` event. Failure → error toast, Save stays enabled.
- **FTG Sync → Connection:** new **FTG integration** Settings Card (replaces the instant-save toggle row; `belims_save_ftg_enabled` removed). Saving off still asks "Disable FTG connection?".
- **Alert dialog is now generic:** page-level `#bpc-alert-dialog` + `window.bpcConfirm()` in `admin.js` (was FTG-only `#ftg-alert-dialog` / `ftgConfirm()`); the FTG tool confirmations use it.
- **Status labels** (`belims_integration_statuses()`, new `belims_integration_badge()`): FTG Connected / Not connected; BobGo Enabled · Production|Sandbox / Disabled; Firebase Configured / Setup; AI Services Configured / Setup. Attention states are amber badges linking to the tab (replaces the Configure button on the Dashboard panel). FTG tab badge uses the same two labels.
- **Overview:** integration cards rebuilt from the shared statuses — **toggles removed** with their POST handlers (`save_ftg_enabled_dashboard`, `save_bobgo_enabled_dashboard`) and script; cards keep badge, description and **Configure**. Unused Overview variables removed.
- Docs: plugin README (*Settings Card*, status labels, AJAX table) and USERGUIDE (*Status labels*, turning FTG on/off).

### Verified
- `php -l` on `global-site-settings.php` and `includes/class-dashboard-widgets.php`; `node --check assets/js/admin.js`; FTG inline scripts pass `node --check`; Overview and FTG tab `<div>`s balanced.
- Browser (local, built-in pane): Overview cards have no toggles and show the new labels (3 of 4 active — FTG off locally); FTG Settings Card — Save disabled initially, enabled on change, disabled on revert; Enable + Save → toast "FTG integration enabled.", badge Connected, credentials + 4 menu items shown; Disable + Save → "Disable FTG connection?" dialog → toast "FTG integration disabled.", everything hidden again. Local FTG left off, as found.
- Committed locally as `c5e8055d` (GSS 2.9.4–2.10.5, not pushed).

### Deployed — staging only (2026-10-02, app `xnmtexmyyf`)
- Backup `~/backups/xnmtexmyyf-gss-2.10.4-20261002-175958.tgz`; server diff reviewed = the 2.10.5 changes only. Uploaded `global-site-settings.php`, `includes/class-dashboard-widgets.php`, `assets/js/admin.js`, `assets/css/sitebridge-ui.css`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.5 active, env `staging`; `belims_save_setting` registered, `belims_save_ftg_enabled` gone; one `load-index.php` callback; `wp-login.php` 200, `/wp-admin/` 302, products API 200.
- Staging BobGo: switched off by the user (status Disabled) — resolves the 2.10.4 note.

### Deployed — production (2026-10-05, app `uhkkwupuum`)
- Released 2.9.1 → 2.10.5 from `4f99a44d` (14 files incl. new `assets/css/sitebridge-ui.css`). Backup `~/backups/uhkkwupuum-gss-2.9.1-20261005-124807.tgz`. Pre-check: the 11 code files matched git 2.9.1; server `README.md` was the 2.8.0 copy and `USERGUIDE.md` was missing (docs only, replaced).
- Uploaded files match git; `php -l` OK on 6 PHP files; GSS 2.10.5 active, env `production`; `belims_save_setting` registered. `wp-login.php` 200, `/wp-admin/` 302, `products/home` 200 JSON direct and via `belims.vercel.app/api`.
- State unchanged: FTG on (weekly cron), BobGo on (production), PayFast test mode. `belims_ftg_connection_status` not yet set — click **Test Connection** once so the badge shows Connected.

---

## 2026-10-02 — Global Site Settings 2.10.4: full-width Site Settings panel on the WordPress Dashboard

Why: The "⚙️ Belims Site Settings" Dashboard widget was narrow, unstyled and showed statuses from old fields (`bobgo_api_key`, `payment_api_key`, WooCommerce consumer keys) that didn't match the real integrations. The user wanted it in the plugin's style, full width, using the Overview layout (`Desktop/dash.html`).

### Global Site Settings 2.10.4
- **Panel replaces the widget:** rendered in WordPress's Welcome panel slot (the only full-width area on the Dashboard) for `manage_options` users; WordPress's own Welcome content is removed. Hideable via Screen Options → Welcome.
- **Row 1 — 4 stat blocks:** Environment (from `WP_ENVIRONMENT_TYPE`), Products (published count), Last FTG sync, Run Diagnostics (disabled, "Coming soon").
- **Row 2 — two columns:** Integrations (FTG Sync, BobGo Shipping, Firebase Auth, AI Services — badge when fine, **Configure** link when setup is needed; header *N of 4 active*) and Quick links (placeholder list of six Site Settings tabs + Open Site Settings).
- **Shared helper `belims_integration_statuses()`** now drives both this panel and the Overview tab's *N of 4 active* count, so they can't disagree.
- **Styles:** `sitebridge-ui.css` loaded on the Dashboard; prototype classes `status-strip`, `dashboard-grid`, `item-list`, `shortcut-grid` added (scoped to `.sitebridge-ui`, responsive at 900px / 782px); WP's dark Welcome styling neutralised for this panel only. Removed the old `.bpc-settings-summary*` CSS and `render_settings_summary_widget()`.
- **Fixed:** `Belims_Dashboard_Widgets` was instantiated twice (at the bottom of its own file and in the plugin loader), so every hook in the class was registered twice — the new panel rendered twice. Removed the self-instantiation; the loader is the only one.
- Docs: plugin README (WordPress Dashboard panel) and USERGUIDE (WordPress Dashboard).

### Verified
- `php -l` on `global-site-settings.php` and `includes/class-dashboard-widgets.php`; no references to the removed widget left.
- Browser-checked locally: panel renders once after the fix; quick-link arrow renamed to `shortcut-arrow` (WP core styles a bare `.arrow:after`, which drew a stray box); at 375px the strip is 2×2, columns stack, no horizontal scroll.

### Deployed — staging only (2026-10-02, app `xnmtexmyyf`)
- Backup `~/backups/xnmtexmyyf-gss-2.10.3-20261002-163307.tgz`; server diff = the 2.10.4 changes only (`dashboard-widgets.css` matched git). Uploaded `global-site-settings.php`, `includes/class-dashboard-widgets.php`, `assets/css/sitebridge-ui.css`, `assets/css/dashboard-widgets.css`, `README.md`, `USERGUIDE.md`; `php -l` OK; GSS 2.10.4 active, env `staging`, one `load-index.php` callback (no duplicate); `wp-login.php` 200, `/wp-admin/` 302, products API 200.
- Found on staging: `options_bobgo_enabled` is back to `1` with `bobgo_environment` = `production` (set to `0` at 14:39) — not changed; awaiting the user.

---

## 2026-10-02 — Global Site Settings 2.10.3: environment detection — staging/local never point at production

Why: The new staging CMS was cloned from production, so its settings (and the header badge, read from the `belims_frontend_environment` option) said "Production". The user asked that staging never point at `belims.co.za`. A switch stored in the database would be cloned/pushed with it, so the environment comes from `wp-config.php` instead.

### Global Site Settings 2.10.3
- **`belims_environment()` / `belims_is_production()`** read `wp_get_environment_type()` (`WP_ENVIRONMENT_TYPE` in wp-config; unset = production). Constants `BELIMS_PRODUCTION_STOREFRONT_HOSTS` (`www.belims.co.za`, `belims.co.za`) and `BELIMS_PREVIEW_STOREFRONT`.
- **Guards outside production:** `get_frontend_url()` / `get_cors_origin()` replace a production storefront URL with the preview storefront (`belims_guard_storefront_url()`); `get_cors_origins()` drops production origins, so CORS and PayFast returns can't target the live site; the homepage **Production** deploy hook can't be saved and is skipped when publishing ("Skipped — production deploys only run from the production CMS").
- **Header badge** shows the hosting environment (Production green; Staging / Development / Local amber) instead of the frontend option; outside production a warning lists PayFast live mode, BobGo enabled on Production, or a saved Production deploy hook. Dashboard widget adds a **CMS Environment** row.
- Docs: `docs/OPERATIONS.md` → new *Staging CMS* section; plugin README / USERGUIDE.

### Verified
- `php -l` on `global-site-settings.php`, `includes/class-homepage.php`, `includes/class-dashboard-widgets.php`; guard unit-checked for production / staging / local (production keeps `www.belims.co.za`; staging and local map it to `https://belims.vercel.app`, leave preview and localhost unchanged).

### Deployed — staging only (2026-10-02, app `xnmtexmyyf`)
- Backup `~/backups/xnmtexmyyf-gss-2.10.2-20261002-153623.tgz`; server copies matched the 2.10.2 deploy / git `ba0e3322` (diff = the 2.10.3 changes only). Uploaded `global-site-settings.php`, `includes/class-homepage.php`, `includes/class-dashboard-widgets.php`, `assets/css/sitebridge-ui.css`, `README.md`, `USERGUIDE.md`; `php -l` OK; plugins load, GSS 2.10.3 active.
- Staging `wp-config.php`: `WP_ENVIRONMENT_TYPE` = `staging` via `wp config set` (backup `~/backups/xnmtexmyyf-wp-config-20261002-153752.php`, `php -l` OK).
- Verified on staging: environment `staging`, frontend URL and CORS default `https://belims.vercel.app`, CORS origins `belims.vercel.app` + `localhost:3000` only (no `www.belims.co.za`); `wp-login.php` 200, Site Settings 302 → login, products API 200.
- **Production (`cms.belims.co.za`) unchanged — GSS 2.9.1, no `WP_ENVIRONMENT_TYPE` (= production).**

---

## 2026-10-02 — Global Site Settings 2.10.2: FTG tool results show in the box that ran them

Why: Results from every Tools button appeared in one area below all four boxes, away from the button that produced them.

### Global Site Settings 2.10.2
- **Look up**, **Sync to WooCommerce** and **Maintenance** each end with a `.ftg-tool-result` area; the nine handlers that wrote to the shared `#ftg-sync-status` now resolve the area of their own box (`$(this).closest('.postbox').find('.ftg-tool-result')`). The shared area is removed. Sync Single Product keeps its result in its own row.
- CSS: 12px gap above a result area once it has content.

### Verified
- `php -l global-site-settings.php` passes; both FTG inline scripts pass `node --check`; FTG tab `<div>`s balanced; no `ftg-sync-status` references left.

### Deployed — staging only (2026-10-02, Cloudways app `xnmtexmyyf`, https://wordpress-1482444-6707114.cloudwaysapps.com)
- **New staging app** cloned from production (`uhkkwupuum`) as a Cloudways *staging* app.
- **Staging safety (WP options, approved):** `belims_ftg_cron_frequency` → `disabled` and the `belims_ftg_auto_sync` event deleted; `options_bobgo_enabled` → 0; `belims_vercel_deploy_hook_preview` / `_production` cleared; `wp-content/mu-plugins/staging-block-mail.php` added (overrides `wp_mail()` to block all email — staging only, not in git). uAfrica and the AI product descriptions plugin removed on staging by the user. Previous values: `~/backups/xnmtexmyyf-staging-safety-20261002-143902.txt`.
- **GSS 2.9.1 → 2.10.2:** backup `~/backups/xnmtexmyyf-gss-2.9.1-20261002-145403.tgz`; 11 plugin files uploaded (`README.md`, `USERGUIDE.md`, `assets/css/admin.css`, `assets/css/sitebridge-ui.css`, `assets/js/admin.js`, `assets/js/homepage-tools.js`, `assets/js/media-tools.js`, `global-site-settings.php`, `includes/admin-homepage-tab.php`, `includes/class-ecommerce-settings.php`, `includes/ftg-sync/class-ftg-sync-endpoint.php`). Server copies matched git `ba0e3322` except three reviewed differences: the clone's domain search-replace in the old Clear Cache JS line, an older README (2.8.0), and USERGUIDE never deployed.
- **Checks on staging:** `php -l` on the 4 PHP files OK; `wp plugin list` → active 2.10.2; plugins load (`wp eval`); `wp-login.php` 200, Site Settings 302 → login, `/wp-json/belims/v1/products` 200.
- **Production (`cms.belims.co.za`) unchanged — still 2.9.1.** Not browser-tested on staging yet.

---

## 2026-10-02 — Global Site Settings 2.10.1: FTG Tools split into read-only vs sync; Enable toggle as a row

Why: All ten FTG tool buttons sat in one row, so nothing told the user which only read data and which change WooCommerce products ("Test Sync" actually imports 10). The Enable toggle sat outside the label | value rows.

### Global Site Settings 2.10.1
- **Enable integration** is now a row: label in the 220px column, toggle + "Imports FTG products into WooCommerce." in the value column. The credentials grid shares the same columns and spacing (14px rows, 24px gap).
- **Tools** pane → four postboxes: **Brand & product** (Brand, Custom brand, Product SKU), **Look up** (*Read only*: Search Available Brands, Check Catalogue Count, Count Display On Web Active, Inspect Product, Export Brand Products (CSV)), **Sync to WooCommerce** (*Changes products*: Selected brand → Sync first 10 (test) / **Sync Catalogue**; Single product → Sync Single Product; All brands → Dry run + Sync All Brands), **Maintenance** (*Caution*: Cleanup Duplicate Attributes). Results stay in one area below. The "Ready / Needs credentials" badge is removed (the notice already covers missing credentials).
- **Confirmations:** Sync first 10, Sync Catalogue, Sync All Brands (dry-run wording when ticked), Cleanup and Auto Sync's Run Now use the alert dialog (`window.ftgConfirmed()`) instead of `confirm()`.
- **Inspect Product** reads the Product SKU field (was a `prompt()` pre-filled with `RCKT1213`).
- **Labels:** buttons restore plain labels after running (were "✅ Test Sync", "🔄 SYNC CATALOGUE", "▶ Run Now", "Save" …); "Test Sync (first 10)" renamed **Sync first 10 (test)**.
- **CSS:** `.badge.warn`; `.field-label` rows in postboxes; section menu buttons no longer show a focus box on mouse click (outline only for keyboard focus).

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass; both FTG inline scripts pass `node --check`; FTG tab `<div>`s balanced (7 postboxes, 7 `.inside`); every button bound; no `confirm()` / `prompt()` or emoji labels left in the FTG scripts.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.10.0: plugin header on every page, postbox sections on Overview + FTG Sync

Why: The user wants the plugin header on all Site Settings pages with the tab bar below it, and Overview / Integrations sections styled like WP core postboxes (header with title + status, rows of label | control) — reference: the user's mock-up of the FTG tab.

### Global Site Settings 2.10.0
- **Page header** (`header.bpc-page-header`, above the tab bar on every page): "Belims Hardware — Global Site Settings", version tag, environment badge (Production / Development from `belims_frontend_environment`), description, **View Storefront ↗** (`get_frontend_url()`); then `<hr class="wp-header-end">` for WP notices.
- **Postbox sections** (WP core `.postbox` / `.postbox-header` / `.inside`), header = `<h2>` title + status badge:
  - **FTG Sync:** Connection status (connection badge), Automatic synchronization (schedule — updates on Save Schedule), Sync tools (Ready / Needs credentials — updates on Save Credentials; Dry run moved from the title into the actions row), Activity log.
  - **Overview:** Integrations (*N of 4 active*), Settings shortcuts, REST API endpoints (endpoint count; table full-width via `.inside.is-flush`).
- **Overview cleanup:** removed the dashboard's own header (now the page header) and the **Clear Frontend Cache** quick tool — it only opened `cms.belims.co.za/wp-admin/index.php?no-cache=…` in a new tab and cleared nothing. A real cache purge (Breeze / Cloudflare / Vercel) is a separate task. Endpoint list moved into the Overview variables.
- **CSS (`sitebridge-ui.css`):** page header + version tag; postbox header (grey bar, 48px), `.inside` spacing, `.field` rows (220px label | control, separators), `.credential-grid` aligned to the same column, single column below 782px. Removed unused `.bpc-dash-header`, `.bpc-dash-section-title`, `.bpc-quick-tools` rules.
- Other Settings / Integrations / Tools tabs are unchanged (still `.sb-panel` / `.panel`).

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass; Overview and FTG inline scripts pass `node --check`; both tabs' `<div>`s balanced, each postbox has one `.inside`; header renders before the tab bar.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.9.9: left-column section menu for Integrations tabs (FTG Sync)

Why: The user wants a left-column menu inside the Integrations tabs (guide: the Bob Go plugin's two-column page), starting with FTG Sync: Connection, Auto Sync, Tools, Activity Log.

### Global Site Settings 2.9.9
- **Reusable section layout:** `.section-layout` → `nav.section-nav` (`<button data-section>`, active = `aria-current="true"`) + `.section-content` with `[data-section-pane]` panes. `admin.js` (new SECTION LAYOUT block) shows one pane at a time, no reload or URL change; opens the current/first visible item on load; exposes `window.bpcShowSection(layout, name)`.
- **FTG Sync:** heading + intro above; menu **Connection** (default) · **Auto Sync** · **Tools** (Sync tools or the "save credentials first" notice) · **Activity Log**. Auto Sync / Tools / Activity Log (`data-requires="enabled"`) are hidden while FTG is off; turning it off returns to Connection.
- **CSS (layout only, `sitebridge-ui.css`):** 200px menu column + content column; menu items as plain text buttons with a left-border + bold active state and a focus outline; below 782px a single column with a horizontal, scrollable menu. No shadows or decoration.
- **Noted for follow-up** (`docs/ROADMAP.md`): 2.9.8 Save Credentials — no toast and a reload prompt reported locally.

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass; both FTG inline scripts pass `node --check`; FTG tab `<div>`/`<nav>` balanced and each pane sits at the right nesting level.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.9.8: FTG Save Credentials over AJAX with toast feedback

Why: The user wants Save Credentials to confirm success or failure with a toast instead of reloading the page.

### Global Site Settings 2.9.8
- **New AJAX action `belims_save_ftg_credentials`** (`manage_options` + the form's `ftg_nonce`): validates the email and token, keeps the stored password when `BELIMS_FTG_PASSWORD_MASK` is posted (and requires one if none is stored), marks the connection OK when the form reports a successful Get Token, and returns JSON (`message`, `email`, `token`, `token_prefix`, `connected`) or an error `message` (400/403 — invalid email, no token, no password, expired session, no permission). It no longer touches `ftg_enabled` (the toggle saves itself). The old POST handler and its flash message are removed.
- **Form:** submit is intercepted; Save shows "Saving…". Success → toast, grid email/token prefix, badge (Connected), stored edit values and the saved view update in place; failure → error toast, form stays open with input intact.
- **Always rendered, toggled with `hidden`:** the saved view, Cancel / Disconnect, and the Sync tools panel + its script (with a "Save FTG credentials above before syncing" notice while none are saved), so a first save needs no reload. Test Connection still only shows in the saved view.
- **Brands fetch gated:** the Sync tools script now loads on every Site Settings page, so `GET /ftg/brands` (up to 2 min uncached) runs only when Sync tools is visible — on load, or on the `ftg:tools-visible` event after Save / enabling FTG.
- **`admin.js`:** new `window.bpcMarkFormClean(form)` resets the unsaved-changes snapshot; called after the AJAX save and after the toggle saves (previously the toggle made the form look dirty, so leaving the page prompted "unsaved changes").

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass; both FTG inline scripts pass `node --check`; FTG tab `<div>`s balanced, no PHP conditionals left in the tab markup; every button bound.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.9.7: FTG saved grid + pre-filled edit (masked password); Get Token stores nothing; credential logging removed

Why: The user wants the production FTG show/edit behaviour back — a masked summary grid when saved, and an edit form filled with the stored values — and Save Credentials to be the only step that saves. Production achieves the pre-fill by echoing the real password into the HTML (`value="<?php echo esc_attr($ftg_password); ?>"`, removed in 2.9.3); 2.9.7 matches the look with a mask instead. Separately, `/ftg/login` wrote the plaintext FTG password, raw FTG responses and tokens to the PHP error log.

### Global Site Settings 2.9.7
- **Saved view:** `.credential-grid` — Email, Password (mask), Token (first 8 + `••••••••`) — with **Edit Credentials** and **Test Connection** (Test only appears here).
- **Edit form pre-filled:** stored email and token; the password field holds `BELIMS_FTG_PASSWORD_MASK` (new constant), never the stored password. Show is disabled while the mask is in place; focusing the field selects the mask so typing replaces it. Edit always reopens with the stored values. Save is enabled for unchanged values; changing email/password clears the token and requires Get Token again.
- **Save handler:** keeps the stored password when the mask (or nothing) is posted; passwords are now `wp_unslash`ed before storing (previously a `'` or `\` would be saved escaped); marks the connection OK only when the form reports a successful Get Token (hidden `ftg_token_verified`).
- **`POST /belims/v1/ftg/login` (`class-ftg-sync-endpoint.php`):** no longer saves email/password/token or switches FTG on — it only returns the token. A masked password uses the stored password when the email matches the stored email (400 otherwise). Removed logging of the request body (plaintext password), raw FTG responses, bearer token and collection token; only short failure messages remain.
- **Get Token (JS):** no longer records the connection status; Save does.

### Verified
- `php -l` on `global-site-settings.php` and `class-ftg-sync-endpoint.php` passes; both FTG inline scripts pass `node --check`; FTG tab `<div>` / `if/endif` balanced; every button bound; the stored password is not echoed anywhere in the tab.
- Not yet browser-tested locally or deployed to Cloudways.
- **Follow-up:** production (2.9.1) has been logging the FTG password on every Get Token — check/rotate the Cloudways PHP error logs and consider changing the FTG password. Other FTG code still logs tokens (`get_instances` `print_r`, sync start logs the collection token, `class-ftg-api.php` logs FTG response bodies incl. the bearer token).

---

## 2026-10-02 — Global Site Settings 2.9.6: FTG connection states, disable confirmation dialog

Why: The FTG toggle sat inside the credentials form, so once credentials were stored there was no visible Save and turning it off was never persisted — the badge kept saying Connected. Show/hide used jQuery `.show()`/`.hide()` on elements rendered with the `hidden` attribute, so toggling on after a disabled page load (and Edit) could leave sections hidden. The user specified the connection states and an alert dialog for disabling (reference: Tailgrids Alert Dialog).

### Global Site Settings 2.9.6
- **Toggle:** saves immediately via new AJAX action `belims_save_ftg_enabled` (`manage_options` + nonce `belims_ftg_enabled`; sets `ftg_enabled`, credentials kept). Turning it **off** opens a native `<dialog role="alertdialog">` — "Disable FTG connection?" with **Cancel** (also Escape; reverts the toggle) / **Disable connection**. Badge shows **Disabled** when off. Overview card intentionally not updated live (reflects the saved state on reload).
- **Schedule / Sync tools / Activity log** panels are always rendered inside `#ftg-enabled-panels` and shown/hidden with the toggle (previously only rendered when enabled at page load).
- **No stored credentials:** email, password, read-only token + **Get Token**, **Save Credentials**. Save is disabled until email + password are filled and Get Token succeeded for them; editing email/password clears the token. Get Token records the connection as OK (`belims_save_ftg_connection_status`), and the Save handler no longer resets the status, so the badge reads **Connected** after Save.
- **Stored credentials:** only **Edit Connection** + **Test Connection** (credential summary grid removed).
- **Edit:** form with empty password/token (same Save rule), **Cancel**, and **Disconnect FTG** — moved here from the stored view, now confirmed through the same dialog ("Remove FTG credentials?") instead of `confirm()`. `clear_ftg_credentials` also deletes `belims_ftg_connection_status`.
- **Removed:** the edit-form Test Connection button (`#ftg-test-connection-inline`) — Get Token now validates credentials; the stored token is no longer echoed into the form; Disconnect handler moved from the sync script into the connection script.
- Show/hide uses the `hidden` property throughout the connection panel.

### Verified
- `php -l global-site-settings.php` passes; both FTG inline scripts pass `node --check` (PHP echoes stubbed); FTG tab `<div>`, `<dialog>` and `if/endif` balanced; every button ID has exactly one handler.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.9.5: FTG Sync tab rebuilt to the prototype layout; plugin restored from pre-split copy

Why: An uncommitted refactor (09:56) split the tabs into `includes/admin-*-tab.php` but dropped every tab's inline `<script>`, leaving FTG, CORS, WooCommerce, BobGo and Dashboard buttons inert. The user restored the 07:56 working copy (2.9.3); the split version is kept at `~/Desktop/gss-backup-2.9.4` (outside the repo). The FTG tab is then laid out as the prototype's four panels.

### Global Site Settings 2.9.5
- **Plugin folder:** replaced with the restored 2.9.3 copy; 2.9.4 (four-group submenu, `admin.js` `tabGroup()`, README/USERGUIDE navigation text) re-applied on top. Not carried over from the split copy: its edits to `admin-homepage-tab.php`, `admin-media-tab.php`, `class-ecommerce-policies.php`, `admin.css`, `sitebridge-ui.css`, and an `admin.js` "Clear Edge Cache" handler that showed a success toast without clearing anything.
- **FTG sync script fixed:** the restore contained a truncated duplicate of the sync `<script>` (cut off mid-function, followed by the full copy), which made the whole block a JS syntax error — every sync/tool button was dead. Removed the duplicate; kept the full copy (2.9.2 toast version).
- **FTG tab layout** (`Prototype/index.html` → FTG Sync), layout only: **Connection status** (badge, last sync, Enable toggle, `.credential-grid` summary, Edit / Test / Disconnect, credentials form), **Automatic synchronization** (schedule, next run, Save Schedule, Run Now), **Sync tools** (Dry run in title, Brand + SKU + Custom brand fields, all sync/tool buttons in one `.actions` row, Cleanup as `button-danger`, VAT note), **Activity log** (placeholder). Prototype class names; `sb-*`, `ftg-toolbar`, `ftg-action-group*`, `ftg-product-sync` markup, inline styles and emojis removed. No CSS added. All element IDs the scripts bind to are unchanged.
- **Removed duplicates:** the second Test Connection (`#ftg-test-connection`, did not save status) and its handler; the unbound `#ftg-disconnect-btn`. Test Connection and Disconnect now live only in Connection status.
- **Fixed:** password **Show** button had no handler (added); last-sync line always said "Today, HH:MM" (now the full date); orphan `</div>` left from the earlier removal of the `bpc-card` wrapper.

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass; both FTG inline scripts pass `node --check` (PHP echoes stubbed); FTG tab `<div>` and `if/endif` balanced; every button ID in the tab is bound by a handler.
- Not yet browser-tested locally or deployed to Cloudways. Prototype classes are unstyled in the plugin, so the tab renders in plain WP admin styling until the styling pass.

---

## 2026-10-02 — Global Site Settings 2.9.4: Site Settings submenu reduced to four groups

Why: The WP admin submenu listed every page plus three non-clickable group headings (14 entries), duplicating the in-page horizontal sub-tabs. The prototype navigation is two-level: groups in the sidebar, pages in the tab bar.

### Global Site Settings 2.9.4
- **`global_site_settings_admin_menus()`:** submenu is now **Overview · Settings · Integrations · Tools**, linking to each group's first tab (`#tab-dashboard`, `#tab-branding`, `#tab-ftg-sync`, `#tab-media`). Removed the `#bpc-menu-<group>` heading items, the `bpc-menu-heading` class loop and the `admin_footer` script that stripped their `href`.
- **`assets/js/admin.js`:** new `tabGroup()` reads a tab's group from its `.bpc-section-tab-group[data-section-group]` row; it drives the visible sub-tab row and highlights the submenu item for the active **group** (was per tab). Replaced the hardcoded tab→group arrays.
- **Docs:** plugin README (Navigation) and USERGUIDE (intro) updated.

### Verified
- `php -l global-site-settings.php` and `node --check assets/js/admin.js` pass.
- Not yet browser-tested locally or deployed to Cloudways.

---

## 2026-10-02 — Global Site Settings 2.9.3: SiteBridge design-system CSS + FTG Integration tab UX

Why: The in-page tab UIs mixed `button`/`button-primary`/`bpc-btn-primary`/`bpc-btn-secondary`, had 150+ inline styles, and the FTG tab leaked the saved password back into the HTML. The user's prototype (`Prototype/index.html`) defines the target: minimal WordPress-core look, consistent controls, status badges, panel/field patterns.

### Global Site Settings 2.9.3
- **Shared design system:** new `assets/css/sitebridge-ui.css` scoped to `.sitebridge-ui` (added to `#bpc-admin-root`). Tokens, panels, buttons (`.button`, `.button-primary`, `.button-small`, `.button-danger` — mapped to the prototype's palette), toggle (`.sb-toggle`), fields, status badges (`.sb-badge-good|warn|error|off`), summary grid (`.sb-summary`), log, actions. Enqueued after `global-site-settings-admin`.
- **FTG Integration tab rebuilt** to the agreed integration pattern:
  1. Title + description + Enable toggle (always visible, badge shows connection state).
  2. Enabled → credential fields reveal: email, password, token with Get Token helper, then **Save Settings + Test Connection**.
  3. Successful save → fields collapse into a read-only summary (email, masked password/token), **Edit Connection + Test Connection** replace Save.
  4. Edit Connection reopens the form with Save + Test + Cancel.
- **No more plaintext password in HTML:** the password `<input>` renders empty; a placeholder shows that one is saved, and the save handler keeps the stored password when the field is blank.
- **Connection status is persistent:** new WP option `belims_ftg_connection_status` `{ok, time, message}` written by AJAX action `belims_save_ftg_connection_status` after each test. Badge in the toggle row reads *Connected · checked <relative time>* / *Credentials saved · not tested* / *Not connected*. Status cleared on credential change.
- **Test Connection** calls `GET /belims/v1/ftg/instances` with the current nonce and reports via a `sb-badge` plus a toast; identical shared handler runs from the summary view and the edit form.

### Verified
- `php -l` on `global-site-settings.php` passes.
- Not yet browser-tested or deployed.

---

## 2026-10-02 — Global Site Settings 2.9.2: save feedback (toasts, Saving…, per-form unsaved check), Dashboard landing, WP admin submenu

Why: ACF's page-wide "Leave site? Changes you made may not be saved." prompt fired after saving any form (any ACF change armed it for the whole page), save results were inline notices in random places (or nothing), and Site Settings reopened the last tab from `localStorage`.

### Global Site Settings 2.9.2
- **Toasts:** one reusable `window.bpcToast(message, type)` (`assets/js/admin.js`, styles in `assets/css/admin.css`): bottom-right stack, `aria-live="polite"`, success/info 4 s, warning 6 s, error 8 s, close button, border (no box-shadow). Replaces the old `BPCAdmin.showNotification()` (removed).
- **Flash after POST saves:** `belims_settings_flash()` → per-user transient `belims_settings_flash_<user_id>` `{type, message, tab}`, printed once by `belims_settings_print_flash()` (`admin_footer`) as `window.bpcSettingsFlash`. Set on success and failure by: dashboard FTG/BobGo toggles, FTG credentials, BobGo enable, Store Details (`class-ecommerce-settings.php`), product CSV import, BobGo environment (`load-options.php`), and all ACF forms (`acf/save_post` → "Branding settings / CORS settings / AI settings / Homepage saved."). `belims_settings_verify_post()` (capability + nonce) replaces `check_admin_referer()` in those handlers, so a failed check flashes an error instead of WordPress's "link expired" page. ACF posts now also require `manage_options` + a valid ACF nonce before `acf_form_head()` runs. Inline success notices for these saves removed; the CSV import keeps its inline counts. Homepage form return URL drops `&updated=true` (it made every ACF form show "Post updated").
- **Saving state:** submit buttons show a spinner + "Saving…" and are disabled (after the POST is built, so button names still post); ACF `validation_failure` restores them and shows an error toast. Every form posts a hidden `bpc_tab` so the page reopens the saved tab.
- **Unsaved changes:** `acf.unload` disabled on this page; each form is snapshotted after `load` (TinyMCE synced) and `beforeunload` warns only if a form differs from its snapshot. Cleared on submit. Tab switches never warn.
- **Landing tab:** URL hash → saved tab (flash) → Dashboard. `localStorage` `bpccms_active_tab` removed. `hashchange`/`popstate` switch tabs.
- **WP admin submenu:** Site Settings → Dashboard · SETTINGS (Branding, Store Details, Homepage, CORS & Security, WooCommerce) · INTEGRATIONS (FTG Sync, BobGo Shipping, Firebase Auth, AI Services) · TOOLS (Media Management). Items link to `admin.php?page=belims-site-settings#tab-<id>`; on the page admin.js switches tabs in place and keeps the submenu `current` highlight in sync. Group headings are non-clickable labels (`bpc-menu-heading`, styled on `admin_head`, `href` removed on `admin_footer`).
- **AJAX tools → toasts:** FTG tools/sync/token/cron (inline scripts in `global-site-settings.php`), media tools (`media-tools.js`, replaces `alert()`), homepage publishing (`homepage-tools.js`). Reports (brand tables, counts, inspect/sync details, cleanup and per-brand lists, progress bars, archive/assign results) stay inline. New success toasts for the previously silent auto-sync schedule save and auto-convert toggle.
- Ctrl/Cmd+S submits the active tab's form (was the first form on the page) and no longer shows a fake "Settings saved!".

### Verified
- `php -l` on `global-site-settings.php`, `includes/admin-homepage-tab.php`, `includes/class-ecommerce-settings.php`; `node --check` on `assets/js/admin.js`, `media-tools.js`, `homepage-tools.js` and on all 11 inline `<script>` blocks of `global-site-settings.php` (PHP tags stubbed).
- Not yet browser-tested or deployed.

---

## 2026-10-02 — SiteBridge 2.9.2: Site Settings UI aligns to the WordPress-core prototype

### SiteBridge 2.9.2
- `assets/css/admin.css`: the Site Settings Overview rendered the prototype's unprefixed classes (`.shell`, `.sidebar`, `.status-strip`, `.dashboard-grid`, `.panel`, `.shortcut`, `.api-table`) while every rule targeted the older `bpc-` names, so the whole pane was unstyled. Prototype class names are now additional selectors on the existing `bpc-` rules (scoped under `.shell`) — one source of truth, no duplicated blocks. Added the WP admin shell normalisation (`#wpcontent` padding, `#wpbody-content` bottom padding, `.wrap` centred 1280px column) and `.nav-tab` / `.nav-tab-wrapper` declarations so the prototype tab bar wins regardless of stylesheet order. Extended the 900/782/640px breakpoints.
- `sitebridge.php`: `.wrap` and `.shell` were never closed — `</main>` closed while both were open, so `.shell` swallowed `#wpfooter` into the 210px sidebar column. Closing tags added. The inline FTG `<style>` referenced undefined `--bpc-*` / `--belims-*` variables (13 + 10 refs); remapped to `--wp-border`, `--wp-red`, `--wp-blue`, `--wp-text`, `--wp-muted`.
- `sitebridge.php`: `sitebridge-admin-ui` and `sitebridge-admin` now version off `filemtime()` via new `sitebridge_asset_version()`, so a browser never serves a stale CSS/JS copy after an edit.
- `assets/js/admin.js`: `renderGroup()` collected **every** `.bpc-nav-item`, so opening Settings/Integrations relocated the Overview shortcut buttons and the dashboard "Configure" buttons out of their pane and into the tab bar. `$navItems` is now scoped to `#bpc-tab-registry`, and clicks are delegated to `main#main-content [data-tab]` so in-content shortcuts navigate without being moved.

### Verified
- `php -l sitebridge.php`, `node --check assets/js/admin.js`.
- Markup balance check on the renderer: zero unclosed/mismatched `div`/`section`/`main`/`aside`/`nav`/`ul`/`li`/`table`/`form` (previously 2 unclosed).
- Every class named in the prototype Overview now has a matching selector in `admin.css`.

Not deployed — local nginx docroot only.

---

## 2026-10-01 — Global Site Settings 2.9.1: storefront shows only sellable products; FTG sync trashes/restores

Rule: the storefront never shows a product that is **out of stock (no backorders)**, has **no price**, or has **no category**.

### Global Site Settings 2.9.1
- `includes/ftg-sync/class-ftg-sync-endpoint.php`: products missing stock, price or category are still never imported; an **existing** CMS copy is now moved to the trash (bulk + single-SKU sync). When it qualifies again, the sync untrashes **and publishes** it (WordPress would restore it as a draft). Lookup split into `find_existing_product_ids()`.
- `includes/class-products-endpoint.php`: `/products` queries only in-stock, `_price` > 0, categorised products (correct pagination totals); `/products/home` applies `is_sellable()`; new `Belims_Products_Endpoint::is_sellable()`.

### Storefront
- `utils/price.ts` `isProductPurchasable`: also requires a category other than "Uncategorized".

### CMS data (outside the repo)
- 323 of 1,705 published products moved to the trash (146 out of stock only, 73 no price only, 18 no category only, 86 with several). 0 products allowed backorders. ID list: server `~/belims-trashed-2026-10-01.txt`. Restore: Products → Trash, or `wp post update <ids> --post_status=publish` after `wp post untrash`.
- Plugin backup: `~/gss-backup-20261001-231501`.

### Verified
- `php -l` (local + server, before swap), `npm run build`; server checksums match git.

---

## 2026-10-01 — Global Site Settings 2.9.0: storefront allowlist, homepage targets, `/products/home`, order + payment hardening

### Global Site Settings 2.9.0
- **CORS allowlist:** `get_cors_origins()` (www, preview, `localhost:3000`, plus `get_cors_origin()` / `get_frontend_url()`; filter `belims_cors_origins`). Responses echo the caller's Origin when allowed (`Vary: Origin`), else the default. Core `rest_send_cors_headers` is unhooked — it echoed any Origin and overrode the allowlist.
- **Orders remember their storefront:** `POST /orders` saves an allowed `frontend_origin` as `_belims_frontend_origin`; PayFast return/cancel URLs use `belims_order_frontend_url($order)`, so preview and production checkouts both return to the site they started on.
- The Development/Production toggle (`switch_frontend_environment`) is removed; CORS & Security shows a read-only **Allowed Storefronts** card.
- **Homepage rebuild target:** Site Settings → Homepage → *Saving rebuilds* = Preview / Production / Both (option `belims_homepage_deploy_target`, default preview); one deploy hook per target (`belims_vercel_deploy_hook_preview|production`) with per-target live status. The legacy `belims_vercel_deploy_hook` migrates into the preview slot on `admin_init`.
- **`GET /products/home`:** de-duplicated, in-stock homepage rail set (newest, best-stocked, deals, on sale, featured, Hand Tools) — ~70 items / 55 KB vs the ~1 MB full listing; cacheable (`s-maxage=300`), covered by the Cloudflare "API catalogue" rule.
- **Order access:** `GET /orders/:id` and the PayFast status routes require the order key (or the owning customer / shop manager).
- **PayFast:** amount taken from the order server-side; ITN signature, order key, amount and PayFast server validation all checked before an order is marked paid; the browser return only redirects; `/payfast/config` returns public fields only.

### Storefront (`frontend/`)
- `App.tsx`: homepage rails load from `fetchHomeProducts()` first and fall back to the full catalogue.
- `Checkout` / `OrderConfirmation` / `paymentService.ts`: pass the order key; send `frontend_origin`; payment status polled up to 18 times.
- `cachedGetJson`: aborts a request that has not started responding within 25 s and retries once (body download is not time-limited). First shipped at 8 s, which cut off cold full-catalogue responses (8.5–10 s to first byte when uncached) — raised to 25 s; real stalls ran 60 s+.

### Server / hosting (outside the repo)
- Plugin deployed to the CMS (backups `~/gss-backup-20261001-221757`, `~/gss-backup-20261001-222341`); WP options: preview hook migrated, `belims_vercel_deploy_hook_production` = "CMS Homepage" (`vercel`), `belims_homepage_deploy_target` = `preview`.
- Vercel: pushes to `main` stopped creating deployments (no GitHub → Vercel status on the commits); preview built via the Deployments API, GitHub app connection then re-checked by the owner.

### Verified
- `php -l` (local + server), `npm run build`, mocked-fetch tests (stall → retry → ok; caller abort → no retry).
- Live: `/orders/:id` 404 without / with a wrong key, 200 with the key; CORS allows www, preview, localhost and rejects other origins; `/products/home` 200 (0.54 s server-side, Cloudflare cached).
- PayFast sandbox order **#5566** on preview: marked paid by the verified ITN, customer returned to preview.

---

## 2026-10-01 — API retry for challenged / cut-off responses

### frontend/services/wooCommerceService.ts — `cachedGetJson`
- Parses the body itself; an unparseable body (Imunify "One moment, please…" HTML, or a response cut off in transit — e.g. `Expected ':' after property name at position 560768` on the ~1 MB product listing) or HTTP 403/429/502/503/504 now **retries once** after 600 ms. Other errors (e.g. 404) and aborted requests are not retried.
- Verified: `vite build`; mocked-fetch test — truncated → ok, HTML → ok, 403 → ok, 404 → no retry, two failures → error surfaced.

---

## 2026-10-01 — Preview/production branch workflow + documentation consolidation

### Vercel environments
- `main` → **Preview** → https://belims.vercel.app (public; Vercel Authentication disabled). `vercel` → **Production** → https://www.belims.co.za.
- `main` fast-forwarded to `vercel`; a Git deployment of `main` was created via the API (an already-built SHA pushed to a new branch does not auto-build).
- Root cause of the Coming Soon page on `belims.vercel.app`: the domain was still aliased to a Production build (`VITE_COMING_SOON=true` is inlined at build time). Release through Git only — never Promote/Redeploy across environments.

### CMS deploy hook
- New Vercel deploy hook **"CMS Homepage (preview)"** on `main`; WP option `belims_vercel_deploy_hook` now points at it, so Homepage saves rebuild preview. Switch back to the `vercel` hook ("CMS Homepage") at launch.

### Cloudflare / Cloudways
- Cloudflare **Bot Fight Mode** turned off — on the Free plan WAF skip rules cannot bypass it, and it was challenging Vercel → CMS API calls.
- Remaining blocker: Cloudways Imunify360 SplashScreen still challenges some `/wp-json/` requests; no per-path toggle in the Cloudways UI — escalated to support.

### Cloudways deploys
- Removed the GitHub Actions Cloudways SFTP workflow and its archived setup notes. It would have uploaded plugins **and `wp-config.php`** into the production CMS on every push to `main` (now the preview branch); it never ran (GitHub account locked for billing).
- Deploy policy: the agent deploys files to the CMS on Cloudways (`deploy.sh` or targeted SSH upload) and **asks the user for explicit approval before every deploy**. Recorded in `AGENTS.md`, `README.md` and `docs/OPERATIONS.md`.

### Documentation
- Root `README.md` deployment section rewritten for Vercel (Netlify guide removed).
- `UPDATES.md` merged into this file (see the 2026-06-02 entry); docs consolidated into [`docs/`](docs/README.md); superseded docs moved to [`docs/archive/`](docs/archive/).

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

### Commits (2026-09-09 session)
- `a5dcc78` frontend: swap DealsSection and CategoryGrid order on home page
- `9128234` frontend: match Checkers category hero style for archive breadcrumbs and toolbar
- `8ac1ea4` frontend: link Track Order to /track-order and remove Help Center
- `bb2b5fd` frontend: remove category pills and expand mobile filter panel
- `5e98f39` frontend: hide AI assistant, remove backorder filter, fix price filter and sidebar
- `8d5aef3` frontend: filter out backorder/zero-price products from shop listings
- `dbe41ae` frontend: block backorder/zero-price products and hide out-of-stock from shop
- `868249a` frontend: update FulfillmentTiles and Vercel port config

---

## 2026-06-02 — Updates log (merged from former `UPDATES.md`)

_Undated session notes from January–June 2026, kept verbatim. The standalone delivery-location note (`delivery-location-updates.md`) duplicated "Delivery Location — Modal & Address Persistence Refactor" below and is archived._

### Fix: PayFast Return/Cancel URL Pointing to Netlify

**Files:** `wp-content/plugins/global-site-settings/global-site-settings.php`, `includes/payfast/class-payfast-api.php`, `includes/payfast/class-payfast-return-handler.php`

PayFast was redirecting users back to `belims-headless-react-app.netlify.app` after payment.

**Root cause:** The ACF option `headless_frontend_url` on `cms.belims.co.za` was still set to the Netlify URL, which overrides the fallback in `get_frontend_url()`.

**Fix (PHP):**
- Added global `get_frontend_url()` to `global-site-settings.php` — reads ACF `headless_frontend_url` option first, falls back to `https://belims.vercel.app`
- `class-payfast-api.php`: `cancelUrl` and `cancel_url` now call `get_frontend_url()` instead of hardcoded Netlify domain
- `class-payfast-return-handler.php`: private `get_frontend_url()` delegates to the global function

**Fix (server):** Updated ACF option on `cms.belims.co.za` via WP-CLI:
```bash
wp eval 'update_field("headless_frontend_url", "https://belims.vercel.app", "option");'
```

**When going live on `belims.co.za`:** Change the ACF option value in WP Admin → Custom Fields → Options — no code deploy needed.

---

### Fix: "Enter Address" Button Opening Store Pickup Modal

**File:** `frontend/components/Header.tsx`

Clicking "Enter Address" / "Deliver to" in the utility bar opened the Store Pickup tab instead of the Delivery tab.

**Root cause:** After a revert, `deliveryLocationModalType` state and `openDeliveryLocationPanel()` helper were lost. All three buttons (pickup, deliver-to, mobile delivery) called `setIsDeliveryLocationModalOpen(true)` with no type, so `DeliveryLocationModal` defaulted to showing Pickup.

**Fix:**
- Restored `deliveryLocationModalType` state (default `"delivery"`)
- Restored `openDeliveryLocationPanel(type)` helper
- Pickup button → `openDeliveryLocationPanel("pickup")`
- Deliver to + mobile delivery buttons → `openDeliveryLocationPanel("delivery")`
- Passed `initialFulfillmentType={deliveryLocationModalType}` to `<DeliveryLocationModal>`

---

### Fix: Shipping Rates and Track Order CORS Errors on Vercel

**Files:** `frontend/services/bobGoService.ts`, `frontend/components/TrackOrderPage.tsx`

Both files called `cms.belims.co.za` directly, bypassing the Vercel proxy and triggering CORS rejections.

**Fix:** Both now use `getApiBaseUrl()` from `wooCommerceService.ts`, which returns `/api/belims/v1` in production (proxied by Vercel) and `http://belims-headless.local/wp-json/belims/v1` in local dev.

---

### QuickView — Layout Refactor

**File:** `frontend/components/QuickView.tsx`

Redesigned to match SingleProduct styling and the Shopify quick-view layout pattern.

**Changes:**
- **Image column:** `bg-[#f9f9f9]`, rounded left corners (`md:rounded-l-[14px]`), multi-image gallery with prev/next arrow navigation and thumbnail strip (uses `product.images[]`)
- **Outer dialog:** `md:p-5` padding so the card floats; `md:max-h-[82vh]` (was fixed `h-[88vh]`) — auto-sizes to content
- **Brand:** `mb-2 inline-block text-sm font-semibold uppercase tracking-wide text-grey-medium hover:text-brand` (exact SingleProduct class)
- **Title:** `text-3xl font-bold text-grey font-heading mb-1`
- **SKU:** `text-base text-grey-medium mb-3`
- **Price:** `font-heading text-[28px] font-bold text-grey` with strikethrough for sale price
- **Stock bar:** `StockBar` component reused as-is — same badge colours and progress bar as SingleProduct
- **Qty stepper:** `border border-gray-300 rounded-sm h-11` with `Minus`/`Plus` icons
- **Add to cart:** `rounded-pill bg-belims-blue` with `bg-red-muted` hover sweep (matches SingleProduct)
- **Buy Now:** `rounded-pill bg-grey` with same hover sweep

---

### Vercel Deployment Setup

**Files:** `frontend/vercel.json` (created), `frontend/services/bobGoService.ts`, `frontend/components/TrackOrderPage.tsx`

Set up `belims.vercel.app` as an alternative production frontend (Netlify remains on `main` branch auto-deploy).

- New `vercel` branch tracks Vercel production; `main` continues to trigger Netlify
- `frontend/vercel.json` configures build (`npm ci --include=dev && npm run build`), output dir (`dist`), and rewrites:
  - `/api/:path*` → `https://cms.belims.co.za/wp-json/:path*` (API proxy)
  - `/:path*` → `/index.html` (SPA fallback)
- Vercel Root Directory set to `frontend/` in project settings

---

### Future: Editable Order Note in Checkout

**File:** `frontend/components/Checkout.tsx`

The order note is currently pre-filled from the CartDrawer (`initialOrderNote` prop) and sent to WC as `order_note` on submit, but it is read-only inside Checkout.

**Planned:** Add an editable `<textarea>` below the read-only note display in `OrderSummary`, wired to `setOrderNote`. The block only renders when `orderNote` is non-empty (pre-filled from cart), so it never appears as a blank field for users who didn't add a note in the cart. The Save/update action is implicit — `orderNote` state is already consumed by `handlePlaceOrder`.

---

### CartDrawer → Checkout — Order Note, Coupon & Shipping Persistence

**Files:** `frontend/App.tsx`, `frontend/components/CartDrawer.tsx`, `frontend/components/Checkout.tsx`, `frontend/services/wooCommerceService.ts`

#### 1. `cartOrderNote` + `cartCoupon` pre-fill Checkout

- `Checkout` now accepts `initialOrderNote?: string` and `initialCouponCode?: string`
- `promoCode` state initialises from `initialCouponCode`; `orderNote` state from `initialOrderNote`
- `createWooOrder` receives `order_note` and `coupon_lines: [{ code }]` from these values — they land directly in the WC order payload
- `App.tsx` passes `cartOrderNote` and `cartCoupon` (existing state) down through `MainApp` → `<Checkout>`

#### 2. Async coupon validation before marking applied

- `validateCoupon(code)` added to `wooCommerceService.ts` — GET `${BASE_URL}/coupons?code=…`, throws a user-facing message if the response is empty or non-OK
- CartDrawer coupon Apply button is now async: calls `validateCoupon`, then sets `appliedCoupon` only on success
- New state: `couponLoading` (spinner on button) and `couponError` (red message above input)
- Input `onChange` clears `couponError` so stale errors don't persist

#### 3. `onEstimateShipping` wired to delivery context

- `App.tsx` handler calls `saveStoredAddress({ postalCode, street: "", city: "", province: "", country: "ZA" })` then dispatches `belims:delivery-address-updated` and `belims:fulfillment-changed`
- The postal-code-only path is already supported by `saveStoredAddress` (see: Delivery Location — Modal & Address Persistence Refactor)
- Header and SingleProduct will pick up the new address via the dispatched events

---

### CartDrawer — Addon Panel Enhancements

**Files:** `frontend/components/CartDrawer.tsx`, `frontend/App.tsx`

#### Coupon Panel
- Applied coupon code is tracked in `appliedCoupon` state
- Pill button shows a `<Check>` icon when a coupon is applied, and switches border/bg to `border-green-600 bg-green-50 text-green-700`
- Confirmation block appears inside the panel: "{code} applied" with a Remove link that clears both `appliedCoupon` and `couponInput`
- `onApplyCoupon` prop wired through `App.tsx` → `MainApp` → `CartDrawer`; App stores the last applied code in `cartCoupon` state

#### Order Note & Estimate Shipping Pill Icons
- Order note pill: `<FileText size={12} />` icon added
- Estimate Shipping pill: `<Truck size={12} />` icon added
- Coupon pill icon conditionally renders `<Check>` (when applied) or `<Tag>`

#### Shipping Estimate — Inline Results
- `getShippingRates` from `bobGoService.ts` called directly inside `CartDrawer` on Calculate click
- State: `estimateRates`, `estimateLoading`, `estimateError`
- Loading state: spinner (`<Loader>` with `animate-spin`) replaces button text
- Error state: red error message inside the panel
- Results rendered in a `rounded-lg bg-green-50` block:
  - Heading: "Shipping rate for your address:" (singular) or "There are multiple shipping rates for your address:" (plural)
  - Each option: `service_name — formatCurrency(total_price)` with optional `— expected_delivery_date` in `text-green-600`
  - FREE shown for zero-price options
- Postal input `onChange` clears stale results and errors
- `onEstimateShipping` prop retained as a side-effect callback; wired to no-op in `App.tsx`

#### Geolocation
- "Use my location" button triggers `navigator.geolocation`; reverse-geocodes via Nominatim to fill the postal code input
- On success, `estimateRates` and `estimateError` are cleared so the user must click Calculate

---

### Fix: "Schedule Pickup" Dialog Not Opening on Single Product Page

**File:** `frontend/components/FulfillmentTiles.tsx`

Clicking "Schedule Pickup" in the fulfillment tile had no effect.

**Root cause:** `onSchedulePickup` was called on line 415 but was never declared in `FulfillmentTilesProps` or destructured in the component. TypeScript surfaced this as `TS2304: Cannot find name 'onSchedulePickup'` — the prop was silently `undefined` at runtime, so `onSchedulePickup?.()` was a no-op.

**Fix:**
- Added `onSchedulePickup?: () => void` to `FulfillmentTilesProps`
- Added `onSchedulePickup` to the component destructuring

The prop was already being passed correctly from `SingleProduct.tsx` (`onSchedulePickup={() => setIsSchedulePickupOpen(true)}`).

---

### DeliveryLocationModal — Panel UI Refactor

**File:** `frontend/components/DeliveryLocationModal.tsx`

Restructured both the delivery and pickup panels to use a consistent fixed-header / scrollable-content / sticky-footer layout matching the brand auth panel pattern in `Header.tsx`.

#### Layout
- Header: `bg-brand text-white` with `MapPin` icon and close button — matches account panel in Header
- Content: `flex-1 overflow-y-auto bg-soft` — scrollable, padded
- Footer: `border-t bg-surface flex-shrink-0` — sticky, contains the primary action button

#### Delivery Panel
- Title: `text-lg font-bold text-gray-900 mb-2`
- Copy: `text-gray-500 mb-6 max-w-sm`
- "Use your location." pill button: `rounded-full border border-gray-300 py-3` full-width outlined
- Input: flat (no `rounded-lg bg-gray-50` card wrapper), borderless background
- Removed all card wrappers, decorative borders, and rounded containers

#### Pickup Panel
- Title and copy match delivery panel
- "Use your location." pill button identical pattern
- Store cards: selected state uses `border-2 border-belims-blue bg-belims-blue/[0.04] shadow-sm`; unselected `border border-gray-200 bg-white`
- Radio-style indicator dot in card
- Store name turns `text-belims-blue` when selected
- Operating hours hidden by default — only toggle on explicit "View Hours" click
- Selecting a card does **not** auto-expand hours
- Removed dev-only "Reset store" / "Use default store" buttons

#### Panel / Drawer
- `BottomDrawer` called with `panelClassName="!rounded-none !border-0"` — no rounded corners, no border
- `showHandle={false}` — handle hidden for right-placement drawer

#### Dead Code Removed
- `isDev` const (`import.meta.env.DEV`) — no longer used
- `onResetPickupStore` prop removed from `PickupPanelProps` and call site (handler kept for future use)
- `isDev` prop removed from `PickupPanelProps` and call site

---

### Delivery Location — Modal & Address Persistence Refactor

**Files:**
- `frontend/components/Header.tsx`
- `frontend/components/DeliveryLocationModal.tsx`
- `frontend/services/shippingAddress.ts`
- `frontend/src/lib/fulfillmentContext.ts`
- `frontend/src/features/chatbot/components/BelimsChatbot.tsx`

#### Header
- Added explicit delivery modal mode state for `pickup` and `delivery`
- Pickup header action now opens the pickup panel directly
- Delivery header action now opens the delivery panel directly
- Mobile delivery action opens the delivery panel directly
- Header continues to read saved delivery location from shared localStorage keys

#### Delivery Modal
- Converted to a right-side panel using the existing drawer behaviour
- Removed old modal header and tab switcher
- Split delivery and pickup into separate panel views selected by the caller
- Added compact close icon
- Added postal-code-only save handling for valid 4-digit South African postal codes
- Closing the delivery panel with a typed valid postal code now saves it before closing
- Closing with an already saved full address no longer triggers the postal-code fallback path
- Fixed invalid nested button markup in the pickup store list
- Pickup store rows now use a non-button row wrapper with separate controls for selecting a store and viewing operating hours

#### Address Storage (`shippingAddress.ts`)
- `saveStoredAddress()` falls back to `postalCode` when `label`, `street`, `city`, and `province` are empty
- `readStoredAddress()` supports legacy postal-code-only values from `deliveryAddress`
- `readStoredAddress()` fills missing labels using address label, built address label, postal code, or legacy label
- Added temporary console logging for address save, read, and remove operations
- Added a removal stack trace to identify future explicit storage clears

#### Product Page Sync
- `SingleProduct` refreshes saved address state on modal close and `belims:delivery-address-updated` events
- Delivery rates are requested when a saved address or postal code is available

#### Shared Fulfillment Context
- Shared fulfillment storage now accepts postal-code-only delivery addresses
- `deliveryLocationSet` is now `true` when a postal code exists, even without city/province
- Shared context no longer clears `deliveryAddressV2` when it temporarily has `deliveryAddress: null`
- Before persisting, rehydrates saved site delivery address from storage
- Preserved saved delivery address in the shared snapshot to prevent noisy clears

#### Chatbot
- Chatbot delivery adapter preserves postal-code-only addresses
- Chatbot delivery location state treats a postal code as a valid delivery location

#### Debug Logs Added
- `[delivery-location-modal] postal code save requested / skipped`
- `[delivery-location-modal] full address save requested`
- `[delivery-location-modal] clear location requested`
- `[delivery-address] saved / removed / removal stack / read saved address / read legacy postal code / read failed / read empty`

#### Known Local Dev Note
- Requests from `http://localhost:3000` to `https://cms.belims.co.za/wp-json/belims/v1/shipping/calculate` are blocked by CORS
- App falls back to development shipping options after the CORS failure
- Separate from address persistence

---

### Fix: `getStoreStatus is not defined` — DeliveryLocationModal

**File:** `frontend/components/DeliveryLocationModal.tsx`

`getStoreStatus` was defined inside `DeliveryLocationModal` but called inside the top-level `PickupPanel` component, outside its scope.

**Changes:**
- Added `getStoreStatus` to `PickupPanelProps` interface
- Destructured it in `PickupPanel`
- Passed `getStoreStatus={getStoreStatus}` at the render site

---

### Fix: Postal Code Not Persisting to Product Page

**Files:** `frontend/components/SingleProduct.tsx`, `frontend/components/DeliveryLocationModal.tsx`

Address visible in Header but SingleProduct showed "Add your address to see delivery options."

**Root causes:**
- `handleUpdatePostalCode()` did not emit a sync event when closing without a detected address
- SingleProduct's `onClose` effect only called `refreshStoredAddress()`, not `hydrateFromSiteStorage()`

**Changes:**
- `DeliveryLocationModal.tsx` — `handleUpdatePostalCode()`: added `emitDeliveryAddressUpdated()` before `onClose()`
- `SingleProduct.tsx` — modal-close `useEffect`: added `hydrateFromSiteStorage()` alongside `refreshStoredAddress()`

---

### Fix: PayFast Return — Order Not Marked as Paid

**File:** `wp-content/plugins/global-site-settings/includes/payfast/class-payfast-return-handler.php`

Frontend received `payment_status=pending` after sandbox payment and polled indefinitely.

**Root cause:** PayFast only sends `pf_payment_id` via ITN (server-to-server POST). In local dev, ITN cannot reach `localhost`, so `pf_payment_id` is always empty in the return URL. The handler gated the paid-mark on `!empty($pf_payment_id)`, which always failed.

**Fix:** PayFast only calls `return_url` on successful payment (cancels go to `cancel_url`), so reaching the handler is sufficient proof. Removed the `!empty($pf_payment_id)` condition. Falls back to `'PF-RETURN-{order_id}'` as the payment ref when `pf_payment_id` is absent.

**Production safety:** ITN arrives before the user in production and sets the order to `processing`. The mark-paid block only runs if order is still `pending` or `on-hold` — no double-processing.

---

### Mobile Menu — Font Sizes Standardised to 15px

**File:** `frontend/components/Header.tsx`

**Elements updated to `text-[15px]`:**
- Section headers: "Departments", "Help & Settings"
- Back button and sub-panel category label
- "Shop All" / "View all {category}" buttons
- Category item buttons
- "Track Order", "Help Center" rows

---

### Fix: Hide "Uncategorised" Category from Tree

**File:** `frontend/categoryTree.ts`

"Uncategorised" appeared as a top-level department in the mega menu, mobile menu, and search dropdown.

**Approach:** Filter at `rootCategories` level after the full hierarchy is built. Filtering in the first pass orphaned all child categories that used "uncategorised" as a parent slug.

**Change:**
```ts
const HIDDEN_SLUGS = new Set(["uncategorised", "uncategorized"]);
return rootCategories
  .filter((cat) => !HIDDEN_SLUGS.has(cat.id?.toLowerCase()))
  .map(cleanupNode);
```

Covers both UK and US spellings. Child categories of valid parents are unaffected.
