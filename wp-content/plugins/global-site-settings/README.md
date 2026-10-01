# Global Site Settings Plugin

**Version:** 2.7.2  
**WordPress:** 5.8+  
**PHP:** 7.4+

Unified plugin for the Belims headless WooCommerce store. Manages REST API endpoints, CORS, third-party integrations (BobGo, PayFast, FTG), and the Site Settings admin dashboard.

---

## Plugin Structure

```
global-site-settings/
├── global-site-settings.php          # Bootstrap, CORS headers, AJAX handlers, admin menus
├── assets/
│   ├── css/admin.css                 # All BPC admin UI styles (variables, layout, components)
│   ├── js/admin.js                   # Admin tab switching and shared JS
│   ├── js/media-folders.js           # Media Library grid folder filter
│   └── js/media-tools.js             # Site Settings → Media tab controls
├── includes/
│   ├── acf-field-groups.php          # ACF field group registration
│   ├── class-orders-endpoint.php     # POST /orders — headless checkout order creation
│   ├── class-products-endpoint.php   # GET /products, /products/:id
│   ├── class-categories-endpoint.php # GET /categories
│   ├── class-user-endpoint.php       # Auth, registration, customer profile
│   ├── class-user-admin-page.php     # User management admin UI
│   ├── class-ecommerce-settings.php  # Returns, warranty, shipping policies
│   ├── class-bundled-products.php    # Bundled product support
│   ├── class-media-folders.php       # Media → Folders (media_folder taxonomy)
│   ├── class-image-optimizer.php     # WebP conversion queue, auto-convert, archive, Products folder
│   ├── admin-media-tab.php           # Site Settings → Media tab markup
│   ├── bobgo-shipping/               # BobGo shipping integration (see below)
│   ├── payfast/                      # PayFast payment gateway (see below)
│   └── ftg-sync/                     # FTG brand sync integration
```

---

## Admin UI — Site Settings

Single-page tabbed interface at **WP Admin → Site Settings**.

### Sidebar navigation

| Group | Label | Tab ID | Purpose |
|-------|-------|--------|---------|
| Overview | Dashboard | `tab-dashboard` | System status, integrations, settings shortcuts, REST API reference, Clear Cache |
| Settings | Branding | `tab-branding` | WP admin dashboard colours |
| Settings | Store Details | `tab-ecommerce` | Store locations + hours, Google Maps key (masked), product page policies, Ask an Expert block |
| Settings | CORS & Security | `tab-cors-security` | Allowed origins and REST API security |
| Settings | WooCommerce | `tab-woocommerce` | WooCommerce API and product description import |
| Integrations | FTG Sync | `tab-ftg-sync` | FTG credentials, product sync, cron schedule |
| Integrations | BobGo Shipping | `tab-bobgo-shipping` | BobGo enable toggle + API settings |
| Integrations | Firebase Auth | `tab-firebase-auth` | Read-only status: API key, JWT secret, endpoints |
| Integrations | AI Services | `tab-ai-services` | Gemini key for product descriptions |
| Tools | Media Management | `tab-media` | Bulk WebP conversion, auto-convert toggle, archive old originals, Products folder assignment |

Each feature appears once: integrations only in the Integrations row/menu, settings only in the Settings row/menu. Payment Gateways and PayFast Testing tabs remain in the DOM but are removed from the sidebar and dashboard (v2.7.0).

### Dashboard tab

- **System strip**: WordPress version, WooCommerce version, PHP version, CORS origin, Frontend URL
- **Integrations grid**: FTG Sync (toggle + last sync date), BobGo Shipping (toggle + env badge), Firebase Auth (Active / JWT missing / Not verified), AI Services — each card's Configure opens its tab
- **Settings tiles**: Branding, Store Details, CORS & Security, WooCommerce
- **Quick Tools**: Clear Cache
- **REST API reference table**: All `belims/v1` endpoints with method badges and auth type badges

Last sync on the Dashboard and Products tab both read from `belims_get_ftg_last_sync_timestamp()` and display in `date_i18n('F j, Y, g:i a')` format.

### FTG Sync tab

**Credentials section** — collapses to a saved summary when email + password + token are all set. "Edit Credentials" expands the form; "Cancel" collapses it back.

**Product Sync section** (visible when enabled + token set):
- Brand toolbar: dropdown (populated from FTG API) + Search Available Brands + optional Custom Brand input
- **Auto-Sync Schedule** group: frequency selector (Disabled / Hourly / Twice Daily / Daily / Weekly), Save button, Run Now button, next scheduled run display
- **Connection** group: Test Connection, Disconnect FTG
- **Tools** group: Inspect Product, Check Catalogue Count, Count Display On Web Active, Export Brand Products, Cleanup Duplicate Attributes
- **Sync** group: Test Sync (first 10), SKU field + Sync Single Product, SYNC CATALOGUE, SYNC ALL BRANDS + Dry Run toggle

### BobGo Shipping tab

Enable toggle form (field-row layout, auto-saves). Settings section (API token form) collapses to a saved summary when production API token is set. "Edit Settings" / "Cancel" toggle the form.

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
| `POST` | `/ftg/login` | Admin | Exchange FTG email+password for collection token |
| `GET` | `/ftg/brands` | Admin | List all FTG brands (cached) |
| `GET` | `/ftg/brand-count` | Admin | Count products for a given brand |
| `POST` | `/ftg/sync` | Admin | Sync FTG products to WooCommerce |
| `POST` | `/ftg/sync/product` | Admin | Sync a single product by SKU |
| `GET` | `/ftg/instances` | Admin | Test FTG API connection |
| `POST` | `/ftg/cleanup-attributes` | Admin | Remove duplicate WC attributes |

---

## CORS

CORS origin is controlled by the `belims_frontend_environment` WP option and the ACF `headless_frontend_url` option field (takes priority).

| Environment | Origin |
|-------------|--------|
| Production | Value of ACF `headless_frontend_url` (currently `https://belims.vercel.app`) |
| Development | `http://localhost:3000` (or `FRONTEND_URL` env var) |

Helper functions available globally:
- `get_cors_origin()` — returns the current allowed origin
- `get_frontend_url()` — returns the frontend base URL (used for PayFast return URLs)

---

## FTG Sync (`includes/ftg-sync/`)

Syncs brand/product data from the FTG supplier feed.

| File | Purpose |
|------|---------|
| `class-ftg-api.php` | FTG API client |
| `class-ftg-sync-endpoint.php` | REST endpoint + sync logic. Writes `belims_ftg_last_sync` as `['time' => mysql_datetime, ...]` |
| `admin-ftg-sync-page.php` | Legacy admin page (writes `belims_ftg_last_sync` as Unix timestamp) |

### Sync eligibility (v2.5.0)

A product is only created/updated when FTG provides **stock quantity > 0**, **selling price > 0** and **at least one web category** (`webUrlHierarchyCollection.web_hierarchy`). Applies to bulk sync and single-SKU sync via `get_missing_required_fields()`. Failing products are reported as skipped (`reason: Missing stock, price, …`); existing CMS products that fail are left untouched — not updated, not unpublished.

### Last sync storage

`belims_ftg_last_sync` may be stored as either a Unix timestamp (integer) or an array `['time' => 'Y-m-d H:i:s', 'products_synced' => N, ...]` depending on which code path ran. Always read it through:

```php
belims_get_ftg_last_sync_timestamp(); // returns int Unix timestamp or 0
```

### FTG Auto-Sync Cron

| Hook / Option | Value |
|---------------|-------|
| WP-Cron event | `belims_ftg_auto_sync` |
| Frequency option | `belims_ftg_cron_frequency` (default: `'disabled'`) |
| Allowed values | `disabled`, `hourly`, `twicedaily`, `daily`, `weekly` |
| Helper | `belims_schedule_ftg_cron($frequency)` — clears existing and reschedules |

The cron callback (`belims_run_ftg_cron_sync`) calls `POST /belims/v1/ftg/sync` with the saved collection token. It only runs when FTG is enabled and a token is configured.

**UI controls** (Products tab → Product Sync → Auto-Sync Schedule):
- Frequency dropdown → Save button → `wp_ajax_belims_save_ftg_cron_frequency`
- Run Now button → `wp_ajax_belims_run_ftg_cron_now`

The cron is unscheduled on plugin deactivation.

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
| `class-bobgo-api.php` | Direct BobGo API wrapper (Bearer token auth) — not active, kept for future use |
| `class-bobgo-order-handler.php` | Direct API order push — **disabled**. Kept for reference. |
| `class-bobgo-tracking-endpoint.php` | `/track` endpoint — returns shipment tracking status |
| `class-bobgo-webhook-endpoint.php` | Receives inbound webhooks from BobGo (tracking events) |
| `admin-bobgo-settings-page.php` | Admin UI: saved/edit state for environment + token fields, connection test |

### Saved state

Settings form collapses when `bobgo_api_token` option is non-empty. Displays environment and masked token. "Edit Settings" / "Cancel" toggle the form via JS.

### Logging

`class-bobgo-order-handler.php` writes to the WooCommerce logger under source `belims-bobgo`.  
View logs: **WooCommerce → Status → Logs → select `belims-bobgo`**.

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
| `belims_save_ftg_cron_frequency` | Saves `belims_ftg_cron_frequency` and reschedules `belims_ftg_auto_sync` |
| `belims_run_ftg_cron_now` | Immediately fires `belims_ftg_auto_sync` action |

All admin AJAX handlers require `manage_options` capability and a valid nonce.

---

## PayFast (`includes/payfast/`)

| File | Purpose |
|------|---------|
| `class-payfast-api.php` | Builds PayFast payment payload, signature generation |
| `class-payfast-return-handler.php` | Handles `/payfast/return` — verifies payment, moves order to `processing`, redirects to `get_frontend_url()/order-confirmation?order_id=X&order_key=Y` |
| `class-payfast-admin-page.php` | Admin test panel |

**Return URL** is built from `get_frontend_url()` which reads the ACF `headless_frontend_url` option.

---

## Media Folders (`includes/class-media-folders.php`)

Hierarchical `media_folder` taxonomy on attachments.

- **Media → Folders** admin page to add/rename/nest folders.
- Seeded once (option `belims_media_folders_seeded`): Global, Products, Brands, Campaigns.
- Folder column + dropdown filter in Media Library list view; folder dropdown in grid view / media modal (`assets/js/media-folders.js`, filtered server-side via `ajax_query_attachments_args`).
- Assign a folder from the attachment edit screen (Folders field).
- `Belims_Media_Folders::assign_to($attachment_id, $slug)` adds an attachment to a folder without removing existing ones. FTG sync assigns every imported product image to **Products** (v2.6.0).

---

## Image Optimizer (`includes/class-image-optimizer.php`, v2.6.0)

Controlled from **Site Settings → Media**.

| Tool | Behaviour |
|------|-----------|
| Bulk Convert & Optimise | PNG/JPEG originals → WebP q80 (Imagick, method 6, stripped); attachment repointed, sub-sizes regenerated. Runs as an Action Scheduler queue (`belims_image_optimizer_batch`, group `belims-media`, 10 per batch) with pause/resume; state in option `belims_image_optimizer_state`. Skips the Woo email header image. Failures flagged with `_belims_webp_failed` (cleared on next Start). Old files are left in place. |
| Auto-convert new uploads | Option `belims_image_auto_webp`. Converts on `wp_handle_upload` and in FTG sync image import (`maybe_convert_upload()`). |
| Archive Old Originals | Dry run / move of PNG/JPEG in `uploads/YYYY/MM` that no attachment references, to `private_html/belims-img/archive/` (fallback `wp-content/belims-image/archive/`). |
| Products Folder | Adds product/variation featured images, gallery images and images uploaded to products to the Products folder. Last run in option `belims_products_folder_last_run`. |

---

## Deployment

Plugin files are owned by app user `uhkkwupuum`, group `www-data` (group-writable). The SSH master user (`master_ggrkakuzjf`, in `www-data`) can deploy over SSH/SCP to `applications/uhkkwupuum/public_html/wp-content/plugins/global-site-settings/` (verified 2026-10-01); Cloudways File Manager also works.

Do not override files owned by other plugins (e.g. `uafrica-shipping`).

---

## Known Constraints

- **Firebase verification**: `BELIMS_FIREBASE_API_KEY` must be defined in `wp-config.php` (set on production 2026-10-01). Without it, `/auth/firebase-phone` and `/auth/firebase-google` refuse sign-in (fail closed). Accounts are identified only by the Firebase-verified phone/email — client-supplied values are ignored.
- **BobGo API keys**: The current BobGo plan does not allow API key creation. Direct API calls (`class-bobgo-order-handler.php`) are disabled. Order sync relies on the BobGo ↔ WooCommerce channel integration.
- **CORS**: Only one origin is allowed at a time. The ACF `headless_frontend_url` option overrides all other CORS settings.
- **FTG last sync format**: Two code paths write different formats to `belims_ftg_last_sync`. Always use `belims_get_ftg_last_sync_timestamp()` to read it.
