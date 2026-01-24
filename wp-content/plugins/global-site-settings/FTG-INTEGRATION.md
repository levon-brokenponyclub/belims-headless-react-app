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
curl -X POST https://wordpress-1482444-6163809.cloudwaysapps.com/wp-json/belims/v1/ftg/instances \
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
curl https://wordpress-1482444-6163809.cloudwaysapps.com/wp-json/belims/v1/ftg/products/YOUR_TOKEN?limit=10
```

### 4. Sync Products to WooCommerce

**Manual Sync via REST API:**

```bash
curl -X POST https://wordpress-1482444-6163809.cloudwaysapps.com/wp-json/belims/v1/ftg/sync \
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
curl https://wordpress-1482444-6163809.cloudwaysapps.com/wp-json/belims/v1/ftg/sync/status
```

## Available Endpoints

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

| FTG Field                      | WooCommerce Field        |
| ------------------------------ | ------------------------ |
| `code` / `mdrProductCode`      | SKU                      |
| `description` / `name`         | Product Name             |
| `longDescription`              | Description              |
| `shortDescription`             | Short Description        |
| `price` / `sellingPrice`       | Regular Price (excl VAT) |
| `stockLevel` / `quantity`      | Stock Quantity           |
| `departmentDescription`        | Category                 |
| `primaryImageUrl` / `imageUrl` | Product Image            |

### Metadata Stored:

- `_ftg_one_id`: FTG product ID
- `_ftg_product_code`: FTG product code
- `_ftg_last_sync`: Last sync timestamp

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

## Files Created

- `/includes/class-ftg-api.php` - FTG API client
- `/includes/class-ftg-sync-endpoint.php` - WordPress REST endpoints
- Updated: `belims-headless-api.php` - Plugin loader
- Updated: `acf-field-groups.php` - Settings UI fields
