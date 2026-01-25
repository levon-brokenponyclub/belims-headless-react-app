# BobGo Shipping Integration

## Overview

This document details the integration of BobGo shipping services into the Belims Hardware WooCommerce store. BobGo provides real-time shipping rate calculations, order synchronization, shipment submissions, and tracking event management.

**Integration Status:** 🚧 In Progress

**Last Updated:** January 25, 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Environment Setup](#environment-setup)
3. [Authentication](#authentication)
4. [Core Features](#core-features)
5. [API Endpoints](#api-endpoints)
6. [WooCommerce Integration](#woocommerce-integration)
7. [Workflows](#workflows)
8. [Webhooks](#webhooks)
9. [Admin UI](#admin-ui)
10. [Testing](#testing)
11. [Production Deployment](#production-deployment)

---

## Introduction

### What is BobGo?

BobGo is a comprehensive shipping platform that provides:

- **Rates at Checkout (RAC)**: Real-time shipping quotes during checkout
- **Order Synchronization**: Keep orders in sync between WooCommerce and BobGo
- **Shipment Submission**: Submit shipments to couriers via API
- **Tracking & Updates**: Real-time tracking events and status updates
- **Multi-Courier Support**: Access multiple courier services through single API

### Integration Goals

- Display real-time shipping rates at checkout
- Automatically create shipments when orders are placed
- Provide tracking updates to customers
- Manage shipments through WordPress admin
- Support multiple courier options

---

## Environment Setup

### Sandbox Environment

**Base URL:** `https://api.sandbox.bobgo.co.za/v2/`

**Sandbox Account:**

1. Register at [https://sandbox.bobgo.co.za/](https://sandbox.bobgo.co.za/)
2. Obtain API bearer token from Settings menu
3. Pre-loaded with test credits
4. Create unlimited test shipments

### Production Environment

**Base URL:** `https://api.bobgo.co.za/v2/`

**Production Setup:**

1. Create production BobGo account
2. Obtain production bearer token
3. Configure actual courier accounts
4. Update plugin settings with production credentials

### WordPress Requirements

- WordPress 5.8+
- WooCommerce 5.0+
- PHP 7.4+
- SSL certificate (required for webhooks)
- Global Site Settings plugin

---

## Authentication

### Bearer Token Authentication

All API requests require a Bearer token in the Authorization header:

```
Authorization: Bearer YOUR_API_TOKEN_HERE
```

### Token Storage

Tokens are stored securely in ACF options:

- `bobgo_api_token` - Bearer token
- `bobgo_environment` - "sandbox" or "production"
- `bobgo_base_url` - API base URL

### Token Management

```php
// Get current token
$token = get_field('bobgo_api_token', 'option');

// Get base URL based on environment
$env = get_field('bobgo_environment', 'option');
$base_url = ($env === 'production')
    ? 'https://api.bobgo.co.za/v2/'
    : 'https://api.sandbox.bobgo.co.za/v2/';
```

---

## Core Features

### 1. Rates at Checkout (RAC)

Retrieve dynamic shipping rates during checkout based on:

- Cart weight and dimensions
- Delivery address
- Available courier services
- Configured rate types (fixed, courier, formula)

**Endpoint:** `POST /rates_at_checkout`

### 2. Order Management

- Create orders in BobGo when WooCommerce orders are placed
- Update order status synchronization
- Retrieve order fulfillment status
- Support for returns

**Endpoints:**

- `POST /orders` - Create order
- `PATCH /orders/{id}` - Update order
- `GET /orders` - Get orders
- `GET /orders/{id}/fulfillments` - Get fulfillments

### 3. Shipment Management

- Create shipments for orders
- Generate waybills (standard and sticker formats)
- Cancel shipments
- Retrieve proof of delivery (POD)

**Endpoints:**

- `POST /shipments` - Create shipment
- `GET /shipments/{id}/waybill` - Get waybill
- `GET /shipments/{id}/waybill/sticker` - Get sticker waybill
- `POST /shipments/{id}/cancel` - Cancel shipment
- `GET /shipments/{id}/pod` - Get POD

### 4. Tracking Events

Retrieve real-time tracking information for shipments.

**Endpoint:** `GET /tracking_events`

### 5. Webhooks

Subscribe to real-time events:

- Tracking updated
- Fulfillment created
- Shipment submission status updated
- Shipment charged amount changed
- Shipment health status updated

**Endpoints:**

- `POST /webhooks` - Subscribe
- `GET /webhooks` - List subscriptions
- `DELETE /webhooks/{id}` - Unsubscribe

---

## API Endpoints

### POST /rates_at_checkout

Get shipping rates for checkout.

**Request:**

```json
{
  "collection_address": {
    "type": "business",
    "company": "Belims Hardware",
    "street_address": "123 Main Street",
    "local_area": "Suburb",
    "city": "Cape Town",
    "zone": "Western Cape",
    "country": "ZA",
    "code": "8001"
  },
  "delivery_address": {
    "type": "residential",
    "street_address": "456 Oak Avenue",
    "local_area": "Gardens",
    "city": "Cape Town",
    "zone": "Western Cape",
    "country": "ZA",
    "code": "8001"
  },
  "parcels": [
    {
      "parcel_description": "Hardware items",
      "submitted_length_cm": 30,
      "submitted_width_cm": 20,
      "submitted_height_cm": 15,
      "submitted_weight_kg": 5.5
    }
  ]
}
```

**Response:**

```json
{
  "rates": [
    {
      "service_level": {
        "name": "Standard Delivery",
        "code": "STANDARD"
      },
      "courier": {
        "name": "Courier Company",
        "logo_url": "https://..."
      },
      "total_price": 85.5,
      "currency": "ZAR",
      "estimated_delivery_days": 3
    }
  ]
}
```

### POST /orders

Create an order in BobGo.

**Request:**

```json
{
  "external_order_number": "WC-12345",
  "external_order_url": "https://cms.belims.co.za/wp-admin/post.php?post=12345",
  "customer_reference": "Customer Name",
  "collection_address": {
    /* address object */
  },
  "delivery_address": {
    /* address object */
  },
  "parcels": [
    /* parcel objects */
  ]
}
```

### POST /shipments

Create a shipment.

**Request:**

```json
{
  "order_reference": "order_id_from_bobgo",
  "service_level_code": "STANDARD",
  "courier_code": "COURIER_CODE",
  "collection_min_date": "2026-01-26",
  "collection_after": "09:00",
  "collection_before": "17:00"
}
```

**Response:**

```json
{
  "id": "shipment_id",
  "tracking_number": "TRACK123456",
  "waybill_url": "https://..."
}
```

### GET /tracking_events

Get tracking events for a shipment.

**Query Parameters:**

- `tracking_number` - Tracking number to query
- `shipment_id` - Or query by shipment ID

**Response:**

```json
{
  "events": [
    {
      "timestamp": "2026-01-25T10:30:00Z",
      "status": "collected",
      "description": "Parcel collected from sender",
      "location": "Cape Town"
    }
  ]
}
```

---

## WooCommerce Integration

### Custom Shipping Method

Create a custom WooCommerce shipping method class:

**File:** `includes/class-bobgo-shipping-method.php`

```php
class Belims_BobGo_Shipping_Method extends WC_Shipping_Method {

    public function __construct($instance_id = 0) {
        $this->id = 'bobgo_shipping';
        $this->instance_id = absint($instance_id);
        $this->method_title = __('BobGo Shipping', 'belims');
        $this->method_description = __('Real-time shipping rates from BobGo', 'belims');
        $this->supports = ['shipping-zones', 'instance-settings'];

        $this->init();
    }

    public function calculate_shipping($package = []) {
        // Get cart items and calculate total weight/dimensions
        // Call BobGo API for rates
        // Add rates to WooCommerce
    }
}
```

### Order Hooks

**Hook into WooCommerce order creation:**

```php
// When order status changes to processing, create shipment
add_action('woocommerce_order_status_processing', 'belims_create_bobgo_shipment', 10, 1);

function belims_create_bobgo_shipment($order_id) {
    $order = wc_get_order($order_id);

    // Check if already created
    if ($order->get_meta('_bobgo_shipment_id')) {
        return;
    }

    // Create order in BobGo
    // Create shipment
    // Store shipment ID and tracking number
}
```

### Tracking Display

**Show tracking on order page:**

```php
add_action('woocommerce_order_details_after_order_table', 'belims_display_tracking_info', 10, 1);

function belims_display_tracking_info($order) {
    $tracking_number = $order->get_meta('_bobgo_tracking_number');

    if ($tracking_number) {
        echo '<h2>Shipment Tracking</h2>';
        echo '<p>Tracking Number: <strong>' . esc_html($tracking_number) . '</strong></p>';
        // Display tracking events
    }
}
```

---

## Workflows

### Checkout Flow

1. Customer adds products to cart
2. Proceeds to checkout and enters delivery address
3. WooCommerce calls `calculate_shipping()` method
4. Plugin calls BobGo `POST /rates_at_checkout` with cart details
5. BobGo returns available shipping options
6. Customer selects shipping method
7. Completes order

### Order Fulfillment Flow

1. Order created in WooCommerce (status: pending)
2. Payment confirmed (status: processing)
3. `woocommerce_order_status_processing` hook fires
4. Plugin creates order in BobGo via `POST /orders`
5. Plugin creates shipment via `POST /shipments`
6. BobGo returns tracking number and waybill
7. Plugin stores tracking info in order meta
8. Waybill emailed to admin for printing
9. Webhooks update order status as shipment progresses

### Tracking Update Flow

1. Courier updates shipment status
2. BobGo receives update from courier
3. BobGo sends webhook to WordPress
4. Plugin receives webhook at `POST /wp-json/belims/v1/bobgo/webhook`
5. Plugin updates order meta with tracking event
6. Plugin sends email to customer with update
7. Tracking displayed on customer's order page

---

## Webhooks

### Webhook Subscription

Subscribe to webhooks during plugin activation:

```php
POST /webhooks
{
  "url": "https://cms.belims.co.za/wp-json/belims/v1/bobgo/webhook",
  "event": "tracking.updated"
}
```

### Available Events

- `tracking.updated` - Shipment tracking status changed
- `fulfillment.created` - Order fulfilled
- `shipment.submission_status_updated` - Submission to courier updated
- `shipment.charged_amount_changed` - Charged amount changed
- `shipment.health_status_updated` - Shipment health status changed

### Webhook Endpoint

**File:** `includes/class-bobgo-webhook-endpoint.php`

```php
public function register_routes() {
    register_rest_route('belims/v1', '/bobgo/webhook', [
        'methods' => 'POST',
        'callback' => [$this, 'handle_webhook'],
        'permission_callback' => [$this, 'verify_webhook']
    ]);
}

public function handle_webhook($request) {
    $data = $request->get_json_params();
    $event_type = $data['event'] ?? '';

    switch ($event_type) {
        case 'tracking.updated':
            $this->handle_tracking_update($data);
            break;
        // Handle other events
    }
}
```

---

## Admin UI

### Settings Tab

Add "BobGo Shipping" tab to Global Site Settings:

**Fields:**

- Environment (Sandbox/Production) - Radio buttons
- API Bearer Token - Text input
- Test Connection - Button
- Collection Address - Address fields
- Default Parcel Dimensions - Number inputs
- Enable Auto-Shipment - Toggle
- Webhook Status - Display only

### Shipment Management

Add meta box to WooCommerce order edit page:

**BobGo Shipment Information:**

- Order ID in BobGo
- Shipment ID
- Tracking Number
- Courier Name
- Service Level
- Waybill Download Link
- Current Status
- Tracking Events Timeline
- Actions: Create Shipment, Cancel Shipment, Refresh Tracking

### Testing Buttons

**Test Connection:** Verify API credentials are valid

**Get Sample Rates:** Test rate calculation with sample data

**View Webhooks:** List active webhook subscriptions

---

## Testing

### Sandbox Testing Checklist

- [ ] API connection test successful
- [ ] Checkout rates calculation working
- [ ] Multiple courier options displayed
- [ ] Order creation in BobGo successful
- [ ] Shipment creation successful
- [ ] Waybill generation working
- [ ] Tracking number stored correctly
- [ ] Webhook receiving tracking updates
- [ ] Customer email notifications sending
- [ ] Admin shipment management UI functional
- [ ] Shipment cancellation working

### Test Addresses

**Collection Address (Belims):**

```
Type: Business
Company: Belims Hardware
Street: [Your warehouse address]
City: Cape Town
Province: Western Cape
Postal Code: 8001
Country: ZA
```

**Test Delivery Address:**

```
Type: Residential
Street: 123 Test Street
Suburb: Gardens
City: Cape Town
Province: Western Cape
Postal Code: 8001
Country: ZA
```

### Test Products

Create test products with realistic:

- Weight (0.5kg - 25kg)
- Dimensions (small to large items)
- Various product combinations in cart

---

## Production Deployment

### Pre-Launch Checklist

- [ ] Switch to production API credentials
- [ ] Update base URL to production
- [ ] Configure actual collection address
- [ ] Set up production courier accounts in BobGo
- [ ] Configure rate types in BobGo dashboard
- [ ] Test checkout flow end-to-end
- [ ] Subscribe to production webhooks
- [ ] Set up SSL certificate (required)
- [ ] Configure email notifications
- [ ] Train staff on shipment management

### Configuration Steps

1. Log into production BobGo account
2. Copy bearer token from Settings
3. Go to WordPress Admin → Global Site Settings → BobGo Shipping
4. Select "Production" environment
5. Paste production bearer token
6. Click "Test Connection"
7. Update collection address
8. Save settings
9. Test checkout on frontend
10. Process test order

### Monitoring

Monitor the following in production:

- Failed API requests (log in plugin)
- Webhook delivery failures
- Shipment creation errors
- Rate calculation timeouts
- Tracking update delays

### Support

**BobGo Support:**

- Email: support@bobgo.co.za
- Documentation: https://api-docs.bob.co.za/bobgo
- Dashboard: https://bobgo.co.za

---

## File Structure

```
wp-content/plugins/global-site-settings/
├── includes/
│   ├── class-bobgo-shipping-method.php    # WooCommerce shipping method
│   ├── class-bobgo-api.php                # API wrapper
│   ├── class-bobgo-webhook-endpoint.php   # Webhook handler
│   └── class-bobgo-admin.php              # Admin UI
├── assets/
│   ├── css/
│   │   └── admin.css                      # Existing admin styles
│   └── js/
│       └── admin.js                       # Existing admin JS
└── BOBGO-INTEGRATION.md                   # This file
```

---

## Development Notes

### Key Considerations

- **Weight Calculation:** Aggregate all cart items into parcels (max 30kg per parcel)
- **Dimensional Weight:** Consider volumetric weight for large, light items
- **Address Validation:** Ensure addresses are complete before API calls
- **Error Handling:** Gracefully handle API timeouts and failures
- **Caching:** Consider caching rates for same cart/address combination
- **Fallback Rates:** Provide manual rates if API is unavailable
- **Multi-Parcel:** Support splitting orders into multiple parcels
- **Insurance:** Option to add insurance to shipments
- **Special Instructions:** Field for delivery instructions

### Rate Types

BobGo supports multiple rate types:

- **Fixed Rates:** Flat rate per zone
- **Courier Rates:** Real-time courier pricing
- **Formula Rates:** Custom formulas based on weight/distance
- **Dynamic Rates:** Configured in BobGo dashboard

### Best Practices

1. **Always validate** addresses before API calls
2. **Cache rates** for 5-10 minutes to reduce API calls
3. **Log all API requests** for debugging
4. **Provide fallback** shipping options
5. **Test with various** product combinations
6. **Monitor webhook** delivery success
7. **Handle timeouts** gracefully (set 10s timeout)
8. **Sanitize all data** before sending to API
9. **Store tracking history** for customer service
10. **Regular sync** of order statuses

---

## Next Steps

1. ✅ Review BobGo API documentation
2. ✅ Create integration documentation
3. ⏳ Set up sandbox account and obtain API token
4. ⏳ Create ACF fields for BobGo settings
5. ⏳ Implement API wrapper class
6. ⏳ Create WooCommerce shipping method
7. ⏳ Build checkout rate calculation
8. ⏳ Implement order/shipment creation
9. ⏳ Set up webhook endpoint
10. ⏳ Create admin UI for shipment management
11. ⏳ Test complete order flow
12. ⏳ Deploy to production

---

**Status Legend:**

- ✅ Completed
- ⏳ In Progress
- ❌ Blocked
- 📝 Needs Review
