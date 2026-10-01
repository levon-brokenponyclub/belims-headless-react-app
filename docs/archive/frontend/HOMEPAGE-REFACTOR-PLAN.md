# Belims Homepage Refactor Plan

## Overview

This document outlines the comprehensive plan to refactor the React frontend components to match the updated gpt/index.html static template and homepage-base.css styling system.

## Current State Analysis

### Static Template (gpt/index.html)

- Complete homepage structure with all sections
- Semantic HTML5 with ARIA labels
- Fully responsive layout (mobile-first)
- Self-contained JavaScript for drawer interactions

### CSS System (gpt/css/homepage-base.css)

- 1663 lines of comprehensive styling
- CSS custom properties (--belims-primary, --belims-accent, --belims-red, etc.)
- Component-scoped classes with BEM-like naming
- Mobile-first responsive approach
- Drawer/panel system with fixed positioning

### Current React Components

- Basic structure exists in frontend/components/
- Some components partially implemented
- No unified styling system
- Missing many layout sections present in template

---

## Phase 1: Foundation Setup (CSS & Tokens)

### 1.1 Update CSS Tokens & Variables

**File:** `frontend/index.css` and `frontend/tailwind.config.js`

**Actions:**

1. Import all CSS custom properties from homepage-base.css into index.css
2. Map color tokens to Tailwind config custom colors
3. Add custom spacing values and border radius
4. Define font families and sizes as Tailwind extensions

**Key Tokens to Add:**

```javascript
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

### 1.2 Merge CSS Classes

**File:** `frontend/index.css`

**Actions:**

1. Copy all component CSS classes from homepage-base.css
2. Organize by section (header, hero, products, footer, etc.)
3. Ensure no conflicts with existing Tailwind utilities
4. Test all classes render correctly

---

## Phase 2: Header Component Refactor

### 2.1 Update Header.tsx

**Current Issues:**

- May not have topbar structure
- Missing search form integration
- Actions section needs work
- No proper drawer implementation

**Actions:**

1. Create topbar section with:
   - Logo (left)
   - Search form (center) - connects to /shop with search param
   - Actions nav (right) - Account button + Cart button
2. Create navrow section with:
   - Primary nav pills (Departments, Services, Track Order, Deals, How-To)
   - Fulfillment pills (right side)
3. Implement sidepanels:
   - Services panel with 8 menu items + divider + AI links
   - Account panel with sign-in/create buttons + pro callout + menu items
4. Add drawer logic:
   - Close button behavior
   - Overlay dismissal
   - Escape key handling
   - Prevent body scroll when open
5. Apply all .cart button styling (background #463D90, color #fff, 44x44px)

**Key Classes to Use:**

- `.site-header`, `.topbar`, `.topbar-grid`
- `.logo`, `.search`, `.actions`
- `.cart` (updated with new colors)
- `.navrow`, `.navrow-grid`
- `.primary`, `.nav-pill`, `.nav-pill--accent`
- `.fulfillment`, `.fulfillment-pill`
- `.sidepanel-overlay`, `.sidepanel`, `.sidepanel-head`, `.sidepanel-body`
- `.sidepanel-row`, `.sp-ic`, `.sp-txt`, `.sp-arrow`

---

## Phase 3: Homepage Sections

### 3.1 Create/Update HeroBanner.tsx

**Layout:** Split entry with DIY and Trade cards

**Components:**

- Hero grid (2 columns)
- Hero card with:
  - Background image (--hero-image CSS var)
  - Overlay gradient
  - Content section (kicker, title, subtitle, list, actions)
  - Trade card: Add trade CTA section with registration link
- Trust row (4 columns) with icons and text

**Key Classes:**

- `.hero.hero--split`, `.hero-grid`
- `.hero-card`, `.hero-card--diy`, `.hero-card--trade`
- `.hero-bg`, `.hero-overlay`, `.hero-content`
- `.hero-kicker`, `.hero-title`, `.hero-sub`
- `.hero-list`, `.hero-actions`
- `.btn`, `.btn--primary`, `.btn--ghost`, `.btn--primary-red`
- `.hero-trust`, `.trust-item`, `.trust-ic`, `.trust-txt`

### 3.2 Create CategoryStrip.tsx

**Layout:** 6-column grid below hero

**Components:**

- Category tiles with:
  - Icon (emoji)
  - Label
  - Hover effects

**Categories:** Tools, Paint, Fasteners, Plumbing, Electrical, Safety

**Key Classes:**

- `.category-strip`, `.category-grid`
- `.category-tile`, `.category-icon`, `.category-label`

### 3.3 Create CategorySlider.tsx

**Layout:** Tabbed section with scrollable product row

**Components:**

- Section header (title + view all link)
- Tab buttons (What's Popular, Deals of the Day, Bathroom, Tools, Electrical)
- Horizontal scrollable product row
- Use ProductCard component for each item

**Key Classes:**

- `.category-slider`
- `.category-tabs`, `.category-tab`, `.category-tab.active`
- `.category-product-row`, `.product-card`

### 3.4 Create DealsHeroSection.tsx

**Layout:** 3-column grid of deal hero cards

**Components:**

- Deal flag badge (SAVE 25%, BULK SAVE, CLEARANCE)
- Product title (H3)
- Product description
- Price display (was / now)
- CTA button

**Key Classes:**

- `.deals-hero`, `.deals-hero-row`
- `.deal-hero-card`, `.deal-flag`
- `.deal-hero-price`, `.was`, `.now`
- `.deal-cta`

### 3.5 Create WeeklyDealsSection.tsx

**Layout:** Deal path navigation + 4-column product grid

**Components:**

- Section header
- Deal path cards (3 columns) - Weekly / Bulk / Clearance
- Product grid (4 columns) with deal cards
- Each card uses ProductCard with deal variant

**Key Classes:**

- `.deals`, `.deal-paths`
- `.deal-path`, `.deal-path-title`, `.deal-path-sub`
- `.product-grid`, `.product-card--deal`
- `.deal-badge`, `.deal-price`, `.price-was`, `.price-now`
- `.deal-meta-row`, `.deal-meta`

### 3.6 Create TradeEssentialsSection.tsx

**Layout:** 5-column grid of trade cards

**Components:**

- Section header with kicker note
- Trade cards with:
  - Title
  - CTA link (Shop now →)

**Cards:** Ladders, Power Tools, Fasteners, Sealants, Safety Wear

**Key Classes:**

- `.trade-essentials`, `.trade-grid`
- `.trade-card`, `.trade-title`, `.trade-cta`

### 3.7 Create BrandStrip.tsx

**Layout:** 6-column grid of brand logos

**Components:**

- Brand images in grid
- No text labels, just logos

**Key Classes:**

- `.brand-strip`, `.brand-grid`

### 3.8 Create SpotlightsSection.tsx

**Layout:** 3-column grid of spotlight cards

**Components Per Card:**

- Media placeholder (full bleed top)
- Body section with:
  - Title (H3)
  - Description
  - Links list (3 links per card)
  - CTA button (Shop Category →)

**Spotlight Data:**

1. Paint & Coatings - Links: Interior, Exterior, Primers
2. Plumbing & Sanitaryware - Links: Pipes, Bathroom, Kitchen
3. Doors & Windows - Links: Frames, Hardware, Security

**Key Classes:**

- `.spotlights`, `.spotlights-grid`
- `.spotlight-card`, `.spotlight-media`
- `.spotlight-body`, `.spotlight-title`, `.spotlight-desc`
- `.spotlight-links`, `.spotlight-cta`

### 3.9 Create ProjectsSection.tsx

**Layout:** 4-column grid of project cards

**Components Per Card:**

- Media placeholder
- Body with:
  - Title (H3)
  - Description
  - CTA (View checklist →)

**Projects:**

1. Bathroom Renovation Essentials
2. Interior Painting Checklist
3. Outdoor Patio Setup
4. Basic Home Security Upgrade

**Key Classes:**

- `.projects`, `.projects-grid`
- `.project-card`, `.project-media`
- `.project-body`, `.project-title`, `.project-desc`, `.project-cta`

### 3.10 Create LifestyleSection.tsx

**Layout:** Split layout (content left, media right)

**Components:**

- Lifestyle title (H2)
- Description paragraph
- Points list (3 items)
- CTA button (Start your project →)
- Media placeholder

**Key Classes:**

- `.lifestyle`, `.lifestyle-grid`
- `.lifestyle-content`, `.lifestyle-title`, `.lifestyle-desc`
- `.lifestyle-points`, `.lifestyle-media`
- `.lifestyle-cta`

### 3.11 Create SeasonalBlock.tsx

**Layout:** 3-column grid of seasonal cards

**Components Per Card:**

- Title (H3)
- Description
- Link (Shop essentials →)

**Seasonal Items:**

1. Load Shedding Essentials
2. Rainy Season Prep
3. Outdoor Maintenance

**Key Classes:**

- `.seasonal-block`, `.seasonal-grid`
- `.seasonal-card`

### 3.12 Create SEOCategoriesSection.tsx

**Layout:** List of 10 category links for SEO

**Categories:**

- Boards & Sheeting
- Ceiling Accessories
- Tiles & Adhesives
- Window Film
- Fasteners
- Power Tool Accessories
- Sealants
- Safety Wear
- Electrical Components
- Plumbing Fittings

**Key Classes:**

- `.seo-categories`, `.seo-category-grid`

---

## Phase 4: Component Updates

### 4.1 Update ProductCard.tsx

**Current State:** Basic card structure

**Updates Needed:**

1. Add product image placeholder div
2. Add meta section:
   - Category label (small text)
   - Product name (bold)
   - Product spec (muted)
3. Add purchase section:
   - Price row (price + VAT note)
   - Fulfillment pills (Pickup / Delivery)
   - Add-to-cart button
4. Support deal variant:
   - Deal badge instead of category
   - Price display shows was/now
   - Deal meta row (MOQ, per-unit price)

**Key Classes:**

- `.product-card`, `.product-card--deal`
- `.product-image`, `.product-meta`, `.product-purchase`
- `.product-category`, `.product-name`, `.product-spec`
- `.price-row`, `.product-price`, `.price-note`
- `.product-fulfillment`, `.pill`, `.pill.pickup`, `.pill.delivery`
- `.add-to-cart`
- `.deal-badge`, `.deal-price`, `.price-was`, `.price-now`

### 4.2 Update CartDrawer.tsx

**Current State:** May exist

**Verify:**

- Drawer styling matches .sidepanel classes
- Cart button integration works
- Close functionality (X button + overlay click)

### 4.3 Review/Update Footer.tsx

**Verify Structure:**

- 4-column footer grid (Shop, Trade, Support, Belims)
- Each column has header (H4) and list
- Footer bottom with copyright and tagline

**Key Classes:**

- `.site-footer`, `.footer-grid`
- `.footer-col`, `.footer-col h4`
- `.footer-bottom`

---

## Phase 5: App.tsx Integration

### 5.1 Import All New Components

```typescript
import { Header } from "./components/Header";
import { HeroBanner } from "./components/HeroBanner";
import { CategoryStrip } from "./components/CategoryStrip";
import { CategorySlider } from "./components/CategorySlider";
import { DealsHeroSection } from "./components/DealsHeroSection";
import { WeeklyDealsSection } from "./components/WeeklyDealsSection";
import { TradeEssentialsSection } from "./components/TradeEssentialsSection";
import { BrandStrip } from "./components/BrandStrip";
import { SpotlightsSection } from "./components/SpotlightsSection";
import { ProjectsSection } from "./components/ProjectsSection";
import { LifestyleSection } from "./components/LifestyleSection";
import { SeasonalBlock } from "./components/SeasonalBlock";
import { SEOCategoriesSection } from "./components/SEOCategoriesSection";
import { Footer } from "./components/Footer";
```

### 5.2 Create HomePage Component

```typescript
const HomePage = () => (
  <>
    <HeroBanner />
    <CategoryStrip />
    <CategorySlider />
    <DealsHeroSection />
    <WeeklyDealsSection />
    <TradeEssentialsSection />
    <BrandStrip />
    <SpotlightsSection />
    <ProjectsSection />
    <LifestyleSection />
    <SeasonalBlock />
    <SEOCategoriesSection />
  </>
);
```

### 5.3 Add Route

```typescript
<Route path="/" element={<HomePage />} />
```

---

## Phase 6: Testing & Optimization

### 6.1 Responsive Testing

- [ ] Test at 320px, 640px, 768px, 1024px, 1440px breakpoints
- [ ] Verify grid columns collapse appropriately
- [ ] Check touch interactions on mobile
- [ ] Test drawer/panel behavior on small screens

### 6.2 Functionality Testing

- [ ] Header search form submission
- [ ] Services panel open/close
- [ ] Account panel open/close
- [ ] Escape key closes panels
- [ ] Overlay click closes panels
- [ ] Tab switching in category slider
- [ ] Product add-to-cart
- [ ] Cart icon opens/updates
- [ ] Navigation links work

### 6.3 Performance

- [ ] Bundle size check
- [ ] Lazy load images
- [ ] Minimize CSS in production
- [ ] Test page load speed
- [ ] Check console for errors/warnings

### 6.4 Browser Compatibility

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

---

## Implementation Order

### Sprint 1: Foundation

1. Implement Phase 1 (CSS Tokens & Variables)
2. Implement Phase 4.1 (ProductCard updates)
3. Verify styling system works

### Sprint 2: Core Components

4. Implement Phase 2 (Header refactor)
5. Implement Phase 3.1 (HeroBanner)
6. Implement Phase 3.2 (CategoryStrip)
7. Test Header + Hero sections

### Sprint 3: Homepage Sections

8. Implement Phase 3.3-3.12 (All other sections)
9. Implement Phase 4.2-4.3 (CartDrawer, Footer)
10. Integrate all sections

### Sprint 4: Integration & Testing

11. Implement Phase 5 (App.tsx integration)
12. Implement Phase 6 (Testing)

---

## CSS Architecture Notes

### Utility Classes

Use the custom classes from homepage-base.css rather than pure Tailwind. This ensures consistency with the static template.

### Responsive Breakpoints

- Mobile: < 768px (single column, stacked sections)
- Tablet: 768px - 1024px (2-3 columns)
- Desktop: > 1024px (4-6 columns)

### Color System

All colors use CSS custom properties (variables) for easy updates:

```css
var(--belims-primary)        /* #322783 */
var(--belims-primary-hover)  /* #4a3fc2 */
var(--belims-accent)         /* #f97316 */
var(--belims-red)            /* #e40613 */
var(--bg-main)               /* #f4f6f8 */
var(--bg-card)               /* #ffffff */
var(--border)                /* #e2e8f0 */
var(--text-main)             /* #1e293b */
var(--text-muted)            /* #64748b */
```

### Component Naming

Follow BEM-like pattern: `.block`, `.block--modifier`, `.block__element`

Example:

```css
.product-card {
}
.product-card--deal {
}
.product-card:hover {
}
.product-image {
}
.product-meta {
}
.product-name {
}
```

---

## File Checklist

### Components to Create

- [ ] CategoryStrip.tsx
- [ ] CategorySlider.tsx
- [ ] DealsHeroSection.tsx
- [ ] WeeklyDealsSection.tsx
- [ ] TradeEssentialsSection.tsx
- [ ] BrandStrip.tsx
- [ ] SpotlightsSection.tsx
- [ ] ProjectsSection.tsx
- [ ] LifestyleSection.tsx
- [ ] SeasonalBlock.tsx
- [ ] SEOCategoriesSection.tsx

### Components to Update

- [ ] Header.tsx
- [ ] HeroBanner.tsx
- [ ] ProductCard.tsx
- [ ] CartDrawer.tsx
- [ ] Footer.tsx

### Config Files to Update

- [ ] frontend/index.css (add all CSS from homepage-base.css)
- [ ] frontend/tailwind.config.js (add custom colors/tokens)
- [ ] frontend/App.tsx (add routes and imports)

---

## Dependencies & Tools

- React Router (already installed)
- Tailwind CSS (already configured)
- Lucide React icons (already imported)
- CSS custom properties (native browser support)

No additional packages needed!
