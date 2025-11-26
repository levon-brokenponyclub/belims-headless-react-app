import { Product, Category, Store } from './types';

export { CATEGORY_TREE } from './categoryTree';

export const FREE_SHIPPING_THRESHOLD = 1000; // R1000 ZAR
export const CURRENCY_SYMBOL = 'R';

export const STORES: Store[] = [
  { id: '1', name: 'Belims Sandton', address: '12 Rivonia Rd, Sandton', distance: 2.5 },
  { id: '2', name: 'Belims Cape Town', address: '88 Strand St, Cape Town', distance: 1200 },
  { id: '3', name: 'Belims Durban', address: '45 West St, Durban', distance: 600 },
];

export const CATEGORIES: Category[] = [
  { id: 'power-tools', name: 'Power Tools', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80', subcategories: ['Drills', 'Saws', 'Sanders', 'Grinders'] },
  { id: 'hand-tools', name: 'Hand Tools', image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb363?auto=format&fit=crop&w=400&q=80', subcategories: ['Hammers', 'Screwdrivers', 'Wrenches', 'Pliers'] },
  { id: 'building', name: 'Building Materials', image: 'https://images.unsplash.com/photo-aX-poWx3lRs?auto=format&fit=crop&w=400&q=80', subcategories: ['Cement', 'Bricks', 'Timber', 'Insulation'] },
  { id: 'paint', name: 'Paint & Supplies', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80', subcategories: ['Interior', 'Exterior', 'Primers', 'Brushes'] },
  { id: 'safety', name: 'Safety Gear', image: 'https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', subcategories: ['Helmets', 'Gloves', 'Boots', 'Goggles'] },
];

// CORE HARDWARE PRODUCTS - Synced from WooCommerce 2025-11-26 (30 products captured, 23 with complete pricing)
export const SYNCED_PRODUCTS: Product[] = [
  {
    id: '20v-lithium-ion-battery-and-charger-kit',
    name: '20V Lithium-Ion Battery And Charger Kit',
    category: 'Cordless Tools Batt and Acc',
    price: 688.85,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/6070f46fde67bacca245b32d9981478b.png',
    rating: 4,
    reviews: 20,
    stock: 2,
    maxStock: 4,
    brand: 'Cordless Tools Batt and Acc',
    sku: 'FBCPK1222',
    description: '20V Lithium-Ion Battery And Charger Kit ships directly from Belims staging warehouse.',
    tags: ['cordless-tools-batt-and-acc', 'power-tools', 'tools-and-machinery'],
    features: ['Live SKU FBCPK1222', 'Includes 15% VAT for storefront parity', '2 in stock']
  },
  {
    id: 'staples-3',
    name: 'Staples',
    category: 'Fasteners and Adhesives',
    price: 92.01,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/cfd58a70e94ac20b56e163b137c8b0f7.png',
    rating: 4.2,
    reviews: 25,
    stock: 5,
    maxStock: 10,
    brand: 'Fasteners and Adhesives',
    sku: 'STS6110',
    description: 'Staples ships directly from Belims staging warehouse.',
    tags: ['fasteners-and-adhesives', 'nail-in-anchors', 'nails'],
    features: ['Live SKU STS6110', 'Includes 15% VAT for storefront parity', '5 in stock']
  },
  {
    id: 'tool-vest',
    name: 'Tool Vest',
    category: 'Uncategorized',
    price: 575,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/996dc2ab1b5c25ffb40d4b22fdffa9b8.png',
    rating: 4.4,
    reviews: 30,
    stock: 4,
    maxStock: 8,
    brand: 'Uncategorized',
    sku: 'HTVT09028',
    description: 'Tool Vest ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU HTVT09028', 'Includes 15% VAT for storefront parity', '4 in stock']
  },
  {
    id: 'hex-chisel-2',
    name: 'Hex Chisel',
    category: 'Chisels and Crowbar',
    price: 143.76,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/26ee14c71e371ec2e2295d12a9dfaf08.png',
    rating: 4,
    reviews: 45,
    stock: 0,
    maxStock: 0,
    brand: 'Chisels and Crowbar',
    sku: 'DBC0522802',
    description: 'Hex Chisel ships directly from Belims staging warehouse.',
    tags: ['chisels-and-crowbar', 'hand-tools', 'tools-and-machinery'],
    features: ['Live SKU DBC0522802', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 't-handle-torx-wrench-set',
    name: 'T-Handle Torx Wrench Set',
    category: 'Hand Tools',
    price: 436.99,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/e6e92c7c1968d0adc9eeb6aa9a057a36.png',
    rating: 4.4,
    reviews: 55,
    stock: 3,
    maxStock: 6,
    brand: 'Hand Tools',
    sku: 'HHKT80838',
    description: 'T-Handle Torx Wrench Set ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'screwdrivers-and-allen-keys', 'tools-and-machinery'],
    features: ['Live SKU HHKT80838', 'Includes 15% VAT for storefront parity', '3 in stock']
  },
  {
    id: 'screwdriver-set-3',
    name: 'Screwdriver Set',
    category: 'Hand Tools',
    price: 98.9,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/51a134ec518b8a4988d5784bf032dc6e.png',
    rating: 4.6,
    reviews: 60,
    stock: 0,
    maxStock: 0,
    brand: 'Hand Tools',
    sku: 'HKSD0428',
    description: 'Screwdriver Set ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'screwdrivers-and-allen-keys', 'tools-and-machinery'],
    features: ['Live SKU HKSD0428', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'high-pressure-washer-2',
    name: 'High Pressure Washer',
    category: 'Uncategorized',
    price: 8567.5,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/6de07d56a0b81afc657ca0334b4106e4.png',
    rating: 4,
    reviews: 70,
    stock: 0,
    maxStock: 0,
    brand: 'Uncategorized',
    sku: 'HPWR25008',
    description: 'High Pressure Washer ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU HPWR25008', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'compound-combination-plier',
    name: 'Compound Combination Plier',
    category: 'Hand Tools',
    price: 278.29,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/09912837cec64f65144d3a9e4dae045e.png',
    rating: 4.8,
    reviews: 90,
    stock: 5,
    maxStock: 10,
    brand: 'Hand Tools',
    sku: 'HCCP58200',
    description: 'Compound Combination Plier ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'pliers', 'tools-and-machinery'],
    features: ['Live SKU HCCP58200', 'Includes 15% VAT for storefront parity', '5 in stock']
  },
  {
    id: 'circular-saw',
    name: 'Circular Saw',
    category: 'Power Tools',
    price: 1610,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/a464db7f1878636d67dc8eb2f885fa4a.png',
    rating: 4,
    reviews: 95,
    stock: 10,
    maxStock: 20,
    brand: 'Power Tools',
    sku: 'CS18538',
    description: 'Circular Saw ships directly from Belims staging warehouse.',
    tags: ['power-tools', 'saws', 'tools-and-machinery'],
    features: ['Live SKU CS18538', 'Includes 15% VAT for storefront parity', '10 in stock']
  },
  {
    id: 'rotary-hammer',
    name: 'Rotary Hammer',
    category: 'Drills',
    price: 3795.01,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/d878cac030ef0b45cc4c698c995cc382.png',
    rating: 4.2,
    reviews: 100,
    stock: 2,
    maxStock: 4,
    brand: 'Drills',
    sku: 'RH1600388',
    description: 'Rotary Hammer ships directly from Belims staging warehouse.',
    tags: ['drills', 'power-tools', 'tools-and-machinery'],
    features: ['Live SKU RH1600388', 'Includes 15% VAT for storefront parity', '2 in stock']
  },
  {
    id: '20v-lithium-ion-drive-ratchet',
    name: '20V Lithium-Ion Drive Ratchet',
    category: 'Uncategorized',
    price: 2875,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/03806ac4b9ca5c36cfc804fce1400909.png',
    rating: 4.4,
    reviews: 105,
    stock: 62,
    maxStock: 124,
    brand: 'Uncategorized',
    sku: 'CDRLI206015',
    description: '20V Lithium-Ion Drive Ratchet ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU CDRLI206015', 'Includes 15% VAT for storefront parity', '62 in stock']
  },
  {
    id: '20v-lithium-ion-sheet-sander',
    name: '20V Lithium-Ion sheet sander',
    category: 'Power Tools',
    price: 920,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/d2338287a98cddbf2c4578327e49e183.png',
    rating: 4.6,
    reviews: 110,
    stock: 1,
    maxStock: 3,
    brand: 'Power Tools',
    sku: 'CSHSLI2014',
    description: '20V Lithium-Ion sheet sander ships directly from Belims staging warehouse.',
    tags: ['power-tools', 'sander', 'tools-and-machinery'],
    features: ['Live SKU CSHSLI2014', 'Includes 15% VAT for storefront parity', '1 in stock']
  },
  {
    id: 'lithium-ion-cordless-2-piece-combo-kit',
    name: 'Lithium-ion Cordless 2 Piece combo kit',
    category: 'Hand Tools',
    price: 3910,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/88a5cd1bbf3f426920ca5fc07eceb3a2.png',
    rating: 4.8,
    reviews: 115,
    stock: 10,
    maxStock: 20,
    brand: 'Hand Tools',
    sku: 'COSLI23011',
    description: 'Lithium-ion Cordless 2 Piece combo kit ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'tools-and-machinery', 'wrenches'],
    features: ['Live SKU COSLI23011', 'Includes 15% VAT for storefront parity', '10 in stock']
  },
  {
    id: '20v-lithium-ion-circular-saw',
    name: '20V Lithium-Ion Circular Saw',
    category: 'Power Tools',
    price: 1896.35,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/383e87c47e50b4f6be114b8ce7be8080.png',
    rating: 4,
    reviews: 120,
    stock: 0,
    maxStock: 0,
    brand: 'Power Tools',
    sku: 'CSLI18511',
    description: '20V Lithium-Ion Circular Saw ships directly from Belims staging warehouse.',
    tags: ['power-tools', 'saws', 'tools-and-machinery'],
    features: ['Live SKU CSLI18511', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: '40v-lithium-ion-chain-saw',
    name: '40V Lithium-Ion Chain Saw',
    category: 'Uncategorized',
    price: 4025,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/bb7988d64a589c350f3eae9b3e5139a7.png',
    rating: 4.2,
    reviews: 125,
    stock: 2,
    maxStock: 4,
    brand: 'Uncategorized',
    sku: 'CGSLI401682',
    description: '40V Lithium-Ion Chain Saw ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU CGSLI401682', 'Includes 15% VAT for storefront parity', '2 in stock']
  },
  {
    id: '20v-lithium-ion-angle-grinder',
    name: '20V Lithium-Ion angle grinder',
    category: 'Grinders',
    price: 1092.5,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/9dfcb67a29288078c0f65d6156f39ef7.png',
    rating: 4.4,
    reviews: 130,
    stock: 21,
    maxStock: 42,
    brand: 'Grinders',
    sku: 'CAGLI21154',
    description: '20V Lithium-Ion angle grinder ships directly from Belims staging warehouse.',
    tags: ['grinders', 'power-tools', 'tools-and-machinery'],
    features: ['Live SKU CAGLI21154', 'Includes 15% VAT for storefront parity', '21 in stock']
  },
  {
    id: 'lithium-ion-compact-brushless-impact-drill',
    name: 'Lithium-Ion compact brushless impact drill',
    category: 'Drills',
    price: 977.5,
    image: 'https://staging.belims.co.za/wp-content/uploads/2025/05/60550b6742c225df53293d3377c78694.png',
    rating: 4.6,
    reviews: 135,
    stock: 2,
    maxStock: 4,
    brand: 'Drills',
    sku: 'CIDLI206021',
    description: 'Lithium-Ion compact brushless impact drill ships directly from Belims staging warehouse.',
    tags: ['drills', 'power-tools', 'tools-and-machinery'],
    features: ['Live SKU CIDLI206021', 'Includes 15% VAT for storefront parity', '2 in stock']
  },
  {
    id: 'fencing-pliers',
    name: 'Fencing Pliers',
    category: 'Hand Tools',
    price: 287.5,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/11/41de02a721e817136bd7c3d8916882ee.png',
    rating: 4.8,
    reviews: 140,
    stock: 2,
    maxStock: 4,
    brand: 'Hand Tools',
    sku: 'HFP2508',
    description: 'Fencing Pliers ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'pliers', 'tools-and-machinery'],
    features: ['Live SKU HFP2508', 'Includes 15% VAT for storefront parity', '2 in stock']
  },
  {
    id: 'self-leveling-line-laser-green-laser-beams-2',
    name: 'Self-Leveling Line Laser (Green Laser Beams)',
    category: 'Hand Tools',
    price: 5748.85,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/10/7a1668c2b782c3be43fb4c809ddad810.png',
    rating: 4,
    reviews: 145,
    stock: 0,
    maxStock: 0,
    brand: 'Hand Tools',
    sku: 'HLL305205',
    description: 'Self-Leveling Line Laser (Green Laser Beams) ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'levels-and-accessories', 'tools-and-machinery'],
    features: ['Live SKU HLL305205', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'self-leveling-line-laser-green-laser-beams',
    name: 'Self-Leveling Line Laser (Green Laser Beams)',
    category: 'Hand Tools',
    price: 1897.5,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/10/e260150345f6194bda9ac2639039238d.png',
    rating: 4.2,
    reviews: 150,
    stock: 0,
    maxStock: 0,
    brand: 'Hand Tools',
    sku: 'HLL156508',
    description: 'Self-Leveling Line Laser (Green Laser Beams) ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'levels-and-accessories', 'tools-and-machinery'],
    features: ['Live SKU HLL156508', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'flexible-ratchet-spanner-set',
    name: 'Flexible Ratchet Spanner Set',
    category: 'Hand Tools',
    price: 1259.25,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/10/9f70fad70bdd92982d2dcb3fbaf50e9e.png',
    rating: 4.4,
    reviews: 155,
    stock: 0,
    maxStock: 0,
    brand: 'Hand Tools',
    sku: 'HKSPAR1083',
    description: 'Flexible Ratchet Spanner Set ships directly from Belims staging warehouse.',
    tags: ['hand-tools', 'spanners-and-sockets', 'tools-and-machinery'],
    features: ['Live SKU HKSPAR1083', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'retractable-utility-knife',
    name: 'Retractable Utility Knife',
    category: 'Uncategorized',
    price: 36.8,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/10/e5ca481406a869c0dcba87d3c1b008bf.png',
    rating: 4.6,
    reviews: 160,
    stock: 0,
    maxStock: 0,
    brand: 'Uncategorized',
    sku: 'HKNS11615',
    description: 'Retractable Utility Knife ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU HKNS11615', 'Includes 15% VAT for storefront parity', 'Out of stock']
  },
  {
    id: 'knife',
    name: 'Knife',
    category: 'Uncategorized',
    price: 49.45,
    image: 'https://staging.belims.co.za/wp-content/uploads/2024/10/31753ee84e6ef665a5026e94ddd66257.png',
    rating: 4.8,
    reviews: 165,
    stock: 1,
    maxStock: 3,
    brand: 'Uncategorized',
    sku: 'HKNS28035',
    description: 'Knife ships directly from Belims staging warehouse.',
    tags: [],
    features: ['Live SKU HKNS28035', 'Includes 15% VAT for storefront parity', '1 in stock']
  }
];

export const FEATURED_PRODUCTS: Product[] = SYNCED_PRODUCTS.slice(0, 4);
export const DEALS_PRODUCTS: Product[] = SYNCED_PRODUCTS.slice(4);

export const HERO_SLIDES = [
  {
    id: 1,
    title: "Build It Better",
    subtitle: "Up to 25% off DeWalt and Makita power tools this week.",
    image: "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=1600&q=80",
    cta: "Shop Power Tools"
  },
  {
    id: 2,
    title: "Contractors Warehouse",
    subtitle: "Bulk cement, bricks, and timber delivered to your site.",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
    cta: "Get A Quote"
  }
];

export const QUICK_LINKS = [
  "Power Tools",
  "Paint Centre",
  "Plumbing",
  "Electrical",
  "Building Materials",
  "Safety Gear"
];

export const PROJECT_IDEAS = [
  {
    id: 1,
    title: "Build a Floating Deck",
    description: "Everything you need from timber to screws to build the perfect outdoor deck.",
    image: "https://images.unsplash.com/photo-1591825729269-caeb344f6df2?auto=format&fit=crop&w=500&q=80",
    linkText: "Start Project"
  },
  {
    id: 2,
    title: "Bathroom Renovation",
    description: "Upgrade your fixtures, tiling, and plumbing for a modern look.",
    image: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=500&q=80",
    linkText: "Shop Bathroom"
  },
  {
    id: 3,
    title: "Garage Workshop Setup",
    description: "Organize your tools with our range of storage and workbenches.",
    image: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=500&q=80",
    linkText: "Get Organized"
  },
  {
    id: 4,
    title: "Interior Painting Guide",
    description: "Professional tips and the best primers for a flawless finish.",
    image: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=500&q=80",
    linkText: "View Guide"
  }
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
  "Garden"
];

const pickProducts = (predicate: (product: Product) => boolean, limit = 4): Product[] => {
  const matches = SYNCED_PRODUCTS.filter(predicate);
  if (matches.length >= limit) {
    return matches.slice(0, limit);
  }
  if (matches.length) {
    return [...matches, ...SYNCED_PRODUCTS].slice(0, limit);
  }
  return SYNCED_PRODUCTS.slice(0, limit);
};

const getProductsByTag = (tag: string, limit = 4) =>
  pickProducts(product => product.tags?.includes(tag) ?? false, limit);

const getProductsByCategory = (category: string, limit = 4) =>
  pickProducts(product => product.category === category, limit);

// Interactive Slider Data mapped to Hardware Categories
export const CATEGORY_SLIDER_DATA: Record<string, { title: string; image: string; products: Product[] }> = {
  "Top Deals": {
    title: "Pro-Grade Gear. Amateur Prices.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: DEALS_PRODUCTS.slice(0, 4)
  },
  "Power Tools": {
    title: "Drill, Cut, Sand. Done.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: getProductsByTag('power-tools')
  },
  "Hand Tools": {
    title: "Essential Tools for Every Toolbox.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: getProductsByCategory('Hand Tools')
  },
  "Building Materials": {
    title: "Foundation to Finish.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: getProductsByCategory('Building Materials')
  },
  "Safety Gear": {
    title: "Protect Yourself on Site.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: getProductsByTag('safety-equipment')
  },
  "default": {
    title: "Hardware for Hard Work.",
    image: "https://images.unsplash.com/photo-1593307315564-c96172dc89dc?q=80&w=772&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    products: SYNCED_PRODUCTS
  }
};