
# Belims Hardware - Headless WooCommerce Store

This project is a modern, scalable, headless e-commerce frontend built with React, TypeScript, and Tailwind CSS. It is designed to interface with a WordPress/WooCommerce backend via the REST API.

## 🚀 Getting Started

### 1. Installation

```bash
# Install dependencies
npm install

# Run the development server
npm start
```

The application will start at `http://localhost:3000`.

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

Ensure you have a valid Gemini API Key in your `.env` file:
`REACT_APP_GEMINI_API_KEY=...`

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

## 📦 Deployment

This project is a standard React Single Page Application (SPA) and can be deployed to any static hosting provider.

### Option 1: Vercel (Recommended)

1.  Push your code to GitHub/GitLab/Bitbucket.
2.  Login to Vercel and "Add New Project".
3.  Import your repository.
4.  **Important**: Add your Environment Variables (`REACT_APP_WOO_...`) in the Vercel Project Settings.
5.  Click **Deploy**.

### Option 2: Netlify

1.  Push code to git.
2.  "New site from Git" in Netlify.
3.  Build command: `npm run build`.
4.  Publish directory: `build`.
5.  Add Environment Variables in Site Settings > Build & Deploy > Environment.
