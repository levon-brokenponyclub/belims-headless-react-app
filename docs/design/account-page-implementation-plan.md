# AccountPage implementation plan (Option A)

Source of truth: [`docs/mockups/account-dashboard/option-a-command-centre.html`](../mockups/account-dashboard/option-a-command-centre.html) · findings: [`AUDIT.md`](../mockups/account-dashboard/AUDIT.md).
Decisions: Option A · keep `R2,690.00` · remove Payment tab · delete Account Balance.
Rules: commit only when asked · plugin/CMS deploys need your approval (list files, path, backup) · every phase updates CHANGELOG + `docs/FEATURES.md` · verify with `npm run build` and preview.

## What the code already gives us (changes the mock's assumptions)

| Mock assumption | Reality | Consequence |
|---|---|---|
| New order-detail API | `GET belims/v1/orders/:id` exists; owner access enforced (`class-orders-endpoint.php`) | No backend work for order detail; only a frontend route |
| Reset-password link needs an endpoint | `POST belims/v1/users/forgot-password` exists (`sendPasswordResetEmail`, `authService.ts`) | Wire it; no backend |
| Line items carry product id + image | Yes (`product_id`, `image` in both order payloads) | Reorder / buy-again can be built from orders |
| Collect orders and "ready to collect" step | **Checkout only creates delivery orders** (`method_id: "bobgo_shipping"`, `Checkout.tsx:964`); no collect fulfilment exists on orders | Build the delivery stepper only. The collect stepper in the mock is future work; do not ship it |
| Default address saved server-side | `PUT /users/me` handles names, phone, billing/shipping only (`class-user-endpoint.php:249`) | Needs a plugin change (new user meta) — separate, approval-gated phase. Until then keep `localStorage` |
| Invoice download | No endpoint | Out of scope: drop the button from the build (keep in backlog) |
| Wishlist is stock-aware | Wishlist items are `localStorage` snapshots; no stock | Resolve each item against the loaded catalogue (`allProducts`) before enabling Add |
| Token for the dark band `#1d1650` | Not a token | Use `bg-belims-blue` (matches the header) unless you want a new `--color-surface-deeper` |

## Target structure

`AccountPage.tsx` (1,197 lines) becomes a thin router + data owner; views move to `frontend/components/account/`:

```
AccountPage.tsx            props unchanged ({ user, onLogout, addToCart }); owns orders + wishlist data, picks the view
account/AccountShell.tsx   dark band, greeting, account-type badge, delivering-to, rail (lg) / scroll strip (<lg)
account/AccountNav.tsx     <Link aria-current="page">, wishlist count, Sign out
account/DashboardView.tsx  trade bar, LatestOrderCard, StatStrip, RecentOrders, QuickActions
account/OrdersView.tsx     status filters, table (lg) / list, empty state
account/OrderDetailView.tsx
account/AddressesView.tsx  (port of the existing logic, new layout)
account/DetailsView.tsx
account/WishlistView.tsx
account/OrderStatusTracker.tsx   stepper (delivery only) + badge
account/orderStatus.ts           status → label/tone map, stepper index, ACTIVE statuses
hooks/useCustomerOrders.ts       fetch + loading/error, sorted newest first
```

Shared formatting: `utils/price.ts` `formatCurrency`; **one** `formatDate` (`en-ZA`) in `utils/date.ts`.
Routing (`App.tsx`): add `/account/orders/:orderNumber` → `AccountPage`; `useParams` reads `tab` and `orderNumber`. Remove `selectedOrder` state. `/admin/account-preview` consumer keeps working (props unchanged).

## Phases

Each phase ships on its own, builds clean, and leaves the page working.

### Phase 0 — P0 fixes in the current page (small, safe, independent) — **DONE 2026-10-31**
Files: `AccountPage.tsx` only.
1. Delete the Account Balance card (L415–426); stat grid → 2 cards (or hold for Phase 2).
2. Recent-order rows become `<Link>`s (to `/account/orders` until Phase 3) — fixes the dead rows.
3. `user.username[0]` → safe initial (`first_name || username || email || "?"`).
4. `formatDate` → `en-ZA`; wishlist price → `formatCurrency` (drops `toFixed`).
5. Wishlist add-to-cart: look up the product by id in the catalogue; disable when out of stock; keep deal pricing (stop hard-coding `stock_status` / `sale_price`). Needs `allProducts` passed to `AccountPage` from `App.tsx` (additive prop).
6. Remove the disabled password fields and "coming soon"; add "Email me a reset link" → `sendPasswordResetEmail`.
7. Remove the Payment tab (`VALID_TABS`, menu, view); `/account/payment` redirects to `/account/dashboard`.
8. Associate every `<label>` with its input (`htmlFor`/`id`, `autocomplete`); `role="status"` on save/remove messages.
Acceptance: build passes; no hard-coded stock; all labels linked; Payment URL redirects.

### Phase 1 — Shell + nav + dashboard (Option A look) — **DONE 2026-10-31**
Files: new `account/AccountShell.tsx`, `AccountNav.tsx`, `DashboardView.tsx`, `OrderStatusTracker.tsx`, `orderStatus.ts`, `hooks/useCustomerOrders.ts`; edit `AccountPage.tsx`.
- Shell per the mock; nav items are `Link`s; mobile scroll strip; `<h1>` per view; focus the heading on route change.
- Dashboard: latest active order (stepper + Bob Go tracking block → existing `/track-order?order-number=`), stats strip (total / active / wishlist — **active = pending, processing, on-hold, partially-shipped, shipped**; today's count is processing + on-hold only), recent orders, quick actions, trade bar for `contractor`.
- States: skeletons while loading, empty (new customer), trade.
- Tokens only: `rounded-md`/`rounded-sm`, no shadows, one button/badge style (reuse the Phase 3–5 classes; extract `StatusBadge`).
Acceptance: matches the mock at 375/768/1024/1280; no horizontal scroll; targets ≥ 44px; `aria-current` on the active link.

### Phase 2 — Orders list + order detail route — **DONE 2026-10-31**
Files: `OrdersView.tsx`, `OrderDetailView.tsx`, `App.tsx` (route), `AccountPage.tsx`.
- Filters (All / Active / Completed / Cancelled) kept in the query string (`?status=`), back-button safe.
- Detail at `/account/orders/:orderNumber`: looked up in the loaded list (the endpoint returns every order, so a deep link works once it loads); "not found" otherwise. A per-order `GET /orders/:id` fetch is only needed if the list is paginated later. Items with per-line Add, totals, address, payment, tracking, **Reorder all**.
- Reorder = add each line by `product_id` via the catalogue (skip + report out-of-stock / removed lines).
Acceptance: deep link to an order works after reload; Back returns to the filtered list; reorder reports skipped lines.

### Phase 3 — Addresses, Details, Wishlist views — **DONE 2026-10-31**
Files: `AddressesView.tsx`, `DetailsView.tsx`, `WishlistView.tsx`.
- Port existing save/remove logic unchanged (the delivery-details route, confirm-remove, `saveStoredAddress`); restyle only.
- Default address still `localStorage` here; add a visible TODO tied to Phase 4.
- Wishlist uses `railCard`-style stock logic from Phase 0; remove announces via live region.
Acceptance: no behaviour change except the listed fixes; wishlist count in nav stays in sync (`belims:wishlist-updated`).

### Phase 4 — Server-side default address (plugin; approval-gated)
Files: `class-user-endpoint.php` (accept/return `default_address` = `billing|shipping`, user meta), bump plugin version (`global-site-settings.php`), CHANGELOG; frontend reads it, falls back to `localStorage` for guests/older sessions.
**Do not deploy to Cloudways without your approval** (list files, path, backup; `php -l`).
Acceptance: default survives a second browser; header "Delivering to" and the dashboard agree.

### Phase 5 — QA, docs, release
- Route regression: `/account`, `/account/:tab`, deep-linked order, `/admin/account-preview`, checkout → order confirmation → account.
- a11y: keyboard through nav and forms, heading order, contrast, reduced motion, live regions.
- Update `docs/FEATURES.md` (Account row), `docs/ROADMAP.md`, CHANGELOG; release to preview only; production on request.

## Out of scope / backlog
Invoice download · collect-order tracking and "ready to collect" (needs a collect fulfilment on orders first) · Buy again grid (Option C idea) · trade quotes / spend (needs finance API) · saved cards (PayFast is redirect-only).

## Risks
- `AccountPage` is also rendered by `AdminAccountPreview`; keep its props stable.
- Orders fetch is client-side and uncached; long histories will need pagination on `GET /orders` (not in mock).
- `tsc` can't run repo-wide until the two syntax-broken files are fixed (see CHANGELOG); verify new files with the scratch type-check approach or fix those first.

## Open questions
1. ~~Band colour~~ — **decided: `bg-belims-blue`** (2026-10-31).
2. Order history: paginate now, or accept the current full-list fetch?
3. Is Phase 4 (plugin change) wanted now, or leave default address on `localStorage`?
