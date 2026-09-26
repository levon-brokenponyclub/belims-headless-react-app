# Changelog

## 2026-09-26 — Auth page redesign + ProductCard category hidden

### 1. Auth page — social buttons repositioned
- Google and Facebook buttons moved above form fields for both sign-in and registration.
- Layout changed to 2-column inline grid on `sm+` breakpoint (`grid-cols-2`), stacks on mobile.
- "Or continue with" divider repositioned below the buttons.

### 2. Auth page — Login flow restructured
- Sign-in page now loads directly on email + password (removed the single identifier step).
- "Log In with a One-Time Code" button added above the Sign In button (only rendered when Firebase is configured), separated by an `or` divider. Clicking it switches to the phone OTP flow.
- "Don't have an account? Create one." moved from the header subtitle to below the Sign In button.
- "Forgot your password?" link added inline with the Password label (right-aligned), matching checkout form pattern.
- Back links in the OTP flow now return to the password step (not the legacy identifier step).

### 3. Auth page — Forgot password
- `authService.ts`: added `requestPasswordReset(email)` calling `POST /belims/v1/users/forgot-password`.
- New `forgot-password` login step: email input → "Send reset link" → success message replaces button → "← Back to sign in".
- Email pre-filled from whatever was typed in the password step before clicking the forgot link.

### 4. Auth page — Registration 2-step flow
- Registration refactored from a single form to a 2-step flow with a progress bar.
- **Step 1**: Email + Password → "Create Account" button → "Already have an account? Log in here." below.
- **Step 2 (Personal Details)**: First Name (required), Last Name (required), Mobile Number (required) with international dial-code selector (flag + country code `<select>` + numeric input, reusing `DIAL_CODES`). Back button returns to Step 1; "Register" submits.
- Phone stored in E.164 format (`buildRegPhone()` strips leading zero and prepends dial code).
- "Already have an account?" removed from header subtitle; lives below the Step 1 button only.
- Registration API call (`registerUser`) happens on Step 2 submission; errors reset to Step 1.

### 5. Auth page — Checkout-style layout
- Dark left sidebar removed entirely.
- Page wrapper: `min-h-screen flex flex-col bg-neutral-50`.
- Checkout-style `<header>`: Belims logo (linked to `/`) on the left, `<Lock />` + "Secure checkout" on the right — exact markup from `Checkout.tsx`.
- Form card: `rounded-lg border border-neutral-200 bg-white p-6 md:p-8` — matches checkout card.
- All inputs: `h-12 rounded-md border-neutral-200 focus:border-neutral-950 focus:ring-2 focus:ring-neutral-950/10` — checkout `inputClass`.
- All labels: `text-[14px] font-medium text-neutral-950` — checkout `labelClass`.
- Primary buttons: `h-12 rounded-md bg-belims-blue hover:bg-neutral-800` with full focus ring — checkout `primaryButtonClass`.
- Outlined buttons (Back, OTC): `h-12 rounded-md border-neutral-200 bg-white hover:bg-neutral-50`.
- Error/success messages: `rounded-md border-red-200 bg-red-50` / `border-green-200 bg-green-50`.
- Field spacing: `space-y-1.5` per field, `space-y-5` between fields.
- Class constants (`inputClass`, `labelClass`, `primaryButtonClass`, `outlineButtonClass`, `errorClass`, `successClass`, `orDivider`) declared at module level.

### 6. App.tsx — header/footer hidden on auth routes
- `isCheckoutRoute` extended to `["/checkout", "/login", "/register"].includes(pathname)`.
- Suppresses the main `<Header>`, `<Footer>`, `<CartDrawer>`, `<SearchModal>`, `<CompareModal>`, and all other overlays on login and register pages — same behaviour as the checkout page.

### 7. ProductCard — category label hidden
- Removed the `{/* Category / Deal Name */}` block from `ProductCard.tsx`.
- Category, deal name, and custom `categoryText` no longer render on any card variant.

---

## 2026-09-25 — Delivery Details popover + Add Address page

### 1. Delivery Details popover
- New `frontend/components/DeliveryDetailsPopover.tsx` — nudge popover anchored under the header "Delivering to" pill, with two variants: `popover` (desktop, caret pointing up at the pill) and `sheet` (mobile, fixed bottom, dark backdrop, drag handle, close X).
- Copy: "To view **product availability** and **local pricing** for your area, please add your delivery details before you start shopping."
- Buttons: "Do this later" (outline pill) + "Add delivery details" (belims-blue primary pill, underlined).
- Footer link: "Log in to see your saved addresses" → `/login`.
- Escape key and click-outside dismissal.

### 2. Header wiring
- Auto-opens once per session when `!hasDeliveryAddress` and `localStorage.belims_delivery_popover_dismissed !== "1"`, with a 400 ms delay.
- Variant chosen by viewport width: `< 768px` → sheet; `≥ 768px` → popover.
- "Do this later" persists the dismissed flag; primary CTA closes the popover and navigates to `/delivery-details/add-address`.
- Auto-closes when `belims:delivery-address-updated` fires from any surface (checkout, account, single product, add-address page) and a stored address is now present.
- Three delivery triggers switched from `openDeliveryLocationPanel("delivery")` to `openDeliveryPopover`: topbar "Deliver to:" (line 630), desktop address pill (line 663), mobile delivery bar (line 983). Pickup triggers still open `DeliveryLocationModal`.

### 3. `/delivery-details/add-address` page
- New `frontend/components/DeliveryDetailsAddAddress.tsx` mirroring pnp.co.za's layout.
- Two-column grid on `lg+` (form left, OpenStreetMap iframe pinned to selected coords right); stacks on mobile.
- Guest sees "Sign in to see your saved addresses" link; hidden when `getCurrentUser()` resolves.
- Street search: Nominatim autocomplete, 300 ms debounce, min 3 chars, ZA country restriction, dropdown with main / secondary text.
- "Use my current location" — `navigator.geolocation` → Nominatim reverse geocode → `mapNominatimAddress`; falls back to error message on permission denial.
- Optional Complex/Building and Address name fields. Complex/unit is prepended to the street when saved.
- Cancel returns via `navigate(-1)`. Save writes to `deliveryAddressV2` via `saveStoredAddress`, sets `fulfillmentType=delivery`, dispatches `belims:delivery-address-updated` + `belims:fulfillment-changed`, marks popover dismissed, navigates to `/`.
- Route registered in `App.tsx` after `/wishlist`.

### 4. Header account chip — guest routes to `/login`
- Desktop "Sign In · Sign Up" chip in `Header.tsx:832–853` now branches on `currentUser`: guests navigate to `/login`, logged-in users open the account side panel as before.
- No new imports; reuses the existing `useNavigate` hook.

### 5. Checkout — save shipping address on guest account creation
- `Checkout.tsx:978–992` — the `pendingAccountCreation` blob written when a guest ticks "Create an account for faster checkout next time" now includes the customer's `street / city / province / postalCode` under `shippingAddress`.
- `OrderConfirmation.tsx:7,181–194` — after `registerUser()` succeeds and the JWT is set, `saveBillingAddress(address)` and `saveShippingAddress(address)` run via `Promise.allSettled` so an address save failure never blocks the "Account created" success message. Same address written to both billing and shipping meta.

### 6. Delivery popover — saved-address picker + full-address pill
- `DeliveryDetailsPopover.tsx` accepts optional `isLoggedIn`, `savedAddresses`, `onSelectSavedAddress`. When the logged-in user has saved profile addresses the popover renders a list of cards (source chip + street) above the primary CTA; the CTA relabels to "Add new address" and the "Log in…" link is hidden.
- `Header.tsx` derives `savedAddressOptions` from `currentUser.billing` + `currentUser.shipping` (deduped by `line1|city|postcode`), passes it to both popover mounts, and exposes `handleSelectSavedAddress` which converts the WC record into a `ShippingAddress` and runs it through the existing `handleAddressSelect` flow.
- Pill display (`Header.tsx:679`, `753`, `1073`) swapped from postal-code only to `pillAddressLine` — a memoised `"street, city"` string with truncation, falling back to postal code / label.

### 7. Checkout — Personal Details skeleton loader
- `Checkout.tsx` — imports `getAuthToken`; `isInitializingCheckout` is seeded synchronously from `getAuthToken() !== null` so guests never see the skeleton.
- Personal Details field grid (email, first/last name, phone) is replaced with animated grey skeleton bars while `initializeFromSavedLocation()` is in flight; flag flips false in `.finally()`.
- "Create an account for faster checkout next time" checkbox and its expanded fields are also gated on `!isInitializingCheckout` so they don't flash briefly for logged-in users before the auth check resolves.

### 8. Register form field order
- `AuthPage.tsx:498–522` — swapped Password and Phone. Register form now reads: First name → Last name → Email → Phone → Password.

### 9. `/delivery-details/add-address` — rewrite to Woolworths two-step flow
- Full rewrite of `DeliveryDetailsAddAddress.tsx`. Dropped the two-column form + OSM iframe + Complex/Building + Address-name fields.
- New two-step layout with pagination dots and close ×:
  - **Step 1 — Confirm your address:** centered heading + copy, single search input with magnifier icon (swaps to a circular clear × once an address is selected), Nominatim autocomplete dropdown, saved-address cards for logged-in users (source chip + street) or "To see your saved addresses **Sign In**" hint for guests, `CONFIRM ADDRESS` button bottom-right (disabled until an address is picked).
  - **Step 2 — Confirm Your Option:** back ← arrow, selected street with an **Edit** link, two large tiles — **Delivery** (default, `Truck` icon, "Delivered to your door") and **Click & Collect** (`ShoppingBag` icon, "Collect from a nearby store"). C&C reveals a store dropdown fed by the existing `/ecommerce-policies` `store_locations` endpoint. `CONFIRM DELIVERY` / `CONFIRM COLLECTION` bottom-right.
- Delivery save: `saveStoredAddress`, `fulfillmentType=delivery`, dispatches `belims:delivery-address-updated` + `belims:fulfillment-changed`, marks popover dismissed, navigates to `/`.
- Collection save: same address save + writes `selectedPickupStore`, `pickupStoreSelected=true`, `fulfillmentType=pickup`, dispatches `belims:pickup-store-updated`.

### 10. Account → add/edit address routes through `/delivery-details/add-address`
- `AccountPage.tsx` — removed the `DeliveryLocationModal` mount and the `isDeliveryModalOpen` / `editingAddressType` / `handleAddressSelect` scaffolding that only served the address side panel.
- `handleAddNewAddress(type, mode="add")` now navigates to `/delivery-details/add-address?context=account&type={billing|shipping}&mode={add|edit}`. The two Edit call sites pass `"edit"`.
- `DeliveryDetailsAddAddress.tsx` reads `context`, `type`, `mode` from `useSearchParams`. In `context=account` mode the page shows a single-step layout (no stepper dots, no back arrow, no Delivery/Click&Collect tiles), the heading and subtitle reflect add vs edit, and the primary CTA becomes **Save address**. In edit mode the selected address is prefilled from the requested billing or shipping profile on mount.
- Save calls `saveBillingAddress` or `saveShippingAddress`, dispatches `user-updated`, and returns to `/account/addresses`. Close × also returns to `/account/addresses`. The default two-step flow (no `context` param) is unchanged.

### 11. Nominatim autocomplete — street numbers + admin cruft stripped
- `DeliveryDetailsAddAddress.tsx` — new `extractLeadingNumber()` pulls the leading digits (+ optional letter) from the user's query; new `formatSuggestionLabel()` builds `{house_number || leading} {road}, {suburb}, {city}, {country}` from Nominatim's structured `address` fields instead of the raw `display_name`.
- Ward / Metropolitan / Local / District Municipality tokens are stripped from the suburb slot; the leading number is only prepended when a `road` field exists (fixes orphan "5, uMhlathuze Local Municipality" results).
- `handleSelectSuggestion` also prepends the number to the mapped `street` and rebuilds `label`, so the persisted address carries the house number, not just the display label.
- Result: `"5 durnford"` returns readable `"5 Durnford Road, Durban, South Africa"` instead of the previous `"Durnford Road, eThekwini Ward 28, Durban, eThekwini Metropolitan Municipality, KwaZulu-Natal, 4023, South Africa"`.

### 12. Add-address flow — manual fields + chip-row saved addresses
- `DeliveryDetailsAddAddress.tsx` — added Checkout-style manual editing on the add-address page: Street address (with `MapPin` icon), City, Province `<select>` populated from the `PROVINCES` constant, Postal code (`inputMode="numeric"`).
- New `patchAddress(patch)` helper merges partial field updates into `selectedAddress` (initialising defaults when null) and rebuilds `label`. Suggestion picks, chip picks, and manual typing all funnel through the same state, so the persisted address matches what the user sees.
- `canConfirm` memo requires street + city + province before enabling Confirm/Save — prevents half-filled saves.
- Saved-addresses list replaced with a horizontal chip row (`Billing · Hillcrest`, `Shipping · Durban North`, …). Active chip fills belims-blue, others outline. Wraps on narrow screens with a separator line below.
- Applies to both the default two-step flow and the `?context=account` single-step flow.

### 13. ProductCard hover + QuickView — Add-to-cart adds silently, Buy Now → /checkout
- `ProductCard.tsx` — the hover "Add to cart" button no longer defaults to opening QuickView. Default `onClick` now calls `addWithPriceMode(isTradeSpecial ? "trade" : "retail")` directly; the `quickViewButtonAction?.onClick` escape hatch is preserved for consumers that need a custom action. Dropped `aria-controls`/`aria-haspopup="dialog"` since the button no longer opens a dialog.
- `handleQuickViewAddToCart` now closes QuickView after adding so the user isn't stranded in the modal. `handleQuickViewBuyNow` no longer double-adds (removed the extra `onBuyNow?.(product)` call that was firing on top of the qty loop) — adds the requested quantity, closes QuickView, then navigates to `/checkout`, mirroring the SingleProduct Buy Now behaviour.
- `QuickView.tsx` — modal now portalled to `document.body` via `ReactDOM.createPortal`. Fix root: QuickView was rendered as a sibling of ProductCard's outer div, so clicks inside it bubbled up through ancestor `<Link>` wrappers that some parent grids apply, routing Add-to-cart and Buy-Now to the single product URL. Belt-and-braces: added `stopPropagation` on the outer wrapper and on both action click handlers.

### 14. SingleProduct — Perfect Match With bundle grid + delivery tile routing + rates sidepanel
- `SingleProduct.tsx` — inserted a new section after `FulfillmentBlock` titled **Perfect Match With**. Only renders when `product.bundleCandidates.length > 0`. 3-column grid of the first three items: rounded gray image tile (click routes to product page), product name (2-line clamp), price (sale in red + strikethrough `regular_price` when discounted), full-width black pill button (**Add** silently for in-stock, **View** navigates to product page for out-of-stock). The existing cross-sell "Perfect Match With" slider now returns null when bundle candidates exist so only one section with that heading renders; it remains as fallback when there are no candidates.
- `FulfillmentTiles.tsx` + `FulfillmentBlock.tsx` — new optional `onAddDeliveryAddress` prop threaded from `SingleProduct.tsx` as `navigate("/delivery-details/add-address")`. The no-address delivery tile now navigates there directly instead of opening `DeliveryLocationModal`.
- Delivery-set delivery tile no longer expands rates inline (`deliveryExpanded` state removed). Clicking the tile opens a portalled sidepanel: **right-slide drawer on desktop (md+), bottom sheet on mobile** — same responsive pattern as `DeliveryDetailsPopover`. `ReactDOM.createPortal` to `document.body` at `z-[9999]` puts it above the sticky Header (`z-[1200]`) and immune to transformed ancestors. Styling matches the account side panel: red brand header (Truck icon + "Delivery options" + address subtitle + close ×), soft body with the existing radio-select rate list, white footer with a Change-address underline link and a full-width red accent "Done" pill. Header rounds top corners on mobile only. Escape / backdrop / Done all dismiss.

## 2026-09-24 — Account, Checkout, Routing, and UX session

### 1. AccountPage typography audit
- Audited `AccountPage.tsx` against the Nexvo design system (`tailwind.config.js` + `index.css`).
- Replaced all `font-extrabold` (weight 800, outside design system) with `font-bold` (700).
- Replaced bare `text-3xl`, `text-xl`, `text-2xl` (Tailwind defaults) with design-system tokens: `text-h4`, `text-h6`, `text-lg`.
- Fixed h3/h4 stat card labels and address card headings that had no explicit size class, causing them to inherit Nexvo base CSS heading sizes (2.8rem / 2.2rem). Applied `text-sm font-semibold uppercase tracking-wider` to stat labels and `text-base font-bold` to address card headings.
- Matched section heading weights to `SingleProduct.tsx` reference: `text-lg` sections use `font-semibold` (not bold).
- Replaced all `text-[10px]` and `text-[11px]` arbitrary values with `text-xs` design-system token.

### 2. Address management — Remove and Name
- **Remove addresses**: Added inline confirmation flow (no browser `confirm()`) with Edit / Remove buttons on each address card.
  - Saved Delivery: clears localStorage via `saveStoredAddress(null)`.
  - Billing / Shipping: new `clearBillingAddress()` and `clearShippingAddress()` functions in `authService.ts` that send empty fields to the WordPress `PUT /users/me` endpoint independently.
- **Address naming**: Added `pendingAddress` + `pendingAddressName` state to `DeliveryLocationModal.tsx`. Both search suggestion clicks and GPS detection now route through a "Confirm address" name step before final save. The custom name is stored as the address `label` in localStorage.
- Saved Delivery card title now shows the custom label if one was set.

### 3. Account sidebar routing
- Replaced query-param tab switching (`?tab=`) with path-based routing.
- `App.tsx`: added `/account/:tab` route alongside `/account`.
- `AccountPage.tsx`: swapped `useSearchParams` for `useNavigate` + `useParams`. `activeTab` derived directly from URL (validated against `VALID_TABS`, defaults to `"dashboard"`). Nav buttons now call `navigate("/account/{tab}")`.
- Supported paths: `/account`, `/account/dashboard`, `/account/orders`, `/account/addresses`, `/account/payment`, `/account/details`.

### 4. Header account side panel overhaul
- Replaced "Account" + Dashboard and "Extra Links" sections (Track Order, Cards & Accounts, Pay Credit Card Bill, Discount Benefits) with the five account sidebar items: Dashboard, Orders, Addresses, Payment Methods, Account Details — all pointing to `/account/{tab}` paths.
- Contractor/Trade block condition changed from `!currentUser || !roles.includes("contractor")` to `!currentUser` — block now only shows to guests.
- Updated copy: "Are you a Contractor?" → "Let's get started"; "Register for Trade Deals" → "Let's get started".
- Added "Sign in or create a profile now for access to the widest range of products all in one place, saving you time and money." above Sign In / Create Account buttons in the non-authenticated footer.

### 5. Product URL routing — full category path
- Created `utils/product.ts` with `slugify()`, `buildProductUrl()`, and `extractProductIdFromSlug()`.
- `buildProductUrl()` generates `/product/[cat1]/[cat2]/[cat3]/[product-slug]-[id]` from breadcrumbs + product slug + ID.
- Route changed from `/product/:id` to `/product/*` in `App.tsx`; `ProductPage` extracts ID from the last segment suffix, supporting both new and legacy `/product/2446` URLs.
- Updated all 9 navigation call sites: `App.tsx`, `SingleProduct.tsx`, `ProductCard.tsx`, `NexvoProductCard.tsx`, `QuickView.tsx`, `Header.tsx`, `DealsSection.tsx`, `SearchModal.tsx`, `ShopByCategory.tsx`.

### 6. Buy Now → direct checkout
- `SingleProduct.tsx`: `handleBuyNowAction` now calls `navigate("/checkout")` instead of `onBuyNow(product)`, eliminating a double-add bug (cart was being populated twice) and skipping the cart drawer entirely.
- Applies to both the main buy-box button and the sticky bottom CTA bar.

### 7. Checkout — guest login panel
- Added inline Sign In form to the checkout Personal Details step for unauthenticated users.
- Hidden by default; shown by clicking "Sign In" button right-aligned on the Delivery/Pickup toggle row.
- On successful login: auto-fills first name, last name, email, phone, and billing/shipping address; closes the panel.
- Fixed nested `<form>` DOM error: the login form and the delivery toggle are now siblings rendered before the main checkout form, not inside it.
- "Create an account for faster checkout next time" checkbox hidden when user is already logged in.

### 8. Checkout — Use current location
- Added "Use current location" link beside the Street address label on the Shipping Address step, visible only when address fields are empty.
- Uses `navigator.geolocation` → Nominatim reverse geocode → `mapNominatimAddress` / `normalizeProvince` to fill `address`, `city`, `province`, `postalCode`.
- Shows inline error on permission denial or geocoding failure.

### 9. Scroll and navigation fixes
- **Scroll-to-top on route change**: Added `ScrollToTop` component in `App.tsx` using `useLayoutEffect` on `pathname` + `hash`. Fires before paint; hash links scroll to anchor, all other navigations reset to top instantly.
- **Product page scroll anchor bug**: `FulfillmentTiles.tsx` was calling `deliveryPanelRef.current?.focus()` on mount when `selectedType === "delivery"`, causing the browser to scroll the panel into view. Fixed with `{ preventScroll: true }`.

## 2026-09-10 — Coming Soon page and environment gating

### 1. Coming Soon splash page
- Added `frontend/components/ComingSoon.tsx` with logo, contact CTAs, and copyright.
- Replaced initial "B" icon with `/images/belims-logo-white.png`.
- Removed `<h1>` heading from Coming Soon page.
- Reduced logo height from `h-20` to `h-12`.

### 2. Environment-gated production splash
- Root route now shows `ComingSoon` only when `VITE_COMING_SOON=true`.
- Preview deployments show the full site; production shows the splash.

### 3. App shell isolation
- Hidden on Coming Soon: `Header`, `Footer`, `CartDrawer`, `SearchModal`, `StoreLocator`, `ComparisonModal`, `PriceMatchModal`, `OnboardingWizard`, `PaintAssistant`, `CookieConsent`, and `MobileBottomNav`.

## 2026-09-09 — Frontend hardening, filter UX, and archive restructure

### 1. Inventory / pricing guards
- **Block backorder and zero-price products from purchase flows**
  - Added `isProductPurchasable`, `isValidPrice`, and `getEffectivePrice` helpers in `frontend/utils/price.ts`.
  - Guarded `addToCart` in `frontend/App.tsx` so backorder and invalid/zero-price products cannot be added to cart.
  - Updated `SingleProduct.tsx` Add to Cart / Buy Now buttons and click handlers to disable when the product is not purchasable.
  - Updated `ProductCard.tsx` `addWithPriceMode`, `handleQuickViewAddToCart`, and `handleQuickViewBuyNow` to use the same guard.
  - Filtered unpurchasable products out of `DealsSection.tsx` tab products and `hasAnyDeals`, and `TradeDeals.tsx` hand tools grid.
  - `BundlePanel.tsx` now filters out zero-price bundle candidates and adds selected valid items individually instead of showing an alert.

- **Hide out-of-stock products from shop and listings**
  - Filtered `fetchProducts()` and `fetchFeaturedProducts()` results in `frontend/App.tsx` via `isProductPurchasable`.
  - Filtered category-scoped and search-scoped products in `frontend/components/Archive.tsx` via `isProductPurchasable`.
  - This ensures `/shop`, category pages, search results, and featured grids exclude backorder / zero-price / out-of-stock items.

### 2. Archive sidebar and mobile filter panel
- **Removed Back Order Availability filter**
  - Removed `filterBackOrder` state and UI from desktop sidebar and mobile filter panel.
  - Removed backorder logic from `filteredProducts` computation and availability counts.

- **Fixed price filter behavior**
  - Desktop min/max inputs are now editable numeric fields with validation.
  - Added `parsePrice` helper that strips non-numeric input and clamps to valid bounds.
  - Range slider stays synced with inputs; inputs stay synced with slider via `useEffect`.
  - Added 300ms debounced URL persistence via `useSearchParams` (`price_min`, `price_max`).
  - Values clamp to catalogue bounds on blur.

- **Fixed sidebar scrollbar / divider**
  - Removed `sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto` from the sidebar container.
  - Sidebar now scrolls naturally with the page instead of creating a broken internal scroll area.

- **Added active filter chips + Clear all**
  - Added active filter chips bar above the product grid showing all active filters.
  - Chips include: In Stock, Deal types, Ranges, Colors, Brands, and Price range.
  - Each chip has an X that updates the canonical filter state.
  - "Clear all" button resets all filters including price range and sort.

- **Removed category/sale pills carousel**
  - Removed the category slider / pill section that appeared below the breadcrumb on the archive page.

- **Expanded mobile filter panel**
  - Added all desktop sidebar filters to the mobile filter drawer: Categories, Price, Availability, Current Offers, Brand, Range, Color.
  - Increased mobile filter panel z-index to `z-[1300]` so it appears above the sticky header.

- **Restructured archive toolbar layout**
  - Moved sort/filter toolbar above the sidebar+grid layout, spanning full width below the breadcrumb.
  - Toolbar now contains: product count, grid/list view toggles, mobile Filters button, and Sort by dropdown.
  - Breadcrumb section now has a `border-b border-gray-100` separator to match Checkers Category Hero style.

### 3. Header and navigation
- **Linked "Track Your Order" to `/track-order`**
  - Changed top bar "Track Your Order" from a button to a `<Link to="/track-order">`.
  - Changed account panel "Track Order" from a button to a `<Link to="/track-order">`.

- **Removed Help Center**
  - Removed "Help Center" link from the top bar utility menu.
  - Removed "Help Center" from the mobile menu "Help & Settings" section.

### 4. AI assistant removal
- Removed `BelimsChatbot` global mount and `AiAssistant` modal from `frontend/App.tsx`.
- Removed `isAiAssistantOpen` state, chatbot callbacks, and all related props from App.
- Removed "AI Helper" button from `frontend/components/Header.tsx` services panel.
- Components remain on disk but are no longer imported or rendered.

### 5. Vercel / build config
- Added `strictPort: true` to `frontend/vite.config.ts` to prevent Vite from drifting off port 3000, which is required by the WP CORS allowlist.

### 6. Fulfillment tiles redesign
- Redesigned `frontend/components/FulfillmentTiles.tsx` with a card-based pickup/delivery layout.
- Added expandable delivery options accordion with fastest/cheapest markers.
- Added hover animations and arrow swipe effects matching the CategoryGrid style.

### 7. Home page section order
- Moved `<CategoryGrid />` from the top of the home page to directly above `<DealsSection />`.
- Current order: HeroBanner → ShopByCategory → FeaturedGrid → CollageGrid → DealsSection → CategoryGrid → TradeDeals → PopularCategories.

## Commits
- `a5dcc78` frontend: swap DealsSection and CategoryGrid order on home page
- `9128234` frontend: match Checkers category hero style for archive breadcrumbs and toolbar
- `8ac1ea4` frontend: link Track Order to /track-order and remove Help Center
- `bb2b5fd` frontend: remove category pills and expand mobile filter panel
- `5e98f39` frontend: hide AI assistant, remove backorder filter, fix price filter and sidebar
- `8d5aef3` frontend: filter out backorder/zero-price products from shop listings
- `dbe41ae` frontend: block backorder/zero-price products and hide out-of-stock from shop
- `868249a` frontend: update FulfillmentTiles and Vercel port config
