import { Product, Category, Store } from "./types";

export const FREE_SHIPPING_THRESHOLD = 1000; // R1000 ZAR
export const CURRENCY_SYMBOL = "R";

export const STORES: Store[] = [
  {
    id: "umzinto",
    name: "Umzinto",
    address: "Lot 12 of 284, Belims Centre, eMuzisweinto, 4200",
  },
];

export const CATEGORIES: Category[] = [
  {
    id: "power-tools",
    name: "Power Tools",
    image:
      "/images/development/midsection-worker-using-circular-saw-workshop.webp",
    subcategories: ["Drills", "Saws", "Sanders", "Grinders"],
  },
  {
    id: "hand-tools",
    name: "Hand Tools",
    image: "/images/development/Image_44.webp",
    subcategories: ["Hammers", "Screwdrivers", "Wrenches", "Pliers"],
  },
  {
    id: "building",
    name: "Building Materials",
    image: "/images/development/Image_55.webp",
    subcategories: ["Cement", "Bricks", "Timber", "Insulation"],
  },
  {
    id: "paint",
    name: "Paint & Supplies",
    image: "/images/development/Image_60.webp",
    subcategories: ["Interior", "Exterior", "Primers", "Brushes"],
  },
  {
    id: "safety",
    name: "Safety Gear",
    image:
      "/images/development/man-portrait-tools-with-arms-crossed-home-development-construction-renovation-workshop-carpenter-male-employee-contractor-maintenance-drill-repair-work-diy.webp",
    subcategories: ["Helmets", "Gloves", "Boots", "Goggles"],
  },
];

// Products are now loaded dynamically from WooCommerce API via fetchProducts()
// See App.tsx for the product loading logic

export const FEATURED_PRODUCTS: Product[] = [];

export const DEALS_PRODUCTS: Product[] = [];

export const HERO_SLIDES = [
  {
    id: 1,
    title: "Build It Better",
    subtitle: "Up to 25% off DeWalt and Makita power tools this week.",
    image:
      "/images/development/midsection-worker-using-circular-saw-workshop.webp",
    cta: "Shop Power Tools",
  },
  {
    id: 2,
    title: "Contractors Warehouse",
    subtitle: "Bulk cement, bricks, and timber delivered to your site.",
    image:
      "/images/development/man-portrait-tools-with-arms-crossed-home-development-construction-renovation-workshop-carpenter-male-employee-contractor-maintenance-drill-repair-work-diy.webp",
    cta: "Get A Quote",
  },
];

export const QUICK_LINKS = [
  "Power Tools",
  "Paint Centre",
  "Plumbing",
  "Electrical",
  "Building Materials",
  "Safety Gear",
];

export const PROJECT_IDEAS = [
  {
    id: 1,
    title: "Build a Floating Deck",
    description:
      "Everything you need from timber to screws to build the perfect outdoor deck.",
    image: "/images/development/Image_44.webp",
    linkText: "Start Project",
  },
  {
    id: 2,
    title: "Bathroom Renovation",
    description:
      "Upgrade your fixtures, tiling, and plumbing for a modern look.",
    image: "/images/development/Image_55.webp",
    linkText: "Shop Bathroom",
  },
  {
    id: 3,
    title: "Garage Workshop Setup",
    description:
      "Organize your tools with our range of storage and workbenches.",
    image: "/images/development/Image_60.webp",
    linkText: "Get Organized",
  },
  {
    id: 4,
    title: "Interior Painting Guide",
    description:
      "Professional tips and the best primers for a flawless finish.",
    image:
      "/images/development/2147944853_7e958e74-e33b-4336-9aa0-ecfb13fb48bf.webp",
    linkText: "View Guide",
  },
];

export const CATEGORY_PILLS = [
  "Top Deals",
  "Power Tools",
  "Hand Tools",
  "Building Materials",
  "Paint & Decor",
  "Plumbing",
  "Electrical",
  "Safety Gear",
  "Garden",
];

// Interactive Slider Data mapped to Hardware Categories
// Products are populated dynamically from WooCommerce API in App.tsx
export const CATEGORY_SLIDER_DATA: Record<
  string,
  { title: string; image: string; products: Product[] }
> = {
  "Top Deals": {
    title: "Pro-Grade Gear. Amateur Prices.",
    image:
      "/images/development/midsection-worker-using-circular-saw-workshop.webp",
    products: [],
  },
  "Power Tools": {
    title: "Drill, Cut, Sand. Done.",
    image:
      "/images/development/18920_d0e420f0-fd13-40c8-b17d-c5423b3805ac.webp",
    products: [],
  },
  "Hand Tools": {
    title: "Essential Tools for Every Toolbox.",
    image:
      "/images/development/2149451030_1163c5d2-c3df-428e-b198-96c8af43ee3a.webp",
    products: [],
  },
  "Building Materials": {
    title: "Foundation to Finish.",
    image: "/images/development/Image_44.webp",
    products: [],
  },
  "Safety Gear": {
    title: "Protect Yourself on Site.",
    image:
      "/images/development/man-portrait-tools-with-arms-crossed-home-development-construction-renovation-workshop-carpenter-male-employee-contractor-maintenance-drill-repair-work-diy.webp",
    products: [],
  },
  default: {
    title: "Hardware for Hard Work.",
    image: "/images/development/Image_60.webp",
    products: [],
  },
};
