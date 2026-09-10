# Nexvo Migration

Tracking the rebuild of the Belims frontend against the Hyper Nexvo Shopify theme.

**Reference:** https://hyper-nexvo.myshopify.com/
**Local HTML dump:** `/Users/levongravett/Downloads/Hyper_Nexvo.html`
**Cached CSS:** `/tmp/nexvo-css/theme.css`, `/tmp/nexvo-css/vendor.css`

---

## Rules

1. **Copy Nexvo's exact section first, customise later.** Match markup, classes, sizing, typography, hover behaviour. Brand tweaks come after every section is migrated.
2. **Inline font styling during migration.** Don't get blocked on the token system. We'll consolidate once the migration is done.
3. **Migrate top-down, visible-on-load first.** Ignore dropdowns, panels, carts, modals until their parent section is in place.
4. **Preserve Belims handlers + refs.** Replace structure/styles only — keep callbacks, state, routing intact.
5. **One section at a time.** Don't bundle migrations. Confirm visually, then move on.
6. **Defer cleanup.** Unused props, dead state, orphan handlers stay until ~5 sections are stable, then one cleanup pass.
7. **Backend before frontend.** If a section depends on data/routes that don't exist (e.g. `/find-a-store`), flag it before styling.

---

## Section status

| Order | Section                   | Status      | Notes |
|------:|---------------------------|-------------|-------|
| 1     | Header — Topbar           | done        | Belims links: Help Center / Track Your Order / Wishlist. 15px / 400 / 38.4px LH. |
| 2     | Header — Row 2 (logo)     | pending     | Logo + search + icons row. Still hard-coded inline styles. |
| 3     | Header — Row 3 (nav)      | pending     | Mega-menu trigger bar. |
| 4     | Hero (grid_banner)        | done        | 1+2 card grid, Nexvo `btn--primary` w/ slide-fill hover. |
| 5     | CategoryGrid (collection_list_slider) | done | 7-up rail, swiper arrows, card chevron buttons. |
| 6     | ShopByCategory            | pending     | |
| 7     | FeaturedGrid              | pending     | |
| 8     | PopularCategories         | pending     | |
| 9     | Archive                   | pending     | |
| 10    | SingleProduct             | pending     | |
| 11    | Footer                    | pending     | |

---

## Open issues

- **rem scale wrong on Belims root.** Nexvo CSS assumes `html { font-size: 62.5% }` (10px root). Belims uses browser default 16px, so every `--text-*` and `--font-h*-size` rem value renders 1.6× too big. Currently patched ad-hoc (e.g. `--text-base: 15px` literal). Need to either set the 10px root globally or convert the full scale to px.
- **Missing routes:** `/help-center`, `/wishlist`, `/find-a-store`, `/contact` — Topbar links 404 until pages are added.
- **Hero images are athens-theme placeholders** — replace with Belims-owned images before launch.
- **Pre-existing TS errors** in `frontend/backups/SingleProduct.tsx` and a few services. Worth excluding `backups/` from tsconfig.

---

## Workflow per section

1. Find the Nexvo markup (grep `Hyper_Nexvo.html` by section ID).
2. Pull the relevant CSS rules from `/tmp/nexvo-css/theme.css`.
3. Rewrite the Belims component using Nexvo's structure + classes.
4. Use inline styles for fonts; class-based CSS for layout/hover.
5. `npx tsc --noEmit -p .` — confirm no new errors.
6. Visual diff against the live Nexvo section.
7. Update this file's status row.
