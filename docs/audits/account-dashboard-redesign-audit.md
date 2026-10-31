# Account dashboard redesign audit

Date: 2026-10-31  
Scope: `/account/dashboard`, `components/AccountPage.tsx`, and directly supporting account services.

## Executive summary

The current dashboard has the right functional foundations—authenticated customer identity, WooCommerce order history, order detail, tracking links, addresses, profile editing, wishlist, and logout—but presents them as a generic collection of cards. Its strongest information, recent orders, is visually diluted by an unsupported Account Balance card and a broad desktop-only sidebar. The recommended direction is **Option C, Hybrid Trade & Retail**: an order-first workspace with compact account navigation, a focused identity header, and a secondary account-setup panel.

The application is a Vite React SPA, not a Next.js application. `AccountPage` is client-rendered and gets orders through the authenticated custom Belims/WooCommerce REST endpoint. No new account data is assumed in the mockups.

## Step 0: verified implementation

### Technology and design system

| Area | Verified implementation |
|---|---|
| Runtime / router | Vite 6.4.1, React 19.2, React Router DOM 7.1; SPA route, not Next.js App or Pages Router |
| Language | TypeScript ~5.8.2, `moduleResolution: bundler`, `noEmit` |
| Styling | Tailwind CSS 3.4.18, `tailwind.config.js`, global token layer in `index.css` |
| Icons / motion | `lucide-react`; `motion` is installed but AccountPage does not use it |
| Fonts | Archivo loaded from Google Fonts in `index.html`, system fallbacks in CSS tokens |
| Brand primitives | Blue `rgb(50,39,131)`, primary red `#c4301c`, white / muted neutral surfaces, 4px spacing grid, 2–6px industrial radii |
| Breakpoints | Tailwind defaults: sm 640, md 768, lg 1024, xl 1280, 2xl 1536; container max is 1380px at xl/2xl |

### Route and component map

`App.tsx` maps `/account` and `/account/:tab` to `AccountPage`, so `/account/dashboard` resolves to the dashboard tab. `AccountPage` is also rendered by the account-only `AdminAccountPreview` at `/admin/account-preview`.

```text
App shell (shared Header / Footer / global providers)
└─ AccountPage (account-only, except admin preview consumer)
   ├─ account navigation and logout
   ├─ dashboard: summary cards + recent orders
   ├─ order history → local selected-order detail
   ├─ addresses → delivery-details route
   ├─ account details → profile update API
   ├─ wishlist → shared wishlist local storage/service
   └─ payment methods placeholder
```

Shared dependencies are `App.tsx`, authentication and WooCommerce services, URL and price helpers, global tokens, Header/Footer shell, and the delivery-address route. No visual change to those shared components is proposed at this approval stage.

### Authoritative data and behaviour

`UserData` is session-backed with identity, role, billing/shipping address and basic profile fields. `fetchCustomerOrders()` performs an authenticated client-side GET to the custom `${BASE_URL}/orders` endpoint and supports order number, creation date, status, total/currency, line items, payment method, shipping line/address, and optional Bob Go tracking data. Details and addresses write through existing account services. A guest sees a login prompt; there is no route guard in `AccountPage` itself.

Supported status values are pending, processing, on-hold, partially-shipped, shipped, completed, cancelled, refunded, and failed. The implementation can link tracking only when actual `tracking` data exists. It does **not** currently support saved payment methods, password management, reordering, loyalty, recommendations, or a real balance.

### Baseline verification

| Check | Result |
|---|---|
| `npm run build` | Passed. Existing warning: duplicate `type="tel"` attribute in `components/AuthPage.tsx`; existing >500 kB chunk warning. |
| `npx tsc --noEmit` | Failed before redesign in `app/api/products/search/route.ts`, `backups/SingleProduct.tsx`, and `src/features/chatbot/lib/api.ts`; no account-page error reported. |
| Lint script | Not configured in `package.json`. |
| Local route | `http://localhost:3000/account/dashboard` returned HTTP 200 and the Vite SPA shell. |
| DOM / console visual inspection | Not completed in this CLI environment; no browser automation session is available. The audit is source- and route-response-backed; mockups are supplied for browser review. |

## Audit table

| Area | Component/File | Current behaviour | Issue | Severity | Proposed direction | Shared? |
|---|---|---|---|---|---|---|
| Unsupported balance | `AccountPage.tsx` dashboard | Always displays `R0.00` | Looks like customer financial data but is not sourced | P1 | Remove; use only reliable order/account signals | No |
| Dashboard hierarchy | `AccountPage.tsx` | Three summary cards precede recent orders | Order management is diluted; active orders omit shipped states | P1 | Make recent orders primary, show limited derived counts only | No |
| Order fetch failure | `AccountPage.tsx` | Logs error and renders empty orders | Customer cannot distinguish failure from no orders | P1 | Retain state but add an error/retry presentation | No |
| Account navigation | `AccountPage.tsx` | Sticky desktop sidebar, no compact mobile account nav pattern | Repeated sidebar consumes small-screen space and lacks current-context economy | P1 | Persistent desktop rail; horizontal/expandable mobile nav | No |
| Payment methods | `AccountPage.tsx` | Empty-state suggests adding a card, but no flow exists | Implies unsupported functionality | P1 | Use honest “available at checkout” wording or defer tab | No |
| Status semantics | `AccountPage.tsx` | Status colours and uppercase pills | Some status contrast/meaning depends on colour; `refunded` falls to generic | P2 | Tokenise every supported status and retain text labels | No |
| Mobile order list | `AccountPage.tsx` | Flex list changes at sm | Information can become fragmented; no visible action label | P2 | Use labelled mobile cards and an explicit View order action | No |
| Address context | `AccountPage.tsx` | Address cards only on Addresses tab | Dashboard offers no delivery-readiness signal | P2 | Summarise default delivery address with existing data | No |
| Identity privacy | `AccountPage.tsx` | Email appears in persistent sidebar | Full address/email are unnecessarily prominent during routine order work | P2 | Use name/role header; move email to account details | No |
| Focus / semantics | `AccountPage.tsx` | Native buttons/links, no explicit focus utilities in page | Keyboard focus relies on browser/Tailwind defaults; order row affordance is subtle | P2 | Specify visible 3px focus ring and labelled action controls | No |

## Current interface inventory

| Visual order | Purpose / source | Interactions and states | Responsive / accessibility observation |
|---|---|---|---|
| Account sidebar | User identity + tab routing from `user` | Tabs, wishlist count, logout | Stacks above content below `lg`; current state is text + colour |
| Page heading | Active tab label + static help text | None | Heading hierarchy is present but generic |
| Dashboard metrics | `orders.length`, processing/on-hold count, fixed zero balance | Loading dash | The balance must not remain |
| Recent orders | Authenticated order response | View all, tracking if supplied, selected order detail | Empty and loading states exist; fetch error becomes false empty |
| Orders/detail | Full order data / tracking | Selected local detail, tracking external/internal links | Mobile list is readable but lacks a dedicated compact card composition |
| Addresses | `user.billing`, `user.shipping` | Add/edit/remove/set delivery default | Existing confirmation/feedback preserved in future implementation |
| Details | `UserData` and update API | Save profile, API status | Existing fields remain authoritative |
| Wishlist | local wishlist service | Browse, remove, add-to-cart | Account scope but product data is locally persisted |
| Payment | Placeholder only | Non-functional “Add New Card” | Must not be presented as available |

## Recommended information architecture

1. Account identity and current account destination.
2. Recent orders, including truthful order status and a clear detail action.
3. Delivery address readiness and account shortcuts using existing destinations.
4. Full order history, addresses, details, wishlist, then the honest payment placeholder.

Desktop should use a persistent compact navigation rail. Mobile should use a horizontally scrollable, labelled tab strip or an expandable account menu; Option C demonstrates the former because it preserves context without inserting a large sidebar above the dashboard.

## Shared-component safeguards

Remain unchanged: Header, Footer, global button primitives, product cards, checkout, WooCommerce API contracts, authentication/session logic, and delivery-details functionality.

Potential controlled variants after approval: none are required. The redesign can be scoped entirely to `AccountPage.tsx` with existing global tokens.

## SUGGESTION

- **SUGGESTION: Add a retriable order-load error state.** It prevents a network/API failure from looking like an empty history. Trade-off: needs a small additional state and retry handler, but no API contract change.
- **SUGGESTION: Replace the Payment Methods action with an informational state until a real saved-card integration exists.** It avoids a dead-end. Trade-off: the account area will expose fewer apparent actions.
- **SUGGESTION: Consider a future server-backed “reorder” capability.** Repeat trade customers would benefit, but it requires deliberate stock, price, and cart rules; it is not part of this redesign.

## QUESTION

- **QUESTION: Should the mobile account navigation be a horizontal tab strip (recommended), a compact menu button, or a drawer?** The tab strip gives one-tap access to the six existing destinations; a drawer is more compact but adds a step.
- **QUESTION: Should payment methods remain visible as an honest “not available yet” page (recommended) or be hidden until supported?** Keeping it visible documents current checkout behaviour; hiding it reduces dead-end navigation.
- **QUESTION: Should a default delivery address be summarised on the dashboard (recommended) or only remain in Addresses?** The summary speeds delivery-oriented shopping while keeping address editing in its existing route.
