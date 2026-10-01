# Roadmap

Open work, launch checklist and ideas. Start at the root [README](../README.md). When an item ships, remove it here and record it in [CHANGELOG.md](../CHANGELOG.md).

_Last reviewed: 2026-10-01_

---

## 🚨 Urgent

- [ ] **Rotate the Cloudways master SSH password.** It was committed to `README.md` in `63b6388e` (2026-02-20) and the GitHub repo is **public**. Removing it from the file does not remove it from history. After rotating, update the SSH Vault entry. (Server #1482444 → Master Credentials.)
- [ ] **Order endpoint access control** — harden access checks on the orders REST endpoints (details tracked privately, not in this public repo).
- [ ] **Imunify360 SplashScreen on `/wp-json/`** — get Cloudways support (root) to whitelist `cms.belims.co.za` / exclude `/wp-json/` from WebShield. Until then some uncached API calls return HTML and products fail to load. See [OPERATIONS → Cloudways](OPERATIONS.md#cloudways--cms).

## Launch checklist (`www.belims.co.za`)

- [ ] Imunify issue resolved; `/api/*` returns JSON for 10/10 cache-busted requests.
- [ ] Remove `VITE_COMING_SOON` from Vercel Production.
- [ ] Switch WP option `belims_vercel_deploy_hook` back to the **"CMS Homepage"** hook (branch `vercel`).
- [ ] Set the CMS frontend URL (ACF option `headless_frontend_url`, Site Settings → CORS & Security) from `https://belims.vercel.app` to `https://www.belims.co.za` — it sets the **PayFast return URL**, the CORS origin and the Homepage live-version check.
- [ ] Decide preview privacy: re-enable Vercel Authentication for preview deployments if `belims.vercel.app` should not stay public.
- [ ] Release: `git push origin main:vercel` (see [README → Deployment](../README.md#deployment-vercel)); verify production, Lighthouse and Cloudflare Web Analytics (host = www).
- [ ] Replace remaining placeholder/demo imagery (`frontend/public/images/development/*` collage tiles).
- [ ] Official brand logos for FAST, HARD, Ingco, Ruwag (most products), then Alcolin, Bostik, Hillaldam, Lasher, Sika, Union → `frontend/public/brands/{slug}.svg` + `BRAND_LOGOS` in `BrandStrip.tsx`.

## Performance

- [ ] **Lazy-load Firebase Auth** (only on sign-in/account/checkout) — `iframe.js` is 4.2 s of the mobile critical chain.
- [ ] **Route-level code splitting** (`React.lazy` for Shop, Product, Checkout, Account, Cart) — 244 KB unused JS, mobile TBT 440 ms.
- [ ] **Footer CLS** (0.17–0.885 in RUM): reserve min-height for homepage product rails so skeleton/loaded/error states match.
- [ ] Lazy-load the `TradeDeals` tile; eager + `fetchpriority="high"` for the first product row.
- [ ] Animate progress bars with `transform: scaleX()` instead of `width`; add `width`/`height` to header/footer logos.
- [ ] Optional: `cms.belims.co.za` Web Analytics off (admin noise).

## Reliability & code health

- [ ] Homepage product rails depend on the full ~1 MB listing (`fetchProducts`) — give them a dedicated small request (e.g. `per_page=24`).
- [ ] Remove dead `wp-content/plugins/global-site-settings/includes/class-ecommerce-policies.php` (not loaded; live route is in `class-ecommerce-settings.php`).
- [ ] `belims-ai-product-descriptions` uses `gemini-2.0-flash-exp` (experimental model) — move to a current Gemini model.
- [ ] Exclude `frontend/backups/` from `tsconfig` (pre-existing TS errors).
- [ ] Review long-standing uncommitted local changes (`frontend/components/MobileNav.css`, WordPress core files, `wp-config.php`) — never commit `wp-config.php`.

## CMS image pipeline

- [ ] Run `archive-old.php` (dry-run → `--run`) on the server; delete the archive only after confirmation.
- [ ] Convert to WebP **on upload** (`wp_handle_upload` / `add_attachment`) inside Global Site Settings so FTG-synced images never land as PNG.
- [ ] Resumable batches (chunk + offset, `--dry-run`), per-run log summary; skip already-WebP.
- [ ] Converter watcher: use a PID file (`pgrep -f` matched its own SSH command).
- [ ] Decide EWWW's role (currently lossless only) to avoid double processing.

## Design migration (Nexvo)

Pending sections from the migration tracker ([archive/frontend/NEXVO-MIGRATION.md](archive/frontend/NEXVO-MIGRATION.md)): Header rows 2–3, ShopByCategory, FeaturedGrid, PopularCategories, Archive, SingleProduct, Footer. Open issues: rem scale (Nexvo assumes a 10px root), missing routes `/help-center`, `/find-a-store`, `/contact`.

## Ideas backlog

Carried over from the former README "Upcoming Features": faceted search improvements, voice search, visual (photo) search, smart bundling recommendations, project cost calculator, page transitions/micro-interactions, dark mode, 360° gallery, PWA/offline, structured data (SEO), store locator directions, live chat.
