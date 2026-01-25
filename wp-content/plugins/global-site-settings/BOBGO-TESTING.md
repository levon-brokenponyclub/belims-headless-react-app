# BobGo Integration Testing & Deployment Guide

## Overview

Complete BobGo shipping integration for Belims Hardware. This guide covers testing in sandbox and deployment to production.

## Files Created

- `includes/bobgo-shipping/admin-bobgo-settings-page.php` - Admin settings UI
- `includes/bobgo-shipping/class-bobgo-api.php` - API wrapper
- `includes/bobgo-shipping/class-bobgo-shipping-method.php` - WooCommerce shipping method
- `includes/bobgo-shipping/class-bobgo-order-handler.php` - Order/shipment automation
- `includes/bobgo-shipping/class-bobgo-webhook-endpoint.php` - Webhook handler

---

## Phase 1: Sandbox Testing

### Step 1: Configure Store Address

The BobGo integration uses your WooCommerce store address as the collection point.

1. Go to **WooCommerce → Settings → General**
2. Ensure these fields are filled:
   - Store Address
   - City
   - Postcode/ZIP
   - Country (should be South Africa)

### Step 2: Enable BobGo Shipping Method

1. Go to **WooCommerce → Settings → Shipping**
2. Click on a shipping zone (or create one for South Africa)
3. Click **Add shipping method**
4. Select **BobGo Shipping**
5. Configure:
   - **Enable**: Yes
   - **Method Title**: BobGo Shipping (or customize)
   - **Show Delivery Time**: Yes (recommended)
   - **Fallback Cost**: 100 ZAR (in case API fails)

### Step 3: Configure Products

For accurate shipping rates, products need dimensions and weight:

1. Edit a product
2. Go to **Shipping** tab
3. Set:
   - **Weight (kg)**: e.g., 0.5
   - **Dimensions (cm)**: Length x Width x Height
4. Save product

**Default values** if not set:

- Weight: 1 kg
- Dimensions: 30 x 20 x 15 cm

### Step 4: Test Checkout Flow

#### A. Add to Cart

1. Add a product to cart
2. Proceed to checkout

#### B. Enter Delivery Address

Use a real South African address for testing:

```
Street: 123 Main Road
City: Cape Town
State: Western Cape
Postcode: 8001
Country: South Africa
```

#### C. Check Shipping Options

You should see BobGo shipping rates with delivery times:

- Same Day (if before 11am)
- Express (1 day)
- Economy (2-3 days)

#### D. Complete Order

1. Select a shipping method
2. Complete payment
3. Order status changes to **Processing**

### Step 5: Verify Order Created in BobGo

#### A. Check Order Notes

1. Go to **WooCommerce → Orders**
2. Open the order you just placed
3. Check **Order Notes** for:
   - "BobGo order created: [order_id]"
   - "BobGo shipment created: [shipment_id]" (if auto-create enabled)

#### B. Check BobGo Meta Box

In the right sidebar of the order edit screen:

- **BobGo Order ID**: Should show BobGo order ID
- **Shipment ID**: Shows if shipment was created
- **Tracking Number**: Shows tracking number
- **Status**: Current shipment status

#### C. Verify in BobGo Dashboard

1. Login to https://sandbox.bobgo.co.za/
2. Go to **Orders**
3. Find your order by reference: "Order #[number]"
4. Check order details match WooCommerce

### Step 6: Test Manual Shipment Creation

If auto-create is disabled:

1. Open the order in WooCommerce
2. Find **BobGo Shipping** meta box
3. Click **Create Shipment**
4. Verify:
   - Shipment ID appears
   - Tracking number appears
   - Order note added

### Step 7: Test Waybill Download

1. In the BobGo meta box, click **Download Waybill**
2. PDF should download
3. Verify PDF contains correct addresses and tracking info

### Step 8: Configure Webhooks

To receive real-time tracking updates:

1. Login to https://sandbox.bobgo.co.za/
2. Go to **Settings → Webhooks**
3. Add webhook:
   - **URL**: `https://cms.belims.co.za/wp-json/bobgo/v1/webhook`
   - **Events**: Select all (tracking, shipment, fulfillment)
4. Save

**Test webhook:**

```bash
# From terminal
curl -X POST https://cms.belims.co.za/wp-json/bobgo/v1/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "event": "tracking.updated",
    "data": {
      "tracking_number": "TEST123",
      "status": "In Transit",
      "location": "Cape Town Hub",
      "timestamp": "2026-01-25 14:30:00"
    }
  }'
```

### Step 9: Test Order Cancellation

1. Open an order with a shipment
2. Change order status to **Cancelled**
3. Verify:
   - Shipment cancelled in BobGo
   - Order note: "BobGo shipment cancelled"
   - Shipment status updated to "cancelled"

---

## Phase 2: Production Deployment

### Step 1: Get Production Credentials

1. Complete BobGo business verification
2. Get production API token from BobGo support
3. Configure courier accounts (e.g., CourierGuy, Dawn Wing)

### Step 2: Switch to Production

1. Go to **Global Settings → BobGo Shipping**
2. Change **Environment** to **Production**
3. Enter **Production API Token**
4. Click **Test Connection** to verify
5. Save settings

### Step 3: Update Webhook URL

1. Login to https://app.bobgo.co.za/
2. Go to **Settings → Webhooks**
3. Add production webhook:
   - **URL**: `https://cms.belims.co.za/wp-json/bobgo/v1/webhook`
   - **Events**: All events
4. Save

### Step 4: Test with Real Order

1. Place a small test order
2. Verify order creates in BobGo production
3. Verify shipment creates
4. Download and print waybill
5. Hand to courier for collection

### Step 5: Monitor First Week

- Check order notes for any errors
- Verify tracking updates coming through
- Monitor webhook logs: `WP_DEBUG_LOG` enabled

---

## Configuration Reference

### BobGo Settings (Global Settings → BobGo Shipping)

- **Environment**: Sandbox or Production
- **API Token**: Bearer token from BobGo
- **Auto-create Shipments**: Yes/No (recommended: Yes)

### Shipping Method Settings (WooCommerce → Shipping → Zones)

- **Enable**: Enable BobGo Shipping
- **Method Title**: Customer-facing name
- **Show Delivery Time**: Show estimated days
- **Fallback Cost**: Rate if API unavailable

### Store Requirements

- **Address**: Complete street address
- **City**: Valid city name
- **Postcode**: Valid postal code
- **Phone**: Contact number (optional but recommended)

### Product Requirements

- **Weight**: In kilograms
- **Dimensions**: Length, Width, Height in centimeters
- **Stock Status**: In stock

---

## Troubleshooting

### Rates Not Showing at Checkout

**Check:**

1. Store address configured? (WooCommerce → Settings → General)
2. Product has weight/dimensions?
3. BobGo API token valid? (Test connection)
4. Customer address in South Africa?
5. Check error logs: `/wp-content/debug.log`

**Debug mode:**

```php
// Add to wp-config.php temporarily
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

### Order Not Creating in BobGo

**Check:**

1. Order used BobGo shipping method?
2. Order status is "Processing"?
3. Check order notes for error messages
4. Verify API token in settings
5. Check `/wp-content/debug.log`

### Shipment Not Auto-Creating

**Check:**

1. Auto-create enabled? (Global Settings → BobGo Shipping)
2. BobGo order created first? (check order notes)
3. Manual creation works? (click "Create Shipment" button)

### Webhooks Not Working

**Check:**

1. Webhook URL configured in BobGo dashboard?
2. URL correct: `/wp-json/bobgo/v1/webhook`
3. Test with curl command (see Step 8 above)
4. Check error logs

### Waybill Download Fails

**Check:**

1. Shipment created? (shipment ID present?)
2. API token valid?
3. Check error message in browser console
4. Try downloading from BobGo dashboard directly

---

## Service Levels

### Same Day

- **Collection cutoff**: 11:00 AM
- **Delivery**: Same day
- **Best for**: Urgent local deliveries

### Express

- **Delivery**: Next business day
- **Best for**: Standard fast shipping

### Economy

- **Delivery**: 2-3 business days
- **Best for**: Cost-effective shipping

---

## API Endpoints Reference

### Webhook Endpoint

```
POST /wp-json/bobgo/v1/webhook
```

**Events:**

- `tracking.updated`
- `shipment.created`
- `shipment.collected`
- `shipment.in_transit`
- `shipment.delivered`
- `shipment.cancelled`
- `fulfillment.created`
- `fulfillment.completed`

---

## Support

### BobGo Support

- **Email**: support@bobgo.co.za
- **Help Center**: https://help.bobgo.co.za/
- **Dashboard**: https://app.bobgo.co.za/ (Production)
- **Sandbox**: https://sandbox.bobgo.co.za/

### Integration Issues

Check logs in `/wp-content/debug.log` and order notes for error messages.

---

## Next Steps

1. ✅ Sandbox testing complete
2. ⏳ Production credentials obtained
3. ⏳ Switch to production environment
4. ⏳ Test with real order
5. ⏳ Monitor for one week
6. ⏳ Go live to customers

---

**Integration completed:** January 25, 2026
**Status:** Ready for sandbox testing
