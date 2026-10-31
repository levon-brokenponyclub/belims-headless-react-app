# Account dashboard audit

Scope: `/account/dashboard` — `frontend/components/AccountPage.tsx` (1,197 lines). Earlier source-level audit: [../../audits/account-dashboard-redesign-audit.md](../../audits/account-dashboard-redesign-audit.md). Line numbers below are from the current working tree.

## Step 0 — verified stack

| Item | Finding |
|---|---|
| Runtime / router | **Vite 6 + React 19 SPA** (not Next.js). `react-router-dom` 7; `/account/:tab` → `AccountPage` (`useParams`, line 50). |
| Tailwind | **v3.4.18** in the app (`tailwind.config.js` + `index.css` tokens). The mockups use Tailwind v4 via CDN only because the brief asks for it; classes used are v3-compatible. |
| Tokens | `belims-blue` = `rgb(50,39,131)` (`--color-belims-blue`), `primary` red `#c4301c`, `font-heading`, 2–6px radii, `text-eyebrow` etc. Account-specific proposal: `docs/design/belims-account-design-tokens.md`. `belims-light` is an alias of `belims-blue` and `belims-accent` of `primary`. |
| Design state | `DESIGN_MIGRATION_STATE.md` does not exist. Approved redesign = ROADMAP "Design port" + `docs/design/belims-design-tokens.md` (Industrial + brand: blue bands, red CTAs, condensed uppercase headings, square corners, no shadows). Mockups follow it. |
| Price format | `formatNumberWithSeparators` → `Intl.NumberFormat("en-US")`, `R` prefix → `R2,690.00`. Mockups use this (see QUESTION 1). |
| Test account | None available to me; no credentials were entered anywhere. `data.json` is a **hand-built fixture** shaped from `AccountPage.tsx` + `fetchCustomerOrders()` (order, `line_items`, `shipping_lines`, `tracking[{courier,tracking_number,tracking_url}]`, `roles`), all anonymised. Product names/prices mirror the real catalogue; people, emails, phones, addresses are invented. |

## Findings

| Area | Issue | Sev | Evidence | Proposed direction |
|---|---|---|---|---|
| Data honesty | "Account Balance" card is hard-coded `R0` — a fake metric on a shipping store with no store-credit feature | **P0** | L415–426 (`formatNumberWithSeparators(0)`) | Remove. Replace with real data: orders, active orders, wishlist count (all options) |
| Data honesty | Payment tab: "Add New Card" has no handler; "No Saved Cards" is static | **P0** | L1175–1187 | PayFast is redirect-only, so there are no saved cards. Replace with an honest note ("Pay securely with PayFast at checkout") or drop the tab |
| Data honesty | Password fields disabled with "coming soon" — dead UI in production | P1 | L1058 | Remove, or link to the WP lost-password flow |
| Interaction | Dashboard "Recent Orders" rows look clickable (`cursor-pointer`, hover) but have no handler | **P0** | L450 | Each row → order detail link |
| Routing | Order detail is `useState<Order>` — no `/account/orders/:id`; "View All" goes to the list, detail can't be deep-linked or back-buttoned | **P0** | L65, L433 | Add `/account/orders/:orderNumber` route |
| Data | Wishlist add-to-cart hard-codes `stock_status: "instock"` and `sale_price: null` → out-of-stock items can be added and deal pricing is lost | **P0** | L354–359 | Resolve product by id from the catalogue before adding; disable when out of stock |
| Data | Wishlist prices `toFixed(2)` (no separators) vs orders `formatNumberWithSeparators` | P2 | L341 vs L470 | One `formatCurrency` |
| Data | `formatDate` uses `en-US` (e.g. "Oct 29, 2026") for a ZA store | P1 | L270–276 | `en-ZA` ("29 Oct 2026") |
| Robustness | `user.username[0]` throws if `username` is missing (also when `first_name` empty) | **P0** | L1086 | `(first_name \|\| username \|\| email \|\| "?")[0]` |
| Data | Default address lives only in `localStorage` (`belims_default_address_key`) — does not follow the user across devices | P1 | L67, L180 | Persist in user meta via `PUT /users/me` |
| Content | Wishlist tab has no header subtitle (all other tabs do) | P2 | L1153–1168 | Add one |
| Visual | Mixed radii: `rounded`, `rounded-lg`, `rounded-xl`, `rounded-full` | P1 | L316, L393, L525, L478 | One scale (2/4/6px per tokens); pills only for status |
| Visual | Shadow usage varies (`shadow-sm`, `shadow-md`, none); brand rule is no shadows | P1 | L393, L1110 | Remove |
| Visual | Three button styles: pill (L304, L366), square-ish (L1067), text links (L818) | P1 | as listed | One system: primary / outlined / text |
| Visual | Stat cards are generic (icon + number); weak hierarchy; the page doesn't answer "where's my order?" or "buy that again" | P1 | L392–427 | Lead with the latest order + tracker, then reorder |
| Mobile | Whole sidebar (avatar block + 7 items) stacks above content → dashboard is below the fold at 375px | **P0** (UX) | L1082–1146 | Tabs / bottom bar on mobile |
| Visual | Status colours ad hoc (`getStatusColor`); no stepper or timeline | P1 | L240–262 | Token status system + stepper |
| Trade | Contractor is a 10px badge only; no trade value | P1 | L1095–1099 | Trade panel (pricing note, trade deals link) |
| Visual | `bg-[#f9f9f9]` arbitrary value; large `py-20` | P2 | L1078 | `bg-surface-muted` token |
| A11y | Form `<label>`s have no `htmlFor`/`id` | **P0** (a11y) | L945–1046 | Associate, plus `autocomplete` |
| A11y | Nav items are `<button>`s: no middle-click / new tab, no `aria-current` | P1 | L1107 | `<Link aria-current="page">` |
| A11y | `text-gray-400` metadata (contrast ≈ 2.8:1), 10px text | P1 | L331, L1095 | `text-text-tertiary` ≥ 4.5:1, ≥ 12px |
| A11y | Save/remove messages not in a live region; no `focus-visible` styles; no `prefers-reduced-motion` guard on `active:scale-95` | P1 | L748, L934, L1110 | `role="status"`; focus ring; reduced-motion |
| A11y | Heading order: H1 = tab name, then H3s with no H2 | P2 | L1152, L429 | H2 per section |

Severity: P0 = wrong/dead behaviour or crash shipped to customers; P1 = clear UX/consistency/a11y gap; P2 = polish.

## SUGGESTION / QUESTION (batched)

**SUGGESTION 1 — "Buy again" from real order lines.** Hardware buyers re-purchase consumables (gloves, discs, bits). Trade-off: needs stock/price lookup per product id; items no longer sold must be hidden.
**SUGGESTION 2 — Bob Go tracking on the latest-order card**, with the stepper derived from `status` + `tracking[0].status`. Trade-off: shipped→delivered depends on the courier webhook; fall back to order status only.
**SUGGESTION 3 — Collect orders get their own tracker** (Placed → Ready to collect → Collected) with the store hours. Trade-off: needs a "ready for collection" status or order meta, which does not exist yet.
**SUGGESTION 4 — Reorder an entire order** ("Add all N items") with out-of-stock lines flagged. Trade-off: partial adds need clear feedback.
**SUGGESTION 5 — Move Wishlist to a dashboard preview** (3 items + add-to-cart) rather than a hidden tab. Trade-off: duplicates the tab; keep the tab as "see all".
**SUGGESTION 6 — Trade panel without invented numbers**: show trade-pricing status and a link to trade deals. Spend/credit/statement need a finance API; don't ship placeholders.
**SUGGESTION 7 — Persist the default address server-side** and show a "Delivering to" chip identical to the header pill.

**QUESTION 1 — Price format.** Options: (a) keep the store's `R2,690.00` *(recommended — matches header/product/cart)*; (b) en-ZA `R 2 690,00`; (c) mixed. Dates are `en-ZA` regardless.
**QUESTION 2 — Payment tab.** Options: (a) remove it and mention PayFast on Details *(recommended)*; (b) keep as an honest informational page; (c) build saved cards (PayFast tokenisation — significant).
**QUESTION 3 — Account Balance.** Options: (a) delete *(recommended)*; (b) replace with "Total spent" (real, summed from orders); (c) keep for a future store-credit feature.
**QUESTION 4 — Order detail routing.** (a) `/account/orders/:orderNumber` *(recommended)*; (b) keep it in-page state with `?order=`.
**QUESTION 5 — Test account.** Can you supply a staging test customer so the fixture can be replaced with a real anonymised capture?

## Decisions (2026-10-31)

- **Selected: Option A** (Industrial command centre), extended to Orders (+ order detail), Addresses, Details and Wishlist — see `option-a-command-centre.html` (hash routes `#dashboard #orders #order-<n> #addresses #details #wishlist`).
- Q1 Price format: **keep `R2,690.00`**.
- Q2 Payment tab: **removed** (PayFast is redirect-only; no saved cards).
- Q3 Account Balance: **deleted**.
- Q5 Extend to other tabs: **done** in Option A. Q4 (test account) still open — fixture is hand-built.
- Added by the extension (all flagged as new in the mock): order detail route, invoice download, reset-password email link replacing the disabled password fields, server-side default address, stock-aware wishlist add.
