# Global Site Settings Plugin

**Version:** 2.2.0  
**WordPress:** 5.8+  
**PHP:** 7.4+

Unified plugin for the Belims headless WooCommerce store. Manages REST API endpoints, CORS, third-party integrations (BobGo, PayFast, FTG), and the Site Settings admin dashboard.

---

## Plugin Structure

```
global-site-settings/
├── global-site-settings.php          # Bootstrap, CORS headers, AJAX handlers, admin menus
├── includes/
│   ├── acf-field-groups.php          # ACF field group registration
│   ├── class-orders-endpoint.php     # POST /orders — headless checkout order creation
│   ├── class-products-endpoint.php   # GET /products, /products/:id
│   ├── class-categories-endpoint.php # GET /categories
│   ├── class-user-endpoint.php       # Auth, registration, customer profile
│   ├── class-user-admin-page.php     # User management admin UI
│   ├── class-ecommerce-settings.php  # Returns, warranty, shipping policies
│   ├── class-bundled-products.php    # Bundled product support
│   ├── bobgo-shipping/               # BobGo shipping integration (see below)
│   ├── payfast/                      # PayFast payment gateway (see below)
│   └── ftg-sync/                     # FTG brand sync integration
```

---

## REST API Endpoints

All endpoints are under `/wp-json/belims/v1/`. In production, the Vercel frontend calls these via the `/api/` proxy (e.g. `/api/belims/v1/orders`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/products` | None | Product listing with filters |
| `GET` | `/products/:id` | None | Single product |
| `GET` | `/categories` | None | Product categories |
| `POST` | `/orders` | None | Create WooCommerce order from headless checkout |
| `GET` | `/orders` | Logged in | Customer order history |
| `GET` | `/orders/:id` | None | Single order details |
| `POST` | `/shipping/calculate` | None | Get BobGo shipping rates for an address |
| `GET` | `/track` | None | Track a shipment by order key |
| `POST` | `/payfast/notify` | None | PayFast ITN (payment notification) |
| `GET` | `/payfast/return` | None | PayFast return redirect after payment |
| `GET/POST` | `/user/*` | Varies | Auth, registration, profile |

---

## CORS

CORS origin is controlled by the `belims_frontend_environment` WP option and the ACF `headless_frontend_url` option field (takes priority).

| Environment | Origin |
|-------------|--------|
| Production | Value of ACF `headless_frontend_url` (currently `https://belims.vercel.app`) |
| Development | `http://localhost:3000` (or `FRONTEND_URL` env var) |

Switch environments via **Site Settings → CORS & Security → Frontend Environment**.

Helper functions available globally:
- `get_cors_origin()` — returns the current allowed origin
- `get_frontend_url()` — returns the frontend base URL (used for PayFast return URLs)

---

## Order Creation (`class-orders-endpoint.php`)

`POST /belims/v1/orders`

**Request body:**

```json
{
  "customer": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "city": "string",
    "province": "string",
    "postalCode": "string"
  },
  "items": [
    { "id": 123, "quantity": 1 }
  ],
  "shipping": {
    "service_name": "Same Day Delivery",
    "service_code": "bobgo_257655_0_2",
    "method_id": "bobgo_shipping",
    "total_price": 175
  },
  "order_note": "Please leave at door",
  "coupon_lines": [
    { "code": "DISCOUNT10" }
  ]
}
```

**Shipping item notes:**
- `method_id` must be `bobgo_shipping` — required for BobGo webhook recognition
- `service_code` is saved as both `bobgo_service_level` and `uafrica_service_code` on the shipping item. The `uafrica_service_code` key is read by the uAfrica WooCommerce plugin's `save_order_meta` hook, which copies it to order-level meta. BobGo reads this meta when it receives the WooCommerce webhook.
- Coupon codes are applied after the first `calculate_totals()` call, then totals are recalculated.

---

## BobGo Shipping (`includes/bobgo-shipping/`)

### How it works

BobGo shipping uses **two separate integration paths**:

#### 1. Rates at checkout
The official **uAfrica WooCommerce plugin** (`uafrica-shipping`) handles rate retrieval. The headless app POSTs a delivery address to `/belims/v1/shipping/calculate`, which calls the WooCommerce shipping calculator internally. No BobGo API token is required.

#### 2. Order sync
BobGo connects to WooCommerce as a sales channel and pulls paid orders via the WooCommerce REST API / webhook system. Orders appear in the BobGo dashboard automatically once payment is confirmed (status → `processing`). The `uafrica_service_code` order meta tells BobGo which shipping service the customer selected.

**No direct BobGo API key is required** for either path. The current BobGo plan does not support API key creation.

### Files

| File | Purpose |
|------|---------|
| `init.php` | Registers the `/shipping/calculate` REST endpoint |
| `class-bobgo-rates-endpoint.php` | Proxies address → WC shipping calculator → returns rates |
| `class-bobgo-api.php` | Direct BobGo API wrapper (Bearer token auth) — not active, kept for future use if API access is enabled |
| `class-bobgo-order-handler.php` | Direct API order push — **disabled** (not loaded). Direct API requires Bearer token; BobGo plan does not support API keys. Kept for reference. |
| `class-bobgo-tracking-endpoint.php` | `/track` endpoint — returns shipment tracking status |
| `class-bobgo-webhook-endpoint.php` | Receives inbound webhooks from BobGo (tracking events) |
| `admin-bobgo-settings-page.php` | Admin UI: environment toggle, token fields, connection tests, order sync test panel |

### Admin UI — Site Settings → BobGo Shipping

- **Environment toggle**: Production / Sandbox. Controls which BobGo API URL is used if the direct API handler is ever re-enabled.
- **Test API Token**: Authenticates directly against the BobGo API using the saved Bearer token.
- **Test Checkout Rates**: Fires a test address through the WC shipping calculator and returns available rates.
- **Order Sync Test**: Enter a WC order ID to inspect shipping `method_id`, BobGo meta, and sync status. "Trigger Sync" manually runs the order handler (patches legacy `method_id` if blank, then calls `create_bobgo_order()`).

### Logging

`class-bobgo-order-handler.php` writes to the WooCommerce logger under source `belims-bobgo`.  
View logs: **WooCommerce → Status → Logs → select `belims-bobgo`**.

---

## PayFast (`includes/payfast/`)

| File | Purpose |
|------|---------|
| `class-payfast-api.php` | Builds PayFast payment payload, signature generation |
| `class-payfast-return-handler.php` | Handles `/payfast/return` — verifies payment, moves order to `processing`, redirects to `get_frontend_url()/order-confirmation?order_id=X&order_key=Y` |
| `class-payfast-admin-page.php` | Admin test panel |

**Return URL** is built from `get_frontend_url()` which reads the ACF `headless_frontend_url` option. Update this option (WP admin → Options → `headless_frontend_url`) when switching frontend domains.

---

## FTG Sync (`includes/ftg-sync/`)

Syncs brand/product data from the FTG supplier feed.

| File | Purpose |
|------|---------|
| `class-ftg-api.php` | FTG API client |
| `class-ftg-sync-endpoint.php` | REST endpoint + sync logic |
| `admin-ftg-sync-page.php` | Admin UI for triggering and monitoring sync |

---

## AJAX Handlers (registered in `global-site-settings.php`)

| Action | Description |
|--------|-------------|
| `switch_frontend_environment` | Switches `belims_frontend_environment` option (Production / Development) |
| `test_bobgo_connection` | Tests BobGo Bearer token auth via `GET /webhooks` |
| `belims_check_order_sync` | Returns shipping items and BobGo meta for a given WC order ID |
| `belims_trigger_order_sync` | Patches `method_id` on legacy orders and manually triggers `create_bobgo_order()` |
| `clear_ftg_credentials` | Clears saved FTG API credentials |
| `export_woocommerce_products` | Exports products as CSV/JSON |
| `belims_sync_single_product` | Triggers FTG sync for a single product |

All admin AJAX handlers require `manage_options` capability and a valid nonce.

---

## Deployment

Plugin files are owned by app user `uhkkwupuum` on Cloudways. The SSH master user cannot write to them directly. Deploy via **Cloudways File Manager** at `public_html/wp-content/plugins/global-site-settings/`.

Do not override files owned by other plugins (e.g. `uafrica-shipping`).

---

## Known Constraints

- **BobGo API keys**: The current BobGo plan does not allow API key creation. Direct API calls (`class-bobgo-order-handler.php`) are disabled. Order sync relies on the BobGo ↔ WooCommerce channel integration.
- **SSH writes**: `master_ggrkakuzjf` cannot write files owned by `uhkkwupuum`. Use Cloudways File Manager for all plugin uploads.
- **CORS**: Only one origin is allowed at a time. The ACF `headless_frontend_url` option overrides all other CORS settings.
