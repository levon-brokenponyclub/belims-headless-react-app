# Belims Headless — Updates Log

**Last updated:** 2026-06-02

---

## Fix: PayFast Return/Cancel URL Pointing to Netlify

**Files:** `wp-content/plugins/global-site-settings/global-site-settings.php`, `includes/payfast/class-payfast-api.php`, `includes/payfast/class-payfast-return-handler.php`

PayFast was redirecting users back to `belims-headless-react-app.netlify.app` after payment.

**Root cause:** The ACF option `headless_frontend_url` on `cms.belims.co.za` was still set to the Netlify URL, which overrides the fallback in `get_frontend_url()`.

**Fix (PHP):**
- Added global `get_frontend_url()` to `global-site-settings.php` — reads ACF `headless_frontend_url` option first, falls back to `https://belims.vercel.app`
- `class-payfast-api.php`: `cancelUrl` and `cancel_url` now call `get_frontend_url()` instead of hardcoded Netlify domain
- `class-payfast-return-handler.php`: private `get_frontend_url()` delegates to the global function

**Fix (server):** Updated ACF option on `cms.belims.co.za` via WP-CLI:
```bash
wp eval 'update_field("headless_frontend_url", "https://belims.vercel.app", "option");'
```

**When going live on `belims.co.za`:** Change the ACF option value in WP Admin → Custom Fields → Options — no code deploy needed.

---

## Fix: "Enter Address" Button Opening Store Pickup Modal

**File:** `frontend/components/Header.tsx`

Clicking "Enter Address" / "Deliver to" in the utility bar opened the Store Pickup tab instead of the Delivery tab.

**Root cause:** After a revert, `deliveryLocationModalType` state and `openDeliveryLocationPanel()` helper were lost. All three buttons (pickup, deliver-to, mobile delivery) called `setIsDeliveryLocationModalOpen(true)` with no type, so `DeliveryLocationModal` defaulted to showing Pickup.

**Fix:**
- Restored `deliveryLocationModalType` state (default `"delivery"`)
- Restored `openDeliveryLocationPanel(type)` helper
- Pickup button → `openDeliveryLocationPanel("pickup")`
- Deliver to + mobile delivery buttons → `openDeliveryLocationPanel("delivery")`
- Passed `initialFulfillmentType={deliveryLocationModalType}` to `<DeliveryLocationModal>`

---

## Fix: Shipping Rates and Track Order CORS Errors on Vercel

**Files:** `frontend/services/bobGoService.ts`, `frontend/components/TrackOrderPage.tsx`

Both files called `cms.belims.co.za` directly, bypassing the Vercel proxy and triggering CORS rejections.

**Fix:** Both now use `getApiBaseUrl()` from `wooCommerceService.ts`, which returns `/api/belims/v1` in production (proxied by Vercel) and `http://belims-headless.local/wp-json/belims/v1` in local dev.

---

## QuickView — Layout Refactor

**File:** `frontend/components/QuickView.tsx`

Redesigned to match SingleProduct styling and the Shopify quick-view layout pattern.

**Changes:**
- **Image column:** `bg-[#f9f9f9]`, rounded left corners (`md:rounded-l-[14px]`), multi-image gallery with prev/next arrow navigation and thumbnail strip (uses `product.images[]`)
- **Outer dialog:** `md:p-5` padding so the card floats; `md:max-h-[82vh]` (was fixed `h-[88vh]`) — auto-sizes to content
- **Brand:** `mb-2 inline-block text-sm font-semibold uppercase tracking-wide text-grey-medium hover:text-brand` (exact SingleProduct class)
- **Title:** `text-3xl font-bold text-grey font-heading mb-1`
- **SKU:** `text-base text-grey-medium mb-3`
- **Price:** `font-heading text-[28px] font-bold text-grey` with strikethrough for sale price
- **Stock bar:** `StockBar` component reused as-is — same badge colours and progress bar as SingleProduct
- **Qty stepper:** `border border-gray-300 rounded-sm h-11` with `Minus`/`Plus` icons
- **Add to cart:** `rounded-pill bg-belims-blue` with `bg-red-muted` hover sweep (matches SingleProduct)
- **Buy Now:** `rounded-pill bg-grey` with same hover sweep

---

## Vercel Deployment Setup

**Files:** `frontend/vercel.json` (created), `frontend/services/bobGoService.ts`, `frontend/components/TrackOrderPage.tsx`

Set up `belims.vercel.app` as an alternative production frontend (Netlify remains on `main` branch auto-deploy).

- New `vercel` branch tracks Vercel production; `main` continues to trigger Netlify
- `frontend/vercel.json` configures build (`npm ci --include=dev && npm run build`), output dir (`dist`), and rewrites:
  - `/api/:path*` → `https://cms.belims.co.za/wp-json/:path*` (API proxy)
  - `/:path*` → `/index.html` (SPA fallback)
- Vercel Root Directory set to `frontend/` in project settings

---

## Future: Editable Order Note in Checkout

**File:** `frontend/components/Checkout.tsx`

The order note is currently pre-filled from the CartDrawer (`initialOrderNote` prop) and sent to WC as `order_note` on submit, but it is read-only inside Checkout.

**Planned:** Add an editable `<textarea>` below the read-only note display in `OrderSummary`, wired to `setOrderNote`. The block only renders when `orderNote` is non-empty (pre-filled from cart), so it never appears as a blank field for users who didn't add a note in the cart. The Save/update action is implicit — `orderNote` state is already consumed by `handlePlaceOrder`.

---

## CartDrawer → Checkout — Order Note, Coupon & Shipping Persistence

**Files:** `frontend/App.tsx`, `frontend/components/CartDrawer.tsx`, `frontend/components/Checkout.tsx`, `frontend/services/wooCommerceService.ts`

### 1. `cartOrderNote` + `cartCoupon` pre-fill Checkout

- `Checkout` now accepts `initialOrderNote?: string` and `initialCouponCode?: string`
- `promoCode` state initialises from `initialCouponCode`; `orderNote` state from `initialOrderNote`
- `createWooOrder` receives `order_note` and `coupon_lines: [{ code }]` from these values — they land directly in the WC order payload
- `App.tsx` passes `cartOrderNote` and `cartCoupon` (existing state) down through `MainApp` → `<Checkout>`

### 2. Async coupon validation before marking applied

- `validateCoupon(code)` added to `wooCommerceService.ts` — GET `${BASE_URL}/coupons?code=…`, throws a user-facing message if the response is empty or non-OK
- CartDrawer coupon Apply button is now async: calls `validateCoupon`, then sets `appliedCoupon` only on success
- New state: `couponLoading` (spinner on button) and `couponError` (red message above input)
- Input `onChange` clears `couponError` so stale errors don't persist

### 3. `onEstimateShipping` wired to delivery context

- `App.tsx` handler calls `saveStoredAddress({ postalCode, street: "", city: "", province: "", country: "ZA" })` then dispatches `belims:delivery-address-updated` and `belims:fulfillment-changed`
- The postal-code-only path is already supported by `saveStoredAddress` (see: Delivery Location — Modal & Address Persistence Refactor)
- Header and SingleProduct will pick up the new address via the dispatched events

---

## CartDrawer — Addon Panel Enhancements

**Files:** `frontend/components/CartDrawer.tsx`, `frontend/App.tsx`

### Coupon Panel
- Applied coupon code is tracked in `appliedCoupon` state
- Pill button shows a `<Check>` icon when a coupon is applied, and switches border/bg to `border-green-600 bg-green-50 text-green-700`
- Confirmation block appears inside the panel: "{code} applied" with a Remove link that clears both `appliedCoupon` and `couponInput`
- `onApplyCoupon` prop wired through `App.tsx` → `MainApp` → `CartDrawer`; App stores the last applied code in `cartCoupon` state

### Order Note & Estimate Shipping Pill Icons
- Order note pill: `<FileText size={12} />` icon added
- Estimate Shipping pill: `<Truck size={12} />` icon added
- Coupon pill icon conditionally renders `<Check>` (when applied) or `<Tag>`

### Shipping Estimate — Inline Results
- `getShippingRates` from `bobGoService.ts` called directly inside `CartDrawer` on Calculate click
- State: `estimateRates`, `estimateLoading`, `estimateError`
- Loading state: spinner (`<Loader>` with `animate-spin`) replaces button text
- Error state: red error message inside the panel
- Results rendered in a `rounded-lg bg-green-50` block:
  - Heading: "Shipping rate for your address:" (singular) or "There are multiple shipping rates for your address:" (plural)
  - Each option: `service_name — formatCurrency(total_price)` with optional `— expected_delivery_date` in `text-green-600`
  - FREE shown for zero-price options
- Postal input `onChange` clears stale results and errors
- `onEstimateShipping` prop retained as a side-effect callback; wired to no-op in `App.tsx`

### Geolocation
- "Use my location" button triggers `navigator.geolocation`; reverse-geocodes via Nominatim to fill the postal code input
- On success, `estimateRates` and `estimateError` are cleared so the user must click Calculate

---

## Fix: "Schedule Pickup" Dialog Not Opening on Single Product Page

**File:** `frontend/components/FulfillmentTiles.tsx`

Clicking "Schedule Pickup" in the fulfillment tile had no effect.

**Root cause:** `onSchedulePickup` was called on line 415 but was never declared in `FulfillmentTilesProps` or destructured in the component. TypeScript surfaced this as `TS2304: Cannot find name 'onSchedulePickup'` — the prop was silently `undefined` at runtime, so `onSchedulePickup?.()` was a no-op.

**Fix:**
- Added `onSchedulePickup?: () => void` to `FulfillmentTilesProps`
- Added `onSchedulePickup` to the component destructuring

The prop was already being passed correctly from `SingleProduct.tsx` (`onSchedulePickup={() => setIsSchedulePickupOpen(true)}`).

---

## DeliveryLocationModal — Panel UI Refactor

**File:** `frontend/components/DeliveryLocationModal.tsx`

Restructured both the delivery and pickup panels to use a consistent fixed-header / scrollable-content / sticky-footer layout matching the brand auth panel pattern in `Header.tsx`.

### Layout
- Header: `bg-brand text-white` with `MapPin` icon and close button — matches account panel in Header
- Content: `flex-1 overflow-y-auto bg-soft` — scrollable, padded
- Footer: `border-t bg-surface flex-shrink-0` — sticky, contains the primary action button

### Delivery Panel
- Title: `text-lg font-bold text-gray-900 mb-2`
- Copy: `text-gray-500 mb-6 max-w-sm`
- "Use your location." pill button: `rounded-full border border-gray-300 py-3` full-width outlined
- Input: flat (no `rounded-lg bg-gray-50` card wrapper), borderless background
- Removed all card wrappers, decorative borders, and rounded containers

### Pickup Panel
- Title and copy match delivery panel
- "Use your location." pill button identical pattern
- Store cards: selected state uses `border-2 border-belims-blue bg-belims-blue/[0.04] shadow-sm`; unselected `border border-gray-200 bg-white`
- Radio-style indicator dot in card
- Store name turns `text-belims-blue` when selected
- Operating hours hidden by default — only toggle on explicit "View Hours" click
- Selecting a card does **not** auto-expand hours
- Removed dev-only "Reset store" / "Use default store" buttons

### Panel / Drawer
- `BottomDrawer` called with `panelClassName="!rounded-none !border-0"` — no rounded corners, no border
- `showHandle={false}` — handle hidden for right-placement drawer

### Dead Code Removed
- `isDev` const (`import.meta.env.DEV`) — no longer used
- `onResetPickupStore` prop removed from `PickupPanelProps` and call site (handler kept for future use)
- `isDev` prop removed from `PickupPanelProps` and call site

---

## Delivery Location — Modal & Address Persistence Refactor

**Files:**
- `frontend/components/Header.tsx`
- `frontend/components/DeliveryLocationModal.tsx`
- `frontend/services/shippingAddress.ts`
- `frontend/src/lib/fulfillmentContext.ts`
- `frontend/src/features/chatbot/components/BelimsChatbot.tsx`

### Header
- Added explicit delivery modal mode state for `pickup` and `delivery`
- Pickup header action now opens the pickup panel directly
- Delivery header action now opens the delivery panel directly
- Mobile delivery action opens the delivery panel directly
- Header continues to read saved delivery location from shared localStorage keys

### Delivery Modal
- Converted to a right-side panel using the existing drawer behaviour
- Removed old modal header and tab switcher
- Split delivery and pickup into separate panel views selected by the caller
- Added compact close icon
- Added postal-code-only save handling for valid 4-digit South African postal codes
- Closing the delivery panel with a typed valid postal code now saves it before closing
- Closing with an already saved full address no longer triggers the postal-code fallback path
- Fixed invalid nested button markup in the pickup store list
- Pickup store rows now use a non-button row wrapper with separate controls for selecting a store and viewing operating hours

### Address Storage (`shippingAddress.ts`)
- `saveStoredAddress()` falls back to `postalCode` when `label`, `street`, `city`, and `province` are empty
- `readStoredAddress()` supports legacy postal-code-only values from `deliveryAddress`
- `readStoredAddress()` fills missing labels using address label, built address label, postal code, or legacy label
- Added temporary console logging for address save, read, and remove operations
- Added a removal stack trace to identify future explicit storage clears

### Product Page Sync
- `SingleProduct` refreshes saved address state on modal close and `belims:delivery-address-updated` events
- Delivery rates are requested when a saved address or postal code is available

### Shared Fulfillment Context
- Shared fulfillment storage now accepts postal-code-only delivery addresses
- `deliveryLocationSet` is now `true` when a postal code exists, even without city/province
- Shared context no longer clears `deliveryAddressV2` when it temporarily has `deliveryAddress: null`
- Before persisting, rehydrates saved site delivery address from storage
- Preserved saved delivery address in the shared snapshot to prevent noisy clears

### Chatbot
- Chatbot delivery adapter preserves postal-code-only addresses
- Chatbot delivery location state treats a postal code as a valid delivery location

### Debug Logs Added
- `[delivery-location-modal] postal code save requested / skipped`
- `[delivery-location-modal] full address save requested`
- `[delivery-location-modal] clear location requested`
- `[delivery-address] saved / removed / removal stack / read saved address / read legacy postal code / read failed / read empty`

### Known Local Dev Note
- Requests from `http://localhost:3000` to `https://cms.belims.co.za/wp-json/belims/v1/shipping/calculate` are blocked by CORS
- App falls back to development shipping options after the CORS failure
- Separate from address persistence

---

## Fix: `getStoreStatus is not defined` — DeliveryLocationModal

**File:** `frontend/components/DeliveryLocationModal.tsx`

`getStoreStatus` was defined inside `DeliveryLocationModal` but called inside the top-level `PickupPanel` component, outside its scope.

**Changes:**
- Added `getStoreStatus` to `PickupPanelProps` interface
- Destructured it in `PickupPanel`
- Passed `getStoreStatus={getStoreStatus}` at the render site

---

## Fix: Postal Code Not Persisting to Product Page

**Files:** `frontend/components/SingleProduct.tsx`, `frontend/components/DeliveryLocationModal.tsx`

Address visible in Header but SingleProduct showed "Add your address to see delivery options."

**Root causes:**
- `handleUpdatePostalCode()` did not emit a sync event when closing without a detected address
- SingleProduct's `onClose` effect only called `refreshStoredAddress()`, not `hydrateFromSiteStorage()`

**Changes:**
- `DeliveryLocationModal.tsx` — `handleUpdatePostalCode()`: added `emitDeliveryAddressUpdated()` before `onClose()`
- `SingleProduct.tsx` — modal-close `useEffect`: added `hydrateFromSiteStorage()` alongside `refreshStoredAddress()`

---

## Fix: PayFast Return — Order Not Marked as Paid

**File:** `wp-content/plugins/global-site-settings/includes/payfast/class-payfast-return-handler.php`

Frontend received `payment_status=pending` after sandbox payment and polled indefinitely.

**Root cause:** PayFast only sends `pf_payment_id` via ITN (server-to-server POST). In local dev, ITN cannot reach `localhost`, so `pf_payment_id` is always empty in the return URL. The handler gated the paid-mark on `!empty($pf_payment_id)`, which always failed.

**Fix:** PayFast only calls `return_url` on successful payment (cancels go to `cancel_url`), so reaching the handler is sufficient proof. Removed the `!empty($pf_payment_id)` condition. Falls back to `'PF-RETURN-{order_id}'` as the payment ref when `pf_payment_id` is absent.

**Production safety:** ITN arrives before the user in production and sets the order to `processing`. The mark-paid block only runs if order is still `pending` or `on-hold` — no double-processing.

---

## Mobile Menu — Font Sizes Standardised to 15px

**File:** `frontend/components/Header.tsx`

**Elements updated to `text-[15px]`:**
- Section headers: "Departments", "Help & Settings"
- Back button and sub-panel category label
- "Shop All" / "View all {category}" buttons
- Category item buttons
- "Track Order", "Help Center" rows

---

## Fix: Hide "Uncategorised" Category from Tree

**File:** `frontend/categoryTree.ts`

"Uncategorised" appeared as a top-level department in the mega menu, mobile menu, and search dropdown.

**Approach:** Filter at `rootCategories` level after the full hierarchy is built. Filtering in the first pass orphaned all child categories that used "uncategorised" as a parent slug.

**Change:**
```ts
const HIDDEN_SLUGS = new Set(["uncategorised", "uncategorized"]);
return rootCategories
  .filter((cat) => !HIDDEN_SLUGS.has(cat.id?.toLowerCase()))
  .map(cleanupNode);
```

Covers both UK and US spellings. Child categories of valid parents are unaffected.
