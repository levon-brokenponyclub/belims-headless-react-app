Why # BobGo Shipping - Troubleshooting: No Rates Showing

## Issue: Only seeing fallback rate (R100) at checkout

This means the BobGo API is not returning shipping rates. Follow these steps to diagnose:

---

## Step 1: Enable WordPress Debug Logging

Add to `wp-config.php` (above the line that says "That's all, stop editing!"):

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

This creates a log file at `wp-content/debug.log`

---

## Step 2: Configure Store Address

The BobGo API **requires** your store's collection address.

1. Go to **WooCommerce → Settings → General**
2. Scroll to **Store Address** section
3. Fill in ALL fields:
   - **Address line 1**: e.g., `123 Main Road`
   - **Address line 2**: (optional) e.g., `Unit 5`
   - **City / Town**: e.g., `Cape Town`
   - **Postcode / ZIP**: e.g., `8001`
   - **Country / Region**: `South Africa`
   - **State / County**: e.g., `Western Cape`
4. Click **Save changes**

**This is the most common issue!** Without a complete store address, BobGo cannot calculate rates.

---

## Step 3: Check Product Configuration

Products need weight and dimensions for accurate rates.

1. Edit a product
2. Go to **Shipping** tab
3. Set:
   - **Weight (kg)**: e.g., `0.5`
   - **Dimensions (cm)**: Length × Width × Height (e.g., `30 × 20 × 15`)
4. Click **Update**

**Note:** If not set, defaults are used:

- Weight: 1 kg
- Dimensions: 30 × 20 × 15 cm

---

## Step 4: Verify BobGo API Configuration

1. Go to **Global Settings → BobGo Shipping**
2. Check:
   - **Environment**: Should be `Sandbox` for testing
   - **API Token**: Should be filled with your token from BobGo
3. Click **Test Connection**
4. Should show: ✅ "Connected to BobGo Sandbox successfully!"

If connection fails:

- Check API token is correct
- Verify you copied the full token (no spaces)
- Try getting a new token from https://sandbox.bobgo.co.za/

---

## Step 5: Enable Shipping Method in Zone

1. Go to **WooCommerce → Settings → Shipping**
2. Click on your shipping zone (e.g., "South Africa")
3. Check if **BobGo Shipping** is listed
4. If not:
   - Click **Add shipping method**
   - Select **BobGo Shipping**
   - Click **Add shipping method**
5. Make sure it's **Enabled** (toggle should be ON)

---

## Step 6: Test Checkout with Valid Address

1. Add a product to cart
2. Go to checkout
3. Enter a **real South African address**:
   ```
   Street: 123 Main Road
   City: Cape Town
   State: Western Cape
   Postcode: 8001
   Country: South Africa
   ```

**Important:** BobGo only works for South African addresses. International addresses will show fallback rate.

---

## Step 7: Check Debug Logs

After attempting checkout, check the debug log:

```bash
tail -50 /path/to/wp-content/debug.log
```

Look for lines starting with `BobGo:` - they will tell you exactly what's wrong:

### Common Error Messages:

**`BobGo: Store collection address not configured`**

- Fix: Configure store address (see Step 2)

**`BobGo: Invalid delivery address`**

- Fix: Ensure customer entered complete address with postcode

**`BobGo API Error: Unauthorized`**

- Fix: Check API token in settings

**`BobGo API Error: Invalid request`**

- Fix: Check that parcels have valid weight/dimensions

**`BobGo Rate Request: {...}`**

- This shows what data is being sent to BobGo
- Check collection_address and delivery_address are complete

**`BobGo Rate Response: {...}`**

- This shows BobGo's response
- If empty or error, contact BobGo support

---

## Step 8: Manual API Test

Test the BobGo API directly:

```bash
curl -X POST https://api.sandbox.bobgo.co.za/v2/rates_at_checkout \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "collection_address": {
      "type": "business",
      "company": "Belims Hardware",
      "street_address": "123 Main Road",
      "city": "Cape Town",
      "zone": "Western Cape",
      "country": "ZA",
      "code": "8001"
    },
    "delivery_address": {
      "type": "residential",
      "street_address": "456 Oak Avenue",
      "city": "Johannesburg",
      "zone": "Gauteng",
      "country": "ZA",
      "code": "2000"
    },
    "parcels": [{
      "parcel_description": "Test parcel",
      "submitted_length_cm": 30,
      "submitted_width_cm": 20,
      "submitted_height_cm": 15,
      "submitted_weight_kg": 1.0
    }]
  }'
```

Replace `YOUR_API_TOKEN` with your actual token.

**Expected response:** JSON with array of rates
**Error response:** Check error message

---

## Quick Checklist

- [ ] WordPress debug logging enabled
- [ ] Store address complete in WooCommerce → Settings → General
- [ ] BobGo API token configured and connection test passes
- [ ] Shipping zone has BobGo Shipping method enabled
- [ ] Products have weight and dimensions set
- [ ] Testing with South African delivery address
- [ ] Checked debug.log for error messages

---

## Still Not Working?

If you've completed all steps and still see only the R100 fallback rate:

1. **Check the debug log** - The error messages will tell you exactly what's wrong

2. **Contact BobGo Support**
   - Email: support@bobgo.co.za
   - Include: Your API request and any error messages from debug.log

3. **Common Fixes:**
   - Clear WooCommerce cache: Delete transients from database
   - Clear browser cache and test in incognito mode
   - Deactivate/reactivate the plugin
   - Check firewall isn't blocking api.bobgo.co.za

---

## Debug Log Example (What to Look For)

**Successful rate fetch:**

```
[25-Jan-2026 10:30:15 UTC] BobGo Rate Request: {"collection_address":{...},"delivery_address":{...},"parcels":[...]}
[25-Jan-2026 10:30:16 UTC] BobGo Rate Response: {"rates":[{"service_level":{"code":"ECO","name":"Economy"},"total_price":85.50,...}]}
```

**Failed rate fetch:**

```
[25-Jan-2026 10:30:15 UTC] BobGo: Store collection address not configured in WooCommerce → Settings → General
```

---

**Next:** Once you see rates appearing at checkout, proceed to full testing in [BOBGO-TESTING.md](BOBGO-TESTING.md)
