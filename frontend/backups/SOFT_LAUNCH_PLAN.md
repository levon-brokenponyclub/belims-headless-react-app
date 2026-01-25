# Belims Headless - Soft Launch Plan

This document outlines the remaining tasks required to transition the application from a frontend prototype to a functional soft launch state.

## 1. Product Data Integration (Priority: High)

Currently, the app loads hardcoded data from `constants.ts`. We need to switch this to the real API.

- **Action**: Update `App.tsx` to useEffect hook to load products using `wooCommerceService.ts`.
- **Configuration**: create a `.env` file in the `frontend` root with your API details:
  ```env
  VITE_WOO_SITE_URL=https://your-wordpress-site.com
  VITE_WOO_CONSUMER_KEY=ck_xxxxxxxx
  VITE_WOO_CONSUMER_SECRET=cs_xxxxxxx
  ```
  _(Note: Vite uses `import.meta.env.VITE_...` variables, so the service file needs a slight update to match Vite standards if it uses `REACT_APP_` prefixes)._

## 2. Checkout Flow Implementation (Priority: Critical)

The **Checkout** button in the Cart Drawer currently has no action.

- **Task**: Create a `Checkout` component/page.
- **Flow**:
  1.  User clicks "Checkout" in Cart.
  2.  Navigate to `/checkout` (or open a comprehensive modal).
  3.  **Step 1: Customer Info**: specific address fields required for BobGo.

## 3. Shipping Integration (BobGo)

- **Requirement**: "Shipping API to BobGo"
- **Implementation**:
  1.  Add a shipping calc step in the Checkout flow.
  2.  Send cart weight/dimensions + destination address to BobGo API.
  3.  Display returned rates to the user.
  4.  **Note**: Ensure product data (`types.ts`) includes weight/dimensions if not already present.

## 4. Payment Gateway Integration

- **Requirement**: "Payment Gateways"
- **Implementation**:
  1.  Select provider (PayFast, Yoco, PayStack, Stripe, etc.).
  2.  **Action**:
      - On "Place Order", create an order in the Backend (WooCommerce).
      - Redirect user to the Payment Provider's secure page OR render the payment element.
      - Handle the success/failure callback URL.

## 5. Deployment & Environment

- **Build**: Ensure `npm run build` creates the production assets correctly.
- **Hosting**: Verify rewrites/proxy rules if hosting on Netlify/Vercel to handle the client-side routing.

## 6. Miscellaneous / Polish

- **Stock Validation**: Ensure the checkout validates real-time stock before payment.
- **Emails**: Verify WooCommerce sends the "New Order" email upon successful payment.

## Required Immediate Actions:

1.  **Update `wooCommerceService.ts`**: Fix variable names for Vite (`VITE_` prefix) and connect it to `App.tsx`.
2.  **Scaffold Checkout Page**: Create files for the checkout steps.
3.  **BobGo API Research**: Confirm if you have the API Key and Channel ID for BobGo.
