# Belims Design Tokens

**Source of truth:** `:root` in `frontend/index.css` → mapped in `frontend/tailwind.config.js`.
This doc mirrors those files. **Phase 1 (2026-10-31): Industrial + brand tokens are live in `index.css`** — dark surfaces / inverse CTAs / strong outlines are brand blue, radii are 2–6px, section titles are 44px condensed with a red rule (`SectionHeading`). Home redesign approved (Recommended mockup, `docs/mockups/home/index.html`) and implemented 2026-10-31. The **Implemented as** notes record where the build reused existing tokens instead of adding the proposed ones.

---

## 1. Colour

### Brand
| Token | Value | Tailwind | Use |
|---|---|---|---|
| `--color-primary` | `#c4301c` | `primary` | Primary CTA (incl. hero — Q-04), key accents |
| `--color-primary-soft` | `#cb321e` | `primary-soft` | Sale badge |
| `--color-primary-on` | `#ffffff` | `primary-on` | Text on primary |
| `--color-secondary` | `rgb(50, 39, 131)` (was `#232323`) | `secondary` | Inverse CTA — brand blue since Phase 1 (2026-10-31) |
| `--color-belims-blue` | `rgb(50, 39, 131)` | `belims-blue` | Brand band (BrandStrip), active tab underline |

### Surface / text / border
| Token | Value | Tailwind |
|---|---|---|
| `--color-surface` | `#ffffff` | `surface` |
| `--color-surface-muted` | `#f5f5f5` | `surface-muted` |
| `--color-surface-soft` | `#eeecec` | `surface-soft` |
| `--color-surface-dark` | `rgb(50, 39, 131)` (was `#000000`) | `surface-dark` |
| `--color-text` | `#000000` | `text` |
| `--color-text-secondary` | `#4d4d4d` | `text-secondary` |
| `--color-text-tertiary` | `#666666` | `text-tertiary` |
| `--color-border` | `#e5e5e5` | `border` |
| `--color-border-strong` | `rgb(50, 39, 131)` (was `#000000`) | `border-strong` |

### Status / badges / stock / deals
Unchanged — see `index.css` lines 35–64 (`success`, `badge-*`, `stock-*`, `deal-*`). Pricing/deal colours are **FENCED**: no changes in this redesign.

### Hardcoded colours to retire (audit §2.5)
| Where | Value | Replacement |
|---|---|---|
| `FeaturedGrid` | `#f4f691` | Component removed (Q-03) |
| `PopularCategories` | `#F7E6E8`, `#E5F4EA` | `surface-muted` |
| `PopularCategories` badges | `#F3F58E`, `#C9341A` | Removed (fake discounts) |
| `HeroBanner` band | `#F2F3F7` | Removed (full-bleed hero) |

All five were removed on 2026-10-31.

---

## 2. Typography

| Token | Value |
|---|---|
| Family (heading/body/button) | Archivo |
| `--font-body-size` | 15px, line-height 1.6 |
| `--font-heading-weight` | 700 |
| `--font-h1…h6-size` | 36 / 30 / 24 / 20 / 18 / 16px |
| `--font-heading-mobile-scale` | 0.78 |
| `--leading-heading` | 1.2 |

**PROPOSED — section heading style** (industrial retail):
| Token | Value | Notes |
|---|---|---|
| `--font-section-title-size` | `var(--font-h2-size)` (30px, mobile ×0.78) | One size for every home section title (fixes audit §2.5 scale drift) |
| `--font-section-title-transform` | `uppercase` | Home section titles only, not global headings |
| `--font-section-title-tracking` | `-0.01em` | |
| `--font-section-title-stretch` | `87.5%` (semi-condensed) | Archivo variable `wdth` axis — needs the font request to include `wdth` |
| `--font-eyebrow-size` | 12px, 600, uppercase, `0.08em` tracking | Small label above titles ("This week", "Department") |

**Implemented as:** `--font-section-title-stretch: 87.5%` + `.font-condensed` (`index.css`), with the Archivo `wdth 87.5 / 700` instance added to the font request in `index.html`. Title size uses the existing `text-h3 md:text-h2` (24 → 30px), not a new size token. Eyebrow uses the existing `text-eyebrow` (11px, uppercase) + `font-semibold`. All of it lives in `components/SectionHeading.tsx`. The hero H1 uses `text-display-sm md:text-display-lg` + `.font-condensed`.


**Added 2026-10-31 — `caption` size (13px).** `--text-caption` / Tailwind `text-caption` (line-height 1.5, +0.01em). The scale had no step between `text-sm` (11px) and `text-base` (15px), so content pages used arbitrary `text-[12px]` / `text-[13px]` / `text-[14px]` or fell to the 11px `text-sm` for real content. 11px (`text-sm`) and 10px (`text-xs`) are now for chrome only (header pills, footer, cookie bar, badges on cards).

**Product page type spec** (`SingleProduct`, `FulfilmentChooser`, `ProductPriceDisplay`):
| Role | Class | Size / weight |
|---|---|---|
| Product title (H1) | `font-heading font-condensed text-h2 font-extrabold uppercase` | 30 / 800 |
| Price | `text-h2 font-bold tabular-nums` | 30 / 700 |
| Compare-at price | `text-xl` | 18 |
| Section / tab labels | `font-heading font-condensed text-base font-bold uppercase` (active: `font-extrabold`) | 15 / 700–800 |
| Body, lists, descriptions | `text-base text-text` (description `text-text-secondary`) | 15 / 400 |
| Stock status, option lines, item names/prices | `text-base font-semibold` | 15 / 600 |
| Meta: breadcrumb, SKU / category, captions, ETA, address, distance | `text-caption` (`text-text-secondary` / `text-tertiary`) | 13 / 400–600 |
| Uppercase labels and badges (brand chip, deal badge, key-spec labels, trade grid labels) | `text-caption font-bold uppercase tracking-wide` | 13 / 700 |
| Buttons | `text-button font-heading font-condensed uppercase` | 15 / 700 |

Weights: 400 body, 600 for values and links that must read as data, 700 for prices and buttons, 800 for the title and the active tab. No `font-medium` / `font-black`.

---

## 3. Spacing, radius, layout

| Token | Value |
|---|---|
| `--space-1…10` | 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px |
| `--radius-xs / sm / md` | 2 / 2 / 4px (`md` = card + button + input; Nexvo was 5 / 6 / 10px) |
| `--radius-lg` | 6px (was 30px — drives `rounded-lg`, 151 uses) |
| `--radius-pill` / `--radius-badge` | 4px / 4px (was 100px / 40px); true circles use `rounded-full` |
| Container | max 1380px, 1rem gutter |

**PROPOSED — home rhythm:**
| Token | Value | Notes |
|---|---|---|
| `--section-y` | 56px desktop / 40px mobile | Replaces mixed `py-3 / py-10 / py-14 / mb-16` |
| `--section-head-gap` | 24px | Title row → content |
| Card radius on home | `--radius-md` | Drop `rounded-3xl` / `rounded-[14px]` one-offs |
| Product rail | 4-up ≥1024px, 3-up ≥640px, 2-up mobile | Was 5-up (audit §2.3) |

**Implemented as:** sections use Tailwind `py-10 md:py-14` (40/56px), with no `--section-y` token. Home cards and tiles use `rounded-md` (`--radius-md`). `ShopByCategory` is 4-up at `lg`. Home tap targets (tabs, View all, pills) are ≥44px.

---

## 4. Component tokens (home)

| Component | Spec |
|---|---|
| **Button — primary** | `bg-primary text-primary-on`, `radius-md`, h-12, 700 weight, hover → `secondary` |
| **Button — secondary** | `border-strong` 1px, `text`, transparent; hover → `bg-surface-dark text-white` |
| **Button — on-image** | `bg-white text-text`; hover → `bg-primary text-white` |
| **Tab** | 16px 600, `text-tertiary`; active → `text` + 2px `primary` underline |
| **Carousel arrow** | 40×40, 1px `border`, `radius-md` (not circle); hover → `bg-surface-dark text-white` |
| **Category pill** | h-9, `radius-pill`, 1px `border`, 14px 500; hover → `border-primary text-primary` |
| **Section surface alternation** | range (white) → deals (`surface-muted`) → collage (white) → departments (`surface-muted`) → top categories (white) → brands (`belims-blue`) → footer (white, unchanged; the mockup's black footer was not adopted) |

**Product card:** not restyled in the home pass. `ProductCard` is shared by 11 components, so its restyle belongs to the Shop/Product redesign.

No `box-shadow` on any home component (global rule). Elevation via border + surface contrast only — this also removes the existing `shadow-xs` / `shadow-sm` / hover shadows in `ShopByCategory`, `CollageGrid`, `BrandStrip`.
