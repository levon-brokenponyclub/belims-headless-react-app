# Belims Hardware - Headless WooCommerce Store

This project is a modern, scalable, headless e-commerce frontend built with React, TypeScript, and Tailwind CSS. It is designed to interface with a WordPress/WooCommerce backend via the REST API and uses Google Gemini for AI features.

---

## 🚀 Getting Started (Local Development)

Follow these steps to get the project running on your local machine.

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **Git**
- **npm** (usually comes with Node.js)

### 1. Clone the Repository

If you haven't already, clone the repository from GitHub to your computer:

```bash
git clone https://github.com/levon-brokenponyclub/belims-headless-react-app.git
cd belims-headless-react-app
```

### 2. Install Dependencies

Navigate to the frontend directory and install the necessary software packages:

```bash
cd frontend
npm install
```

### 3. Configure Environment Variables

Create a file named `.env.local` in the frontend folder with your actual keys:

```env
# Google Gemini AI Key (Required for Paint Assistant, Price Match, Onboarding)
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here

# WooCommerce Keys (Local by Flywheel setup)
REACT_APP_WOO_SITE_URL=https://belims-headless.local
REACT_APP_WOO_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxx
REACT_APP_WOO_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxx
```

### 4. Run the App

Start the development server:

```bash
npm run dev
```

The app will open at `http://localhost:3000`.

---

## ☁️ Deployment Guide (Netlify)

Since you have your code on GitHub, deploying to Netlify is the easiest way to get your site live.

### Step 1: Prepare your GitHub Repo

Ensure your latest code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect Netlify (Detailed)

1.  Log in to your [Netlify Dashboard](https://app.netlify.com/).
2.  Click **"Add new site"** > **"Import from an existing project"**.
3.  Select **GitHub**.
4.  Authorize Netlify to access your GitHub account.
5.  Search for and select your repo: `belims-headless-react-app`.

### Step 3: Configure Build Settings

You will see a screen titled **"Build settings"**. Ensure the following are set:

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist`

_Note: The netlify.toml file in the frontend folder will automatically configure these settings._

### Step 4: Add Environment Variables (Critical)

Before clicking "Deploy", look for a button that says **"Show advanced"** or **"Environment variables"**.

You **MUST** add your API keys here for the live site to work:

- Key: `REACT_APP_GEMINI_API_KEY` | Value: `your_actual_gemini_key`
- Key: `REACT_APP_WOO_SITE_URL` | Value: `https://your-live-wordpress-site.com`
- Key: `REACT_APP_WOO_CONSUMER_KEY` | Value: `your_production_consumer_key`
- Key: `REACT_APP_WOO_CONSUMER_SECRET` | Value: `your_production_consumer_secret`

_If you miss this step, you can add them later in **Site Settings > Build & deploy > Environment variables**, but you will need to trigger a new deploy after adding them._

### Step 5: Deploy

Click **"Deploy site"**. Netlify will take a minute to build your site and provide you with a live URL.

**🌐 Live Demo:** https://belims-headless-react-app.netlify.app/

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
2.  Under **Import Field Groups**, select the `cms-structure.json` file from this project.
3.  Click **Import File**.

This will automatically create the necessary field groups for Products (Brands, Specs, Features) and define the schema for Stores and Project Ideas.

### Step 3: Register Custom Post Types

You need to register `store` and `project_idea` post types. You can add this to your theme's `functions.php` or use CPT UI:

- **Slug**: `store` | **Label**: Stores
- **Slug**: `project_idea` | **Label**: Project Ideas

---

## 🛠 WooCommerce Integration Guide

To switch this application from using static mock data (`constants.ts`) to live data from your Belims WordPress site:

### Local By Flywheel Setup

If you are using Local By Flywheel hosted at `http://belims-headless.local/`:

1.  **CORS Issues**: Headless setups often face CORS errors. You MUST install a plugin like **"WP GraphQL CORS"** or **"Allow CORS: Access-Control-Allow-Origin"** on your WordPress site.
    - Configure the plugin to allow your Netlify URL (e.g., `https://belims-headless.netlify.app`).
    - Allow methods: `GET, POST, OPTIONS`.

2.  **Generate Keys**:
    - Go to **WooCommerce > Settings > Advanced > REST API**.
    - Add Key > Read/Write Permissions.
    - Use these keys in your Netlify Environment Variables.

---

## 🤖 AI Features (Gemini)

This project uses Google's Gemini API for:

1.  **Paint Assistant**: Suggests color palettes based on user mood/description.
2.  **Onboarding Wizard**: Personalizes product recommendations for DIY vs Business users.
3.  **Price Match**: Scans web for competitor pricing using Gemini grounding.
4.  **Product Descriptions**: Auto-generates SEO-friendly content with "Regenerate" capability.

---

## 🛍 UX Features

- **Sticky Product Layout**:
  - Left Column: Sticky featured image with an overlay "Summary Card" that animates in on scroll.
  - Right Column: Scrollable detailed content (Description, Specs) with a main "Buy Box".
- **Full Gallery Modal**: Immersive full-screen image viewing triggered by the image badge.
- **Advanced Store Locator**: Checks stock availability (In Stock/Out of Stock) per store for the specific product being viewed.
- **Comparison Tool**: Compare up to 4 products side-by-side.
- **Free Shipping Progress**: Sticky widget tracking cart total against threshold.

## 🛠️ Tech Stack

- **React 19** - UI Framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety
- **Google Gemini AI** - AI-powered recommendations
- **WooCommerce REST API** - E-commerce backend

## 📁 Project Structure

```
frontend/
├── components/          # React components
├── services/           # API services (Gemini, WooCommerce)
├── public/            # Static assets
├── dist/              # Production build output
├── .env               # Default environment variables
├── .env.local         # Local development secrets
├── .env.production    # Production environment template
├── netlify.toml       # Netlify deployment configuration
└── vite.config.ts     # Vite configuration
```

## 📦 Build Process

Netlify automatically:

1. Detects the frontend folder as the build directory
2. Installs dependencies with `npm install`
3. Builds the project with environment variables from Netlify settings
4. Deploys the `dist` folder to your live URL

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly locally with `npm run dev`
5. Submit a pull request

---

## 🔮 Upcoming Features

_Ideas and features we're planning to build:_

### 🎯 **High Priority**

- [ ] Enhanced product filtering with faceted search
- [ ] Advanced shopping cart with quantity controls and quick add
- [ ] Real-time inventory status per store location
- [ ] Customer product reviews and rating system

### 🚀 **AI & Innovation**

- [ ] Voice search capabilities ("Hey Belims, find me a drill")
- [ ] Visual product search (upload photo to find similar items)
- [ ] Smart product bundling recommendations
- [ ] AI-powered project cost calculator

### 🎨 **UX Enhancements**

- [ ] Smooth page transitions and micro-interactions
- [ ] Dark mode toggle
- [ ] Advanced product image gallery with 360° views
- [ ] Mobile-first responsive improvements
- [ ] PWA capabilities for offline browsing

### ⚡ **Performance & Tech**

- [ ] Image optimization and lazy loading
- [ ] Code splitting for faster page loads
- [ ] Enhanced SEO with structured data
- [ ] GraphQL integration for better data fetching

### 🛠 **Business Features**

- [ ] Inventory management dashboard
- [ ] Customer wishlist functionality
- [ ] Advanced store locator with directions
- [ ] Live chat support widget
- [ ] Order tracking integration

_Feel free to add ideas as they come to you! 💡_

cd wp-content/plugins/global-site-settings
./deploy.sh

### FUll Auto Deploy: Push & Commit to GitHub, upload Site Settings Plugin using SSH

Ensure your latest code is pushed to GitHub:

```bash
cd wp-content/plugins/global-site-settings
./deploy.sh
```
