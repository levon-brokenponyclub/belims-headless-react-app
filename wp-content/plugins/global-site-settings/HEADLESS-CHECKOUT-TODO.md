# Headless Checkout - BobGo Shipping Integration

## Overview

Connect the React frontend checkout at `belims.co.za` to display BobGo shipping rates from the WordPress backend at `cms.belims.co.za`.

---

## Architecture

```
┌──────────────────────────┐
│  React Frontend          │
│  belims.co.za            │
│                          │
│  1. User enters address  │
│  2. Fetch shipping rates │
│  3. Display BobGo options│
│  4. User selects rate    │
│  5. Submit order         │
└────────────┬─────────────┘
             │ WooCommerce Store API
             │ /wp-json/wc/store/v1/*
             ▼
┌──────────────────────────┐
│  WordPress Backend       │
│  cms.belims.co.za        │
│                          │
│  ┌────────────────────┐  │
│  │  WooCommerce       │  │
│  │  Store API         │  │
│  └─────────┬──────────┘  │
│            │              │
│  ┌─────────▼──────────┐  │
│  │  BobGo Plugin      │  │
│  │  (Calculates rates)│  │
│  └─────────┬──────────┘  │
│            │              │
│  ┌─────────▼──────────┐  │
│  │  Custom Automation │  │
│  │  (Creates orders)  │  │
│  └────────────────────┘  │
└────────────┬─────────────┘
             │
             ▼
      ┌─────────────┐
      │  BobGo API  │
      └─────────────┘
```

---

## Todo List

### Phase 1: Backend API Research

#### ✅ 1. Understand Current Architecture

**Status**: Not Started  
**Tasks**:

- [ ] Review how React frontend communicates with WordPress
- [ ] Check if using WooCommerce REST API or custom endpoints
- [ ] Identify current checkout flow implementation
- [ ] Document existing API endpoints being used

**Files to Check**:

- `frontend/services/` - API service files
- `frontend/components/checkout/` - Checkout components
- `frontend/src/` - Main application files

---

#### ✅ 2. Verify WooCommerce Store API Endpoints

**Status**: Not Started  
**Tasks**:

- [ ] Test if `/wp-json/wc/store/v1/cart` endpoint is accessible
- [ ] Check if shipping methods endpoint exists
- [ ] Verify authentication method (JWT, cookies, etc.)
- [ ] Document required headers and request format

**Test Commands**:

```bash
# Get cart
curl -X GET https://cms.belims.co.za/wp-json/wc/store/v1/cart \
  -H "Content-Type: application/json"

# Get shipping methods
curl -X POST https://cms.belims.co.za/wp-json/wc/store/v1/cart/select-shipping-rate \
  -H "Content-Type: application/json" \
  -d '{"package_id": 0, "rate_id": "bobgo:standard"}'
```

---

#### ✅ 3. Test BobGo Rates in API Response

**Status**: Not Started  
**Tasks**:

- [ ] Create test cart via API
- [ ] Add shipping address via API
- [ ] Fetch shipping methods and verify BobGo rates appear
- [ ] Document exact JSON response structure
- [ ] Check if service levels, delivery times, and prices are included

**Expected Response**:

```json
{
  "shipping_rates": [
    {
      "package_id": 0,
      "name": "Package 1",
      "destination": {...},
      "items": [...],
      "shipping_rates": [
        {
          "rate_id": "bobgo:economy",
          "name": "Economy",
          "description": "2 to 3 business days",
          "delivery_time": "2 to 3 business days",
          "price": "6500",
          "taxes": "0",
          "instance_id": 0,
          "method_id": "bobgo",
          "meta_data": {...}
        }
      ]
    }
  ]
}
```

---

### Phase 2: Frontend Implementation

#### ✅ 4. Create Shipping Service Module

**Status**: Not Started  
**Tasks**:

- [ ] Create `frontend/services/shippingService.ts`
- [ ] Implement `fetchShippingRates(address)` function
- [ ] Implement `selectShippingRate(rateId)` function
- [ ] Add TypeScript types for shipping rates
- [ ] Add error handling and retry logic

**File**: `frontend/services/shippingService.ts`

```typescript
export interface ShippingRate {
  rate_id: string;
  name: string;
  description: string;
  delivery_time: string;
  price: string;
  method_id: string;
}

export async function fetchShippingRates(
  address: Address,
): Promise<ShippingRate[]> {
  // Implementation
}

export async function selectShippingRate(rateId: string): Promise<void> {
  // Implementation
}
```

---

#### ✅ 5. Build Shipping Options Component

**Status**: Not Started  
**Tasks**:

- [ ] Create `frontend/components/checkout/ShippingOptions.tsx`
- [ ] Design UI for displaying rate options (radio buttons or cards)
- [ ] Show service level, delivery time, and price for each option
- [ ] Add loading state while fetching rates
- [ ] Add error state for when no rates available
- [ ] Handle rate selection and update parent component

**Component Props**:

```typescript
interface ShippingOptionsProps {
  rates: ShippingRate[];
  selectedRateId: string | null;
  onSelectRate: (rateId: string) => void;
  isLoading: boolean;
  error: string | null;
}
```

---

#### ✅ 6. Integrate into Checkout Flow

**Status**: Not Started  
**Tasks**:

- [ ] Add shipping options section to checkout page
- [ ] Fetch rates when address is entered/changed
- [ ] Debounce address changes (500ms) to avoid excessive API calls
- [ ] Store selected shipping method in checkout state
- [ ] Update order total when shipping method changes
- [ ] Validate shipping selection before allowing order submission

**Checkout State**:

```typescript
interface CheckoutState {
  address: Address;
  shippingRates: ShippingRate[];
  selectedShippingRateId: string | null;
  shippingCost: number;
  isLoadingRates: boolean;
  ratesError: string | null;
}
```

---

#### ✅ 7. Pass Shipping to Order Creation

**Status**: Not Started  
**Tasks**:

- [ ] Include selected shipping rate ID in order creation payload
- [ ] Verify shipping method is saved in WooCommerce order
- [ ] Test that BobGo order/shipment creates automatically
- [ ] Check order meta contains correct shipping information

**Order Payload**:

```json
{
  "payment_method": "...",
  "billing": {...},
  "shipping": {...},
  "line_items": [...],
  "shipping_lines": [
    {
      "method_id": "bobgo",
      "method_title": "Economy (2-3 days)",
      "total": "65.00"
    }
  ]
}
```

---

### Phase 3: Polish & Error Handling

#### ✅ 8. Add Loading States

**Status**: Not Started  
**Tasks**:

- [ ] Show skeleton/spinner while fetching rates
- [ ] Disable address editing while rates are loading
- [ ] Show "Calculating shipping..." message
- [ ] Cache rates for same address (avoid refetching)
- [ ] Add refresh button to recalculate rates

---

#### ✅ 9. Handle Edge Cases

**Status**: Not Started  
**Tasks**:

- [ ] No rates available → Show fallback message
- [ ] API error → Show "Unable to calculate shipping" with retry option
- [ ] Invalid address → Show "Please verify address" message
- [ ] Non-South African address → Show "Shipping not available to this location"
- [ ] BobGo plugin disabled → Show contact message

**Error Messages**:

```typescript
const ERROR_MESSAGES = {
  NO_RATES:
    "No shipping options available for this address. Please verify the address is correct.",
  API_ERROR: "Unable to calculate shipping. Please try again.",
  INVALID_ADDRESS: "Please enter a valid South African address.",
  NOT_AVAILABLE: "Shipping is not available to this location.",
  PLUGIN_DISABLED:
    "Shipping calculation is temporarily unavailable. Please contact us for assistance.",
};
```

---

#### ✅ 10. Testing & Documentation

**Status**: Not Started  
**Tasks**:

- [ ] Test with various South African addresses
- [ ] Test with invalid addresses
- [ ] Test with different cart values and weights
- [ ] Test error scenarios (API down, timeout, etc.)
- [ ] Document API integration in README
- [ ] Create troubleshooting guide
- [ ] Add JSDoc comments to all functions

---

## Implementation Priority

1. **HIGH**: Research & Test API (Tasks 1-3)
2. **HIGH**: Fetch & Display Rates (Tasks 4-5)
3. **HIGH**: Integrate Checkout (Tasks 6-7)
4. **MEDIUM**: Polish UI/UX (Tasks 8-9)
5. **LOW**: Documentation (Task 10)

---

## Key Decisions Needed

### 1. Which WooCommerce API Version?

- **Option A**: Store API (`/wp-json/wc/store/v1/*`) - Modern, designed for headless
- **Option B**: REST API (`/wp-json/wc/v3/*`) - More features, requires authentication
- **Recommendation**: Use Store API if available (preferred for headless)

### 2. State Management

- **Option A**: React Context
- **Option B**: Redux/Zustand
- **Option C**: Component-level state
- **Recommendation**: Check existing checkout implementation

### 3. Address Validation

- **Option A**: Validate on frontend before fetching rates
- **Option B**: Let backend handle validation
- **Recommendation**: Hybrid - basic frontend validation + backend verification

---

## API Endpoints Reference

### WooCommerce Store API (Headless-Friendly)

```
GET    /wp-json/wc/store/v1/cart
POST   /wp-json/wc/store/v1/cart/add-item
POST   /wp-json/wc/store/v1/cart/update-customer
POST   /wp-json/wc/store/v1/cart/select-shipping-rate
GET    /wp-json/wc/store/v1/checkout
POST   /wp-json/wc/store/v1/checkout
```

### Custom Endpoints (If Needed)

```
GET    /wp-json/belims/v1/shipping/rates
POST   /wp-json/belims/v1/shipping/calculate
```

---

## Testing Checklist

- [ ] Rates fetch successfully on address entry
- [ ] Multiple service levels display (Economy, Express, Same Day)
- [ ] Delivery times show correctly
- [ ] Prices format correctly (ZAR with 2 decimals)
- [ ] Selection updates cart total immediately
- [ ] Order creation includes selected shipping
- [ ] BobGo order auto-creates after WooCommerce order
- [ ] Loading states display appropriately
- [ ] Error messages are user-friendly
- [ ] Works on mobile devices
- [ ] Accessible (keyboard navigation, screen readers)

---

## Resources

- [WooCommerce Store API Docs](https://github.com/woocommerce/woocommerce/blob/trunk/plugins/woocommerce/src/StoreApi/docs/)
- [WooCommerce REST API Docs](https://woocommerce.github.io/woocommerce-rest-api-docs/)
- [BobGo Plugin Documentation](https://help.bobgo.co.za/)
- [React Checkout Best Practices](https://stripe.com/docs/payments/checkout)

---

## Next Steps

1. **Start with Task 1**: Review existing frontend code
2. **Test API access**: Verify WooCommerce Store API is enabled
3. **Create proof of concept**: Simple component that fetches and displays rates
4. **Iterate**: Add features incrementally based on priority

---

**Last Updated**: January 25, 2026  
**Status**: Planning Phase  
**Owner**: Development Team
