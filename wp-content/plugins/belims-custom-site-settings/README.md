# Belims - Custom Site Settings Plugin

A comprehensive WordPress plugin that provides custom site settings and functionality for Belims Hardware Store, with full support for headless/decoupled architecture.

## Features

### 🎨 **Site Branding & Identity**
- Site logo upload with size restrictions
- Favicon management
- Customizable site tagline
- Brand color picker (Primary & Secondary colors)

### 📞 **Contact Information**
- Company name configuration
- Phone number and email settings
- Physical address management

### 🛒 **E-commerce Settings**
- Currency symbol configuration
- Free shipping threshold settings
- Standard and express delivery fee management
- Shipping calculator with API integration

### 🔔 **Site Notifications**
- Configurable notification bar
- Multiple notification types (Info, Success, Warning, Error, Promo)
- Enable/disable functionality
- HTML support for links and formatting

### 🤖 **AI Features & Integrations**
- Google Gemini AI API key management
- Toggle switches for AI features:
  - AI Paint Assistant
  - AI Delivery Optimizer  
  - AI Price Matching

## Installation

1. Upload the plugin folder to `/wp-content/plugins/`
2. Activate the plugin through the WordPress admin
3. Ensure Advanced Custom Fields (ACF) plugin is installed and activated
4. Navigate to **Site Settings** in the WordPress admin sidebar

## Requirements

- WordPress 5.0+
- PHP 7.4+
- Advanced Custom Fields (ACF) plugin

## API Endpoints

The plugin provides several REST API endpoints for headless integration:

### Get All Site Settings
```
GET /wp-json/belims/v1/site-settings
```

### Get Notification Bar Settings
```
GET /wp-json/belims/v1/notification
```

### Get AI Features Status
```
GET /wp-json/belims/v1/ai-features
```

### Calculate Shipping Costs
```
POST /wp-json/belims/v1/calculate-shipping
Body: {
  "cart_total": 1500,
  "express": false
}
```

## Helper Functions

The plugin provides numerous helper functions for theme development:

```php
// Branding
belims_get_site_logo()
belims_get_company_name()
belims_get_brand_colors()

// E-commerce
belims_get_currency_symbol()
belims_get_free_shipping_threshold()
belims_format_price($amount)
belims_check_free_shipping($cart_total)

// AI Features
belims_is_ai_feature_enabled('paint_assistant')
belims_get_gemini_api_key()

// Notifications
belims_is_notification_enabled()
belims_get_notification_message()
```

## Usage in Headless Architecture

Perfect for headless/decoupled WordPress setups where the frontend (React, Vue, etc.) consumes WordPress as a backend API. All settings are accessible via REST endpoints and can be easily integrated into any frontend framework.

## Support

For support and documentation, visit [belims.co.za](https://belims.co.za)

## License

GPL v2 or later