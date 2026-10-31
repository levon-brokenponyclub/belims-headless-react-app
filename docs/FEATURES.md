# Features

What the storefront and CMS do today, and where each feature lives. Start at the root [README](../README.md); code structure is in [ARCHITECTURE.md](ARCHITECTURE.md); change history in [CHANGELOG.md](../CHANGELOG.md).

---

## Shopping & discovery

| Feature | Where | Notes |
| --- | --- | --- |
| Homepage sections | `HeroBanner`, `CategoryGrid`, `ShopByCategory`, `DealsSection` + `CategoryFeature`, `CollageGrid`, `ShopByDepartment`, `PopularCategories`, `BrandStrip`; shared `SectionHeading`, `hooks/useHomeCategories` | Hero content is CMS-editable (Site Settings → Homepage, baked in at build; rebuilds Preview, Production or Both) and is the page H1. Product rails use the small `GET /belims/v1/products/home` set. Category pills (second-level), departments (top-level) and top categories come from `GET /belims/v1/categories`; CMS categories have no images, so tiles use a product image from the category subtree. Shop Deals = Daily / Weekly / Trade tabs + a configurable category spotlight (`SPOTLIGHT` in `DealsSection.tsx`), with an empty state instead of hiding. Spec: [design/belims-design-tokens.md](design/belims-design-tokens.md), mockups in [mockups/home/](mockups/home/). |
| Footer | `Footer`, `TrustStrip` | Option C: direct call/email prompt, restored CMS-backed policy strip, brand-blue shop/account/support index, store-locator action, payment marks and social links. Policy copy comes from `GET /belims/v1/ecommerce-policies`; items without copy are hidden. Layout concepts A/B/C are in `mockups/footer/`; social and policy destinations still need confirmed routes. |
| Product cards | `ProductCard`, `NexvoProductCard` | Responsive Cloudflare images, wishlist toggle, deal badge, quick view. The `/shop` archive uses the approved square card treatment: brand, title, stock, sale price in red with a muted strike-through comparison price, and full-width Add to cart, with Wishlist and Quickview icons kept visible. Other card consumers retain their own presets. |
| Shop / category archive | `Archive`, `ArchiveHero` (`/shop`, `/shop/:categorySlug`) | Route segment resolves against the category tree by slug, then name (legacy links). Hero A (banner + department chips) on `/shop`; Hero C (compact, search within, subcategory strip) on category / brand / search. Archive cards match `docs/mockups/shop-product/archive.html`. Facets: category, price, offers (only types with products), brand — each counted against the others. Mobile filter drawer follows the mockup's left-side panel with a blue header and fixed Clear all / Show results actions. State in the URL (`sub`, `brands`, `offer`, `price_min`, `price_max`, `q`, `sort`, `view`, `page`), Back-safe. 24 per page, numbered pagination. |
| Product page | `SingleProduct`, `FulfilmentChooser`, `ProductAccordions`, `utils/product.ts` (`parseProductDescription`) | Option 3 premium layout: wide gallery (+ thumbnails when >1 image) with sticky purchase panel (brand/deal chips, title + wishlist, price, stock line, up to four key specs in a 2×2 grid, labelled qty stepper, Add to cart and trade block). Delivery / Pickup uses a segmented selector and one active detail card, with live Bob Go rates and store data. Columns from `lg`: gallery 7/12, purchase panel 5/12. Under the gallery, keyboard-accessible underlined tabs: Overview · Technical Specifications · Works with (bundle candidates, else cross-sells / same category) · Delivery & warranty (CMS policies). Empty tabs are hidden. More in <category> and Recently viewed show up to five `railCard` cards on desktop and use `text-h2` headings. Specs and features are parsed from the description's "Specifications" / "Features" lists (plus weight / dimensions). Linked breadcrumb, `<product> \| Belims` title, Product + BreadcrumbList JSON-LD (no store reviews). Sticky add-to-cart bar on mobile only. Source: `mockups/shop-product/product-option-3.html`. |
| Search | `SearchModal`, `SearchResults` | Header dropdown: matching products (left); Suggestions, Departments and **Brands** (right). Brands = `product_brand` terms whose name matches the query plus brands of the matched products, with logo (`BRAND_LOGOS` in `BrandStrip.tsx`, initials otherwise) and term count; click → `/brands/:slug`. Brand list from `GET /belims/v1/products/filters`. |
| Brand archive | `Archive` (`/brands/:brandSlug`) | All products of one brand; reached from search Brands, the homepage `BrandStrip` and `/shop?brand=`. |
| Header | `Header` | Brand-blue sticky header (Industrial + brand, 2026-10-31). Utility bar (scrolls away): pickup store, track order, wishlist, store locator, other services. Main row: logo, "Delivering to" pill (`DeliveryDetailsPopover`), search (`SearchResults` typeahead), account, cart total. Signed-out account control is icon-only; signed-in users see “Account:” and their name. Sub-nav: **Departments** + top 10 second-level categories by catalogue product count. Condenses to one row after 80px scroll (sub-nav collapses and goes `inert`, icon-only Departments button appears in the main row). |
| Mega menu & mobile nav | `MegaMenu`, `MobileNav`, `MobileNavPanel`, `MobileBottomNav`, `utils/categoryCounts.ts` | Desktop mega menu: 3 panes — department → subcategory → its children + up to 3–6 products from that branch (deals first; prices read from `deals_resolved.consumer`, trade specials show retail + "Trade deal"). Hover-intent or click; arrows move within/between panes; Escape closes and returns focus; closes on navigation. Counts = catalogue products per category subtree (unique labels, empty branches hidden). Links use category slugs (`/shop/<slug>`). Mobile: multi-level `MobileNav` drawer (brand-blue head, red rule, hints = first 3 real subcategories). |
| Quick view | `QuickView` | Multi-image gallery, badges, stock warning, add to cart / buy now. |
| Comparison | `ComparisonModal` | Up to 4 products. |
| Brands | `BrandStrip` | CMS brands (`/wp/v2/product_brand`) with self-hosted logos. |
| Deals & trade pricing | `DealsSection`, `DealBadge`, `DualPriceSwitcher`, `TradePricingAvailable`, `services/dealService.ts` | Consumer vs trade deal resolution from the products endpoint (`best_deal_consumer` / `best_deal_trade`). |
| Purchasability guard | `utils/price.ts` (`isProductPurchasable`) + CMS `is_sellable()` | Out-of-stock (no backorders), zero-price and uncategorised products are hidden from listings and blocked from cart. The CMS `/products` endpoint excludes them too, and FTG sync trashes them (GSS 2.9.1). |
| Reviews | `BelimsReviews` (Home, before Brands) | Store-level Google reviews via Vercel function `api/google-reviews.ts` (Places API (New), cached 1 h). Brand-blue rating panel (score, stars, total, **Read all reviews** / **Write a review** links) + 3 newest-relevant review cards as Google returns them (no star filtering). Renders nothing on API error or no reviews. Removed from the footer 2026-10-31. Never add these to Product JSON-LD (store reviews, not product reviews). |
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
| Account area | `AccountPage` (`/account/:tab`), `components/account/*` (shell, nav, dashboard, orders + order detail + reorder, addresses, details, wishlist, status tracker) | Dashboard, orders (`/belims/v1/orders`), addresses (add/edit form `DeliveryDetailsAddAddress`: street, **suburb** (required), city, province, postal code → `PUT /users/me`; checkout pre-fills the suburb from the saved address), payment, details, wishlist. Orders show a **Shipment** block (courier · tracking number · status, *Track here* → `/track-order?order-number=<tracking number>`, *Track shipment ↗* → Bob Go tracking page) once Bob Go has shipped them; the **Track** link only appears when there is a tracking number. Customers also get Bob Go's **Order shipped** email (Bob Go → Notifications). |
| Wishlist | `WishlistPage`, `services/wishlistService.ts` | |
| Welcome / cookies | `WelcomeDrawer`, `Drawer`, `CookieConsent` | Guest and signed-in account drawers share the archive filter's branded blue title bar, rounded panel edge, white body, bordered navigation rows, larger type and Belims blue / red actions. Mobile and desktop account entry points open WelcomeDrawer for guests and the account drawer for signed-in users. |

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
