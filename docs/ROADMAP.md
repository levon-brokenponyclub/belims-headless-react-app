# Roadmap

Open work, launch checklist and ideas. Start at the root [README](../README.md). When an item ships, remove it here and record it in [CHANGELOG.md](../CHANGELOG.md).

_Last reviewed: 2026-10-01_

---

## 🚨 Urgent

- [ ] **Rotate the Cloudways master SSH password.** It was committed to `README.md` in `63b6388e` (2026-02-20) and the GitHub repo is **public**. Removing it from the file does not remove it from history. After rotating, update the SSH Vault entry. (Server #1482444 → Master Credentials.)
- [ ] **Rotate the PayFast merchant passphrase** (PayFast dashboard + WooCommerce PayFast settings) — routine rotation after the 2.9.0 payment changes.
- [ ] **Imunify360 SplashScreen on `/wp-json/`** — get Cloudways support (root) to whitelist `cms.belims.co.za` / exclude `/wp-json/` from WebShield. Until then some uncached API calls return HTML and products fail to load. See [OPERATIONS → Cloudways](OPERATIONS.md#cloudways--cms).
  - **2026-10-02 (user):** Imunify anti-bot protection is **disabled**, and no Vercel IP addresses appear under the blocked IP addresses. If `/api/*` still fails, look at origin speed/timeouts rather than Imunify.

## Launch checklist (`www.belims.co.za`)

- [ ] Imunify issue resolved; `/api/*` returns JSON for 10/10 cache-busted requests.
- [ ] Remove `VITE_COMING_SOON` from Vercel Production.
- [ ] Site Settings → Homepage → *Saving rebuilds*: switch to **Production** (or **Both**).
- [ ] Set the CMS default frontend URL (ACF option `headless_frontend_url`) from `https://belims.vercel.app` to `https://www.belims.co.za` — the PayFast return fallback and default CORS origin.
- [ ] Release `main:vercel` together with or after GSS 2.9.0 — the current production bundle's checkout predates the order-key requirement and fails until released.
- [ ] Decide preview privacy: re-enable Vercel Authentication for preview deployments if `belims.vercel.app` should not stay public.
- [ ] Release: `git push origin main:vercel` (see [README → Deployment](../README.md#deployment-vercel)); verify production, Lighthouse and Cloudflare Web Analytics (host = www).
- [ ] **Cloudflare pre-launch review** (zone `belims.co.za`, Free plan — from the Overview dashboard, 2026-10-02):
  - Keep **Bot Fight Mode OFF** and **Under Attack Mode OFF** — both challenge Vercel's server-side calls to `cms.belims.co.za/wp-json`, and the Free plan can't exempt paths (see [OPERATIONS → Cloudflare](OPERATIONS.md)).
  - **Development Mode** must be **OFF** at launch (it bypasses the cache).
  - **Leaked credentials mitigation** rate-limit rule is already deployed — confirm it doesn't throttle storefront sign-in / checkout calls.
  - **Bot Preference Sync is ON** (Manage AI bot access) — it prepends Cloudflare's AI-bot rules to `robots.txt`. Check `https://www.belims.co.za/robots.txt` at launch: search crawlers allowed, AI crawlers as decided.
  - **Percent cached is 46%** (30 days: 711 visitors, 68.5k requests, 285 MB served) — review cache rules / static asset caching to raise the hit ratio after launch.
  - **Domain Registration shows "Registrar: Unknown"** — confirm the registrar, expiry date and auto-renew (optionally transfer to Cloudflare).
  - **Billing shows "Processing"** under Active Subscriptions — check what is pending on the account.
  - Optional: decide on **Client-side security** (off) and Workers (none connected — not needed).
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
- [ ] **GSS 2.10.5 — verify the FTG on/off switch on staging (then production after release).** Passed locally 2026-10-02; repeat on https://wordpress-1482444-6707114.cloudwaysapps.com:
  1. FTG Sync → Connection → **FTG integration** card: Save is disabled at first, enables when the toggle changes, and disables again when it's changed back.
  2. Enable → Save: toast, badge **Connected**, credentials and all 4 menu items (Connection · Auto Sync · Tools · Activity Log) appear.
  3. Disable → Save: the "Disable FTG connection?" dialog opens, then a toast, and everything hides again.
  4. WordPress Dashboard panel: with FTG off, FTG shows an amber **Not connected** link and there are no Configure buttons.
- [ ] **GSS — User Guide inside the plugin dashboard.** Show the plugin's `USERGUIDE.md` (how the plugin works, section by section) in Site Settings, e.g. a Help tab or per-section help. Keep `USERGUIDE.md` the single source so the in-dashboard guide and the file never drift.
- [ ] **GSS FTG Tools — consider splitting Look up and Sync** into separate FTG Sync menu items (e.g. Connection · Auto Sync · Look up · Sync · Activity Log). Today (2.10.2) they are separate boxes in one **Tools** section; splitting means the shared Brand / SKU inputs need a home both can use.
- [ ] **GSS FTG Tools — Brand dropdown scope is unclear.** The Brand (and Product SKU) inputs sit in the top **Brand & product** box, and it isn't obvious they apply to the Look up and Sync buttons below. Options: label it ("Applies to Look up and Sync below"), repeat the selected brand in the Look up / Sync box headers, or move the inputs into each box.
- [ ] **Review orders since 2026-09-25 for placeholder shipping.** Rates failed from 25 Sep (plugin swap) and checkout charged placeholder rates (R75 / R125 / R150, `dev_*` codes) instead of Bob Go quotes. List paid orders since then, compare shipping charged vs the real quote, decide on follow-up with customers / BobGo.
- [ ] **Headless orders don't tell BobGo the chosen shipping service.** `POST /orders` (`includes/class-orders-endpoint.php`) adds the shipping line with only title + total — no `method_id` and no `bobgo_service_code` meta — so BobGo may not know which service the customer picked (or pull the order at all). Check a recent paid order in the BobGo dashboard, then set the method id / service-code meta from the selected rate.
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
