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
- [ ] Eager + `fetchpriority="high"` for the first product row (`TradeDeals` was removed in the home redesign).
- [ ] Optimise the `GET /belims/v1/products/home` cold rebuild (>100 s, see CHANGELOG 2026-10-05). It still didn't respond within 60 s on 2026-10-31, so the client hit its 25 s timeout and home rails waited for the full catalogue (~10 s cold).
- [ ] `class-products-endpoint.php` gives every product without an ACF video a test video (`/images/development/output_32s_50s_360p_under1_5mb.mp4`). Remove the fallback (plugin deploy).
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
- [ ] **GSS 2.9.8 FTG Save Credentials (follow-up):** on Save no toast appears and the page "wants to reload" (reported 2026-10-02, local). The saved view did switch in place, so the AJAX success path likely ran. Check: whether `bpcToast` fires/renders (console, toast region), whether the "reload" is the browser's leave-page prompt (`bpcMarkFormClean` snapshot in `admin.js`) or the password manager's save-login prompt reacting to the form `submit`, and the Network tab response of `admin-ajax.php?action=belims_save_ftg_credentials`.

## CMS image pipeline

- [ ] Run `archive-old.php` (dry-run → `--run`) on the server; delete the archive only after confirmation.
- [ ] Convert to WebP **on upload** (`wp_handle_upload` / `add_attachment`) inside Global Site Settings so FTG-synced images never land as PNG.
- [ ] Resumable batches (chunk + offset, `--dry-run`), per-run log summary; skip already-WebP.
- [ ] Converter watcher: use a PID file (`pgrep -f` matched its own SSH command).
- [ ] Decide EWWW's role (currently lossless only) to avoid double processing.

## Design port — Industrial + brand (mockups approved 2026-10-31)

Source of truth: [mockups/](mockups/) — `home/index.html` (default style), `shop-product/archive.html` (Hero A on `/shop`, Hero C on categories), `shop-product/product.html` (Layout B + delivery chooser), shared `mockups/theme.css` + `header/site-header.*`. Tokens: [design/belims-design-tokens.md](design/belims-design-tokens.md). Supersedes the Nexvo tracker ([archive/frontend/NEXVO-MIGRATION.md](archive/frontend/NEXVO-MIGRATION.md)).

Decisions (2026-10-31): tokens change **globally** (cart/checkout/account inherit; regression pass in Phase 6) · order **Tokens → Header → Home → Archive → Product** · keep and build on the uncommitted `MobileNav.css` edits · home redesign stays **uncommitted** for now.

Rules for every phase: inspect before editing · pricing/deal logic (`dealService`, `ProductPriceDisplay`, `ProductCard` price paths) is fenced — visual only · `npm run build` + `tsc` (touched files) + `vite preview` check at 375 / 1024 / 1440 · CHANGELOG + docs in the same change · commit only when asked · never release to production unless asked.

- [ ] **Phase 0 — Prerequisites**
  - Commit the built home redesign (uncommitted since 2026-10-31) so the port starts from a clean base.
  - ~~Hide the reviews section on API error~~ (done 2026-10-31, uncommitted). Still open: Google returns `403 PERMISSION_DENIED` for the Vercel `GOOGLE_PLACES_API_KEY` — in Google Cloud, enable **Places API (New)** for the key's project, allow it under the key's API restrictions, and use no HTTP-referrer restriction (server-side calls send none).
  - Decide what happens to the uncommitted `components/MobileNav.css` edits (the mobile drawer is restyled in Phase 2).
- [x] **Phase 1 — Theme tokens** — done 2026-10-31 (uncommitted): brand-blue `secondary` / `surface-dark` / `border-strong`, radii 2/4/6px, 44px `SectionHeading`. Button classes deferred to Phase 2 (added where first used). Component one-offs (`rounded-full/xl/2xl`, hardcoded black) handled per phase.
  - Brand blue for dark surfaces / inverse CTAs / strong outlines (`--color-surface-dark`, `--color-secondary`, `--color-border-strong`); red stays primary CTA + accents.
  - Industrial shape: `--radius-md` 10→4px, `--radius-sm` 6→2px, `--radius-pill` → 4px; condensed uppercase section titles (44px + 4px red rule) via `SectionHeading`; uppercase condensed button style as `@layer components` classes.
  - Blast radius: `rounded-md/card/button` appear 61× in 17 components (cart, checkout, account included) — global vs scoped is an open decision.
- [x] **Phase 2 — Header** — done 2026-10-31 (uncommitted). Divergences from the mockup: "Delivering to" pill stays left of search (popover anchoring); no Deals link yet (needs the Phase 4 offer filter); category links use names until Phase 4 makes the archive slug-aware; Home's pill rail is hidden from `md` up (kept on mobile, where the header has no pills). CMS data surfaced in menus: categories "None" (Tools and Machinery) and "Shop By Tool Application".
  - Brand-blue sticky header with real logo: utility bar (pickup store / delivery copy, track order, store locator, trade) → main row (logo, search with existing typeahead, collect chip, account, cart total) → sub row (Departments, top 10 live subcategory pills, Deals). Condenses to one row on scroll.
  - Replace `MegaMenu` with the 3-pane cascade (department → subcategory → children + products in branch) from the existing category tree; keyboard: arrows, Escape, focus return.
  - Keep all location/delivery state and modals (`DeliveryLocationModal`, `DeliveryDetailsPopover`) — restyle only.
  - Mobile: keep the existing multi-level `MobileNav`, restyle (white panels, blue head, red accents).
  - Then remove Home's duplicate `CategoryGrid` pill rail (the header carries it).
- [x] **Phase 3 — Home retune** — done 2026-10-31 (uncommitted). Reviews show again once Google's Places API (New) permission is fixed (see Phase 0).
  - Blue Deals + Departments bands, Brands band with red top rule, blue footer base; Google reviews section before Brands (store reviews, hidden when the API fails; never in Product JSON-LD).
- [x] **Phase 4 — Archive** — done 2026-10-31 (uncommitted). `ArchiveHero` split out; filters, chips, sort and pagination stay in `Archive.tsx`. Range, Colour and In-stock facets removed (no product data behind them). Header / mega menu / mobile nav links back on slugs. Hero image is a dev placeholder until the CMS supplies one. Archive product cards now use the approved mockup treatment with Wishlist and Quickview controls retained.
  - Hero A on `/shop`, Hero C (no promo) on `/shop/:category`; proper H1 + `document.title`.
  - All filter / sort / view / page state in the URL (back-button safe); 24 per page with numbered pages (client-side first; server pagination needs plugin params).
  - Category match by slug subtree (fixes "Hand Tools" substring over-match); Offer facet lists only types with matches; verify/remove the no-op Colour and Range facets.
- [x] **Phase 5 — Product** — done 2026-10-31 (uncommitted). Then matched to the mockup (Phase 5b): `FulfilmentChooser` radio cards + rates drawer, specs table / key specs parsed from the description HTML, product-page `railCard`. Pricing/cart/fulfilment logic untouched. Placeholder video still served by the plugin; the storefront ignores it. Follow-ups: `FulfillmentBlock.tsx` + `FulfillmentTiles.tsx` are now unused (delete on approval); structured specs from the plugin would replace storefront parsing; header "Collect from" chip + Deals button from the mockup not built.
  - Layout B: wide gallery, sticky buy panel, content + "Perfect match with" flow in the left column.
  - Delivery / Collect chooser using the existing quote logic (`FulfillmentBlock`, `DeliveryLocationModal`, Bob Go rates); Returns + Warranty only in the Delivery & returns accordions.
  - Product + BreadcrumbList JSON-LD, per-product title, labelled qty stepper, `aria-live` updates; ignore the placeholder video until the plugin fallback is removed.
- [x] **Track Order** — 2026-10-31 (uncommitted): complete tracking data, flat layout, all states; see [audits/track-order-audit.md](audits/track-order-audit.md). Deferred: plugin 404 for unknown references, live tests of in-transit / failed / multi-shipment.
- [ ] **Account page (Option A)** — plan: [design/account-page-implementation-plan.md](design/account-page-implementation-plan.md) (Phase 0 P0 fixes → shell/dashboard → orders + `/account/orders/:orderNumber` → other tabs → server-side default address → QA). Mockup: `docs/mockups/account-dashboard/option-a-command-centre.html`.
- [ ] **Phase 6 — QA + release**: full route regression (cart, checkout, account), Lighthouse, update `docs/` + CHANGELOG, release to preview; production only on request.

## Ideas backlog

Carried over from the former README "Upcoming Features": faceted search improvements, voice search, visual (photo) search, smart bundling recommendations, project cost calculator, page transitions/micro-interactions, dark mode, 360° gallery, PWA/offline, structured data (SEO), store locator directions, live chat.
