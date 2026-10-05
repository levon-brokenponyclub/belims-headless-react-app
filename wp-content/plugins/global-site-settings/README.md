# Global Site Settings Plugin

**Version:** 2.10.6  
**WordPress:** 5.8+  
**PHP:** 7.4+

Unified plugin for the Belims headless WooCommerce store. Manages REST API endpoints, CORS, third-party integrations (BobGo, PayFast, FTG), and the Site Settings admin dashboard.

**Docs:** this file is the developer overview · admin how-to: [USERGUIDE.md](USERGUIDE.md) · project docs: [root README](../../../README.md) · ops & deploys: [docs/OPERATIONS.md](../../../docs/OPERATIONS.md) · history: [CHANGELOG.md](../../../CHANGELOG.md)

---

## Plugin Structure

```
global-site-settings/
├── global-site-settings.php          # Bootstrap, CORS headers, AJAX handlers, admin menus
├── assets/
│   ├── css/admin.css                 # All BPC admin UI styles (variables, layout, components)
│   ├── js/admin.js                   # Tab switching, WP submenu sync, bpcToast, save forms (dirty check + Saving…)
│   ├── js/media-folders.js           # Media Library grid folder filter
│   ├── js/media-tools.js             # Site Settings → Media tab controls
│   └── js/homepage-tools.js          # Site Settings → Homepage publishing controls
├── includes/
│   ├── acf-field-groups.php          # ACF field group registration
│   ├── class-orders-endpoint.php     # POST /orders, GET /orders, GET /orders/:id (order-key access)
│   ├── class-products-endpoint.php   # GET /products, /products/home, /products/:id
│   ├── class-categories-endpoint.php # GET /categories
│   ├── class-user-endpoint.php       # Auth, registration, customer profile
│   ├── class-user-admin-page.php     # User management admin UI
│   ├── class-ecommerce-settings.php  # Returns, warranty, shipping policies
│   ├── class-bundled-products.php    # Bundled product support
│   ├── class-media-folders.php       # Media → Folders (media_folder taxonomy)
│   ├── class-image-optimizer.php     # WebP conversion queue, auto-convert, archive, Products folder
│   ├── admin-media-tab.php           # Site Settings → Media tab markup
│   ├── class-homepage.php            # GET /homepage + Vercel deploy hooks (preview/production) on save
│   ├── admin-homepage-tab.php        # Site Settings → Homepage tab markup
│   ├── bobgo-shipping/               # BobGo shipping integration (see below)
│   ├── payfast/                      # PayFast payment gateway (see below)
│   └── ftg-sync/                     # FTG brand sync integration
```

---

## Admin UI — Site Settings

Single-page tabbed interface at **WP Admin → Site Settings**.

**Page header (2.10.0)** — `header.bpc-page-header` above the tab bar on every page: title, version tag (`.bpc-version-tag`), environment badge (2.10.3: the hosting environment from `belims_environment()` → `WP_ENVIRONMENT_TYPE` — Production / Staging / Development / Local) with a warning notice outside production when PayFast is live, BobGo is enabled on Production or a Production deploy hook is saved, description, and **View Storefront ↗** (`get_frontend_url()`). Followed by `<hr class="wp-header-end">` so WP admin notices land below it.

**Sections (2.10.0)** — Overview and FTG Sync use WP core postboxes: `.postbox` → `.postbox-header` (`<h2>` title + optional status `.badge`) → `.inside` (`.inside.is-flush` for full-width tables). Inside a postbox, `.field` renders as a row (label 220px | control) with a separator and `.store-fields` stacks rows; below 782px rows stack. Styles in `sitebridge-ui.css`. Other tabs still use `.sb-panel` / `.panel`.

### Navigation

Two levels (2.9.4). The WP admin submenu (`global_site_settings_admin_menus()`) lists only the four groups — **Overview · Settings · Integrations · Tools** — each linking to its group's first tab (`#tab-dashboard`, `#tab-branding`, `#tab-ftg-sync`, `#tab-media`). The first item reuses the parent slug, so it replaces WP's duplicate "Site Settings" entry. A group's pages are the horizontal sub-tabs in `.nav-tab-wrapper.bpc-section-tabs`: one `.bpc-section-tab-group[data-section-group]` per group, only the active group's row is shown.

`admin.js` switches tabs in place for sub-tab clicks, Site Settings menu links (intercepted, no reload) and `hashchange`/`popstate`. A tab's group is read from the sub-tab markup (`tabGroup()`), which drives both the visible sub-tab row and the submenu `current` highlight — add a tab by adding its `<a data-tab>` to the right group row; no JS list to update. Initial tab: URL hash → tab of the last save (flash) → Dashboard. No `localStorage` tab memory.

| Group | Label | Tab ID | Purpose |
|-------|-------|--------|---------|
| Overview | Dashboard | `tab-dashboard` | System status, integrations, settings shortcuts, REST API reference |
| Settings | Branding | `tab-branding` | WP admin dashboard colours |
| Settings | Store Details | `tab-ecommerce` | Store locations + hours, Google Maps key (masked), product page policies, Ask an Expert block |
| Settings | Homepage | `tab-homepage` | Homepage sections (Hero), rebuild target (Preview/Production/Both), deploy hook per target, publish + live-version status |
| Settings | CORS & Security | `tab-cors-security` | Read-only Allowed Storefronts list + default frontend URL; REST API security |
| Settings | WooCommerce | `tab-woocommerce` | WooCommerce API and product description import |
| Integrations | FTG Sync | `tab-ftg-sync` | FTG credentials, product sync, cron schedule |
| Integrations | BobGo Shipping | `tab-bobgo-shipping` | BobGo enable toggle + API settings |
| Integrations | Firebase Auth | `tab-firebase-auth` | Read-only status: API key, JWT secret, endpoints |
| Integrations | AI Services | `tab-ai-services` | Gemini key for product descriptions |
| Tools | Media Management | `tab-media` | Bulk WebP conversion, auto-convert toggle, archive old originals, Products folder assignment |

Each feature appears once: integrations only in the Integrations row/menu, settings only in the Settings row/menu. Payment Gateways and PayFast Testing tabs remain in the DOM but are removed from the sidebar and dashboard (v2.7.0).

### Save feedback (2.9.2)

- **Toasts:** `window.bpcToast(message, type)` (`assets/js/admin.js`, styles in `admin.css` → "Toasts") — one bottom-right `aria-live="polite"` stack; types `success` / `info` (4 s), `warning` (6 s), `error` (8 s), each with a close button. AJAX tools (FTG tools + sync, media tools, homepage publishing, `admin.js` actions) report short success/error/warning messages with it; reports (sync tables, progress bars, brand lists, cleanup/import summaries) stay inline.
- **Flash after POST saves:** `belims_settings_flash($type, $message, $tab)` stores one message per user in the transient `belims_settings_flash_<user_id>` (5 min). `belims_settings_print_flash()` (`admin_footer`, this page only) hands it to `admin.js` as `window.bpcSettingsFlash` and deletes it; admin.js shows the toast and reopens `tab`. Set by: dashboard FTG/BobGo toggles, BobGo enable, Store Details, product CSV import, BobGo environment (`load-options.php`), and every ACF form via `acf/save_post` (label from the posted tab). Failures: `belims_settings_verify_post()` (capability + nonce, flashes an error instead of `check_admin_referer()`'s die page) and the ACF nonce/capability check in `global_site_settings_acf_form_head()`.
- **Tab after save:** `admin.js` adds a hidden `bpc_tab` input (the form's tab id) to every form on submit.
- **Saving state:** on submit, submit buttons show **Saving…** and are disabled (after the browser has built the POST, so the button name is still sent) with a spinner (ACF forms use ACF's own). ACF `validation_begin` / `validation_failure` lock / restore the form; validation failure shows an error toast.
- **Unsaved changes:** ACF's page-wide `acf.unload` prompt is disabled on this page. Each form is snapshotted (serialised fields + file inputs, TinyMCE synced) after window `load`; `beforeunload` warns only if a form differs from its snapshot. A form is marked clean on submit (restored if the submit is cancelled, e.g. ACF validation). Tab switches never warn.

### Dashboard tab

- **System strip**: WordPress version, WooCommerce version, PHP version, CORS origin, Frontend URL
- **Integrations** postbox (status: *N of 4 active*): one card per entry of `belims_integration_statuses()` — name, status badge (`belims_integration_badge()`), description (FTG: last sync when connected) and **Configure** (`#tab-<id>`). No toggles since 2.10.5 — integrations are switched on/off in their own tabs (the card toggles saved on click, which re-enabled BobGo on staging).
- **Settings shortcuts** postbox: Branding, Store Details, Homepage, CORS & Security, WooCommerce
- **REST API endpoints** postbox (status: endpoint count): `belims/v1` endpoints with method and auth badges
- The dashboard's own header and the "Clear Frontend Cache" quick tool were removed in 2.10.0 (the button only opened `wp-admin` with a query string — no cache was cleared).

`$integrations_active` comes from `belims_integration_statuses()` (2.10.4), the same helper the WordPress Dashboard panel uses.

### WordPress Dashboard panel (2.10.4, `includes/class-dashboard-widgets.php`)

Full-width Site Settings panel at the top of **WP Admin → Dashboard**, for `manage_options` users. It replaces WordPress's Welcome panel (`load-index.php` → `remove_action('welcome_panel', 'wp_welcome_panel')` + `render_site_settings_panel()`), the only full-width slot above the widget columns; users can hide it via Screen Options → Welcome. Replaced the narrow "⚙️ Belims Site Settings" widget, whose checks (`bobgo_api_key`, `payment_api_key`, WooCommerce consumer keys) didn't match the real integrations.

- **Status strip (4):** Environment (`belims_environment()`, green dot in production, amber otherwise) · Products (published `product` count) · Last FTG sync · **Run Diagnostics** (disabled, "Coming soon" — not wired yet).
- **Integrations** (`badge` *N of 4 active*): one row per entry of `belims_integration_statuses()` — label, description and a status badge from `belims_integration_badge($tab, $integration, $settings_url)` — states that need attention render as an amber badge linking to the tab.
- **Quick links:** placeholder array `$quick_links` (tab id → label) rendered as a two-column shortcut list linking to Site Settings tabs, plus **Open Site Settings**.
- Styles: `sitebridge-ui.css` is enqueued on `index.php`; the panel is wrapped in `.sitebridge-ui` and uses the prototype classes `status-strip`, `dashboard-grid`, `panel`, `item-list`, `shortcut-grid` (arrow class `shortcut-arrow` — WP core styles a bare `.arrow:after`). `#welcome-panel:has(> .belims-dashboard-panel)` removes WP's dark Welcome styling. Below 900px the strip is 2×2; below 782px the columns stack.

`belims_integration_statuses()` labels (2.10.5): FTG — **Connected** (enabled + token + last connection OK) / **Not connected** (action); BobGo — **Enabled · Production|Sandbox** / **Disabled**; Firebase — **Configured** / **Setup** (action); AI Services — **Configured** / **Setup** (action). `active` = the good state; drives *N of 4 active* on both screens.

Last sync on the Dashboard and Products tab both read from `belims_get_ftg_last_sync_timestamp()` and display in `date_i18n('F j, Y, g:i a')` format.

### Settings Card (2.10.5)

Reusable on/off card with a deferred save — `belims_settings_card($card)` (PHP) + the SETTINGS CARD block in `admin.js`:

- Card = title, description, toggle + label; footer = help text + **Save**. Save is disabled until the toggle differs from `data-saved`; nothing is stored on toggle.
- Save → optional confirm when switching off (`confirm_off` → `data-confirm-off-*` → `window.bpcConfirm()`), then AJAX `belims_save_setting`; success → toast with the server message, `data-saved` updated, Save disabled again, `settings-card:saved` triggered with the new value; failure → error toast, Save stays enabled.
- `$card` keys: `id`, `setting`, `title`, `description`, `label`, `checked`, `help`, optional `confirm_off` = [title, text, confirm label]. New settings must be added to the whitelist in `belims_save_setting`.
- `window.bpcConfirm(title, description, confirmLabel)` → `Promise<boolean>` uses the page-level `<dialog id="bpc-alert-dialog" role="alertdialog">` (Cancel / Escape → false). The FTG tools' `ftgConfirmed()` uses it too.
- Styles: `.settings-card`, `.settings-card-body`, `.settings-card-footer` in `sitebridge-ui.css`.

### FTG Sync tab

Four `.panel`s matching `Prototype/index.html` (2.9.5; prototype classes are styled in `sitebridge-ui.css`). Element IDs are what the tab's two inline scripts bind to; keep them when restyling.

**Section layout (2.9.9)** — a left-column menu (**Connection · Auto Sync · Tools · Activity Log**) shows one panel at a time. Reusable for the other Integrations tabs:

```html
<div class="section-layout">
  <nav class="section-nav" aria-label="…">
    <button type="button" data-section="connection" aria-current="true">Connection</button>
    <button type="button" data-section="tools">Tools</button>
  </nav>
  <div class="section-content">
    <div data-section-pane="connection">…</div>
    <div data-section-pane="tools" hidden>…</div>
  </div>
</div>
```

`admin.js` (SECTION LAYOUT) handles clicks, sets `aria-current` and the panes' `hidden`, opens the `aria-current` item (else the first visible) on load, and exposes `window.bpcShowSection(layout, name)`. No URL change. Layout CSS (`.section-layout`, `.section-nav`) is in `sitebridge-ui.css`: 200px menu column, single column with a horizontal menu below 782px. On FTG, menu items with `data-requires="enabled"` are hidden while FTG is off, and turning it off returns to Connection.

0. **FTG integration** Settings Card (2.10.5, `#ftg-enabled-card`, setting `ftg_enabled`) above Connection status — see *Settings Card* below. Saving **off** first opens the alert dialog ("Disable FTG connection?"); on `settings-card:saved` the FTG script runs `ftgApplyEnabled()` (credentials, `#ftg-enabled-panels`, menu items, badge) and, when on, fires `ftg:tools-visible`. Credentials are kept when off.
1. **Connection status** (2.9.6, 2.9.7) — badge `#ftg-status-badge`: **Connected** (credentials saved + last connection OK) or **Not connected** (also while FTG is off); `data-on-class` / `data-on-label` hold the enabled state. Last catalogue sync. States:
   - **On, nothing stored** → form: email, password (+ Show), read-only token + **Get Token**, **Save Credentials**. Save is disabled until email + password are filled and Get Token succeeded for them (`ftgTokenVerified`); editing email/password clears the token. Get Token (`POST /ftg/login`) **stores nothing**; on success the form sets hidden `ftg_token_verified=1`, and **Save Credentials** — the only step that saves — submits over AJAX (`belims_save_ftg_credentials`, 2.9.8), stores email/password/token and records `belims_ftg_connection_status` as OK. No reload: a toast confirms or reports the error, and on success the grid, badge (Connected), stored values (`data-stored`) and saved view update in place; `window.bpcMarkFormClean()` (admin.js) resets the unsaved-changes snapshot, as do the toggle saves.
   - **On, stored** → `.credential-grid` with masked values (email, `BELIMS_FTG_PASSWORD_MASK`, token first 8 + `••••••••`), **Edit Credentials** + **Test Connection** (Test only exists in this view).
   - **Edit** → the form pre-filled from stored values (`data-stored`): email, password shown as `BELIMS_FTG_PASSWORD_MASK` (never the real password; Show disabled until a new one is typed; focusing selects the mask), stored token. Save is enabled for unchanged values; changing email/password clears the token and requires Get Token again. Posting the mask keeps the stored password (Save handler and `/ftg/login`, which uses the stored password for the mask only when the email matches). **Cancel** and **Disconnect FTG** (`clear_ftg_credentials`, behind the same alert dialog).
The saved view, Cancel / Disconnect and panels 2–4 are always rendered and toggled with `hidden` (2.9.8), so a first save or enabling FTG needs no reload. Panels 2–4 sit in `#ftg-enabled-panels`, hidden while FTG is off; Sync tools (`#ftg-sync-tools`) is hidden — with `#ftg-token-notice` shown — until credentials are saved. Brands are fetched only when Sync tools is visible (on load, or on the `ftg:tools-visible` event after Save / enable).

2. **Automatic synchronization** (enabled) — schedule select (Disabled / Hourly / Twice Daily / Daily / Weekly), next-run line, **Save Schedule**, **Run Now**.
3. **Tools** (enabled + credentials saved; container `#ftg-sync-tools`) — four postboxes split by effect (2.10.1):
   - **Brand & product** — Brand select (populated from the FTG API), Custom brand (for "Other"), Product SKU (used by Inspect Product and Sync Single Product).
   - **Look up** (`badge info` *Read only*) — Search Available Brands, Check Catalogue Count, Count Display On Web Active, Inspect Product (reads the SKU field; was a `prompt()`), Export Brand Products (CSV).
   - **Sync to WooCommerce** (`badge warn` *Changes products*) — rows: Selected brand → Sync first 10 (test), **Sync Catalogue** (primary); Single product → Sync Single Product; All brands → Dry run + Sync All Brands. VAT note.
   - **Maintenance** (`badge warn` *Caution*) — Cleanup Duplicate Attributes (`button-danger`).
   - Reports render inside the box whose button ran them (2.10.2): each of Look up / Sync to WooCommerce / Maintenance ends with a `.ftg-tool-result` area, and handlers resolve it with `$(this).closest('.postbox').find('.ftg-tool-result')`; Sync Single Product uses `#ftg-sync-single-result` in its row. Every writing action, Cleanup and Run Now go through the alert dialog via `window.ftgConfirmed(el, title, description, label)` — first click opens the dialog, confirm replays the click — instead of `confirm()`. Buttons restore their plain labels after running.
4. **Activity log** (enabled) — `#ftg-log` placeholder; not yet written to.

### BobGo Shipping tab

Enable toggle form (field-row layout, auto-saves). Settings section (API token form) collapses to a saved summary when production API token is set. "Edit Settings" / "Cancel" toggle the form.

---

## REST API Endpoints

All endpoints are under `/wp-json/belims/v1/`. In production, the Vercel frontend calls these via the `/api/` proxy (e.g. `/api/belims/v1/orders`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/products` | Public | Product listing (`view=listing\|detail`, `fields`, `featured`, `category`, `search`, `page`, `per_page`). Only sellable products (2.9.1): in stock, `_price` > 0, a category other than Uncategorized — `Belims_Products_Endpoint::is_sellable()`. Sends `Cache-Control: public, s-maxage=300` + ETag |
| `GET` | `/products/home` | Public | Homepage rail set (newest, best-stocked, deals, on sale, featured, Hand Tools), in stock, de-duplicated, listing fields. `Cache-Control: public, s-maxage=300` |
| `GET` | `/products/:id` | Public | Single product |
| `GET` | `/products/filters` | Public | Archive filter options (registered in `ftg-sync/class-ftg-sync-endpoint.php`) |
| `GET` | `/categories` | Public | Category tree (cached, ETag) |
| `GET` | `/homepage` | Public | Homepage sections (baked into the storefront at build time) |
| `GET` | `/ecommerce-policies` | Public | Policies, `store_locations`, `expert_contact` (`class-ecommerce-settings.php`; `Cache-Control: public, s-maxage=300` since 2.8.1) |
| `GET` | `/coupons?code=` | Public | Validate a coupon |
| `GET` | `/ai/config` | Public | AI feature config |
| `POST` | `/orders` | Public | Create WooCommerce order from headless checkout; saves an allowed `frontend_origin` as `_belims_frontend_origin` |
| `GET` | `/orders` | Logged in | Customer order history |
| `GET` | `/orders/:id?key=` | Order key, owning customer or shop manager | Single order details (404 otherwise) — `Belims_Orders_Endpoint::can_access_order()` |
| `POST` | `/shipping/calculate` | Public | BobGo shipping rates for an address |
| `POST` | `/track` | Public | Track a shipment |
| `POST` | `/users/register` · `/users/login` · `/users/logout` · `/users/check-email` | Public | Account auth |
| `GET` / `PUT` | `/users/me` | Logged in | Current user profile |
| `GET` | `/users` | Admin / shop manager | List users |
| `POST` | `/auth/firebase-phone` · `/auth/firebase-google` | Public (Firebase token verified server-side) | Firebase sign-in |
| `GET` | `/payfast/config` | Public | Public PayFast fields only (`merchantId`, URLs, `testMode`) |
| `POST` | `/payfast/initiate-payment` | Order key | Start a PayFast payment for a pending/failed order; amount = order total |
| `GET` | `/payfast/verify-payment/:order_id` · `/payfast/payment-status/:order_id` | Order key (`?key=`) | Payment status checks |
| `POST` | `/payfast/itn` | PayFast (signature + server validation) | PayFast ITN — the only path that marks an order paid |
| `POST` | `/payfast/test/mark-paid/:order_id` | `manage_options` | Testing only |
| `POST` | `/ftg/login` | Admin | Exchange FTG email+password for collection token. Stores nothing (2.9.7); password `BELIMS_FTG_PASSWORD_MASK` = use the stored password (same email only). Logs no credentials or tokens |
| `GET` | `/ftg/brands` · `/ftg/instances` · `/ftg/products/:token` · `/ftg/product/:sku` · `/ftg/sync/status` · `/ftg/display-on-web-count` | Admin | FTG catalogue reads |
| `GET` | `/ftg/brand-count` | Public | Count products for a brand |
| `POST` | `/ftg/sync` · `/ftg/sync/product` · `/ftg/cleanup-attributes` | Admin | FTG sync operations |

PayFast's browser return is handled outside the REST API (`includes/payfast/class-payfast-return-handler.php`, `template_redirect`). `includes/class-ecommerce-policies.php` registers a duplicate `/ecommerce-policies` route but is **not loaded**.

---

## CORS

Several storefronts can use the CMS at once (2.9.0). REST responses (and `OPTIONS` preflights) echo the caller's `Origin` when it is on the allowlist, with `Vary: Origin`; any other origin gets the default. Core `rest_send_cors_headers` is unhooked on `rest_api_init` because it echoes every origin.

Helper functions available globally:
- `get_cors_origins()` — allowlist: `https://www.belims.co.za`, `https://belims.vercel.app`, `http://localhost:3000`, plus `get_cors_origin()` / `get_frontend_url()`. Filter: `belims_cors_origins`.
- `belims_is_allowed_origin($origin)` / `belims_request_cors_origin()` — check / resolve the origin for the current request.
- `get_cors_origin()` / `get_frontend_url()` — the **default** storefront (ACF `headless_frontend_url`, currently `https://belims.vercel.app`).
- `belims_order_frontend_url($order)` — the storefront an order was placed on (`_belims_frontend_origin`), else the default. Used for PayFast return/cancel URLs.

---

## FTG Sync (`includes/ftg-sync/`)

Syncs brand/product data from the FTG supplier feed.

| File | Purpose |
|------|---------|
| `class-ftg-api.php` | FTG API client |
| `class-ftg-sync-endpoint.php` | REST endpoint + sync logic. Writes `belims_ftg_last_sync` as `['time' => mysql_datetime, ...]` |
| `admin-ftg-sync-page.php` | Legacy admin page (writes `belims_ftg_last_sync` as Unix timestamp) |

### Sync eligibility (v2.5.0, trash/restore v2.9.1)

A product is only created/updated when FTG provides **stock quantity > 0**, **selling price > 0** and **at least one web category** (`webUrlHierarchyCollection.web_hierarchy`). Applies to bulk sync and single-SKU sync via `get_missing_required_fields()`. Failing products are never imported and are reported as skipped (`reason: Missing stock, price, …`).

- **Existing CMS product fails** → moved to the trash (`trash_ineligible_products()`), reason suffixed *— CMS product moved to trash*.
- **Trashed product qualifies again** → `resolve_existing_product_id()` untrashes it **and publishes it** (same ID/URL), then updates it. (WordPress restores trashed posts as drafts by default.)
- Lookup by SKU / `_ftg_product_code` / `_ftg_one_id` across all statuses: `find_existing_product_ids()`.

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
The official **Bob Go Smart Shipping** WooCommerce plugin (`bobgo-shipping`, class `BobGo_Shipping\app\Shipping`) handles rate retrieval; it replaced the legacy uAfrica plugin (`uafrica-shipping`, now inactive) on 2026-09-25. The headless app POSTs a delivery address plus the cart `items` (`[{id, quantity}]` — Bob Go returns no rates for an empty package) to `/belims/v1/shipping/calculate`, which builds a WC package from them and instantiates the Bob Go shipping method and calls `get_rates_for_package()` (falls back to the uAfrica class if Bob Go isn't active; `service_code` comes from rate meta `bobgo_service_code`, else `uafrica_service_code`). The tracking endpoint uses `BobGo_Shipping\app\Admin::get_api_domain()` the same way. No BobGo API token is required in GSS (the Bob Go plugin holds its own connection). The storefront never shows placeholder rates outside localhost — with no live rates, checkout can't continue.

#### 2. Order sync
BobGo connects to WooCommerce as a sales channel and pulls paid orders via the WooCommerce REST API / webhook system. Orders appear in the BobGo dashboard automatically once payment is confirmed (status → `processing`). The service-code order meta (`bobgo_service_code`, formerly `uafrica_service_code`) tells BobGo which shipping service the customer selected — **note:** headless orders (`POST /orders`) currently save the shipping line without it (see ROADMAP).

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
| `test_bobgo_connection` | Tests BobGo Bearer token auth via `GET /webhooks` |
| `belims_check_order_sync` | Returns shipping items and BobGo meta for a given WC order ID |
| `belims_trigger_order_sync` | Patches `method_id` on legacy orders and manually triggers `create_bobgo_order()` |
| `clear_ftg_credentials` | Clears saved FTG API credentials, auth token and `belims_ftg_connection_status`; turns FTG off |
| `belims_save_setting` | Settings Card save (2.10.5): `setting` + `value` (0/1); only whitelisted ACF option fields (`ftg_enabled`) — nonce `belims_save_setting` (`bpcAdminData.settings_nonce`); returns `{value, message}` for the toast |
| `belims_save_ftg_credentials` | FTG tab Save Credentials (form `ftg_nonce`): validates email + token, keeps the stored password when `BELIMS_FTG_PASSWORD_MASK` is posted, marks the connection OK when `ftg_token_verified`; returns `{message, email, token, token_prefix, connected}` or `{message}` with 400/403 |
| `belims_save_ftg_connection_status` | Records `{ok, time, message}` in `belims_ftg_connection_status` after Test Connection / Get Token |
| `export_woocommerce_products` | Exports products as CSV/JSON |
| `belims_sync_single_product` | Triggers FTG sync for a single product |
| `belims_save_ftg_cron_frequency` | Saves `belims_ftg_cron_frequency` and reschedules `belims_ftg_auto_sync` |
| `belims_run_ftg_cron_now` | Immediately fires `belims_ftg_auto_sync` action |

All admin AJAX handlers require `manage_options` capability and a valid nonce.

---

## PayFast (`includes/payfast/`)

| File | Purpose |
|------|---------|
| `class-payfast-api.php` | REST routes; builds the payment payload from the order (server-side amount, `custom_str1` = order key); ITN handler |
| `class-payfast-return-handler.php` | Handles `/payfast/return` — **never changes the order**; checks the key and redirects to `belims_order_frontend_url($order)/checkout?order_id=…&payment_status=…&return_source=payfast` (+ `order_key` when valid) |
| `class-payfast-admin-page.php` | Admin test panel |

**ITN (2.9.0):** an order is marked paid only when all pass — signature over the posted fields in order (empty values included, `&passphrase=` appended), `custom_str1` = order key, amount = order total (±0.01), and PayFast's `/eng/query/validate` returns `VALID`. Already-paid orders are acknowledged without changes. Logs: WooCommerce → Status → Logs → `payfast-api`.

**Return / cancel URLs** use `belims_order_frontend_url($order)` — the storefront the order was placed on.

---

## Media Folders (`includes/class-media-folders.php`)

Hierarchical `media_folder` taxonomy on attachments.

- **Media → Folders** admin page to add/rename/nest folders.
- Seeded once (option `belims_media_folders_seeded`): Global, Products, Brands, Campaigns.
- Folder column + dropdown filter in Media Library list view; folder dropdown in grid view / media modal (`assets/js/media-folders.js`, filtered server-side via `ajax_query_attachments_args`).
- Assign a folder from the attachment edit screen (Folders field).
- `Belims_Media_Folders::assign_to($attachment_id, $slug)` adds an attachment to a folder without removing existing ones. FTG sync assigns every imported product image to **Products** (v2.6.0).

---

## Homepage (`includes/class-homepage.php`, v2.8.0, targets v2.9.0)

Homepage content is edited in **Site Settings → Homepage** and baked into the storefront **at build time** (keeps the hero LCP preload static and home-only).

| Piece | Detail |
|-------|--------|
| ACF | `group_belims_homepage` → Flexible Content `homepage_sections` (options). Layout `hero` (max 1): enabled, title, description, button_text, button_link, image (ID), image_mobile (ID, optional), alt |
| Endpoint | `GET /belims/v1/homepage` → `{ version, sections: [{ type: "hero", title, description, button:{text,link}, image:{url,width,height,alt}, image_mobile }] }`. Disabled/incomplete sections omitted. `Cache-Control: public, max-age=60` |
| Rebuild on save | `acf/save_post` (options) compares payload `version` with option `belims_homepage_version`; when changed, schedules Action Scheduler `belims_homepage_deploy` (group `belims-homepage`) 60s out — rapid saves coalesce into one build |
| Rebuild target | Option `belims_homepage_deploy_target` = `preview` (default) / `production` / `both` — *Saving rebuilds* radio. `Belims_Homepage::TARGETS`: preview → `belims.vercel.app` (`main`), production → `www.belims.co.za` (`vercel`) |
| Deploy hooks | Options `belims_vercel_deploy_hook_preview` / `_production` (must start `https://api.vercel.com/v1/integrations/deploy/`), masked in UI. A legacy `belims_vercel_deploy_hook` migrates into the preview slot on `admin_init`. Last result in `belims_homepage_deploy_log` |
| Live check | Per target: reads `<target url>/homepage-version.json` written by the storefront build; shows Up to date / Out of date / Publishing… / Unreachable |

Storefront side: `frontend/build/homepagePlugin.ts` fetches the endpoint at build (10s timeout; falls back to `frontend/content/homepage.fallback.json` with a build-log warning), exposes `virtual:homepage`, injects the hero preload into `index.html`, and writes `app.html` (no preload, served for all other routes via `vercel.json`) + `homepage-version.json`.

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

Plugin files are owned by app user `uhkkwupuum`, group `www-data` (group-writable). The SSH master user (`master_ggrkakuzjf`, in `www-data`) can deploy over SSH/SCP to `applications/uhkkwupuum/public_html/wp-content/plugins/global-site-settings/` (verified 2026-10-01); Cloudways File Manager also works. Use `../deploy.sh` (full plugin) or a targeted upload of changed files — see [docs/OPERATIONS.md → CMS plugin deploys](../../../docs/OPERATIONS.md#cms-plugin-deploys). The agent deploys these files to Cloudways **only after the user explicitly approves** each deploy (files + target listed).

Do not override files owned by other plugins (e.g. `uafrica-shipping`).

---

## Known Constraints

- **Firebase verification**: `BELIMS_FIREBASE_API_KEY` must be defined in `wp-config.php` (set on production 2026-10-01). Without it, `/auth/firebase-phone` and `/auth/firebase-google` refuse sign-in (fail closed). Accounts are identified only by the Firebase-verified phone/email — client-supplied values are ignored.
- **BobGo API keys**: The current BobGo plan does not allow API key creation. Direct API calls (`class-bobgo-order-handler.php`) are disabled. Order sync relies on the BobGo ↔ WooCommerce channel integration.
- **CORS**: The allowlist is code-defined (`get_cors_origins()`, filter `belims_cors_origins`); ACF `headless_frontend_url` only sets the default.
- **FTG last sync format**: Two code paths write different formats to `belims_ftg_last_sync`. Always use `belims_get_ftg_last_sync_timestamp()` to read it.
