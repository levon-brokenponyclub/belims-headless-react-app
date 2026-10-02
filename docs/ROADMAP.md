# Roadmap

Open work, launch checklist and ideas. Start at the root [README](../README.md). When an item ships, remove it here and record it in [CHANGELOG.md](../CHANGELOG.md).

_Last reviewed: 2026-10-01_

---

## 🚨 Urgent

- [ ] **Rotate the Cloudways master SSH password.** It was committed to `README.md` in `63b6388e` (2026-02-20) and the GitHub repo is **public**. Removing it from the file does not remove it from history. After rotating, update the SSH Vault entry. (Server #1482444 → Master Credentials.)
- [ ] **Rotate the PayFast merchant passphrase** (PayFast dashboard + WooCommerce PayFast settings) — routine rotation after the 2.9.0 payment changes.
- [ ] **Imunify360 SplashScreen on `/wp-json/`** — get Cloudways support (root) to whitelist `cms.belims.co.za` / exclude `/wp-json/` from WebShield. Until then some uncached API calls return HTML and products fail to load. See [OPERATIONS → Cloudways](OPERATIONS.md#cloudways--cms).

## Launch checklist (`www.belims.co.za`)

- [ ] Imunify issue resolved; `/api/*` returns JSON for 10/10 cache-busted requests.
- [ ] Remove `VITE_COMING_SOON` from Vercel Production.
- [ ] Site Settings → Homepage → *Saving rebuilds*: switch to **Production** (or **Both**).
- [ ] Set the CMS default frontend URL (ACF option `headless_frontend_url`) from `https://belims.vercel.app` to `https://www.belims.co.za` — the PayFast return fallback and default CORS origin.
- [ ] Release `main:vercel` together with or after GSS 2.9.0 — the current production bundle's checkout predates the order-key requirement and fails until released.
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

- [ ] `POST /orders` ignores `coupon_lines` and `order_note` from checkout — applied coupons and notes don't reach the WooCommerce order.
- [ ] Headless orders show WooCommerce order attribution "Origin: Unknown" — optionally set attribution meta in `create_order`.
- [ ] Remove dead `wp-content/plugins/global-site-settings/includes/class-ecommerce-policies.php` (not loaded; live route is in `class-ecommerce-settings.php`).
- [ ] `belims-ai-product-descriptions` uses `gemini-2.0-flash-exp` (experimental model) — move to a current Gemini model.
- [ ] Exclude `frontend/backups/` from `tsconfig` (pre-existing TS errors).
- [ ] Review long-standing uncommitted local changes (`frontend/components/MobileNav.css`, WordPress core files, `wp-config.php`) — never commit `wp-config.php`.
- [ ] **GSS — User Guide inside the plugin dashboard.** Show the plugin's `USERGUIDE.md` (how the plugin works, section by section) in Site Settings, e.g. a Help tab or per-section help. Keep `USERGUIDE.md` the single source so the in-dashboard guide and the file never drift.
- [ ] **GSS FTG Tools — consider splitting Look up and Sync** into separate FTG Sync menu items (e.g. Connection · Auto Sync · Look up · Sync · Activity Log). Today (2.10.2) they are separate boxes in one **Tools** section; splitting means the shared Brand / SKU inputs need a home both can use.
- [ ] **GSS FTG Tools — Brand dropdown scope is unclear.** The Brand (and Product SKU) inputs sit in the top **Brand & product** box, and it isn't obvious they apply to the Look up and Sync buttons below. Options: label it ("Applies to Look up and Sync below"), repeat the selected brand in the Look up / Sync box headers, or move the inputs into each box.
- [ ] **GSS 2.9.8 FTG Save Credentials (follow-up):** on Save no toast appears and the page "wants to reload" (reported 2026-10-02, local). The saved view did switch in place, so the AJAX success path likely ran. Check: whether `bpcToast` fires/renders (console, toast region), whether the "reload" is the browser's leave-page prompt (`bpcMarkFormClean` snapshot in `admin.js`) or the password manager's save-login prompt reacting to the form `submit`, and the Network tab response of `admin-ajax.php?action=belims_save_ftg_credentials`.

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
