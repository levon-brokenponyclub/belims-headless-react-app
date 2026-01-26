# Find The Gap Integration - Setup Guide

## Overview

The Belims Headless API plugin now includes modular integration with Find The Gap (FTG) product supplier API.

## Setup Steps

### 1. Configure FTG Credentials

Go to WordPress Admin → Belims Settings → APIs Tab

Fill in:

- **Enable Find The Gap Integration**: Toggle ON
- **FTG Account Email**: Your FTG login email
- **FTG Account Password**: Your FTG password
- **FTG Collection Token**: (Leave blank initially, get from step 2)

### 2. Get Your Collection Token

**Option A: Use REST API**

```bash
# Login and get collection token
curl -X POST https://cms.belims.co.za/wp-json/belims/v1/ftg/instances \
  -H "Authorization: Bearer YOUR_WP_AUTH_TOKEN"
```

**Option B: Direct FTG API**

```bash
# 1. Login to FTG
curl -X POST https://gateway.ftgone.co.za/v2/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'

# 2. Get instances (collection tokens)
curl -X GET https://gateway.ftgone.co.za/v2/instances \
  -H "Authorization: Bearer YOUR_FTG_TOKEN"
```

Copy the `collectionToken` value and paste it into the Belims Settings.

### 3. Preview Products (Optional)

Test the connection by viewing products:

```bash
curl https://cms.belims.co.za/wp-json/belims/v1/ftg/products/YOUR_TOKEN?limit=10
```

### 4. Sync Products to WooCommerce

**Manual Sync via REST API:**

```bash
curl -X POST https://cms.belims.co.za/wp-json/belims/v1/ftg/sync \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WP_AUTH_TOKEN" \
  -d '{
    "collection_token": "YOUR_COLLECTION_TOKEN",
    "limit": 100,
    "offset": 0
  }'
```

**Response:**

```json
{
  "success": true,
  "synced": 95,
  "total": 100,
  "errors": []
}
```

### 5. Check Sync Status

```bash
curl https://cms.belims.co.za/wp-json/belims/v1/ftg/sync/status
```

## Admin UI Testing

The FTG Sync admin page (WordPress Admin → FTG Sync) provides convenient buttons for testing:

### Get Token

Retrieves your FTG collection token using saved credentials

### Test Connection

Verifies FTG API credentials and displays account information

### Inspect Product

Fetches a single product from FTG by SKU for debugging data mapping issues:

- Enter any FTG product SKU (e.g., "0-6200-2402-4")
- Returns full FTG product JSON structure
- Useful for verifying stock levels, categories, prices, brand data

### Test Sync (5 Products)

Syncs first 5 products from FTG to test the sync process without affecting all products

### Sync All Products

Performs full product sync from FTG to WooCommerce

### Disconnect FTG

Clears saved FTG credentials and collection token

## Available Endpoints

### GET `/wp-json/belims/v1/ftg/product/{sku}`

Inspect a single FTG product by SKU for debugging

- **Params**: SKU in URL path
- **Auth**: WordPress admin
- **Returns**: Full FTG product JSON structure
- **Example**: `/wp-json/belims/v1/ftg/product/0-6200-2402-4`

### GET `/wp-json/belims/v1/ftg/instances`

Get list of FTG collection tokens

- **Auth**: WordPress admin

### GET `/wp-json/belims/v1/ftg/products/{token}`

Preview products from FTG before syncing

- **Params**: `page`, `limit`
- **Auth**: WordPress admin

### POST `/wp-json/belims/v1/ftg/sync`

Sync products from FTG to WooCommerce

- **Body**: `{collection_token, limit, offset}`
- **Auth**: WordPress admin
- **Action**: Creates/updates WooCommerce products

### GET `/wp-json/belims/v1/ftg/sync/status`

Get last sync information

- **Auth**: WordPress admin

## Product Mapping

FTG products are mapped to WooCommerce as follows:

| FTG Field                                   | WooCommerce Field              |
| ------------------------------------------- | ------------------------------ |
| `code` / `mdrProductCode`                   | SKU                            |
| `description` / `name`                      | Product Name                   |
| `longDescription`                           | Description                    |
| `shortDescription`                          | Short Description              |
| `sellingPrice.priceExcl`                    | Regular Price (excl VAT)       |
| `stockLocations[0].stockLocations[0].stock` | Stock Quantity                 |
| `categoryTree[]`                            | Categories (hierarchical)      |
| `brandDescription`                          | Brand (product_brand taxonomy) |
| `primaryImageUrl` / `imageUrl`              | Product Image                  |

### Metadata Stored:

- `_ftg_one_id`: FTG product ID
- `_ftg_product_code`: FTG product code
- `_ftg_last_sync`: Last sync timestamp

### Special Handling:

**Price on Application (POA)**:

- Products with invalid/zero prices automatically set to "POA"
- Regular price set to 0
- Product tagged with "POA" for frontend filtering

**Brand Taxonomy**:

- Brands stored as custom taxonomy: `product_brand`
- Hierarchical structure with WordPress admin UI
- Accessible at: `/wp-admin/edit-tags.php?taxonomy=product_brand&post_type=product`
- Synced from FTG `brandDescription` field
- Available in REST API for frontend filtering

**Categories**:

- Supports nested category structures from FTG `categoryTree`
- Creates parent-child relationships automatically
- Handles multiple category levels (e.g., Tools > Power Tools > Drills)

## VAT Handling

- FTG prices are stored as regular prices (excl VAT)
- Frontend displays prices with 15% VAT added (handled by functions.php)
- This keeps product data consistent with FTG source

## Automation (Future Enhancement)

To enable automatic daily syncs, add this to your theme's functions.php:

```php
// Schedule daily FTG product sync
if (!wp_next_scheduled('belims_ftg_daily_sync')) {
    wp_schedule_event(strtotime('03:00:00'), 'daily', 'belims_ftg_daily_sync');
}

add_action('belims_ftg_daily_sync', function() {
    $collection_token = get_field('ftg_collection_token', 'option');

    if (!$collection_token) return;

    wp_remote_post(rest_url('belims/v1/ftg/sync'), array(
        'body' => json_encode(array(
            'collection_token' => $collection_token,
            'limit' => 500,
        )),
        'headers' => array('Content-Type' => 'application/json'),
    ));
});
```

## Troubleshooting

### "Authentication failed"

- Check FTG email/password in Belims Settings
- Verify FTG account is approved (registration may require approval)

### "No products found"

- Verify collection token is correct
- Check if FTG account has products assigned

### "Image download failed"

- FTG image URLs must be publicly accessible
- Check WordPress upload permissions

### "Duplicate SKUs"

- Products are matched by SKU
- Existing products with same SKU will be updated, not duplicated

## Security Notes

- FTG credentials stored in WordPress options (use object cache encryption in production)
- Auth tokens cached for 24 hours to minimize API calls
- Only WordPress admins can trigger syncs
- CORS headers allow frontend API access

## Plugin Structure

```
wp-content/plugins/global-site-settings/
├── global-site-settings.php           # Main plugin file, registers hooks and loads includes
├── FTG-INTEGRATION.md                 # This documentation file
├── assets/
│   ├── css/
│   │   └── admin.css                  # Consolidated admin styles with Belims branding
│   ├── js/
│   │   └── admin.js                   # Consolidated admin JavaScript with tab navigation
│   └── images/
│       └── belims-logo-white.png      # Belims logo for login page
└── includes/
    ├── acf-field-groups.php           # ACF field definitions for Site Settings
    ├── admin-ftg-sync-page.php        # FTG Sync admin page UI with test buttons
    ├── class-categories-endpoint.php  # REST endpoint for categories
    ├── class-ftg-api.php              # FTG API client with authentication
    ├── class-ftg-sync-endpoint.php    # FTG sync REST endpoints with brand taxonomy
    ├── class-orders-endpoint.php      # REST endpoint for orders
    └── class-products-endpoint.php    # REST endpoint for products with brand filtering
```

## Production Environment

**Domain**: [cms.belims.co.za](https://cms.belims.co.za)

**Hosting**: Cloudways (wordpress-1482444-6163809.cloudwaysapps.com)

**DNS**: CNAME record pointing to Cloudways server

**Headless Architecture**:

- Backend: WordPress + WooCommerce (cms.belims.co.za)
- Frontend: React/TypeScript separate application
- Home redirect: `/` → `/wp-login.php` (headless CMS only)

## Branding & UI

**Belims Brand Colors**:

- Primary Blue: `#322783`
- Light Blue: `#4a3fc2` (hover states)
- Orange: `#f97316` (accent)
- Red: `#e40613` (toggles, danger actions)
- Gray: `#f4f6f8` (backgrounds)

**Login Page**:

- Custom gradient background (blue)
- Belims logo replaces WordPress logo
- Rounded input fields with modern styling

**Admin Interface**:

- Consolidated CSS (admin.css) with CSS variables
- Primary buttons: Belims blue with 2px border
- Secondary buttons: Transparent with blue border
- Toggle switches: Belims red when active
- Tab navigation with consistent styling
