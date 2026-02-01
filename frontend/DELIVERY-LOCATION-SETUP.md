# Delivery Location Feature Setup

## Overview

The delivery location feature has been updated to include:

1. **Auto-detection on site load** - automatically detects user's location using geolocation
2. **Modal-based location picker** - replaces the old dropdown with a full-featured modal
3. **Google Maps Places Autocomplete** - real-time address suggestions as you type
4. **Available delivery rates** - displays standard and express shipping options per location
5. **Persistent storage** - saves location preference to localStorage

## Components

### DeliveryLocationModal.tsx

- Modal that opens when user clicks the "Delivery" button in the header
- Provides autocomplete address input using Google Maps Places API
- Shows available delivery rates (Standard/Express) with pricing and arrival times
- Auto-detect location button using Geolocation API
- Confirms selection and saves to localStorage

### Header.tsx Updates

- Auto-detects user location on first site visit (if no saved address)
- Displays delivery location button in secondary navbar
- Opens modal when clicked
- Stores address and rates in state
- Persists location to localStorage

## Google Maps API Setup

### Required Environment Variable

Add the following to your `.env.local` file:

```env
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### Getting a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
4. Create an API key credential (restricted to JavaScript origins)
5. Add your domain to the approved JavaScript origins

### Optional: Restrict API Key

For security, restrict the key to:

- **Application restrictions**: HTTP referrers
- **API restrictions**: Maps JavaScript API, Places API

## Features

### Auto-Detection Flow

1. On page load, Header checks if address is saved in localStorage
2. If not found, requests geolocation permission from user
3. Uses Nominatim (OpenStreetMap) reverse geocoding to get formatted address
4. Falls back to coordinates (lat, lon) if geocoding fails
5. Saves address to localStorage for future visits

### Modal Features

- **Address Input**: Type an address with Google Places Autocomplete
- **Suggestions**: Real-time autocomplete filtered to Canadian cities
- **Detect Button**: Quick auto-detection without typing
- **Delivery Rates Preview**: Shows Standard and Express options with:
  - Estimated delivery time
  - Shipping cost
  - Note: "Final rates at checkout"
- **Confirm Button**: Saves selected location and closes modal

### Location-Based Rates

Currently using mock delivery rates data stored in `mockDeliveryRates` object. Rates are provided for:

- Major Canadian cities (Toronto, Vancouver, Montreal, Calgary, etc.)
- Default rates apply for unlisted locations
- Can be replaced with API call to real shipping service

## Data Flow

```
User clicks "Delivery" button
    ↓
DeliveryLocationModal opens
    ↓
User types address or clicks "Detect Location"
    ↓
Google Places/Geolocation API returns address
    ↓
Modal displays available shipping rates
    ↓
User confirms location selection
    ↓
Address & rates saved to state + localStorage
    ↓
Header button updates with new location
```

## Integration Points

### SingleProduct.tsx

- Already syncs delivery location from localStorage
- Can access delivery rates from Header state (pass as prop if needed)
- Delivery preview modal uses this location to show options

### Cart/Checkout Flow

- Should read deliveryAddress from localStorage
- Use actual Bobgo API instead of preview rates at checkout
- Note in modal disclaimer: "Final shipping rates are calculated at checkout"

## Testing

### Test Auto-Detection

1. Clear localStorage: `localStorage.removeItem('deliveryAddress')`
2. Reload page
3. Allow geolocation permission when prompted
4. Verify address appears in header

### Test Address Input

1. Click delivery button to open modal
2. Type "Toronto" and select suggestion
3. Verify rates display correctly
4. Click "Confirm Delivery Location"
5. Verify address updates in header

### Test Location Persistence

1. Select a delivery address
2. Reload page
3. Verify same address appears in header
4. (Address should persist across page reloads)

## Future Enhancements

1. **Real Shipping Rates**: Replace mock data with Bobgo API calls
2. **Location History**: Store recently used addresses
3. **Postal Code Search**: Add postal code input as alternative to full address
4. **Same-Day Delivery**: Show availability indicator if available
5. **Store Pickup Option**: Let users select store pickup instead of delivery
6. **Tracking Integration**: Pre-fill from package tracking

## Known Limitations

- Google Maps API key must be set in environment variables
- Fallback to client-side suggestions if API key not configured
- Mock delivery rates only include major Canadian cities
- No real-time rate calculation (uses preview rates)
- Cannot set different rates per product category yet
