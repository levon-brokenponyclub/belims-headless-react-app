import { Product, Category, Store } from "./types";

export const FREE_SHIPPING_THRESHOLD = 1000; // R1000 ZAR
export const CURRENCY_SYMBOL = "R";

export const STORES: Store[] = [
  {
    id: "1",
    name: "Belims Sandton",
    address: "12 Rivonia Rd, Sandton",
    distance: 2.5,
  },
  {
    id: "2",
    name: "Belims Cape Town",
    address: "88 Strand St, Cape Town",
    distance: 1200,
  },
  {
    id: "3",
    name: "Belims Durban",
    address: "45 West St, Durban",
    distance: 600,
  },
];

export const CATEGORIES: Category[] = [
  {
    id: "power-tools",
    name: "Power Tools",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80",
    subcategories: ["Drills", "Saws", "Sanders", "Grinders"],
  },
  {
    id: "hand-tools",
    name: "Hand Tools",
    image:
      "https://images.unsplash.com/photo-1581235720704-06d3acfcb363?auto=format&fit=crop&w=400&q=80",
    subcategories: ["Hammers", "Screwdrivers", "Wrenches", "Pliers"],
  },
  {
    id: "building",
    name: "Building Materials",
    image:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80",
    subcategories: ["Cement", "Bricks", "Timber", "Insulation"],
  },
  {
    id: "paint",
    name: "Paint & Supplies",
    image:
      "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80",
    subcategories: ["Interior", "Exterior", "Primers", "Brushes"],
  },
  {
    id: "safety",
    name: "Safety Gear",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
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
      "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=1600&q=80",
    cta: "Shop Power Tools",
  },
  {
    id: 2,
    title: "Contractors Warehouse",
    subtitle: "Bulk cement, bricks, and timber delivered to your site.",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
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
    image:
      "https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=500&q=80",
    linkText: "Start Project",
  },
  {
    id: 2,
    title: "Bathroom Renovation",
    description:
      "Upgrade your fixtures, tiling, and plumbing for a modern look.",
    image:
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=500&q=80",
    linkText: "Shop Bathroom",
  },
  {
    id: 3,
    title: "Garage Workshop Setup",
    description:
      "Organize your tools with our range of storage and workbenches.",
    image:
      "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=500&q=80",
    linkText: "Get Organized",
  },
  {
    id: 4,
    title: "Interior Painting Guide",
    description:
      "Professional tips and the best primers for a flawless finish.",
    image:
      "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
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
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
  "Power Tools": {
    title: "Drill, Cut, Sand. Done.",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
  "Hand Tools": {
    title: "Essential Tools for Every Toolbox.",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
  "Building Materials": {
    title: "Foundation to Finish.",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
  "Safety Gear": {
    title: "Protect Yourself on Site.",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
  default: {
    title: "Hardware for Hard Work.",
    image:
      "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80",
    products: [],
  },
};
