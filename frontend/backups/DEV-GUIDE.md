# 🛠️ Belims Hardware Store - Development Guide

## **🚨 CRITICAL: Server Setup & Directory Structure**

### **⚠️ MUST RUN FROM FRONTEND DIRECTORY**

```bash
# ❌ WRONG - Don't run from public/
cd /Users/levongravett/Desktop/BPC/Sites/belims-headless/app/public
npx vite  # This won't work! → 404 Page not found

# ✅ CORRECT - Must be in frontend/
cd /Users/levongravett/Desktop/BPC/Sites/belims-headless/app/public/frontend
npx vite --host 0.0.0.0 --port 3000  # This works! ✅
```

### **Directory Structure**

```
/Users/levongravett/Desktop/BPC/Sites/belims-headless/app/public/
├── frontend/           ← MUST be here to run server!
│   ├── package.json    ← Contains vite config
│   ├── index.html      ← Entry point
│   ├── constants.ts    ← Fixed TypeScript file
│   └── App.tsx         ← Main React app
└── wp-admin/          ← WordPress (not needed for dev)
```

### **Quick Debug Commands**

```bash
# Check you're in the right place
pwd && ls package.json index.html

# Kill all servers if stuck
pkill -f "vite|npm|node"

# Start fresh (from frontend/ directory)
npx vite --host 0.0.0.0 --port 3000
```

## 🎯 **Quick Start (5 Minutes)**

```bash
# 1. Clone the repository
git clone https://github.com/levon-brokenponyclub/belims-headless-react-app.git
cd belims-headless-react-app/frontend

# 2. Install dependencies
npm install

# 3. Copy environment variables (optional - uses mock data if missing)
cp .env.example .env

# 4. Start development server
npm run dev

# 5. Open browser
open http://localhost:5173
```

**🎉 That's it! The site will work with mock data even without API keys.**

---

## 🔧 **Two Versions Explained**

### **🏠 Local Development Version**

- **Purpose**: For learning, development, and testing
- **Environment**: Your computer (`localhost:5173`)
- **Data**: Uses mock data if API keys missing
- **Features**: Hot reload, error overlay, TypeScript checking
- **AI Functions**: Falls back to sample paint colors if no Gemini key

### **🌐 Production Version (Netlify)**

- **Purpose**: Live website for users
- **Environment**: https://belims-headless-react-app.netlify.app/
- **Data**: Requires real API keys for full functionality
- **Features**: Optimized build, CDN delivery, automatic deployments
- **AI Functions**: Requires real Gemini API key

---

## 🚀 **Running Local Development Server**

### **Method 1: Basic Setup (Recommended for Learning)**

```bash
# Navigate to project
cd belims-headless-react-app/frontend

# Start server (uses mock data - no setup needed)
npm run dev

# Server starts at http://localhost:5173
# Features that work without API keys:
# ✅ Product browsing
# ✅ Bundle system
# ✅ Shopping cart
# ✅ Buy Now workflow
# ✅ Mock paint recommendations
# ✅ Store locator
```

### **Method 2: Full Setup (With Real API Integration)**

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env file with your API keys
code .env  # Opens in VS Code
# OR
nano .env  # Terminal editor

# 3. Add your real API keys:
# REACT_APP_GEMINI_API_KEY=your_real_gemini_key
# REACT_APP_WOO_SITE_URL=http://your-wordpress.local

# 4. Start server
npm run dev

# Now AI features will use real data!
```

---

## 📝 **Understanding the Development Server**

### **What Happens When You Run `npm run dev`**

1. **Vite starts** the development server
2. **TypeScript compiles** your code in real-time
3. **Tailwind CSS processes** your styles
4. **Hot Module Reload** watches for file changes
5. **Browser opens** automatically to your app

### **Development Server Features**

- **Port**: Usually `5173` (auto-increments if busy)
- **Hot Reload**: Changes appear instantly without page refresh
- **Error Overlay**: Helpful error messages in browser
- **Source Maps**: Debug your original TypeScript code
- **Fast**: Vite is lightning-fast compared to other bundlers

---

## 🎨 **Key Features to Test**

### **1. Bundle & Save System**

```bash
# Test Steps:
1. Click any product card from homepage
2. Scroll down below "Buy Now" section
3. Click "Bundle & Save" accordion to expand
4. Click "Create Bundle" for full interface
5. Add/remove products and see price calculations

# What to Look For:
✅ Blue accordion expands/collapses smoothly
✅ Progressive discounts (3%, 5%, 10%)
✅ Visual progress bar
✅ Real-time price calculations
```

### **2. Buy Now Workflow**

```bash
# Test Steps:
1. Click orange "Buy Now" button on any product
2. Watch cart drawer open automatically
3. See product added with quantity

# What to Look For:
✅ Orange construction branding on buttons
✅ Zap icon indicates instant action
✅ Cart opens immediately after click
✅ Smooth animations
```

### **3. AI Paint Assistant**

```bash
# Test Steps:
1. Click "Paint Assistant" in header
2. Type: "cozy living room"
3. Click "Get Recommendations"

# With API Key:
✅ Real AI-generated color suggestions
✅ Sophisticated color names and descriptions

# Without API Key (Mock Mode):
✅ Sample colors: Ocean Breeze, Warm Earth, etc.
✅ Still fully functional for testing
```

---

## 🔍 **Development Tools & Commands**

### **Essential Commands**

```bash
# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npx tsc --noEmit

# Install new package
npm install package-name
```

### **Useful Development Shortcuts**

```bash
# Quick server restart
Ctrl+C  # Stop server
npm run dev  # Restart

# Clear Vite cache (if weird issues)
npm run dev -- --force

# View all running processes
ps aux | grep node

# Kill all node processes (if needed)
pkill -f node
```

---

## 🎯 **Learning Path**

### **Week 1: Getting Familiar**

- [ ] Run `npm run dev` and explore the homepage
- [ ] Click through product cards to product pages
- [ ] Test the Bundle & Save accordion
- [ ] Try the Buy Now workflow
- [ ] Open browser dev tools and explore

### **Week 2: Understanding the Code**

- [ ] Open VS Code and explore the file structure
- [ ] Look at `App.tsx` to see main application logic
- [ ] Examine `SingleProduct.tsx` for product page layout
- [ ] Check `BundlePanel.tsx` for bundle system
- [ ] Review Tailwind CSS classes

### **Week 3: Making Changes**

- [ ] Change colors in `tailwind.config.js`
- [ ] Update product data in `constants.ts`
- [ ] Modify text content in components
- [ ] Add new products to the catalog
- [ ] Experiment with layout changes

---

## 🐛 **Common Issues & Solutions**

### **Server Won't Start**

```bash
# Problem: Port already in use
# Solution: Kill existing process or use different port
lsof -ti:5173 | xargs kill -9
# OR
npm run dev -- --port 3000
```

### **"Cannot find module" Errors**

```bash
# Problem: Missing dependencies
# Solution: Reinstall node_modules
rm -rf node_modules package-lock.json
npm install
```

### **TypeScript Errors**

```bash
# Problem: Type checking issues
# Solution: Check for missing imports or prop types
# Look at the error message in VS Code or terminal
# Most common: missing props in component calls
```

### **Styles Not Loading**

```bash
# Problem: Tailwind CSS not working
# Solution: Restart dev server
Ctrl+C
npm run dev
```

---

## 📚 **File Structure Explained**

```
frontend/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   ├── types.ts             # TypeScript type definitions
│   ├── constants.ts         # Product data and mock content
│   ├── components/          # Reusable UI components
│   │   ├── Header.tsx       # Top navigation
│   │   ├── ProductCard.tsx  # Product grid items
│   │   ├── SingleProduct.tsx # Product detail page
│   │   ├── BundlePanel.tsx  # Bundle & Save system
│   │   └── ...              # Other components
│   └── services/            # API integrations
│       ├── geminiService.ts # AI functionality
│       └── wooCommerceService.ts # WordPress integration
├── public/                  # Static assets
├── package.json             # Dependencies and scripts
├── tailwind.config.js       # Styling configuration
├── vite.config.ts          # Build tool configuration
└── .env.example            # Environment variables template
```

---

## 🎓 **Next Steps**

1. **Get comfortable** with running the local server
2. **Explore the code** in VS Code
3. **Make small changes** and see them update live
4. **Set up API keys** when ready for real data
5. **Deploy changes** to your own Netlify site

**Remember: The app works perfectly with mock data, so you can learn everything without needing API keys!**

## 🧠 Git: Correct Setup & Best Commands (Do This, Nothing Else)

### One-Time Git Setup

````bash
git config --global user.name "Levon Gravett"
git config --global user.email "you@domain.com"
git config --global init.defaultBranch main
git config --global http.postBuffer 524288000
Correct Remote (HTTPS – Stable for Large Pushes)
git remote -v
git remote set-url origin https://github.com/levon-brokenponyclub/belims-headless-react-app.git
Branch Workflow
git checkout -b temp-push || git checkout temp-push
Commit (One Change at a Time)
git status
git add .gitignore frontend/.gitignore
git commit -m "Update .gitignore to ignore backups, builds, and node_modules"
Push (Safe for Large Repos)
git push -u origin temp-push --verbose
If Push Freezes
pkill -f git
git push origin temp-push --verbose
Monitor Push Size (macOS / zsh)
while true; do du -sh .git/objects/pack/; sleep 2; done
Emergency Reset (Use Carefully)
git merge --abort || true
git rebase --abort || true
git fetch origin
git reset --hard origin/temp-push
GitHub Auth Reminder
GitHub HTTPS requires a Personal Access Token (not your password)

Create one at: https://github.com/settings/tokens

Scope required: repo

Sanity Check
git status
git branch
git remote -v

If you want, I can now **compress this to a brutal 10-line “just push the damn thing” version** or **convert it into a checklist for README.md**.## 🧠 Git: Correct Setup & Best Commands (Do This, Nothing Else)

### One-Time Git Setup
```bash
git config --global user.name "Levon Gravett"
git config --global user.email "you@domain.com"
git config --global init.defaultBranch main
git config --global http.postBuffer 524288000
Correct Remote (HTTPS – Stable for Large Pushes)
git remote -v
git remote set-url origin https://github.com/levon-brokenponyclub/belims-headless-react-app.git
Branch Workflow
git checkout -b temp-push || git checkout temp-push
Commit (One Change at a Time)
git status
git add .gitignore frontend/.gitignore
git commit -m "Update .gitignore to ignore backups, builds, and node_modules"
Push (Safe for Large Repos)
git push -u origin temp-push --verbose
If Push Freezes
pkill -f git
git push origin temp-push --verbose
Monitor Push Size (macOS / zsh)
while true; do du -sh .git/objects/pack/; sleep 2; done
Emergency Reset (Use Carefully)
git merge --abort || true
git rebase --abort || true
git fetch origin
git reset --hard origin/temp-push
GitHub Auth Reminder
GitHub HTTPS requires a Personal Access Token (not your password)

Create one at: https://github.com/settings/tokens

Scope required: repo

Sanity Check
git status
git branch
git remote -v

If you want, I can now **compress this to a brutal 10-line “just push the damn thing” version** or **convert it into a checklist for README.md**.

### Fast Push Rescue (Stuck Compression)
1) Stop any hung pushes: `pkill -f git || true`
2) Keep ignored stuff out: `git ls-files -i --exclude-standard -z | xargs -0 git rm --cached -r || true`
3) Bigger buffer for large packs: `git config --global http.postBuffer 524288000`
4) Use SSH for stability: `git remote set-url origin git@github.com:levon-brokenponyclub/belims-headless-react-app.git`
5) Push with verbose logging: `git push --verbose origin main`
6) If it still hangs, repack then retry: `git repack -a -d && git gc --prune=now && git push --verbose origin main`
7) Last resort: push a temp branch then merge on GitHub: `git checkout -b temp-push && git push --verbose origin temp-push`
````
