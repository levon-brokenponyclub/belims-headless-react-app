# BobGo Integration - Hybrid Setup Guide

## Overview

We're using a **hybrid approach** that combines the official BobGo plugin with custom automation code.

### Why Hybrid?

- ✅ **BobGo Plugin**: Handles rate calculation (proven, maintained by BobGo)
- ✅ **Custom Code**: Handles automation, webhooks, and advanced features
- ✅ **Best of Both**: Reliability + Flexibility

---

## Architecture

```
┌─────────────────┐
│  React Frontend │ (Headless)
└────────┬────────┘
         │
         v
┌─────────────────────────────────────┐
│         WordPress/WooCommerce        │
│  ┌────────────────────────────────┐ │
│  │   Official BobGo Plugin        │ │ ← Rate Calculation
│  │   - Rates at checkout          │ │
│  │   - Service level display      │ │
│  └────────────────────────────────┘ │
│  ┌────────────────────────────────┐ │
│  │   Custom BobGo Integration     │ │ ← Automation
│  │   - Auto order/shipment create │ │
│  │   - Webhook handling           │ │
│  │   - Admin meta boxes           │ │
│  │   - Waybill downloads          │ │
│  └────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │
               v
        ┌─────────────┐
        │  BobGo API  │
        └─────────────┘
```

---

## Setup Instructions

### Part 1: Configure BobGo Sales Channel

#### 1. Create WooCommerce REST API Credentials

1. Go to **WooCommerce → Settings → Advanced → REST API**
2. Click **Add key**
3. Fill in:
   - **Description**: `BobGo Integration`
   - **User**: Your admin user
   - **Permissions**: `Read/Write`
4. Click **Generate API key**
5. **Copy** both:
   - Consumer key: `ck_xxxxxxxxxxxxx`
   - Consumer secret: `cs_xxxxxxxxxxxxx`

⚠️ **Important**: Save these somewhere safe - you can't view the secret again!

#### 2. Install WooCommerce Channel in BobGo

1. Login to https://sandbox.bobgo.co.za/
2. Go to **Settings → Integrations** (or **Sales Channels**)
3. Click **Add Channel** or **Connect Store**
4. Select **WooCommerce**
5. Enter:
   - **Store URL**: `https://cms.belims.co.za`
   - **Consumer Key**: (paste from step 1)
   - **Consumer Secret**: (paste from step 1)
6. Click **Install** or **Connect**
7. Wait for BobGo to verify the connection

✅ Success: You should see "Connected" status

#### 3. Configure Rates in BobGo Dashboard

1. In BobGo, go to **Rates at Checkout** or **Shipping Rates**
2. Enable the service levels you want to offer:
   - ✅ Economy (2-3 days)
   - ✅ Express (next day)
   - ✅ Same Day (before 11am)
3. Set rate rules (if needed):
   - Free shipping thresholds
   - Markup percentages
   - Excluded products
4. Save settings

---

### Part 2: Configure BobGo Plugin in WooCommerce

#### 1. Enable Rates at Checkout

1. Go to **WooCommerce → Settings → Shipping**
2. Click **Bob Go rates at checkout** tab
3. Enable:
   - ✅ **Enable**: Turn on BobGo rates
   - ✅ **Hide WooCommerce shipping rates**: Only show BobGo rates
   - ✅ **Show additional rate information**: Display delivery times
4. Optional settings:
   - ⬜ **Use Site Address (URL)**: Only if using subfolders (like /shop)
5. Click **Save changes**

✅ The error "Your WooCommerce channel is not installed" should now be gone

#### 2. Remove Other Shipping Methods (Optional)

If you only want BobGo shipping:

1. Go to **WooCommerce → Settings → Shipping → Shipping zones**
2. Click on your zone (e.g., "South Africa")
3. **Remove** or **Disable** other methods:
   - Flat rate
   - Free shipping
   - Local pickup (unless you want it)
4. BobGo rates will show automatically - no need to add as shipping method

---

### Part 3: Configure Custom Automation

This is already done via our Global Site Settings plugin!

#### What's Automated:

1. **Order Creation** (when order → Processing)
   - Creates order in BobGo
   - Stores BobGo order ID in order meta

2. **Shipment Creation** (if auto-create enabled)
   - Creates shipment in BobGo
   - Stores shipment ID and tracking number
   - Adds order note

3. **Webhook Handling** (for tracking updates)
   - Receives BobGo status updates
   - Updates order notes
   - Changes order status when delivered

4. **Admin Features**
   - Meta box on order edit page
   - Manual shipment creation button
   - Waybill download
   - Shipment cancellation

#### Settings in Global Settings → BobGo Shipping:

1. **Environment**: `Sandbox` (change to Production when ready)
2. **API Token**: Your BobGo API bearer token
3. **Auto-create Shipments**: `Yes` (creates shipments automatically)

---

### Part 4: Configure Store Address

**Critical**: BobGo needs your store's collection address.

1. Go to **WooCommerce → Settings → General**
2. Scroll to **Store Address** section
3. Fill **completely**:
   - **Address line 1**: `123 Main Road`
   - **Address line 2**: `Unit 5` (optional)
   - **City / Town**: `Cape Town`
   - **Postcode / ZIP**: `8001`
   - **State / County**: `Western Cape`
   - **Country / Region**: `South Africa`
4. Click **Save changes**

---

## Testing Checklist

### ✅ Verify Rates Show at Checkout

1. Add product to cart
2. Go to checkout
3. Enter South African delivery address:
   ```
   123 Oak Street
   Cape Town, Western Cape
   8001
   South Africa
   ```
4. Should see multiple BobGo rates:
   - Economy (2-3 days) - R65
   - Express (1 day) - R95
   - Same Day - R150 (if before 11am)

### ✅ Verify Order Automation

1. Complete an order with BobGo shipping
2. Order status → Processing
3. Check order notes:
   - "BobGo order created: [order_id]"
   - "BobGo shipment created: [shipment_id]" (if auto-create on)
4. Check BobGo meta box (right sidebar):
   - Shows order ID
   - Shows shipment ID
   - Shows tracking number

### ✅ Verify Webhooks

1. In BobGo dashboard, go to **Settings → Webhooks**
2. Add webhook:
   - **URL**: `https://cms.belims.co.za/wp-json/bobgo/v1/webhook`
   - **Events**: Select all
3. Simulate tracking update
4. Check order notes for webhook event

---

## Troubleshooting

### Rates Not Showing

**Check:**

1. ✅ WooCommerce channel connected in BobGo?
2. ✅ "Bob Go rates at checkout" enabled in WooCommerce?
3. ✅ Store address configured in WooCommerce → Settings → General?
4. ✅ Testing with South African address?

**Debug:**

- Enable WP_DEBUG_LOG in wp-config.php
- Check wp-content/debug.log for errors

### Orders Not Creating in BobGo

**Check:**

1. ✅ Order used BobGo shipping method?
2. ✅ API token configured in Global Settings?
3. ✅ Auto-create enabled?

**Debug:**

- Check order notes for error messages
- Test connection in Global Settings → BobGo Shipping

### "Channel not installed" Error

**Solution:**

- Complete Part 1 (WooCommerce REST API + BobGo channel setup)
- Verify Consumer Key/Secret are correct
- Check BobGo dashboard shows "Connected" status

---

## What We Disabled

To avoid conflicts, we disabled our **custom shipping method**:

File: `global-site-settings.php` (line ~35)

```php
// 'includes/bobgo-shipping/class-bobgo-shipping-method.php', // Disabled - using official BobGo plugin for rates
```

**Why?**

- BobGo plugin handles rate calculation better
- Avoids duplicate rates at checkout
- Uses BobGo's proven rate engine

**What's still active:**

- ✅ Order handler (auto-creates orders/shipments)
- ✅ Webhook endpoint (receives tracking updates)
- ✅ Admin meta boxes (shipment management)
- ✅ API wrapper (BobGo_API class)

---

## Going to Production

When ready to go live:

1. **Get Production Credentials:**
   - Contact BobGo support for production account
   - Get production API token

2. **Update Settings:**
   - Global Settings → BobGo Shipping
   - Change Environment to `Production`
   - Enter production API token
   - Test connection

3. **Update BobGo Channel:**
   - In BobGo production dashboard
   - Add WooCommerce channel (same as sandbox)
   - Use production site URL

4. **Update Webhooks:**
   - In BobGo production
   - Add webhook: `https://cms.belims.co.za/wp-json/bobgo/v1/webhook`

5. **Test with Real Order:**
   - Place small test order
   - Verify shipment creates
   - Print waybill
   - Hand to courier

---

## Summary

**What BobGo Plugin Does:**

- ✅ Calculates shipping rates at checkout
- ✅ Displays service levels and delivery times
- ✅ Syncs rates from BobGo dashboard

**What Custom Code Does:**

- ✅ Auto-creates orders in BobGo when WC order → Processing
- ✅ Auto-creates shipments (if enabled)
- ✅ Receives webhook updates for tracking
- ✅ Provides admin UI for shipment management
- ✅ Handles waybill downloads
- ✅ Updates order status when delivered

**Result:** Best of both worlds! 🎉
