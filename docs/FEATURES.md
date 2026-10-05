# Features

What the storefront and CMS do today, and where each feature lives. Start at the root [README](../README.md); code structure is in [ARCHITECTURE.md](ARCHITECTURE.md); change history in [CHANGELOG.md](../CHANGELOG.md).

---

## Shopping & discovery

| Feature | Where | Notes |
| --- | --- | --- |
| Homepage sections | `HeroBanner`, `ShopByCategory`, `FeaturedGrid`, `CollageGrid`, `DealsSection`, `CategoryGrid`, `TradeDeals`, `PopularCategories`, `BrandStrip` | Hero content is CMS-editable (Site Settings → Homepage, baked in at build; rebuilds Preview, Production or Both). Product rails use the small `GET /belims/v1/products/home` set. |
| Product cards | `ProductCard`, `NexvoProductCard` | Responsive Cloudflare images, wishlist toggle, deal badge, quick view. |
| Shop / category archive | `Archive` (`/shop`, `/shop/:categorySlug`) | Desktop sidebar + mobile filter drawer (categories, price, availability, offers, brand, range, colour), active filter chips, sort, grid/list. Filter options from `GET /belims/v1/products/filters`. |
| Product page | `SingleProduct` | Gallery, buy box, fulfilment tiles, accordions, "Frequently bought with". |
| Search | `SearchModal`, `SearchResults` | Header dropdown: matching products (left); Suggestions, Departments and **Brands** (right). Brands = `product_brand` terms whose name matches the query plus brands of the matched products, with logo (`BRAND_LOGOS` in `BrandStrip.tsx`, initials otherwise) and term count; click → `/brands/:slug`. Brand list from `GET /belims/v1/products/filters`. |
| Brand archive | `Archive` (`/brands/:brandSlug`) | All products of one brand; reached from search Brands, the homepage `BrandStrip` and `/shop?brand=`. |
| Mega menu & mobile nav | `MegaMenu`, `MobileNav`, `MobileNavPanel`, `MobileBottomNav` | |
| Quick view | `QuickView` | Multi-image gallery, badges, stock warning, add to cart / buy now. |
| Comparison | `ComparisonModal` | Up to 4 products. |
| Brands | `BrandStrip` | CMS brands (`/wp/v2/product_brand`) with self-hosted logos. |
| Deals & trade pricing | `DealsSection`, `TradeDeals`, `DealBadge`, `DualPriceSwitcher`, `TradePricingAvailable`, `services/dealService.ts` | Consumer vs trade deal resolution from the products endpoint (`best_deal_consumer` / `best_deal_trade`). |
| Purchasability guard | `utils/price.ts` (`isProductPurchasable`) + CMS `is_sellable()` | Out-of-stock (no backorders), zero-price and uncategorised products are hidden from listings and blocked from cart. The CMS `/products` endpoint excludes them too, and FTG sync trashes them (GSS 2.9.1). |
| Reviews | `BelimsReviews` (in `Footer`) | Google Places via Vercel function `api/google-reviews.ts`. |
| Coming Soon | `ComingSoon` | Shown on `/` when `VITE_COMING_SOON=true` (production only); hides the app shell. |

## Cart, checkout & payment

| Feature | Where | Notes |
| --- | --- | --- |
| Cart drawer & page | `CartDrawer`, `CartPage` | Quantity, remove, coupon panel, order note, shipping estimate, free-shipping bar. Note/coupon carry into checkout. |
| Coupons | `validateCoupon()` in `services/wooCommerceService.ts` → `GET /belims/v1/coupons?code=` | Validated before being marked applied. |
| Checkout | `Checkout` | Details → fulfilment (delivery or pickup) → payment. Address form with Google autocomplete and "Use current location" (two-attempt geolocation). Auth gate via `AuthModal`. |
| Shipping rates | `services/bobGoService.ts` → `POST /belims/v1/shipping/calculate` | BobGo rates via the uAfrica plugin; orders reach BobGo via the WooCommerce webhook. |
| Payment | `services/paymentService.ts` → `/belims/v1/payfast/*` | PayFast initiate (amount from the order, server-side) → verified ITN marks the order paid → return handler redirects to the storefront the order was placed on → `/order-confirmation` (polls payment status with the order key). |
| Order confirmation | `OrderConfirmation` | Status summary + inline order details toggle; creates the account after payment if opted in at checkout. |
| Order tracking | `TrackOrderPage`, `TrackingProgressCard`, `services/tracking.ts` | |

## Delivery & pickup

| Feature | Where | Notes |
| --- | --- | --- |
| Delivery location | `DeliveryLocationModal` (right-side panel), `Header` | Separate delivery and pickup panels; postal-code-only save (4-digit SA codes) or full address. |
| Address storage | `services/shippingAddress.ts` | `localStorage`, legacy postal-code support; synced to WP user meta when signed in. |
| Shared fulfilment state | `src/lib/fulfillmentContext.ts` | Delivery vs pickup across header, product page, cart and checkout. |
| Pickup stores | `StoreLocator`, `FulfillmentTiles` | Store list, hours and coordinates from `GET /belims/v1/ecommerce-policies` (`store_locations`). |
| Google Maps | `VITE_GOOGLE_MAPS_API_KEY` | Autocomplete + reverse geocoding. |

## Accounts & auth

| Feature | Where | Notes |
| --- | --- | --- |
| Sign in / register | `AuthPage`, `AuthModal`, `services/authService.ts` | Email + password, mobile number required on register. Endpoints: `/belims/v1/users/register`, `/users/login`, `/users/logout`, `/users/me`, `/users/check-email`. |
| Firebase phone & Google | `services/firebaseService.ts` → `/belims/v1/auth/firebase-phone`, `/auth/firebase-google` | Token verified server-side (`BELIMS_FIREBASE_API_KEY` in `wp-config.php`); fails closed without it. |
| Account area | `AccountPage` (`/account/:tab`) | Dashboard, orders (`/belims/v1/orders`), addresses (add/edit form `DeliveryDetailsAddAddress`: street, **suburb** (required), city, province, postal code → `PUT /users/me`; checkout pre-fills the suburb from the saved address), payment, details, wishlist. Orders show a **Shipment** block (courier · tracking number · status, *Track here* → `/track-order?order-number=<tracking number>`, *Track shipment ↗* → Bob Go tracking page) once Bob Go has shipped them; the **Track** link only appears when there is a tracking number. Customers also get Bob Go's **Order shipped** email (Bob Go → Notifications). |
| Wishlist | `WishlistPage`, `services/wishlistService.ts` | |
| Welcome / cookies | `WelcomeDrawer`, `CookieConsent` | |

## AI features

| Feature | Where | Status |
| --- | --- | --- |
| Paint Assistant | `PaintAssistant` | Mounted. |
| Price Match | `PriceMatchModal` | Mounted. |
| Onboarding Wizard | `OnboardingWizard` | Mounted. |
| Chatbot | `src/features/chatbot/` | Built (V1, March 2026) but **not mounted** since 2026-09-09. Spec: [archive/frontend/ChatBot.md](archive/frontend/ChatBot.md). |
| AI Assistant modal | `AiAssistant` | Removed from the app (component kept on disk). |
| AI product descriptions (CMS) | [belims-ai-product-descriptions](../wp-content/plugins/belims-ai-product-descriptions/README.md) | WP admin meta box + bulk generator (Gemini). |

## CMS (WordPress admin)

All custom CMS functionality is in the **Global Site Settings** plugin — [overview](../wp-content/plugins/global-site-settings/README.md) · [user guide](../wp-content/plugins/global-site-settings/USERGUIDE.md):

- Site Settings dashboard: branding, store details & locations, homepage hero + rebuild target, allowed storefronts (CORS), WooCommerce, Firebase status.
- Integrations: **FTG catalogue sync** (eligibility rules, brand filters, cron), **BobGo shipping**, **PayFast**, **AI services**.
- Media: WebP optimiser, Products folder, Media Folders taxonomy.
- REST API under `belims/v1` (products, products/home, categories, filters, homepage, ecommerce-policies, users, auth, orders, coupons, shipping, payfast, ftg).

## Superseded feature notes

Older per-feature write-ups (user registration API, delivery location setup, BobGo/FTG integration guides, homepage refactor plan) are kept for reference in [archive/](archive/README.md). Where they conflict with this file or the code, the code wins.
