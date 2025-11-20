# Belims Headless Hardware Store

A modern, headless e-commerce frontend for Belims Hardware, built with React, Vite, and Tailwind CSS.

## 🚀 Quick Start

### Development
```bash
cd frontend
npm install
npm run dev
```

### Production Build
```bash
cd frontend
npm run build
npm run preview
```

## 🌐 GitHub Pages Deployment

This project is set up for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Steps:

1. **Create GitHub Repository:**
   ```bash
   # In the project root directory
   git remote add origin https://github.com/yourusername/belims-headless.git
   git push -u origin main
   ```

2. **Configure GitHub Pages:**
   - Go to your repository on GitHub
   - Navigate to Settings → Pages
   - Set Source to "GitHub Actions"

3. **Set Environment Secrets:**
   - Go to Settings → Secrets and variables → Actions
   - Add the following repository secrets:
     - `REACT_APP_GEMINI_API_KEY`: Your Google Gemini API key
     - `REACT_APP_WOO_SITE_URL`: Your WordPress/WooCommerce site URL
     - `REACT_APP_WOO_CONSUMER_KEY`: Your WooCommerce consumer key
     - `REACT_APP_WOO_CONSUMER_SECRET`: Your WooCommerce consumer secret

4. **Deploy:**
   - Push any changes to the `main` branch
   - GitHub Actions will automatically build and deploy
   - Your site will be available at `https://yourusername.github.io/belims-headless/`

## 🛠️ Tech Stack

- **React 19** - UI Framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety
- **Google Gemini AI** - AI-powered recommendations
- **WooCommerce REST API** - E-commerce backend

## 🎨 Features

- 🎯 AI-powered paint recommendations
- 🛒 Shopping cart with persistent storage
- 📱 Responsive design
- 🔍 Advanced product search and filtering
- 💰 Price matching functionality
- 📍 Store locator
- ⚡ Fast loading with optimized builds

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
└── vite.config.ts     # Vite configuration
```

## 🔐 Environment Variables

Create a `.env.local` file in the frontend directory with:

```bash
REACT_APP_GEMINI_API_KEY=your_gemini_api_key
REACT_APP_WOO_SITE_URL=https://your-wordpress-site.com
REACT_APP_WOO_CONSUMER_KEY=your_consumer_key
REACT_APP_WOO_CONSUMER_SECRET=your_consumer_secret
```

## 📦 Build Process

The GitHub Actions workflow:
1. Checks out the code
2. Sets up Node.js environment
3. Installs dependencies
4. Builds the project with environment variables from GitHub secrets
5. Deploys to GitHub Pages

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

[Your License Here]