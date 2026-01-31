# Component Structure & Architecture

## Component Dependency Tree

```
App.tsx
├── Header.tsx (existing)
│   ├── Logo
│   ├── SearchForm
│   ├── ActionButtons (Account + Cart)
│   ├── NavPills (Departments, Services, Track Order, Deals, How-To)
│   ├── FulfillmentPills
│   ├── ServicesPanel (drawer)
│   │   └── 8 service links + AI section
│   └── AccountPanel (drawer)
│       └── Sign-in/Create + menu + AI section
│
├── HeroBanner.tsx (NEW)
│   ├── DIY Hero Card
│   │   ├── Background Image
│   │   └── Content (kicker, title, subtitle, list, buttons)
│   ├── Trade Hero Card (similar)
│   │   └── Trade CTA section
│   └── TrustRow
│       └── 4 trust items (icons + text)
│
├── CategoryStrip.tsx (NEW)
│   └── 6 CategoryTiles
│       └── Icon + Label
│
├── CategorySlider.tsx (NEW)
│   ├── SectionHead
│   ├── TabButtons (5 tabs)
│   └── ScrollableProductRow
│       └── 4× ProductCard
│
├── DealsHeroSection.tsx (NEW)
│   ├── SectionHead
│   └── 3× DealHeroCard
│       ├── Deal badge
│       ├── Product title
│       ├── Price (was/now)
│       └── CTA button
│
├── WeeklyDealsSection.tsx (NEW)
│   ├── SectionHead
│   ├── DealPaths (3 cards)
│   └── ProductGrid (4 columns)
│       └── 4× ProductCard (--deal variant)
│
├── TradeEssentialsSection.tsx (NEW)
│   ├── SectionHead
│   └── 5× TradeCard
│       ├── Title
│       └── CTA link
│
├── BrandStrip.tsx (NEW)
│   └── 6 BrandLogos
│
├── SpotlightsSection.tsx (NEW)
│   ├── SectionHead
│   └── 3× SpotlightCard
│       ├── Media placeholder
│       ├── Title
│       ├── Description
│       ├── Links (3× each)
│       └── CTA link
│
├── ProjectsSection.tsx (NEW)
│   ├── SectionHead
│   └── 4× ProjectCard
│       ├── Media placeholder
│       ├── Title
│       ├── Description
│       └── CTA link
│
├── LifestyleSection.tsx (NEW)
│   ├── Content (left)
│   │   ├── Title
│   │   ├── Description
│   │   ├── Points list (3×)
│   │   └── CTA button
│   └── Media placeholder (right)
│
├── SeasonalBlock.tsx (NEW)
│   └── 3× SeasonalCard
│       ├── Title
│       ├── Description
│       └── Link
│
├── SEOCategoriesSection.tsx (NEW)
│   ├── Title
│   └── 10× Category links
│
└── Footer.tsx (existing, may need updates)
    ├── 4× FooterColumn
    │   ├── Column title
    │   └── Link list
    └── FooterBottom
        └── Copyright + tagline
```

---

## Component File Locations

### EXISTING COMPONENTS (May need updates)

```
frontend/components/
├── Header.tsx                    # UPDATE
├── HeroBanner.tsx               # UPDATE
├── ProductCard.tsx              # UPDATE
├── CartDrawer.tsx               # REVIEW
├── Footer.tsx                   # REVIEW
└── ... (other existing components)
```

### NEW COMPONENTS TO CREATE

```
frontend/components/
├── CategoryStrip.tsx
├── CategorySlider.tsx
├── DealsHeroSection.tsx
├── WeeklyDealsSection.tsx
├── TradeEssentialsSection.tsx
├── BrandStrip.tsx
├── SpotlightsSection.tsx
├── ProjectsSection.tsx
├── LifestyleSection.tsx
├── SeasonalBlock.tsx
└── SEOCategoriesSection.tsx
```

---

## CSS Class Reference Map

### Header Styles

```css
.site-header                  /* Main header wrapper */
.topbar                       /* Top bar with logo/search/actions */
.topbar-grid                  /* Grid layout for topbar */
.logo                         /* Logo styling */
.search                       /* Search form */
.search input                 /* Search input field */
.search button                /* Search button */
.actions                      /* Action buttons container */
.action                       /* Individual action button */
.action .kicker              /* Small label above button */
.action .label               /* Button label text */
.cart                        /* Cart button (purple #463D90) */
.navrow                      /* Navigation row below topbar */
.navrow-grid                 /* Grid for navrow */
.primary                     /* Primary navigation container */
.nav-pill                    /* Navigation button */
.nav-pill:hover              /* Navigation button hover */
.nav-pill--accent            /* Accent nav pill (red) */
.fulfillment                 /* Fulfillment options container */
.fulfillment-pill            /* Fulfillment pill button */
.sidepanel-overlay          /* Semi-transparent overlay */
.sidepanel                   /* Side panel container */
.sidepanel.is-open          /* Open state animation */
.sidepanel-head             /* Panel header */
.sidepanel-title            /* Panel title */
.sidepanel-close            /* Close button */
.sidepanel-body             /* Panel content area */
.sidepanel-row              /* Panel menu item */
.sp-ic                      /* Icon in sidebar row */
.sp-txt                     /* Text in sidebar row */
.sp-arrow                   /* Arrow in sidebar row */
.sidepanel-divider          /* Divider line */
.account-cta-row            /* Account CTA buttons row */
.account-cta                /* CTA button style */
.account-cta--primary       /* Primary CTA button */
.account-pro                /* Pro callout section */
```

### Hero Styles

```css
.hero.hero--split           /* Hero split layout */
.hero-grid                  /* Hero grid (2 cols) */
.hero-card                  /* Hero card */
.hero-card--diy            /* DIY variant */
.hero-card--trade          /* Trade variant */
.hero-bg                    /* Hero background image */
.hero-overlay              /* Hero gradient overlay */
.hero-content              /* Hero text content */
.hero-kicker               /* Small label */
.hero-title                /* Main title */
.hero-sub                  /* Subtitle */
.hero-list                 /* Bullet list */
.hero-actions              /* Button container */
.btn                       /* Base button style */
.btn--primary              /* Primary button (purple) */
.btn--ghost                /* Ghost button (outline) */
.btn--primary-red          /* Red primary button */
.hero-trade-cta           /* Trade CTA section */
.hero-trade-note          /* Trade note text */
.hero-trade-links         /* Trade links container */
.link-cta                 /* Call-to-action link */
.link-muted               /* Muted text link */
.hero-trust               /* Trust row container */
.trust-item               /* Individual trust item */
.trust-ic                 /* Trust icon */
.trust-txt                /* Trust text */
```

### Category Styles

```css
.category-strip           /* Category section */
.category-grid            /* Category grid (6 cols) */
.category-tile            /* Category card */
.category-tile:hover      /* Hover state */
.category-icon            /* Category icon */
.category-label           /* Category label text */
```

### Product Styles

```css
.product-grid             /* Product grid container */
.product-card             /* Product card */
.product-card--deal       /* Deal card variant */
.product-card:hover       /* Hover effect */
.product-image            /* Product image placeholder */
.product-meta             /* Product info section */
.product-category         /* Category label */
.product-name             /* Product title */
.product-spec             /* Product specification */
.product-purchase         /* Purchase section */
.price-row                /* Price display row */
.product-price            /* Price text */
.price-note               /* Price note (VAT, etc) */
.product-fulfillment      /* Fulfillment options */
.pill                     /* Pill badge */
.pill.pickup              /* Pickup pill */
.pill.delivery            /* Delivery pill */
.add-to-cart              /* Add to cart button */
.deal-badge               /* Deal badge text */
.deal-price               /* Deal price container */
.price-was                /* Original price */
.price-now                /* Sale price */
.deal-meta-row            /* Deal metadata (MOQ, etc) */
.deal-meta                /* Individual metadata */
```

### Category Slider Styles

```css
.category-slider          /* Slider section */
.category-tabs            /* Tab buttons container */
.category-tab             /* Individual tab button */
.category-tab.active      /* Active tab state */
.category-product-row     /* Scrollable product row */
```

### Deals Styles

```css
.deals-hero               /* Deals hero section */
.deals-hero-row           /* Hero row (3 cols) */
.deal-hero-card           /* Hero card */
.deal-flag                /* Deal flag badge */
.deal-hero-price          /* Hero card price */
.deal-cta                 /* Deal CTA button */
.deals                    /* Weekly deals section */
.deal-paths               /* Deal path cards */
.deal-path                /* Individual path card */
.deal-path-title          /* Path title */
.deal-path-sub            /* Path subtitle */
```

### Trade Styles

```css
.trade-essentials         /* Trade section */
.trade-grid               /* Trade grid (5 cols) */
.trade-card               /* Trade card */
.trade-title              /* Trade card title */
.trade-cta                /* Trade card link */
```

### Brand Styles

```css
.brand-strip              /* Brand section */
.brand-grid               /* Brand grid (6 cols) */
```

### Spotlight Styles

```css
.spotlights               /* Spotlights section */
.spotlights-grid          /* Grid (3 cols) */
.spotlight-card           /* Spotlight card */
.spotlight-media          /* Media area */
.spotlight-body           /* Content area */
.spotlight-title          /* Card title */
.spotlight-desc           /* Description */
.spotlight-links          /* Links list */
.spotlight-cta            /* CTA link */
```

### Projects Styles

```css
.projects                 /* Projects section */
.projects-grid            /* Grid (4 cols) */
.project-card             /* Project card */
.project-media            /* Media placeholder */
.project-body             /* Content area */
.project-title            /* Title */
.project-desc             /* Description */
.project-cta              /* CTA link */
```

### Lifestyle Styles

```css
.lifestyle                /* Lifestyle section */
.lifestyle-grid           /* Grid (2 cols) */
.lifestyle-content        /* Content column */
.lifestyle-title          /* Main title */
.lifestyle-desc           /* Description text */
.lifestyle-points         /* Points list */
.lifestyle-media          /* Media column */
.lifestyle-cta            /* CTA button */
```

### Seasonal Styles

```css
.seasonal-block           /* Seasonal section */
.seasonal-grid            /* Grid (3 cols) */
.seasonal-card            /* Seasonal card */
```

### SEO Styles

```css
.seo-categories           /* SEO section */
.seo-category-grid        /* Category grid (list) */
```

### Footer Styles

```css
.site-footer              /* Footer wrapper */
.footer-grid              /* 4-column grid */
.footer-col               /* Footer column */
.footer-col h4            /* Column title */
.footer-bottom            /* Footer bottom info */
```

### Utility Classes

```css
.container                /* Max-width container (1440px) */
.sr-only                  /* Screen-reader only text */
.section-head             /* Section header (title + link) */
.section-title            /* Section title (H2) */
.section-link             /* View more link */
.section-note             /* Section subtitle */
```

---

## Data Requirements

### HeroBanner

- DIY hero image URL
- DIY hero text (kicker, title, subtitle, 3 list items)
- Trade hero image URL
- Trade hero text (similar structure)

### CategoryStrip

- 6 categories: Tools, Paint, Fasteners, Plumbing, Electrical, Safety
- Each needs: icon (emoji), label, link path

### CategorySlider

- 5 tab labels
- 4 sample products (or fetch from WooCommerce)

### DealsHeroSection

- 3 deal products
- Each: badge, title, description, was/now price, link

### WeeklyDealsSection

- 3 deal paths (Weekly, Bulk, Clearance)
- 4 deal products
- Each: badge, title, spec, was/now price, fulfillment, link

### TradeEssentialsSection

- 5 trade categories with links

### BrandStrip

- 6 brand logos (image URLs)

### SpotlightsSection

- 3 spotlight categories
- Each: title, description, 3 links, media image, CTA link

### ProjectsSection

- 4 project types
- Each: title, description, media image, checklist link

### LifestyleSection

- Title, description, 3 bullet points, CTA link
- Background/media image

### SeasonalBlock

- 3 seasonal offerings
- Each: title, description, link

### SEOCategoriesSection

- 10 category links (static list)

---

## State Management

### Header Component

```typescript
// Local state needed
const [servicesOpen, setServicesOpen] = useState(false);
const [accountOpen, setAccountOpen] = useState(false);

// Functions
const toggleServices = () => {
  /* close other panels */
};
const toggleAccount = () => {
  /* close other panels */
};
const closeAll = () => {
  /* close all panels */
};

// Effects
useEffect(() => {
  // Handle Escape key
  // Manage body.panel-open class
}, [servicesOpen, accountOpen]);
```

### CategorySlider Component

```typescript
// Local state
const [activeTab, setActiveTab] = useState(0);

// When tab changes, filter/update products displayed
```

### Other Components

- Mostly presentational (no state needed initially)
- Can add interactivity later (favorites, comparisons, etc)

---

## Responsive Breakpoints

Reference existing Tailwind config and apply to class styles:

```
Mobile:   < 768px   (1 column, full width)
Tablet:   768-1024px (2-3 columns)
Desktop:  1024-1440px (4-6 columns, proper spacing)
Large:    > 1440px  (max-width container)
```

### Grid Collapse Strategy

- Category Strip: 6 → 3 → 2 → 1
- Product Grid: 4 → 2 → 1
- Spotlights: 3 → 2 → 1
- Projects: 4 → 2 → 1
- Trade Essentials: 5 → 3 → 1
- Seasonal: 3 → 2 → 1
- Footer: 4 → 2 → 1

---

## Component Props Suggestions

```typescript
// HeroBanner
interface HeroBannerProps {
  diyImage?: string;
  diyTitle?: string;
  tradeImage?: string;
  tradeTitle?: string;
}

// ProductCard
interface ProductCardProps {
  product: Product;
  isDeal?: boolean;
  onAddToCart: (productId: string) => void;
}

// SpotlightCard
interface SpotlightCardProps {
  title: string;
  description: string;
  image?: string;
  links: { label: string; url: string }[];
  ctaLabel: string;
  ctaUrl: string;
}

// ProjectCard
interface ProjectCardProps {
  title: string;
  description: string;
  image?: string;
  checklistUrl: string;
}
```

---

## Styling Strategy

1. **Use BEM-style CSS classes** from homepage-base.css
2. **Avoid inline styles** unless necessary
3. **Use CSS variables** for colors (--belims-primary, etc.)
4. **Combine Tailwind utilities** for spacing/sizing only
5. **Maintain mobile-first** approach
6. **Test each component** at 3 breakpoints (mobile/tablet/desktop)
7. **Reference gpt/index.html** for exact styling details

---

## Performance Considerations

1. **Image Optimization**
   - Use srcset for responsive images
   - Consider lazy-loading for below-fold sections
   - Use WebP with fallbacks

2. **Code Splitting**
   - Each section component is self-contained
   - Can be lazy-loaded if needed
   - But homepage typically loads all at once

3. **CSS**
   - Keep CSS class count reasonable
   - Avoid duplicate rules
   - Use CSS variables for maintainability

4. **Bundle Size**
   - Monitor component bundle additions
   - Each new component ~ 2-5kb gzipped
   - Total new components ~ 30-40kb
