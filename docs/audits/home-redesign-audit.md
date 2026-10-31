# Home Page Redesign Audit

**Date:** 2026-10-31  
**Auditor:** Claude (STEP 1 — read-only, no source edits)  
**Stack:** Vite + React 19 SPA, Tailwind v3, Motion v13, React Router v6  
**Scope:** `frontend/App.tsx` (`HomePage`) + all 9 home sections + shared `Header` / `Footer` / `MobileBottomNav`

---

## 1. Current Section Order

| # | Component | Data source | Notes |
|---|-----------|-------------|-------|
| 1 | `HeroBanner` | `virtual:homepage` Vite plugin / CMS | LCP image |
| 2 | `ShopByCategory` | `homeProducts` rail | "Step into Style" heading — wrong domain |
| 3 | `FeaturedGrid` | Hard-coded static links | 5 pill-links on yellow `#f4f691` strip |
| 4 | `CollageGrid` | Hard-coded banners (dev images) | Collage + mobile auto-scroller |
| 5 | `DealsSection` | `homeProducts` filtered | Daily / Weekly / Trade tabs + carousel |
| 6 | `CategoryGrid` | Hard-coded slugs (12 items) | Sub-header pill-rail, no images |
| 7 | `TradeDeals` | `homeProducts` filtered (hand tools only) | Hero image left + 2×3 grid right |
| 8 | `PopularCategories` | `fetchCategories()` live | 2-card promo tiles — hardcoded copy/discounts |
| 9 | `BrandStrip` | `fetchCategories` via `/api/wp/v2/product_brand` | belims-blue bg, auto-rotate |

---

## 2. Audit Findings by Area

### 2.1 Merchandising

**ISSUE** — `ShopByCategory` heading "Step into Style" is apparel copy for a hardware/tool retailer. The tab labels ("New Arrivals", "Best Sellers") are correct but the section heading undermines the brand voice.

**ISSUE** — `TradeDeals` is hardcoded to the "Hand Tools" category (`product.category.includes("hand tools")`). If hand-tools inventory is thin, the section renders a "No hand tools products currently" fallback with a plain white card — looks broken. The section title "Hand Tools" is also not "Trade Deals" despite the component name.

**ISSUE** — `PopularCategories` shows hardcoded "Save 40%" / "Save 30%" badges and hardcoded marketing copy ("Elevate your space with 40% off our timeless designs!") regardless of actual promotions or categories loaded. The copy is also apparel-toned.

**ISSUE** — `FeaturedGrid` links are static slugs (`/shop/on-sale`, `/shop/most-viewed`, `/shop/trending-now`, `/shop/trade-exclusive`, `/shop/online-only`). None of these routes exist in the current router, so all 5 links 404.

**ISSUE** — `CollageGrid` banner `href` values are all `"#"` and the CTA button hard-navigates to `/trade/deals` regardless of which banner the user clicked. The component uses development placeholder images (`/images/development/athens-mosaic-*.webp`).

**ISSUE** — `CategoryGrid` (sub-header pill rail) has 12 hardcoded slugs, some without a `slug` property (e.g. `{ title: "Adhesives" }` — no slug, falls back to encoding the title, which likely 404s).

**ISSUE** — `DealsSection` renders `null` when no deals exist. There is no graceful skeleton or fallback merchandising shown to guest users on first load, causing a layout jump.

**ISSUE** — Section order buries deals (position 5) after two static-content blocks (FeaturedGrid, CollageGrid). High-intent deal seekers must scroll past non-product content.

---

### 2.2 Navigation / Search

**ISSUE** — `CategoryGrid` (the compact pill-rail just below the hero) is section #6, not anchored near the top where it could act as a secondary nav. Its current position is too late to catch users who bail after the hero.

**ISSUE** — The `FilterSearch` and `ProjectInspiration` components are commented out in `App.tsx`. If `FilterSearch` was providing quick-search on the homepage, its absence is a conversion gap.

**OBSERVATION** — The `Header` has a full `MegaMenu` and mobile nav. No search shortcut is surfaced on the homepage itself (no floating search bar, no search pill in the hero).

---

### 2.3 Product Cards

**OBSERVATION** — `ShopByCategory` uses the default `ProductCard` (full variant). `DealsSection` and `TradeDeals` use `PRODUCT_CARD_PRESETS.compactCard`. Two card sizes on the same page with no visual hierarchy rationale.

**ISSUE** — `ShopByCategory` carousel shows 5 items at lg+ (`basis-[calc((100%-4rem)/5)]`), which makes cards narrow. The `DealsSection` also shows 5 at lg+ with a different basis calculation. The industrial retail reference (Krank theme) uses larger, more confident cards — 4 per row max.

**OBSERVATION** — No "View All" CTA link exists on either `ShopByCategory` or `DealsSection`. Users who want more than the 10–16 shown have no obvious next step.

---

### 2.4 Trust / Conversion

**ISSUE** — Zero trust signals on the home page: no delivery promise badge, no "Free delivery over R500" strip, no returns policy mention, no secure-checkout icon. The `BrandStrip` (position 9) is the only brand-trust element and is at the bottom.

**ISSUE** — `PopularCategories` uses a hardcoded "Shop Now" CTA but renders inside a `<Link>` — the inner `<span>` button click fires but the link also navigates, meaning an `e.preventDefault()` pattern is missing. Double-event risk.

**OBSERVATION** — No "Recently viewed" or "Continue shopping" module exists for returning users.

**OBSERVATION** — No social proof (reviews count, order count, trust badges) is visible anywhere on the home page.

---

### 2.5 Visual System

**ISSUE** — `FeaturedGrid` uses a hardcoded `bg-[#f4f691]` yellow that is not a design token. This color does not appear in `tailwind.config.js` and clashes with the brand palette (`#c4301c` primary, `rgb(50,39,131)` belims-blue).

**ISSUE** — `PopularCategories` uses `bg-[#F7E6E8]` and `bg-[#E5F4EA]` — hardcoded pastel colors not in the token system.

**ISSUE** — `CollageGrid` uses `bg-gray-100` section background, `BrandStrip` uses `bg-belims-blue`, `DealsSection` uses plain `bg-white`. No rhythmic alternation between section backgrounds — the page feels visually flat with scattered color bursts.

**ISSUE** — `HeroBanner` CTA uses `bg-belims-blue`. `TradeDeals` CTA uses `bg-white text-text`. `CollageGrid` CTAs use `border-white text-white`. Three different CTA styles for equivalent hierarchy. No defined primary-action token is applied consistently.

**OBSERVATION** — `ShopByCategory` heading font-size is `text-2xl sm:text-3xl`. `DealsSection` heading uses `text-h5 md:text-h4`. Typographic scale is applied inconsistently across sections.

---

### 2.6 Performance

**ISSUE** — `PopularCategories` makes its own independent `fetchCategories()` call, separate from the categories fetch in `App.tsx`. Two concurrent category API requests fire on home page load.

**ISSUE** — `BrandStrip` makes a direct `fetch` to `/api/wp/v2/product_brand` — bypassing `cachedGetJson`, meaning no deduplication if multiple components needed brand data.

**ISSUE** — `CollageGrid` and `useWindowWidth` are duplicated hooks: both `CollageGrid` and `BrandStrip` each define their own `useWindowWidth()` function inline. Three separate resize listeners across three components; should be a shared hook.

**OBSERVATION** — The bundle is pre-warned at 1,461 kB (376 kB gzipped). No lazy-loading is applied to below-the-fold home sections. `TradeDeals`, `PopularCategories`, and `BrandStrip` could all be `React.lazy()` candidates.

**OBSERVATION** — `HeroBanner` correctly uses `loading="eager" fetchPriority="high"` on the LCP image. `CollageGrid` and `TradeDeals` images use `loading="lazy"` ✓. `PopularCategories` product images use `loading="lazy"` ✓.

---

### 2.7 Accessibility

**ISSUE** — `FeaturedGrid` carousel container has `aria-roledescription="carousel"` but individual items have no `aria-roledescription="slide"` and no `aria-label` — screen readers cannot identify the items.

**ISSUE** — `CollageGrid` `BannerCard` outer `<a>` has `aria-label={banner.title}` but the inner `<button>` for the CTA has no accessible label (it shows text, but the outer anchor already claims the label, creating a nested interactive element accessibility issue).

**ISSUE** — `CategoryGrid` pill-links have no `aria-current` for the active category. On the home page all are inactive which is fine, but the component has no mechanism to mark active state.

**ISSUE** — `BrandStrip` prev/next buttons use `‹` / `›` Unicode chars as content without an `aria-hidden` on the char span — screen readers will announce "single left-pointing angle quotation mark". The `aria-label` on the button itself is correct but the char is still read.

**OBSERVATION** — Color contrast: `bg-[#f4f691]` yellow `FeaturedGrid` strip uses `text-text` (dark) on yellow — likely passes AA. The white category pill text on hover (`group-hover:text-white`) against `bg-surface-dark` (near-black) should pass, but the mid-transition state (50% scale on the wipe overlay) has low contrast.

---

### 2.8 Responsive

**ISSUE** — `TradeDeals` hero image is `hidden lg:block` — on mobile, the category promo context (the "Hand Tools" image + description + button) is completely invisible. Mobile users only see a 2-column product grid with no context banner.

**ISSUE** — `FeaturedGrid` has `md:overflow-visible md:snap-none` but the desktop layout uses `md:w-1/5` on items — at exactly 768px viewport width, items are 153px wide and text truncates without ellipsis.

**OBSERVATION** — `ShopByCategory` shows 2 items mobile, 3 tablet, 5 desktop. `DealsSection` shows ~2.15 items mobile, ~2 tablet, 5 desktop. Different snap ratios for what are functionally the same carousel pattern.

**OBSERVATION** — `PopularCategories` 2-column grid collapses to 1-column on mobile correctly (`lg:grid-cols-2` fallback to full-width). The promo tiles are readable on mobile.

---

### 2.9 States

**ISSUE** — `DealsSection` returns `null` when `!hasAnyDeals && !isLoadingProducts`. This causes a layout reflow after the products load — sections below jump up then down. A min-height placeholder or a "no current deals" state should replace the null.

**ISSUE** — `TradeDeals` renders a white bordered card with "No hand tools products currently." — this is a raw dev fallback, not a styled empty state.

**ISSUE** — `PopularCategories` has `isLoading` state but renders nothing during load (no skeleton). On slow connections, a section-sized gap appears between `DealsSection` and `CategoryGrid`.

**ISSUE** — `BrandStrip` starts with `FALLBACK_BRANDS` (6 brands) and silently replaces them when the API responds. No loading indicator. If the API fails, fallback brands link to `/brands/bosch` etc. which may 404.

**OBSERVATION** — `ShopByCategory` and `DealsSection` correctly show skeleton cards during load via `isLoadingProducts` prop ✓.

---

### 2.10 Code Hygiene

**ISSUE** — `useWindowWidth` is defined three times in the codebase (`CollageGrid.tsx`, `BrandStrip.tsx`, `DealsSection.tsx`). Should be extracted to `frontend/hooks/useWindowWidth.ts`.

**ISSUE** — `CategoryGrid` has hardcoded category slugs. Some entries lack `slug` fields (e.g. `{ title: "Adhesives" }`) — the fallback `encodeURIComponent(cat.slug ?? cat.title)` will encode the title as a URL path that likely 404s.

**ISSUE** — `FeaturedGrid` static links (`/shop/on-sale`, `/shop/most-viewed`, etc.) do not exist in the React Router config (`App.tsx`). These should either be connected routes or removed.

**ISSUE** — `CollageGrid` imports are clean but the component exports both a named `CollageGrid` and a default `export default CollageGrid` — inconsistent with all other home components which use only named exports.

**OBSERVATION** — `ShopByCategory` sorts by `maxStock` for "Best Sellers" — stock level is not a reliable proxy for sales rank. This should be flagged for a real `total_sales` field from the CMS if available.

**OBSERVATION** — `DealsSection` has its own local `useWindowWidth` that is only used to invalidate the carousel measurement (`useEffect(..., [width, itemsLength])`). The hook is not strictly needed — a `ResizeObserver` already handles the rail width.

---

## 3. Proposed New Section Order

The following order prioritises trust-building near the top, moves the category nav into a useful position, and consolidates the two deals sections into a single unified deals zone.

| # | Component | Rationale |
|---|-----------|-----------|
| 1 | `HeroBanner` | LCP, CMS-driven — keep as is |
| 2 | `CategoryGrid` (updated) | Secondary nav — visible immediately after hero, above the fold on desktop |
| 3 | `ShopByCategory` | Product carousel — first purchasable content |
| 4 | `DealsSection` | High-intent users; earlier placement improves conversion |
| 5 | `CollageGrid` | Visual editorial break — lifestyle banners with real hrefs |
| 6 | `TradeDeals` (renamed: `CategoryFeature`) | Category spotlight — generalised beyond hand tools |
| 7 | `PopularCategories` | Category promo tiles — CTA-driven, halfway down funnel |
| 8 | `FeaturedGrid` (redesigned) | Contextual links / filters — after users have seen product |
| 9 | `BrandStrip` | Trust anchor — brands near bottom ✓ |

Sections removed from the proposed order:
- None — all 9 sections are retained but reordered and repaired.

---

## 4. Batched SUGGESTIONS

> These are design/implementation proposals for review before STEP 2 mockups.

**S-01 — Section headings:** Adopt a single heading pattern across all home sections: `text-h4` bold, optionally with a subtitle or tab-switcher beside it. Fix "Step into Style" → "New Arrivals" / "Shop Our Range" or similar tool/hardware-appropriate copy.

**S-02 — Deal empty state:** Replace `return null` in `DealsSection` with a "No current deals — check back soon" card at fixed height, preventing layout reflow.

**S-03 — CollageGrid real links:** Replace `href="#"` banners with CMS-configurable or category-driven links. Short-term: map each banner to a real category slug.

**S-04 — Trust strip:** Add a horizontal strip (delivery promise, returns, secure checkout, trade account) between `HeroBanner` and `CategoryGrid`. Single row, icon + text, no extra API call.

**S-05 — Consolidate CarouselHooks:** Extract `useWindowWidth` and the rail-measurement pattern to `hooks/useCarousel.ts`.

**S-06 — CategoryGrid slugs:** Replace hardcoded list with top-N categories from `fetchCategories()` (already cached). Filter to `count > 0`.

**S-07 — TradeDeals generalise:** Make the left-panel category configurable via a prop (`categorySlug`, `heading`, `image`). Start with a "Power Tools" variant as default.

**S-08 — PopularCategories copy:** Remove hardcoded discount badges and marketing copy; drive from a CMS ACF field or remove badges entirely. The current copy is apparel-toned for a hardware store.

**S-09 — Bundle lazy loading:** Lazy-load `TradeDeals`, `PopularCategories`, and `BrandStrip` with `React.lazy()` + `<Suspense>` wrapping.

**S-10 — FeaturedGrid yellow:** Move `#f4f691` to a design token (`--color-highlight-yellow`) or replace the strip with a neutral surface that uses the primary or belims-blue palette.

---

## 5. Batched QUESTIONS

> Decisions that require your input before mockups can be locked.

**Q-01 — Section rename:** Should `TradeDeals` become a generic `CategoryFeature` (configurable spotlight) or stay Trade-specific and be gated for trade-approved users only?

**Q-02 — Deals consolidation:** Should `DealsSection` and `TradeDeals` be merged into one "Shop Deals" section with a "Trade" tab, or kept separate?

**Q-03 — FeaturedGrid fate:** The 5 pill links (On Sale, Most Viewed, Trending Now, etc.) all 404. Do you want these routes built, or should `FeaturedGrid` be replaced with a different editorial block?

**Q-04 — Hero CTA:** The current hero CTA uses `bg-belims-blue`. Should the primary CTA token on the home page be primary (`#c4301c`) or belims-blue (`rgb(50,39,131)`)?

**Q-05 — CategoryGrid data source:** Should the pill-rail use live categories from the API (dynamic, always current) or a hand-curated static list (predictable, always linked)?

**Q-06 — Trust strip placement:** Should trust signals (delivery, returns, trade) live in a dedicated home-only strip, or be incorporated into the existing `Header`/`Footer` components?

---

_End of STEP 1 audit. No source files were modified. STEP 2 (design tokens doc + HTML mockups) begins on approval._
