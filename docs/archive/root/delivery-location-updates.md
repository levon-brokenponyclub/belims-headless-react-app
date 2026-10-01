# Delivery Location Updates

## Files Changed

- `frontend/components/Header.tsx`
- `frontend/components/DeliveryLocationModal.tsx`
- `frontend/services/shippingAddress.ts`
- `frontend/src/lib/fulfillmentContext.ts`
- `frontend/src/features/chatbot/components/BelimsChatbot.tsx`

## Header Changes

- Added explicit delivery modal mode state for `pickup` and `delivery`.
- Pickup header action now opens the pickup panel directly.
- Delivery header action now opens the delivery panel directly.
- Mobile delivery action opens the delivery panel directly.
- Header continues to read saved delivery location from shared localStorage keys.

## Delivery Modal Changes

- Converted the delivery location modal into a right-side panel using the existing drawer behavior.
- Removed the old modal header.
- Removed the delivery/pickup tab switcher.
- Split delivery and pickup into separate panel views selected by the caller.
- Added a compact close icon instead of the old header close control.
- Added postal-code-only save handling for valid 4-digit South African postal codes.
- Closing the delivery panel with a typed valid postal code now saves it before closing.
- Closing the delivery panel with an already saved full address no longer triggers the postal-code fallback path.
- Fixed invalid nested button markup in the pickup store list.
- Pickup store rows now use a non-button row wrapper with separate controls for selecting a store and viewing operating hours.

## Address Storage Changes

- `saveStoredAddress()` now falls back to `postalCode` when `label`, `street`, `city`, and `province` are empty.
- `readStoredAddress()` now supports legacy postal-code-only values from `deliveryAddress`.
- `readStoredAddress()` now fills missing labels using address label, built address label, postal code, or legacy label.
- Added temporary console logging for address save, read, and remove operations.
- Added a removal stack trace to identify any future explicit storage clears.

## Product Page Sync Changes

- `SingleProduct` already refreshes saved address state on modal close and delivery-address update events.
- Product page now keeps saved postal-code/full-address data available for delivery rate fetching.
- Delivery rates are requested when a saved address or postal code is available.

## Shared Fulfillment Context Changes

- Shared fulfillment storage now accepts postal-code-only delivery addresses.
- `deliveryLocationSet` is now true when a postal code exists, even without city/province.
- Shared context no longer clears `deliveryAddressV2` when it temporarily has `deliveryAddress: null`.
- Before persisting shared context changes, it rehydrates saved site delivery address from storage.
- Removed noisy skipped-removal behavior by preserving saved delivery address in the shared snapshot.

## Chatbot Fulfillment Changes

- Chatbot delivery adapter now preserves postal-code-only addresses.
- Chatbot delivery location state now treats a postal code as a valid delivery location.

## Debug Logs Added

Current temporary log labels:

- `[delivery-location-modal] postal code save requested`
- `[delivery-location-modal] postal code save skipped`
- `[delivery-location-modal] full address save requested`
- `[delivery-location-modal] clear location requested`
- `[delivery-address] saved`
- `[delivery-address] removed`
- `[delivery-address] removal stack`
- `[delivery-address] read saved address`
- `[delivery-address] read legacy postal code`
- `[delivery-address] read failed`
- `[delivery-address] read empty`

## Verification

- `npm run build` passes after the updates.
- Address storage now persists across refresh/navigation in local logs.
- Product page now reaches the delivery-rate request path.

## Known Local Development Note

- Local requests from `http://localhost:3000` to `https://cms.belims.co.za/wp-json/belims/v1/shipping/calculate` are blocked by CORS.
- The app falls back to development shipping options after the CORS failure.
- The CORS issue is separate from delivery address persistence.
