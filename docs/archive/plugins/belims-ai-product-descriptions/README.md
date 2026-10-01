# Belims AI Product Descriptions Plugin

Generate AI-powered product descriptions for WooCommerce products using Google Gemini API directly from the WordPress admin panel.

## Features

- 🤖 **AI-Powered Descriptions**: Generate compelling, SEO-optimized product descriptions using Google Gemini 2.0
- 🎯 **Smart Context Awareness**: Automatically pulls product name, category, brand, and features
- ⚡ **One-Click Generation**: Generate descriptions with a single button click
- 👁️ **Preview Before Apply**: Review generated content before applying to your product
- 🎨 **WordPress Native UI**: Seamlessly integrates with WooCommerce product edit screen
- 🔒 **Secure**: API key stored in WordPress options, AJAX requests protected with nonces
- 📱 **Responsive Design**: Works perfectly on desktop and mobile

## Installation

### Method 1: Manual Installation (Recommended for Development)

1. **Upload the Plugin**

   ```bash
   # The plugin is already in your wp-content/plugins directory:
   wp-content/plugins/belims-ai-product-descriptions/
   ```

2. **Activate the Plugin**
   - Go to WordPress Admin → Plugins
   - Find "Belims AI Product Descriptions"
   - Click "Activate"

### Method 2: Via WordPress Admin

1. Upload the `belims-ai-product-descriptions` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress

## Setup

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key (starts with `AIza...`)

### 2. Configure the Plugin

1. Go to **WordPress Admin → Settings → AI Descriptions**
2. Paste your Gemini API key in the "Gemini API Key" field
3. Click "Save Settings"

## Usage

### Generating AI Descriptions for Products

1. **Edit a Product**
   - Go to **Products → All Products**
   - Click on any product to edit it

2. **Find the AI Generator**
   - Look for the "AI Product Description Generator" meta box in the right sidebar
   - It appears below the "Publish" box

3. **Generate Description**
   - Click the **"Generate AI Description"** button
   - Wait a few seconds for the AI to generate the description
   - Review the generated description in the preview area

4. **Apply to Product**
   - If you're happy with the description, click **"Apply to Product"**
   - The description will be inserted into the product's main description field
   - Click **"Update"** to save the product

### Tips for Best Results

- **Add Product Details First**: Fill in product name, category, and attributes before generating
- **Include Features**: Add key features in the short description for more context
- **Set the Brand**: If you use brand attributes, set them before generating
- **Regenerate if Needed**: You can generate multiple times to get different variations

## Features Breakdown

### AI Generation Process

The plugin intelligently gathers context from your product:

```
Product Name → "Bosch GSB 13 RE Drill"
Category → "Power Tools"
Brand → "Bosch"
Features → From short description or attributes

Prompt to Gemini:
"Write a compelling, SEO-optimized product description (approximately 100 words)
for: Bosch GSB 13 RE Drill. Category: Power Tools. Brand: Bosch.
Tone: Professional, encouraging, and authoritative for a hardware store."
```

### Meta Box Components

- **Generate Button**: Triggers AI description generation
- **Loading Indicator**: Shows progress while generating
- **Preview Area**: Displays the generated description with formatting
- **Apply Button**: Inserts the description into the product editor
- **Error Handling**: Clear error messages if something goes wrong

### Editor Compatibility

The plugin works with:

- ✅ **Classic Editor** (TinyMCE)
- ✅ **Gutenberg Block Editor**
- ✅ **WooCommerce Product Editor**

## Troubleshooting

### "Gemini API key not configured" Error

**Solution**: Go to Settings → AI Descriptions and add your API key.

### "Failed to connect to Gemini API" Error

**Possible causes**:

- Invalid API key
- Network connectivity issues
- API rate limits exceeded

**Solution**:

1. Verify your API key at [Google AI Studio](https://aistudio.google.com/apikey)
2. Check your server's outbound connection to Google APIs
3. Wait a few minutes if you've hit rate limits

### Description Not Applying to Editor

**Solution**:

1. Make sure you've saved the product at least once
2. Try refreshing the page
3. Manually copy and paste the generated description

### No Meta Box Visible

**Possible causes**:

- WooCommerce not installed/activated
- Plugin not activated
- Not on a product edit page

**Solution**:

1. Ensure WooCommerce is active
2. Check plugin activation status
3. Go to Products → Edit Product

## File Structure

```
belims-ai-product-descriptions/
├── belims-ai-product-descriptions.php    # Main plugin file
├── assets/
│   ├── js/
│   │   └── admin.js                       # Admin JavaScript
│   └── css/
│       └── admin.css                      # Admin styles
└── README.md                              # This file
```

## Requirements

- WordPress 5.8 or higher
- WooCommerce 5.0 or higher
- PHP 7.4 or higher
- Active Google Gemini API key

## API Usage & Costs

- Uses **Gemini 2.0 Flash** model (fast and cost-effective)
- Typical description generation: ~200 tokens
- Google Gemini offers generous free tier
- Monitor usage at [Google AI Studio](https://aistudio.google.com/)

## Security Features

- ✅ Nonce verification on all AJAX requests
- ✅ Capability checks (only users with `edit_products` permission)
- ✅ Sanitized inputs and outputs
- ✅ API key stored securely in WordPress options
- ✅ HTTPS required for API communication

## Hooks & Filters (For Developers)

### Available Filters

```php
// Modify the Gemini API prompt
add_filter('belims_ai_description_prompt', function($prompt, $product) {
    // Customize prompt
    return $prompt;
}, 10, 2);

// Modify generated description before returning
add_filter('belims_ai_description_generated', function($description, $product) {
    // Customize description
    return $description;
}, 10, 2);
```

### Available Actions

```php
// After successful description generation
add_action('belims_ai_description_generated', function($product_id, $description) {
    // Your code here
}, 10, 2);
```

## Support

For issues or questions:

- Check WordPress debug log: `wp-content/debug.log`
- Enable WP_DEBUG in `wp-config.php` for detailed error messages
- Review browser console for JavaScript errors

## Changelog

### Version 1.0.0

- Initial release
- AI description generation using Gemini 2.0 Flash
- WooCommerce integration
- Settings page for API key configuration
- Preview before apply functionality
- Support for Classic and Block editors

## License

This plugin is proprietary software for Belims Hardware.

## Credits

- **Powered by**: Google Gemini API
- **Developed for**: Belims Hardware
- **Framework**: WordPress, WooCommerce

---

**Built with ❤️ for Belims Hardware**
