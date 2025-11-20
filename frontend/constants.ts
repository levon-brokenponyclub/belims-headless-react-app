
import { Product, Category, Store } from './types';

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
  { id: 'building', name: 'Building Materials', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80', subcategories: ['Cement', 'Bricks', 'Timber', 'Insulation'] },
  { id: 'paint', name: 'Paint & Supplies', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=400&q=80', subcategories: ['Interior', 'Exterior', 'Primers', 'Brushes'] },
  { id: 'safety', name: 'Safety Gear', image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80', subcategories: ['Helmets', 'Gloves', 'Boots', 'Goggles'] },
];

// CORE HARDWARE PRODUCTS
export const FEATURED_PRODUCTS: Product[] = [
  {
    id: 'pt1',
    name: 'Ryobi 18V ONE+ Cordless Impact Driver',
    category: 'Power Tools',
    price: 1499,
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    images: [
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=600&q=80'
    ],
    brand: 'Ryobi',
    sku: 'RY-18V-ID',
    rating: 4.7,
    reviews: 850,
    stock: 120,
    maxStock: 200,
    description: "Powerful impact driver ideal for driving long screws and lag bolts. Part of the ONE+ system.",
    tags: ['drill', 'driver', 'cordless', 'power tool'],
    features: [
        "High torque output of 170 Nm",
        "Keyless hex chuck for quick bit changes",
        "Built-in LED light for work area illumination"
    ],
    specifications: [
        { label: "Voltage", value: "18V" },
        { label: "Torque", value: "170 Nm" },
        { label: "Chuck", value: "1/4 in Hex" }
    ],
    bundleCandidates: [
      {
        id: 'bundle1',
        name: 'Ryobi 18V Battery 2.0Ah',
        price: 299,
        image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&q=80',
        category: 'Power Tools'
      },
      {
        id: 'bundle2', 
        name: 'Drill Bit Set (20pc)',
        price: 149,
        image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80',
        category: 'Hand Tools'
      },
      {
        id: 'bundle3',
        name: 'Tool Belt & Holster',
        price: 89,
        image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=80', 
        category: 'Safety Gear'
      }
    ]
  },
  {
    id: 'pt2',
    name: 'Bosch Professional Angle Grinder 900W',
    category: 'Power Tools',
    price: 1299,
    image: 'https://images.unsplash.com/photo-1558618047-5c8b2c4a6108?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    reviews: 420,
    stock: 45,
    maxStock: 100,
    description: "Heavy duty angle grinder for cutting and grinding metal and stone.",
    brand: "Bosch",
    tags: ['grinder', 'cutting', 'metal', 'wired']
  },
  {
    id: 'bm1',
    name: 'SureBuild General Purpose Cement 42.5N - 50kg',
    category: 'Building Materials',
    price: 105,
    image: 'https://images.unsplash.com/photo-1585250003309-694ff34512d7?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    reviews: 2300,
    stock: 5000,
    maxStock: 10000,
    isBundle: true,
    bundleSavings: 10,
    description: "High strength cement suitable for all structural concrete, mortar, and plaster applications.",
    brand: "PPC",
    tags: ['cement', 'concrete', 'building', 'construction']
  },
  {
    id: 'sf1',
    name: 'Heavy Duty Steel Toe Safety Boots',
    category: 'Safety Gear',
    price: 850,
    image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=600&q=80',
    rating: 4.5,
    reviews: 150,
    stock: 88,
    maxStock: 150,
    description: "Industrial grade safety boots with steel toe cap and oil resistant sole.",
    brand: "Bova",
    tags: ['boots', 'safety', 'ppe', 'shoes']
  }
];

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

export const DEALS_PRODUCTS: Product[] = [
  {
    id: 'd1',
    name: 'Makita 18V Cordless Circular Saw',
    category: 'Power Tools',
    price: 2899,
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    reviews: 112,
    stock: 30,
    maxStock: 50,
    isBundle: false,
    description: "Precision cutting with lightweight design.",
    tags: ['saw', 'cutting', 'wood', 'makita']
  },
  {
    id: 'd2',
    name: 'Bosch 650W Impact Drill Kit',
    category: 'Power Tools',
    price: 899,
    image: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=400&q=80',
    rating: 4.6,
    reviews: 340,
    stock: 200,
    maxStock: 300,
    isBundle: true,
    bundleSavings: 150,
    description: "Includes case and drill bit set.",
    tags: ['drill', 'corded', 'kit', 'bosch']
  },
  {
    id: 'd3',
    name: 'Kreg Pocket Hole Jig 320',
    category: 'Hand Tools',
    price: 750,
    image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=400&q=80',
    rating: 4.9,
    reviews: 88,
    stock: 45,
    maxStock: 60,
    isBundle: false,
    description: "The complete solution for wood joinery.",
    tags: ['jig', 'woodworking', 'joinery']
  },
  {
    id: 'd4',
    name: 'Stanley FatMax Tape Measure 8m',
    category: 'Hand Tools',
    price: 350,
    image: 'https://images.unsplash.com/photo-1581235720704-06d3acfcb363?auto=format&fit=crop&w=400&q=80',
    rating: 4.7,
    reviews: 500,
    stock: 400,
    maxStock: 500,
    isBundle: false,
    description: "Durable and retractable with blade armor coating.",
    tags: ['tape', 'measure', 'hand tool']
  },
  {
    id: 'd5',
    name: 'Werner 6ft Fiberglass Stepladder',
    category: 'Safety Gear',
    price: 1800,
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=400&q=80',
    rating: 4.8,
    reviews: 92,
    stock: 20,
    maxStock: 40,
    isBundle: false,
    description: "Non-conductive fiberglass, safe for electrical work.",
    tags: ['ladder', 'safety', 'access']
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

// Interactive Slider Data mapped to Hardware Categories
export const CATEGORY_SLIDER_DATA: Record<string, { title: string; image: string; products: Product[] }> = {
  "Top Deals": {
    title: "Pro-Grade Gear. Amateur Prices.",
    image: "https://images.unsplash.com/photo-1508873535684-277a3cbcc4e8?auto=format&fit=crop&w=600&q=80",
    products: DEALS_PRODUCTS
  },
  "Power Tools": {
    title: "Drill, Cut, Sand. Done.",
    image: "https://images.unsplash.com/photo-1566937169390-7be4c63b8a0e?auto=format&fit=crop&w=600&q=80",
    products: [FEATURED_PRODUCTS[0], FEATURED_PRODUCTS[1], DEALS_PRODUCTS[0], DEALS_PRODUCTS[1]]
  },
  "Hand Tools": {
    title: "Essential Tools for Every Toolbox.",
    image: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80",
    products: [DEALS_PRODUCTS[2], DEALS_PRODUCTS[3], 
      { ...FEATURED_PRODUCTS[0], id: 'ht1', name: 'Hammer 500g', price: 150, image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=400&q=80' }
    ]
  },
  "Building Materials": {
    title: "Foundation to Finish.",
    image: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80",
    products: [FEATURED_PRODUCTS[2], 
      { ...FEATURED_PRODUCTS[2], id: 'bm2', name: 'Red Clay Bricks (Pallet)', price: 3500, image: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80' }
    ]
  },
  "Safety Gear": {
    title: "Protect Yourself on Site.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    products: [FEATURED_PRODUCTS[3], DEALS_PRODUCTS[4]]
  },
  "default": {
    title: "Hardware for Hard Work.",
    image: "https://images.unsplash.com/photo-1581147036324-c17ac41dfa6c?auto=format&fit=crop&w=600&q=80",
    products: [...FEATURED_PRODUCTS, ...DEALS_PRODUCTS]
  }
};
