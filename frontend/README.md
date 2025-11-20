
# Belims Hardware - Headless WooCommerce Store

This project is a modern, scalable, headless e-commerce frontend built with React 19, TypeScript, and Tailwind CSS. It features AI-powered product recommendations, revolutionary shipping calculator, and bundle & save system with construction orange branding.

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

The application will start at `http://localhost:3000` (or next available port).

---

## ✨ Key Features

### 🤖 AI-Powered Shopping Experience
- **Gemini AI Integration**: Product descriptions, paint recommendations, and intelligent insights
- **Smart Bundle System**: AI-suggested product bundles with progressive discounts (3%, 5%, 10%)
- **Revolutionary Shipping Calculator**: Weather-aware delivery predictions with Bob Go integration

### 💼 Advanced E-commerce Features
- **Bundle & Save System**: Accordion-style bundle creation with visual product selection
- **Buy Now Workflow**: One-click purchasing with Zap icon branding
- **Construction Orange Theme**: Professional hardware store branding (#F97316)
- **Delivery Options Modal**: Smart delivery predictions with weather integration
- **Store Locator**: Real-time stock availability across multiple locations

### 🛠 Professional UX Features
- **Sticky Product Layout**: Left sticky images, right scrollable content
- **Full Gallery Modal**: Immersive product image viewing
- **Stock Management**: Real-time inventory display with progress bars
- **Price Match System**: AI-powered competitor price analysis

---

## 🛠 CMS Configuration (WordPress + ACF)

This application relies on specific data structures in WordPress to power features like "Bundles", "Specifications", and "Store Locators".

### Step 1: Install Plugins
Ensure your WordPress site has the following plugins installed:
1.  **WooCommerce**
2.  **Advanced Custom Fields (ACF) Pro** (Required for Repeater fields)
3.  **CPT UI** (Optional, but recommended for managing Custom Post Types)

### Step 2: Import Data Structure
Included in this project is a file named `cms-structure.json`.
1.  Go to **WordPress Admin > Custom Fields > Tools**.
2.  Under **Import Field Groups**, select the `cms-structure.json` file.
3.  Click **Import File**.

This will automatically create the necessary field groups for Products (Brands, Specs, Features) and define the schema for Stores and Project Ideas.

### Step 3: Register Custom Post Types
You need to register `store` and `project_idea` post types. You can add this to your theme's `functions.php` or use CPT UI:

*   **Slug**: `store` | **Label**: Stores
*   **Slug**: `project_idea` | **Label**: Project Ideas

---

## 🛠 WooCommerce Integration Guide

To switch this application from using static mock data (`constants.ts`) to live data from your Belims WordPress site, follow these steps.

### Local By Flywheel Setup
If you are using Local By Flywheel hosted at `http://belims-headless.local/`:

1.  **Open Local App**: Ensure your site is running.
2.  **Enable SSL**: It is recommended to "Trust" the SSL certificate in Local to work with modern browser APIs, though for dev `http` is usually fine if configured correctly.
3.  **CORS Issues**: Headless setups often face CORS errors. You MUST install a plugin like **"WP GraphQL CORS"** or **"Allow CORS: Access-Control-Allow-Origin"** on your WordPress site. 
    *   Configure the plugin to allow `http://localhost:3000` (or `*` for dev).
    *   Allow methods: `GET, POST, OPTIONS`.

### Step 4: Configure API Keys

1.  Log in to your WordPress Admin Dashboard (`http://belims-headless.local/wp-admin`).
2.  Navigate to **WooCommerce > Settings > Advanced > REST API**.
3.  Click **Add Key**.
4.  **Description**: "Belims Headless React App".
5.  **User**: Select an admin user.
6.  **Permissions**: Read/Write.
7.  Click **Generate API Key**.
8.  Copy the **Consumer Key** and **Consumer Secret**.

### Step 5: Environment Variables

Create a `.env` file in the root of the project (do not commit this to Git):

```env
REACT_APP_WOO_SITE_URL=http://belims-headless.local
REACT_APP_WOO_CONSUMER_KEY=ck_your_consumer_key
REACT_APP_WOO_CONSUMER_SECRET=cs_your_consumer_secret
REACT_APP_GEMINI_API_KEY=your_google_gemini_key
```

---

## 🤖 AI Features (Gemini)

This project uses Google's Gemini API for:
1.  **Paint Assistant**: Suggests color palettes based on user mood/description.
2.  **Onboarding Wizard**: Personalizes product recommendations for DIY vs Business users.
3.  **Price Match**: Scans web for competitor pricing using Gemini grounding.
4.  **Product Descriptions**: Auto-generates SEO-friendly content with "Regenerate" capability.
5.  **Advanced Product Recommendations**: AI-powered suggestion engine analyzing user behavior, purchase history, and project needs
6.  **Intelligent Inventory Management**: Predictive stock analysis, automated reorder points, and demand forecasting
7.  **Smart Customer Insights**: Behavioral analytics, purchase pattern recognition, and personalized shopping experiences
8.  **AI Shipping Assistant**: Smart delivery predictions, optimal shipping method recommendations based on urgency and customer history
9.  **Intelligent Delivery Optimization**: Predictive delivery issues, proactive customer notifications, and carbon footprint calculations
10. **Smart Delivery Scheduler**: AI-suggested optimal delivery times based on location and availability patterns

Ensure you have a valid Gemini API Key in your `.env` file:
`REACT_APP_GEMINI_API_KEY=...`

---

## 🚚 Bob Go Shipping Integration

This project integrates with Bob Go's shipping management system for advanced e-commerce logistics:

### **Live Shipping Features**
1.  **Real-Time Rates at Checkout**: Dynamic shipping costs from 8+ South African couriers with automatic cheapest option selection
2.  **Live Delivery Tracking**: Real-time parcel tracking with proactive status updates and delivery notifications  
3.  **Multi-Courier Optimization**: Intelligent courier selection based on cost, speed, and reliability metrics
4.  **Zone-Based Shipping**: Location-aware delivery options with custom rate rules and free shipping thresholds
5.  **Rule Engine Automation**: Automated shipping decisions based on order value, weight, destination, and customer preferences

### **Enhanced Customer Experience**
- **Smart Delivery Predictions**: Ultra-accurate delivery windows combining Bob Go data with AI analysis
- **Proactive Issue Management**: Early warning system for potential delivery delays or problems
- **Carbon Impact Calculator**: Environmental footprint display for conscious shipping choices
- **Delivery Preference Learning**: AI remembers customer shipping preferences and suggests optimal options

Integration requires Bob Go API credentials and WooCommerce plugin setup.
For setup instructions, visit: https://www.bobgo.co.za/features/rates-at-checkout

---

## 🛍 UX Features

*   **Sticky Product Layout**: 
    *   Left Column: Sticky featured image with an overlay "Summary Card" that animates in on scroll.
    *   Right Column: Scrollable detailed content (Description, Specs) with a main "Buy Box".
*   **Full Gallery Modal**: Immersive full-screen image viewing triggered by the image badge.
*   **Advanced Store Locator**: Checks stock availability (In Stock/Out of Stock) per store for the specific product being viewed.
*   **Comparison Tool**: Compare up to 4 products side-by-side.
*   **Free Shipping Progress**: Sticky widget tracking cart total against threshold.

---

## 📦 Deployment to Netlify

This project is ready for deployment to Netlify with the following setup:

### Quick Deploy Steps

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy: Bundle & Save system with construction orange branding"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Login to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect your GitHub repository
   - Build settings are pre-configured in `netlify.toml`

3. **Environment Variables**:
   Add these in Netlify Dashboard > Site Settings > Environment Variables:
   ```env
   REACT_APP_WOO_SITE_URL=http://belims-headless.local
   REACT_APP_WOO_CONSUMER_KEY=ck_your_consumer_key
   REACT_APP_WOO_CONSUMER_SECRET=cs_your_consumer_secret
   REACT_APP_GEMINI_API_KEY=your_google_gemini_key
   ```

### Build Configuration

The project includes optimized build settings in `netlify.toml`:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18
- Automatic redirects for SPA routing

### Production Features

✅ **Bundle & Save System**: Complete accordion interface with blue theme  
✅ **Buy Now Buttons**: Orange construction branding throughout  
✅ **AI Integration**: Gemini-powered product insights and recommendations  
✅ **Shipping Calculator**: Smart delivery predictions with weather data  
✅ **Responsive Design**: Mobile-first approach with Tailwind CSS  
✅ **Performance**: React 19 with Vite build optimization

---
