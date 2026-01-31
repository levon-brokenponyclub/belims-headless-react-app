# Belims Homepage Refactor - Implementation Checklist

## PHASE 1: FOUNDATION (CSS & TOKENS)

### 1.1 CSS Variables & Tokens Setup

**File:** `frontend/index.css`
**Estimated Time:** 1 hour

- [ ] Copy all CSS custom property definitions from gpt/css/homepage-base.css
- [ ] Add to :root selector in index.css
- [ ] Test variables are accessible in browser DevTools
- [ ] Verify no conflicts with existing Tailwind

**Tokens to Add:**

```
--belims-primary: #322783
--belims-primary-hover: #4a3fc2
--belims-accent: #f97316
--belims-red: #e40613
--bg-main: #f4f6f8
--bg-card: #ffffff
--border: #e2e8f0
--text-main: #1e293b
--text-muted: #64748b
--radius: 4px
```

### 1.2 Tailwind Config Extension

**File:** `frontend/tailwind.config.js`
**Estimated Time:** 30 minutes

- [ ] Add custom colors to extend.colors
- [ ] Add custom spacing values
- [ ] Add custom border-radius
- [ ] Map Tailwind utilities to new color tokens
- [ ] Test Tailwind color utilities work

### 1.3 CSS Classes Import

**File:** `frontend/index.css`
**Estimated Time:** 2 hours

- [ ] Copy entire .site-header section
- [ ] Copy entire .hero section
- [ ] Copy .category-strip, .category-grid sections
- [ ] Copy .product-card, .product-grid sections
- [ ] Copy .deals-hero, .deals sections
- [ ] Copy .trade-essentials section
- [ ] Copy .brand-strip section
- [ ] Copy .spotlights section
- [ ] Copy .projects section
- [ ] Copy .lifestyle section
- [ ] Copy .seasonal-block section
- [ ] Copy .seo-categories section
- [ ] Copy .site-footer section
- [ ] Copy all utility classes (.btn, .pill, .sr-only, etc.)
- [ ] Test all classes render without conflicts

**Total Phase 1 Time:** ~3.5 hours

---

## PHASE 2: HEADER COMPONENT

### 2.1 Update Header.tsx Structure

**File:** `frontend/components/Header.tsx`
**Estimated Time:** 3 hours

- [ ] Create topbar section
  - [ ] Logo (left) with image
  - [ ] Search form (center)
  - [ ] Actions nav (right)
- [ ] Create navrow section
  - [ ] Primary nav pills (5 buttons)
  - [ ] Fulfillment pills (right)
- [ ] Apply all topbar classes
- [ ] Apply all navrow classes
- [ ] Test responsive layout at mobile/tablet/desktop

### 2.2 Cart Button Styling

**File:** `frontend/components/Header.tsx`
**Estimated Time:** 30 minutes

- [ ] Ensure cart button has .cart class
- [ ] Verify background is #463D90
- [ ] Verify text color is #ffffff
- [ ] Verify width & height are both 44px
- [ ] Verify icon is centered

### 2.3 Services Side Panel

**File:** `frontend/components/Header.tsx`
**Estimated Time:** 2 hours

- [ ] Create sidepanel-overlay div
- [ ] Create aside.sidepanel for services
- [ ] Create sidepanel-head with title and close button
- [ ] Create sidepanel-body with:
  - [ ] 6 service rows (Installation, Tool Rental, Truck Rental, Equipment, Credit Cards, Protection Plans)
  - [ ] Divider
  - [ ] 2 AI links (Paint Assistant, AI Helper)
- [ ] Apply all .sidepanel\* classes
- [ ] Add click handler to services button
- [ ] Test open/close animation

### 2.4 Account Side Panel

**File:** `frontend/components/Header.tsx`
**Estimated Time:** 2 hours

- [ ] Create sidepanel-overlay div
- [ ] Create aside.sidepanel for account
- [ ] Create sidepanel-head with title and close button
- [ ] Create account-cta-row (Sign in + Create Account buttons)
- [ ] Create account-pro section (PRO callout)
- [ ] Create sidepanel-divider
- [ ] Create sidepanel-body with:
  - [ ] 5 account rows (Track Order, Cards, Pay Bill, Discounts, Profile)
  - [ ] Divider
  - [ ] 2 AI links (Paint Assistant, AI Helper)
- [ ] Apply all .account*, .sidepanel* classes
- [ ] Add click handler to account button
- [ ] Test open/close animation

### 2.5 Panel Interactivity

**File:** `frontend/components/Header.tsx`
**Estimated Time:** 2 hours

- [ ] Create drawer state (servicesOpen, accountOpen)
- [ ] Toggle functions for each panel
- [ ] closeAll() function to close any open panel
- [ ] Overlay click closes panel
- [ ] Close button click closes panel
- [ ] Escape key closes all panels
- [ ] document.body.panel-open class management
- [ ] Test all interactions work
- [ ] Test animations are smooth

**Total Phase 2 Time:** ~11.5 hours

---

## PHASE 3: HERO & CATEGORY SECTIONS

### 3.1 Update/Create HeroBanner.tsx

**File:** `frontend/components/HeroBanner.tsx`
**Estimated Time:** 2.5 hours

- [ ] Create hero.hero--split structure
- [ ] Create hero-grid (2 columns)
- [ ] DIY Hero Card
  - [ ] hero-bg (background image)
  - [ ] hero-overlay (gradient)
  - [ ] hero-content with:
    - [ ] hero-kicker "Home Improvement"
    - [ ] hero-title "Build. Fix. Upgrade."
    - [ ] hero-sub description
    - [ ] hero-list (3 items)
    - [ ] hero-actions (2 buttons: Shop DIY, Browse categories)
- [ ] Trade Hero Card (similar structure with different content)
  - [ ] Add hero-trade-cta section at bottom
  - [ ] Trade registration link + Shop Trade link
- [ ] Trust row (4 columns)
  - [ ] Fast Delivery
  - [ ] Bulk Pricing
  - [ ] Trusted Brands
  - [ ] Dedicated Support
- [ ] Test layout is responsive
- [ ] Test button styling

### 3.2 Create CategoryStrip.tsx

**File:** `frontend/components/CategoryStrip.tsx`
**Estimated Time:** 1 hour

- [ ] Create .category-strip section
- [ ] Create .category-grid (6 columns)
- [ ] Create 6 category tiles:
  - [ ] Tools
  - [ ] Paint
  - [ ] Fasteners
  - [ ] Plumbing
  - [ ] Electrical
  - [ ] Safety
- [ ] Each tile has icon + label
- [ ] Apply .category-tile hover effects
- [ ] Test layout at all breakpoints

### 3.3 Create CategorySlider.tsx

**File:** `frontend/components/CategorySlider.tsx`
**Estimated Time:** 2 hours

- [ ] Create .category-slider section
- [ ] Create section-head (title + view all link)
- [ ] Create .category-tabs (5 buttons)
  - [ ] What's Popular (active)
  - [ ] Deals of the Day
  - [ ] Bathroom
  - [ ] Tools
  - [ ] Electrical
- [ ] Tab click handler - update active state
- [ ] Create .category-product-row (horizontal scroll)
- [ ] Add 4 ProductCard components
- [ ] Add scrollbar styling
- [ ] Test tab switching
- [ ] Test horizontal scroll on mobile

### 3.4 Create DealsHeroSection.tsx

**File:** `frontend/components/DealsHeroSection.tsx`
**Estimated Time:** 1.5 hours

- [ ] Create .deals-hero section
- [ ] Create section-head (title + view all deals)
- [ ] Create .deals-hero-row (3 columns)
- [ ] Create 3 deal-hero-card components:
  - [ ] Angle Grinder: SAVE 25%, R1,199 → R899
  - [ ] Tile Adhesive: BULK SAVE, R169 → R139
  - [ ] LED Floodlight: CLEARANCE, R349 → R249
- [ ] Each card has:
  - [ ] .deal-flag (badge)
  - [ ] Product title
  - [ ] Description
  - [ ] .deal-hero-price (was/now)
  - [ ] .deal-cta button
- [ ] Test layout at all breakpoints

### 3.5 Create WeeklyDealsSection.tsx

**File:** `frontend/components/WeeklyDealsSection.tsx`
**Estimated Time:** 2 hours

- [ ] Create .deals section
- [ ] Create section-head (title + view all deals)
- [ ] Create .deal-paths (3 columns)
  - [ ] Weekly Trade Deals
  - [ ] Bulk Buy & Save
  - [ ] Clearance & Overstock
- [ ] Create .product-grid (4 columns)
- [ ] Add 4 ProductCard components with --deal variant
- [ ] Each deal card has:
  - [ ] .deal-badge
  - [ ] Title & spec
  - [ ] .deal-price (was/now)
  - [ ] Optional .deal-meta-row (MOQ, per-unit)
  - [ ] .product-fulfillment pills
  - [ ] Add-to-cart button
- [ ] Test grid collapse on mobile

### 3.6 Create TradeEssentialsSection.tsx

**File:** `frontend/components/TradeEssentialsSection.tsx`
**Estimated Time:** 1 hour

- [ ] Create .trade-essentials section
- [ ] Create section-head with kicker note
- [ ] Create .trade-grid (5 columns)
- [ ] Create 5 trade-card components:
  - [ ] Ladders & Trestles
  - [ ] Power Tools
  - [ ] Fasteners
  - [ ] Sealants & Adhesives
  - [ ] Safety Wear
- [ ] Each card has:
  - [ ] .trade-title
  - [ ] .trade-cta link
- [ ] Test hover effects
- [ ] Test responsive layout

### 3.7 Create BrandStrip.tsx

**File:** `frontend/components/BrandStrip.tsx`
**Estimated Time:** 45 minutes

- [ ] Create .brand-strip section
- [ ] Create .brand-grid (6 columns)
- [ ] Add 6 brand logo images:
  - [ ] Bosch
  - [ ] Makita
  - [ ] DeWalt
  - [ ] Stanley
  - [ ] Ingco
  - [ ] Ryobi
- [ ] Use placeholder images if real logos not available
- [ ] Test layout

### 3.8 Create SpotlightsSection.tsx

**File:** `frontend/components/SpotlightsSection.tsx`
**Estimated Time:** 1.5 hours

- [ ] Create .spotlights section
- [ ] Create section-head with title & note
- [ ] Create .spotlights-grid (3 columns)
- [ ] Create 3 spotlight-card components:

**Card 1: Paint & Coatings**

- [ ] .spotlight-media (placeholder)
- [ ] .spotlight-body with:
  - [ ] Title
  - [ ] Description
  - [ ] Links (Interior, Exterior, Primers & Sealers)
  - [ ] CTA (Shop Paint →)

**Card 2: Plumbing & Sanitaryware**

- [ ] Same structure
- [ ] Links (Pipes & Fittings, Bathroom, Kitchen)

**Card 3: Doors & Windows**

- [ ] Same structure
- [ ] Links (Frames, Hardware, Security)

- [ ] Test responsive layout

### 3.9 Create ProjectsSection.tsx

**File:** `frontend/components/ProjectsSection.tsx`
**Estimated Time:** 1.5 hours

- [ ] Create .projects section
- [ ] Create section-head with title & note
- [ ] Create .projects-grid (4 columns)
- [ ] Create 4 project-card components:
  - [ ] Bathroom Renovation Essentials
  - [ ] Interior Painting Checklist
  - [ ] Outdoor Patio Setup
  - [ ] Basic Home Security Upgrade
- [ ] Each card has:
  - [ ] .project-media (placeholder)
  - [ ] .project-body with:
    - [ ] .project-title
    - [ ] .project-desc
    - [ ] .project-cta (View checklist →)
- [ ] Test layout at all breakpoints

### 3.10 Create LifestyleSection.tsx

**File:** `frontend/components/LifestyleSection.tsx`
**Estimated Time:** 1 hour

- [ ] Create .lifestyle section
- [ ] Create .lifestyle-grid (2 columns: content + media)
- [ ] Left side:
  - [ ] .lifestyle-title
  - [ ] .lifestyle-desc (paragraph)
  - [ ] .lifestyle-points (ul with 3 li)
    - [ ] Trade-grade products
    - [ ] Reliable stock & delivery
    - [ ] Clear pricing, no guesswork
  - [ ] .lifestyle-cta button
- [ ] Right side:
  - [ ] .lifestyle-media (placeholder)
- [ ] Test responsive (stacks on mobile)

### 3.11 Create SeasonalBlock.tsx

**File:** `frontend/components/SeasonalBlock.tsx`
**Estimated Time:** 1 hour

- [ ] Create .seasonal-block section
- [ ] Create .seasonal-grid (3 columns)
- [ ] Create 3 seasonal-card components:
  - [ ] Load Shedding Essentials
  - [ ] Rainy Season Prep
  - [ ] Outdoor Maintenance
- [ ] Each card has:
  - [ ] Title (h3)
  - [ ] Description
  - [ ] Link
- [ ] Test layout

### 3.12 Create SEOCategoriesSection.tsx

**File:** `frontend/components/SEOCategoriesSection.tsx`
**Estimated Time:** 45 minutes

- [ ] Create .seo-categories section
- [ ] Create section title (h2)
- [ ] Create .seo-category-grid (ul)
- [ ] Add 10 category links (li > a):
  - [ ] Boards & Sheeting
  - [ ] Ceiling Accessories
  - [ ] Tiles & Adhesives
  - [ ] Window Film
  - [ ] Fasteners
  - [ ] Power Tool Accessories
  - [ ] Sealants
  - [ ] Safety Wear
  - [ ] Electrical Components
  - [ ] Plumbing Fittings
- [ ] Test link styling

**Total Phase 3 Time:** ~18 hours

---

## PHASE 4: COMPONENT UPDATES

### 4.1 Update ProductCard.tsx

**File:** `frontend/components/ProductCard.tsx`
**Estimated Time:** 2 hours

**Current State:** Review existing implementation

**Updates:**

- [ ] Add .product-image div (height 180px, placeholder bg)
- [ ] Add .product-meta section:
  - [ ] .product-category (small label)
  - [ ] .product-name (bold title)
  - [ ] .product-spec (muted description)
- [ ] Add .product-purchase section:
  - [ ] .price-row with price and VAT note
  - [ ] .product-fulfillment with .pill items
    - [ ] .pill.pickup
    - [ ] .pill.delivery
  - [ ] .add-to-cart button
- [ ] Support deal variant (.product-card--deal):
  - [ ] Show .deal-badge instead of category
  - [ ] Show .deal-price with was/now prices
  - [ ] Show .deal-meta-row (MOQ, per-unit)
  - [ ] Add .product-card--deal:hover styling
- [ ] Test all styling classes apply correctly
- [ ] Test hover effects
- [ ] Test responsiveness

### 4.2 Review CartDrawer.tsx

**File:** `frontend/components/CartDrawer.tsx`
**Estimated Time:** 1 hour

- [ ] Verify drawer uses .sidepanel classes
- [ ] Verify overlay uses .sidepanel-overlay
- [ ] Verify close button styling
- [ ] Test open/close animation
- [ ] Test overlay click closes
- [ ] Test Escape key closes

### 4.3 Update Footer.tsx

**File:** `frontend/components/Footer.tsx`
**Estimated Time:** 1.5 hours

- [ ] Verify .site-footer structure
- [ ] Verify .footer-grid (4 columns)
- [ ] Verify .footer-col sections:
  - [ ] Shop (Tools & Machinery, Paint, Building Materials, Plumbing, Deals)
  - [ ] Trade (Trade Accounts, Bulk Orders, Delivery, Returns)
  - [ ] Support (Contact, Help, Account)
  - [ ] Belims (About, Brands, Terms, Privacy)
- [ ] Verify .footer-bottom with copyright
- [ ] Test layout at mobile/desktop
- [ ] Ensure all links are correct

**Total Phase 4 Time:** ~4.5 hours

---

## PHASE 5: APP.TSX INTEGRATION

### 5.1 Import All Components

**File:** `frontend/App.tsx`
**Estimated Time:** 30 minutes

- [ ] Import Header from components/Header
- [ ] Import HeroBanner from components/HeroBanner
- [ ] Import CategoryStrip from components/CategoryStrip
- [ ] Import CategorySlider from components/CategorySlider
- [ ] Import DealsHeroSection from components/DealsHeroSection
- [ ] Import WeeklyDealsSection from components/WeeklyDealsSection
- [ ] Import TradeEssentialsSection from components/TradeEssentialsSection
- [ ] Import BrandStrip from components/BrandStrip
- [ ] Import SpotlightsSection from components/SpotlightsSection
- [ ] Import ProjectsSection from components/ProjectsSection
- [ ] Import LifestyleSection from components/LifestyleSection
- [ ] Import SeasonalBlock from components/SeasonalBlock
- [ ] Import SEOCategoriesSection from components/SEOCategoriesSection
- [ ] Import Footer from components/Footer

### 5.2 Create HomePage Component

**File:** `frontend/App.tsx`
**Estimated Time:** 30 minutes

- [ ] Create HomePage functional component
- [ ] Return Fragment with all sections in order:
  1. HeroBanner
  2. CategoryStrip
  3. CategorySlider
  4. DealsHeroSection
  5. WeeklyDealsSection
  6. TradeEssentialsSection
  7. BrandStrip
  8. SpotlightsSection
  9. ProjectsSection
  10. LifestyleSection
  11. SeasonalBlock
  12. SEOCategoriesSection
- [ ] Test all components render

### 5.3 Update Routes

**File:** `frontend/App.tsx`
**Estimated Time:** 15 minutes

- [ ] Add "/" route pointing to HomePage
- [ ] Ensure Header wraps all routes
- [ ] Ensure Footer renders on all pages
- [ ] Test home page navigation
- [ ] Test other routes still work

**Total Phase 5 Time:** ~1.5 hours

---

## PHASE 6: TESTING & OPTIMIZATION

### 6.1 Visual Testing

**Estimated Time:** 3 hours

- [ ] Desktop (1440px+) - All sections visible, proper spacing
- [ ] Laptop (1024px) - Grid columns adjust, readable
- [ ] Tablet (768px) - 2-3 column layouts, touch-friendly
- [ ] Mobile (360-480px) - 1 column, stacked sections
- [ ] iPhone SE / Small device - all content accessible
- [ ] Wide monitors (1920px+) - proper max-width, centered

**Sections to Test:**

- [ ] Header (search, buttons, panels, cart)
- [ ] Hero (images, text, buttons)
- [ ] Category Strip (6-column grid collapse)
- [ ] Product Slider (tabs, horizontal scroll)
- [ ] Deal cards (pricing display, badges)
- [ ] Weekly deals grid (4-column collapse)
- [ ] Trade essentials (5-column collapse)
- [ ] Brand logos (visibility)
- [ ] Spotlights (3-column, media sizing)
- [ ] Projects (4-column collapse)
- [ ] Lifestyle (text/media split)
- [ ] Seasonal (3-column collapse)
- [ ] SEO links (list readability)
- [ ] Footer (4-column collapse)

### 6.2 Functionality Testing

**Estimated Time:** 2 hours

- [ ] Search form submits correctly
- [ ] Services panel opens on button click
- [ ] Services panel closes on X click
- [ ] Services panel closes on overlay click
- [ ] Account panel opens on button click
- [ ] Account panel closes on X click
- [ ] Account panel closes on overlay click
- [ ] Escape key closes any open panel
- [ ] Only one panel open at a time
- [ ] Body scroll disabled when panel open
- [ ] Tab switching in category slider works
- [ ] Horizontal scroll works on product rows
- [ ] Product add-to-cart buttons functional
- [ ] Cart icon click opens cart drawer
- [ ] All navigation links work
- [ ] External links (brands, etc.) work

### 6.3 Performance Testing

**Estimated Time:** 1.5 hours

- [ ] Check bundle size (should not increase significantly)
- [ ] Lighthouse score > 80
- [ ] No console errors or warnings
- [ ] Images lazy load properly
- [ ] Animations smooth (60fps)
- [ ] No layout shift (CLS)
- [ ] First paint < 1 second
- [ ] Largest contentful paint < 2.5 seconds

### 6.4 Browser Compatibility

**Estimated Time:** 1 hour

- [ ] Chrome 90+ (latest)
- [ ] Firefox 88+ (latest)
- [ ] Safari 14+ (latest)
- [ ] Edge 90+ (latest)
- [ ] Mobile Safari (iPhone)
- [ ] Chrome Mobile (Android)

### 6.5 Accessibility Testing

**Estimated Time:** 1 hour

- [ ] Tab navigation works
- [ ] All buttons have accessible labels
- [ ] Color contrast passes WCAG AA
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Modals are properly trapped
- [ ] Screen reader friendly (test with NVDA/JAWS)
- [ ] Keyboard-only navigation possible

### 6.6 Cross-device Testing

**Estimated Time:** 1.5 hours

- [ ] Test on actual devices if possible
- [ ] Test with different network speeds (throttle in DevTools)
- [ ] Test with different browsers on same device
- [ ] Test landscape/portrait orientation
- [ ] Test with zoom (200%, 400%)

### 6.7 Bug Fixes & Polish

**Estimated Time:** 2 hours (estimated, may vary)

- [ ] Fix any visual inconsistencies
- [ ] Fix any layout issues
- [ ] Smooth animations
- [ ] Adjust spacing/padding if needed
- [ ] Verify hover states
- [ ] Verify focus states
- [ ] Final screenshot comparison with gpt/index.html

**Total Phase 6 Time:** ~12.5 hours

---

## SUMMARY

| Phase     | Task                | Estimated Hours |
| --------- | ------------------- | --------------- |
| 1         | Foundation & CSS    | 3.5             |
| 2         | Header Component    | 11.5            |
| 3         | Hero & Categories   | 18              |
| 4         | Component Updates   | 4.5             |
| 5         | App.tsx Integration | 1.5             |
| 6         | Testing & Polish    | 12.5            |
| **TOTAL** |                     | **~51.5 hours** |

### Timeline

- **Ideal Sprint:** 2 weeks (5 business days × 2 weeks, 5 hours/day)
- **Realistic Timeline:** 3-4 weeks (accounting for refinement & testing)
- **Expedited Timeline:** 10-12 working days (7+ hours/day)

---

## Notes

- Prioritize Header (Phase 2) - it's blocking other work
- Test frequently throughout each phase
- Keep gpt/index.html open for reference during implementation
- Commit changes frequently to avoid conflicts
- Ensure backward compatibility with existing routes/features
