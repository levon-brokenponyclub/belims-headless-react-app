import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Product, CategoryNode } from "../types";
import { ProductCard } from "./ProductCard";
import {
  Filter,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  LayoutGrid,
  List,
} from "lucide-react";
import { CATEGORY_TREE, initializeCategoryTree } from "../categoryTree";
import { getApiBaseUrl } from "../services/wooCommerceService";
import { SkeletonProductCard } from "./Skeleton";

interface FilterOption {
  id: number;
  slug: string;
  name: string;
  count: number;
}

interface ArchiveProps {
  products: Product[];
  isLoadingProducts?: boolean;
  category?: string; // The selected category slug or name
  brand?: string; // The selected brand
  range?: string; // The selected range
  searchQuery?: string;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const Archive: React.FC<ArchiveProps> = ({
  products,
  isLoadingProducts = false,
  category,
  brand,
  range,
  searchQuery,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const [sortBy, setSortBy] = useState<
    "featured" | "price-asc" | "price-desc" | "name"
  >("featured");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const categorySliderWidth = useWindowWidth();
  const [categorySliderIndex, setCategorySliderIndex] = useState(0);
  const showSkeletons = isLoadingProducts;
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);

  // Additional local filters
  const [filterInStock, setFilterInStock] = useState(false);
  const [filterBackOrder, setFilterBackOrder] = useState(false);
  const [selectedDealTypes, setSelectedDealTypes] = useState<string[]>([]);
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    category ? [category] : [],
  );
  const [sidebarSearch, setSidebarSearch] = useState("");

  // Filter data from API
  const [rangeFilters, setRangeFilters] = useState<FilterOption[]>([]);
  const [colorFilters, setColorFilters] = useState<FilterOption[]>([]);

  // Fetch filters from API
  useEffect(() => {
    const fetchFilters = async () => {
      const apiBase = getApiBaseUrl();
      try {
        const response = await fetch(`${apiBase}/products/filters`);
        if (!response.ok) {
          const body = await response.text();
          throw new Error(
            `HTTP ${response.status} ${response.statusText}: ${body.slice(0, 200)}`,
          );
        }
        const data = await response.json();
        setRangeFilters(data.range || []);
        setColorFilters(data.color || []);
      } catch (error) {
        console.error("Failed to fetch product filters:", error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    let isMounted = true;
    initializeCategoryTree()
      .then((tree) => {
        if (isMounted) setCategoryTree(tree);
      })
      .catch(() => {
        if (isMounted) setCategoryTree([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Dynamic Facet Data
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [products]);

  const [selectedFacetBrands, setSelectedFacetBrands] = useState<string[]>([]);

  useEffect(() => {
    setSelectedCategories(category ? [category] : []);
  }, [category]);

  useEffect(() => {
    setSelectedRanges(range ? [range] : []);
  }, [range]);

  const dealTypeOptions = [
    { id: "sale", label: "Sale" },
    { id: "clearance", label: "Clearance" },
    { id: "deal_of_day", label: "Deal of the Day" },
    { id: "weekly_special", label: "Weekly Special" },
    { id: "trade_special", label: "Trade Special" },
    { id: "bundle", label: "Bundle" },
    { id: "promo", label: "Promo" },
  ];

  // Helper to get all subcategories recursively
  const getCategoryMatches = (
    rootLabel: string,
    nodes: CategoryNode[],
  ): string[] => {
    let matches: string[] = [];

    for (const node of nodes) {
      if (node.label.toLowerCase() === rootLabel.toLowerCase()) {
        // Found the root, collect all its children recursively
        matches.push(node.label);
        const collectChildren = (n: CategoryNode) => {
          if (n.children) {
            n.children.forEach((child) => {
              matches.push(child.label);
              collectChildren(child);
            });
          }
        };
        collectChildren(node);
        return matches;
      }

      // If not found at this level, check children
      if (node.children) {
        const childMatches = getCategoryMatches(rootLabel, node.children);
        if (childMatches.length > 0) {
          return childMatches;
        }
      }
    }
    return matches;
  };

  const findCategoryNode = (
    rootLabel: string,
    nodes: CategoryNode[],
  ): CategoryNode | null => {
    for (const node of nodes) {
      if (node.label.toLowerCase() === rootLabel.toLowerCase()) {
        return node;
      }
      if (node.children) {
        const match = findCategoryNode(rootLabel, node.children);
        if (match) return match;
      }
    }
    return null;
  };

  const findParentCategoryNode = (
    targetLabel: string,
    nodes: CategoryNode[],
    parent: CategoryNode | null = null,
  ): CategoryNode | null => {
    for (const node of nodes) {
      if (node.label.toLowerCase() === targetLabel.toLowerCase()) {
        return parent;
      }
      if (node.children) {
        const match = findParentCategoryNode(targetLabel, node.children, node);
        if (match) return match;
      }
    }
    return null;
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    const activeCategoryTree = categoryTree.length
      ? categoryTree
      : CATEGORY_TREE;

    // 1. Filter by Category (Multi-select, Recursive)
    if (selectedCategories.length > 0) {
      const selectedLabels = selectedCategories.map((label) =>
        label.toLowerCase(),
      );
      const validCategories = new Set<string>();

      selectedCategories.forEach((selected) => {
        const matches = getCategoryMatches(selected, activeCategoryTree);
        if (matches.length > 0) {
          matches.forEach((match) => validCategories.add(match.toLowerCase()));
        }
        validCategories.add(selected.toLowerCase());
      });

      filtered = filtered.filter((p) => {
        const productCategory = p.category.toLowerCase();
        if (validCategories.has(productCategory)) return true;
        return selectedLabels.some((label) => productCategory.includes(label));
      });
    }

    // 2. Filter by Brand (Prop)
    if (brand) {
      filtered = filtered.filter(
        (p) => p.brand && p.brand.toLowerCase() === brand.toLowerCase(),
      );
    }

    // 2.5 Filter by Facet Brands (Local)
    if (selectedFacetBrands.length > 0) {
      filtered = filtered.filter(
        (p) => p.brand && selectedFacetBrands.includes(p.brand),
      );
    }

    // 3. Filter by Search Query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query),
      );
    }

    // 4. Filter by Range
    if (selectedRanges.length > 0) {
      const normalizedRanges = selectedRanges.map((r) => r.toLowerCase());
      filtered = filtered.filter((p) => {
        const rangeValue =
          p.acf?.range || p.acf?.range_slug || p.acf?.range_label;
        if (rangeValue) {
          return normalizedRanges.some((r) =>
            String(rangeValue).toLowerCase().includes(r),
          );
        }
        if (p.tags && p.tags.length > 0) {
          return p.tags.some((tag) =>
            normalizedRanges.some((r) => tag.toLowerCase().includes(r)),
          );
        }
        return false;
      });
    }

    // 5. Filter by Price
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
    );

    // 5.5 Additional Facets
    if (filterInStock && !filterBackOrder) {
      filtered = filtered.filter((p) => p.stock > 0);
    }
    if (filterBackOrder && !filterInStock) {
      filtered = filtered.filter((p) => p.stock <= 0);
    }

    if (selectedDealTypes.length > 0) {
      filtered = filtered.filter((p) => {
        const dealType =
          p.deals_resolved?.consumer?.bestDeal?.type ||
          p.deals_resolved?.trade?.bestDeal?.type;
        return dealType ? selectedDealTypes.includes(dealType) : false;
      });
    }

    // 6. Sort
    switch (sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return filtered;
  }, [
    products,
    brand,
    searchQuery,
    priceRange,
    sortBy,
    filterInStock,
    filterBackOrder,
    selectedDealTypes,
    selectedFacetBrands,
    selectedCategories,
    categoryTree,
  ]);

  const productCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProducts.forEach((product) => {
      if (!product.category) return;
      const key = product.category.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredProducts]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const activeCategoryTree = categoryTree.length
      ? categoryTree
      : CATEGORY_TREE;

    const tallyNode = (node: CategoryNode): number => {
      const key = node.label.toLowerCase();
      let total = productCategoryCounts[key] || 0;

      if (node.children && node.children.length > 0) {
        total += node.children.reduce(
          (sum, child) => sum + tallyNode(child),
          0,
        );
      }

      counts[key] = total;
      return total;
    };

    activeCategoryTree.forEach((node) => tallyNode(node));
    return counts;
  }, [productCategoryCounts, categoryTree]);

  const brandCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProducts.forEach((product) => {
      if (!product.brand) return;
      const key = product.brand.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [filteredProducts]);

  const availabilityCounts = useMemo(() => {
    let inStock = 0;
    let backOrder = 0;
    filteredProducts.forEach((product) => {
      if (product.stock > 0) {
        inStock += 1;
      } else {
        backOrder += 1;
      }
    });
    return { inStock, backOrder };
  }, [filteredProducts]);

  const dealTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredProducts.forEach((product) => {
      const dealType =
        product.deals_resolved?.consumer?.bestDeal?.type ||
        product.deals_resolved?.trade?.bestDeal?.type;
      if (!dealType) return;
      counts[dealType] = (counts[dealType] || 0) + 1;
    });
    return counts;
  }, [filteredProducts]);

  // Get min/max price for slider
  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.price), 1000);
  }, [products]);

  const title = brand
    ? `${brand} Products`
    : category
      ? category
      : searchQuery
        ? `Search: "${searchQuery}"`
        : "All Products";

  const activeCategoryTree = categoryTree.length ? categoryTree : CATEGORY_TREE;

  const categoryContextNode = useMemo(() => {
    if (!category) return null;
    const matched = findCategoryNode(category, activeCategoryTree);
    if (matched?.children && matched.children.length > 0) {
      return matched;
    }
    return findParentCategoryNode(category, activeCategoryTree);
  }, [category, activeCategoryTree]);

  const categorySliderItems = useMemo(() => {
    const baseNodes = categoryContextNode?.children?.length
      ? categoryContextNode.children
      : category
        ? []
        : activeCategoryTree;
    const labels = baseNodes.map((node) => node.label);
    const unique = Array.from(new Set(labels));
    return [
      "Sale",
      ...unique.filter((label) => label.toLowerCase() !== "sale"),
    ];
  }, [categoryContextNode, category, activeCategoryTree]);

  const categoryMedia: Record<
    string,
    { icon: string; lifestyle: string; slider: string }
  > = {
    "Fasteners and Adhesives": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/nut.svg",
      lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
      slider: "https://pngimg.com/uploads/screw/screw_PNG40.png",
    },
    Adhesives: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
      lifestyle: "https://images.unsplash.com/photo-1581092918484-8313f08e01c7",
      slider: "https://pngimg.com/uploads/glue/glue_PNG23.png",
    },
    "General Purpose Adhesive": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/paint-bucket.svg",
      lifestyle: "https://images.unsplash.com/photo-1607400201515-c2c41cbe4c3b",
      slider: "https://pngimg.com/uploads/glue/glue_PNG34.png",
    },
    Nails: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hammer.svg",
      lifestyle: "https://images.unsplash.com/photo-1567789884554-0b844b597180",
      slider: "https://pngimg.com/uploads/nail/nail_PNG40.png",
    },
    "Nail-in Anchors": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/anchor.svg",
      lifestyle: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7",
      slider: "https://pngimg.com/uploads/screw/screw_PNG30.png",
    },
    "Tape and Seal Strips": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
      lifestyle: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
      slider: "https://pngimg.com/uploads/tape/tape_PNG27.png",
    },
    "General Purpose Tapes": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
      lifestyle: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc",
      slider: "https://pngimg.com/uploads/tape/tape_PNG20.png",
    },
    "Outdoor Garden and Patio": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/leaf.svg",
      lifestyle: "https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e",
      slider: "https://pngimg.com/uploads/chainsaw/chainsaw_PNG14.png",
    },
    "Gardening Tools": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/shovel.svg",
      lifestyle: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2",
      slider: "https://pngimg.com/uploads/shovel/shovel_PNG29.png",
    },
    Chainsaws: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/zap.svg",
      lifestyle: "https://images.unsplash.com/photo-1581578731548-c64695cc6952",
      slider: "https://pngimg.com/uploads/chainsaw/chainsaw_PNG9.png",
    },
    "Garden Cordless Power Tools": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/battery.svg",
      lifestyle: "https://images.unsplash.com/photo-1621600411688-4be93c5f5b21",
      slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
    },
    "Garden Spray Bottles": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/spray-can.svg",
      lifestyle: "https://images.unsplash.com/photo-1589927986089-35812388d1f4",
      slider: "https://pngimg.com/uploads/spray/spray_PNG10.png",
    },
    "Safety and Protective Wear": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hard-hat.svg",
      lifestyle: "https://images.unsplash.com/photo-1581092160607-ee22621dd758",
      slider: "https://pngimg.com/uploads/gloves/gloves_PNG8024.png",
    },
    "Safety Equipment": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/shield.svg",
      lifestyle: "https://images.unsplash.com/photo-1581092335397-9583eb92d232",
      slider: "https://pngimg.com/uploads/helmet/helmet_PNG37.png",
    },
    Gloves: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hand.svg",
      lifestyle: "https://images.unsplash.com/photo-1607013407627-6ee814329547",
      slider: "https://pngimg.com/uploads/gloves/gloves_PNG8030.png",
    },
    "Tools and Machinery": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/drill.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
    },
    "Drill Accessories": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/settings.svg",
      lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
      slider: "https://pngimg.com/uploads/drill/drill_PNG132.png",
    },
    "Chucks and Keys": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/settings-2.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/drill/drill_PNG109.png",
    },
    "Electrical Hand Tools": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/plug.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/tools/tools_PNG62.png",
    },
    "Staple Guns and Staples": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/paperclip.svg",
      lifestyle: "https://images.unsplash.com/photo-1590080875852-ba44f83ff2c1",
      slider: "https://pngimg.com/uploads/tools/tools_PNG73.png",
    },
    "Grinding Accessories": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
      lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
      slider: "https://pngimg.com/uploads/grinder/grinder_PNG21.png",
    },
    "Abrasive Grinding Disc": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
      lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
      slider: "https://pngimg.com/uploads/disc/disc_PNG5.png",
    },
    "Hand Tools": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/hammer.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/tools/tools_PNG21.png",
    },
    Pliers: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/scissors.svg",
      lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
      slider: "https://pngimg.com/uploads/pliers/pliers_PNG32.png",
    },
    "Screwdrivers and Allen Keys": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/tool.svg",
      lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
      slider: "https://pngimg.com/uploads/screwdriver/screwdriver_PNG46.png",
    },
    Wrenches: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/wrench.svg",
      lifestyle: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8",
      slider: "https://pngimg.com/uploads/wrench/wrench_PNG33.png",
    },
    Machinery: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/factory.svg",
      lifestyle: "https://images.unsplash.com/photo-1513828583688-c52646db42da",
      slider:
        "https://pngimg.com/uploads/pressure_washer/pressure_washer_PNG9.png",
    },
    "Pressure Washer": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
      lifestyle: "https://images.unsplash.com/photo-1513828583688-c52646db42da",
      slider:
        "https://pngimg.com/uploads/pressure_washer/pressure_washer_PNG11.png",
    },
    "Power Tools": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/zap.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/drill/drill_PNG143.png",
    },
    Drills: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/drill.svg",
      lifestyle: "https://images.unsplash.com/photo-1581147036324-c1c7b6d6c7c8",
      slider: "https://pngimg.com/uploads/drill/drill_PNG135.png",
    },
    Grinders: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/disc.svg",
      lifestyle: "https://images.unsplash.com/photo-1604147706283-8d7b3dfd3c4e",
      slider: "https://pngimg.com/uploads/grinder/grinder_PNG16.png",
    },
    Saws: {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/activity.svg",
      lifestyle: "https://images.unsplash.com/photo-1603791440384-56cd371ee9a7",
      slider: "https://pngimg.com/uploads/saw/saw_PNG24.png",
    },
    "Water Tanks and Filtration": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
      lifestyle: "https://images.unsplash.com/photo-1564419320408-38e24e0383ef",
      slider: "https://pngimg.com/uploads/water_tank/water_tank_PNG15.png",
    },
    "Water Storage": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/database.svg",
      lifestyle: "https://images.unsplash.com/photo-1564419320408-38e24e0383ef",
      slider: "https://pngimg.com/uploads/water_tank/water_tank_PNG18.png",
    },
    "Water Tank Pumps": {
      icon: "https://cdn.jsdelivr.net/npm/lucide-static@0.436.0/icons/droplet.svg",
      lifestyle: "https://images.unsplash.com/photo-1581093458791-9d42f6c90c77",
      slider: "https://pngimg.com/uploads/pump/pump_PNG40.png",
    },
  };

  const categorySlidesPerView = useMemo(() => {
    if (categorySliderWidth >= 1280) return 6;
    if (categorySliderWidth >= 1024) return 5;
    if (categorySliderWidth >= 768) return 4;
    return 3;
  }, [categorySliderWidth]);

  const categorySliderMaxIndex = Math.max(
    0,
    categorySliderItems.length - categorySlidesPerView,
  );

  useEffect(() => {
    setCategorySliderIndex((prev) => Math.min(prev, categorySliderMaxIndex));
  }, [categorySliderMaxIndex]);

  const categorySliderPrev = () =>
    setCategorySliderIndex((i) => (i <= 0 ? categorySliderMaxIndex : i - 1));
  const categorySliderNext = () =>
    setCategorySliderIndex((i) => (i >= categorySliderMaxIndex ? 0 : i + 1));
  const categoryTranslatePct =
    (categorySliderIndex * 100) / categorySlidesPerView;

  const toggleBrand = (b: string) => {
    if (selectedFacetBrands.includes(b)) {
      setSelectedFacetBrands((prev) => prev.filter((x) => x !== b));
    } else {
      setSelectedFacetBrands((prev) => [...prev, b]);
    }
  };

  const toggleRange = (r: string) => {
    if (selectedRanges.includes(r)) {
      setSelectedRanges((prev) => prev.filter((x) => x !== r));
    } else {
      setSelectedRanges((prev) => [...prev, r]);
    }
  };

  const toggleColor = (c: string) => {
    if (selectedColors.includes(c)) {
      setSelectedColors((prev) => prev.filter((x) => x !== c));
    } else {
      setSelectedColors((prev) => [...prev, c]);
    }
  };

  const toggleDealType = (type: string) => {
    if (selectedDealTypes.includes(type)) {
      setSelectedDealTypes((prev) => prev.filter((x) => x !== type));
    } else {
      setSelectedDealTypes((prev) => [...prev, type]);
    }
  };

  const openChatBot = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event("belims:open-chat"));
  };

  const toggleCategory = (categoryLabel: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryLabel)) {
        return prev.filter((item) => item !== categoryLabel);
      }
      return [...prev, categoryLabel];
    });
  };

  const selectedFilterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (filterInStock) {
      chips.push({
        key: "availability-in-stock",
        label: "In Stock",
        onRemove: () => setFilterInStock(false),
      });
    }

    if (filterBackOrder) {
      chips.push({
        key: "availability-back-order",
        label: "Back Order",
        onRemove: () => setFilterBackOrder(false),
      });
    }

    selectedDealTypes.forEach((type) => {
      const match = dealTypeOptions.find((deal) => deal.id === type);
      if (!match) return;
      chips.push({
        key: `deal-${type}`,
        label: match.label,
        onRemove: () =>
          setSelectedDealTypes((prev) => prev.filter((item) => item !== type)),
      });
    });

    selectedRanges.forEach((slug) => {
      const match = rangeFilters.find((range) => range.slug === slug);
      if (!match) return;
      chips.push({
        key: `range-${slug}`,
        label: match.name,
        onRemove: () =>
          setSelectedRanges((prev) => prev.filter((item) => item !== slug)),
      });
    });

    selectedColors.forEach((slug) => {
      const match = colorFilters.find((color) => color.slug === slug);
      if (!match) return;
      chips.push({
        key: `color-${slug}`,
        label: match.name,
        onRemove: () =>
          setSelectedColors((prev) => prev.filter((item) => item !== slug)),
      });
    });

    selectedFacetBrands.forEach((brandName) => {
      chips.push({
        key: `brand-${brandName}`,
        label: brandName,
        onRemove: () =>
          setSelectedFacetBrands((prev) =>
            prev.filter((item) => item !== brandName),
          ),
      });
    });

    return chips;
  }, [
    filterInStock,
    filterBackOrder,
    selectedDealTypes,
    selectedRanges,
    selectedColors,
    selectedFacetBrands,
    dealTypeOptions,
    rangeFilters,
    colorFilters,
  ]);

  const clearAllFilters = () => {
    setFilterInStock(false);
    setFilterBackOrder(false);
    setSelectedDealTypes([]);
    setSelectedRanges([]);
    setSelectedColors([]);
    setSelectedFacetBrands([]);
    setSelectedCategories([]);
    setPriceRange([0, maxPrice]);
    setSortBy("featured");
  };

  const activeCategoryNode = category
    ? findCategoryNode(category, CATEGORY_TREE)
    : null;
  const subcategories = activeCategoryNode?.children || [];
  const categoryList = category ? subcategories : CATEGORY_TREE;
  const filteredCategoryList = useMemo(() => {
    const query = sidebarSearch.trim().toLowerCase();
    if (!query) return categoryList;
    return categoryList.filter((sub) =>
      sub.label.toLowerCase().includes(query),
    );
  }, [categoryList, sidebarSearch]);

  return (
    <div className="shopify-section section-collection-template bg-white">
      {/* Breadcrumb Section */}
      <nav className=" bg-white" aria-label="Breadcrumb">
        <div className="container mx-auto px-4 py-3">
          <ol className="flex items-center space-x-2 text-base text-grey">
            <li>
              <Link
                to="/"
                className="hover:text-belims-accent transition-colors"
              >
                Home
              </Link>
            </li>
            <li>
              <ChevronRight size={14} />
            </li>
            {brand && (
              <>
                <li>
                  <span className="font-base text-grey">{brand}</span>
                </li>
              </>
            )}
            {category && (
              <>
                <li>
                  <span className="font-base text-grey">{category}</span>
                </li>
              </>
            )}
            {!category && !brand && (
              <li>
                <span className="font-base text-grey">Shop</span>
              </li>
            )}
          </ol>
        </div>
      </nav>

      {categorySliderItems.length > 0 && (
        <section className="bg-white border-b border-gray-100 mb-6">
          <div className="container mx-auto px-4 py-4 pb-8">
            {/* <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Explore categories
                </h2>
                <p className="text-sm text-gray-600">
                  {categoryContextNode?.label
                    ? `Browse ${categoryContextNode.label} subcategories.`
                    : "Browse popular categories."}
                </p>
              </div>
              <div
                className={`items-center gap-2 ${
                  categorySliderMaxIndex > 0 ? "flex" : "hidden"
                }`}
              >
                <button
                  type="button"
                  onClick={categorySliderPrev}
                  aria-label="Previous categories"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={categorySliderNext}
                  aria-label="Next categories"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-black/10 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                >
                  ›
                </button>
              </div>
            </div> */}

            <div
              className="relative overflow-hidden"
              aria-roledescription="carousel"
            >
              <div
                className="-mx-3 flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${categoryTranslatePct}%)` }}
              >
                {categorySliderItems.map((label) => {
                  const isSale = label.toLowerCase() === "sale";
                  const media = categoryMedia[label];
                  return (
                    <div
                      key={label}
                      className="shrink-0 px-3"
                      style={{ width: `${100 / categorySlidesPerView}%` }}
                    >
                      <Link
                        to={`/shop/${encodeURIComponent(label)}`}
                        className="group relative flex h-full w-full items-center overflow-hidden rounded-full border border-white bg-white px-3 py-2 text-base font-bold text-grey transition-colors hover:border-grey hover:text-white"
                      >
                        <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100" />
                        <span className="relative z-10 flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors group-hover:bg-white ${
                              isSale
                                ? "bg-belims-accent text-white"
                                : "bg-grey-light"
                            }`}
                          >
                            {isSale ? (
                              <span className="text-[10px] font-bold uppercase leading-none">
                                Sale
                              </span>
                            ) : media?.icon ? (
                              <img
                                src={media.icon}
                                alt=""
                                className="h-6 w-6 object-contain"
                                loading="lazy"
                                decoding="async"
                              />
                            ) : (
                              <span className="text-xs font-semibold text-grey">
                                {label.slice(0, 2)}
                              </span>
                            )}
                          </span>
                          <span className="truncate text-sm font-semibold transition-colors group-hover:text-white">
                            {label}
                          </span>
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="container mx-auto px-4 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Facet Filters Sidebar */}
          <aside className="hidden lg:block w-60 flex-shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto bg-white px-0">
              <div className="divide-y divide-gray-100">
                <div className="py-7 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Filter
                  </h2>
                  <div className="flex items-center gap-3">
                    {selectedFilterChips.length > 0 && (
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="text-sm font-medium text-belims-blue hover:text-belims-accent"
                      >
                        Reset All
                      </button>
                    )}
                  </div>
                </div>

                <div className="pb-5">
                  <label className="relative block">
                    <span className="sr-only">Search filters</span>
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="search"
                      value={sidebarSearch}
                      onChange={(e) => setSidebarSearch(e.target.value)}
                      placeholder="Search categories"
                      className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-belims-blue focus:outline-none focus:ring-1 focus:ring-belims-blue"
                    />
                  </label>
                </div>

                <style>
                  {`
                  .plp-radio {
                    position: relative;
                    display: inline-flex;
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                  }

                  .plp-radio__input {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    margin: 0;
                    cursor: pointer;
                  }

                  .plp-radio__symbol {
                    width: 18px;
                    height: 18px;
                    border-radius: 4px;
                    border: 2px solid #d1d5db;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                  }

                  .plp-radio__symbol::after {
                    content: "";
                    width: 8px;
                    height: 8px;
                    border-radius: 2px;
                    background: #322783;
                    opacity: 0;
                    transform: scale(0.6);
                    transition: opacity 0.15s ease, transform 0.15s ease;
                  }

                  .plp-radio__input:checked + .plp-radio__symbol {
                    border-color: #322783;
                  }

                  .plp-radio__input:checked + .plp-radio__symbol::after {
                    opacity: 1;
                    transform: scale(1);
                  }

                  .plp-radio__input:focus-visible + .plp-radio__symbol {
                    box-shadow: 0 0 0 3px rgba(50, 39, 131, 0.2);
                  }
                  `}
                </style>

                <form className="facet-filters-form">
                  {/* Category List */}
                  {filteredCategoryList.length > 0 && (
                    <div className="py-4">
                      <details className="group" open>
                        <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                          Product Category
                          <ChevronDown size={20} className="text-gray-700" />
                        </summary>
                        <div className="mt-5">
                          <ul className="space-y-3">
                            {filteredCategoryList.map((sub) => (
                              <li
                                key={sub.id}
                                className="flex items-center justify-between gap-3"
                              >
                                <label
                                  htmlFor={`category-${sub.id}`}
                                  className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:text-belims-blue"
                                >
                                  <span className="plp-radio plp-radio--subtle">
                                    <input
                                      id={`category-${sub.id}`}
                                      type="checkbox"
                                      className="plp-radio__input"
                                      checked={selectedCategories.some(
                                        (selected) =>
                                          selected.toLowerCase() ===
                                          sub.label.toLowerCase(),
                                      )}
                                      onChange={() => toggleCategory(sub.label)}
                                    />
                                    <span className="plp-radio__symbol"></span>
                                  </span>
                                  <span>{sub.label}</span>
                                </label>
                                <span className="text-xs text-gray-500">
                                  {categoryCounts[sub.label.toLowerCase()] || 0}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  )}
                  {filteredCategoryList.length === 0 &&
                    categoryList.length > 0 && (
                      <div className="py-4 text-sm text-gray-500">
                        No matching categories.
                      </div>
                    )}

                  {/* Availability Filter */}
                  <div className="py-4 border-t border-gray-100">
                    <details className="group">
                      <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                        Availability
                        <ChevronDown size={20} className="text-gray-700" />
                      </summary>
                      <div className="mt-5">
                        <ul className="space-y-3">
                          <li className="flex items-center justify-between gap-3">
                            <label
                              htmlFor="availability-in-stock"
                              className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                            >
                              <span className="plp-radio plp-radio--subtle">
                                <input
                                  id="availability-in-stock"
                                  type="checkbox"
                                  className="plp-radio__input"
                                  checked={filterInStock}
                                  onChange={(e) =>
                                    setFilterInStock(e.target.checked)
                                  }
                                />
                                <span className="plp-radio__symbol"></span>
                              </span>
                              <span>In Stock</span>
                            </label>
                            <span className="text-xs text-gray-500">
                              {availabilityCounts.inStock}
                            </span>
                          </li>
                          <li className="flex items-center justify-between gap-3">
                            <label
                              htmlFor="availability-back-order"
                              className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                            >
                              <span className="plp-radio plp-radio--subtle">
                                <input
                                  id="availability-back-order"
                                  type="checkbox"
                                  className="plp-radio__input"
                                  checked={filterBackOrder}
                                  onChange={(e) =>
                                    setFilterBackOrder(e.target.checked)
                                  }
                                />
                                <span className="plp-radio__symbol"></span>
                              </span>
                              <span>Back Order</span>
                            </label>
                            <span className="text-xs text-gray-500">
                              {availabilityCounts.backOrder}
                            </span>
                          </li>
                        </ul>
                      </div>
                    </details>
                  </div>

                  {/* Current Offers */}
                  <div className="py-4 border-t border-gray-100">
                    <details className="group">
                      <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                        Current Offers
                        <ChevronDown size={20} className="text-gray-700" />
                      </summary>
                      <div className="mt-5">
                        <ul className="space-y-3">
                          {dealTypeOptions.map((deal) => (
                            <li
                              key={deal.id}
                              className="flex items-center justify-between gap-3"
                            >
                              <label
                                htmlFor={`deal-${deal.id}`}
                                className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                              >
                                <span className="plp-radio plp-radio--subtle">
                                  <input
                                    id={`deal-${deal.id}`}
                                    type="checkbox"
                                    className="plp-radio__input"
                                    checked={selectedDealTypes.includes(
                                      deal.id,
                                    )}
                                    onChange={() => toggleDealType(deal.id)}
                                  />
                                  <span className="plp-radio__symbol"></span>
                                </span>
                                <span>{deal.label}</span>
                              </label>
                              <span className="text-xs text-gray-500">
                                {dealTypeCounts[deal.id] || 0}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  </div>

                  {/* Price Filter */}
                  <div className="py-4 border-t border-gray-100">
                    <details className="group">
                      <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                        Price
                        <ChevronDown size={20} className="text-gray-700" />
                      </summary>
                      <div className="mt-5">
                        <div className="flex items-center gap-3 my-6">
                          <div className="flex-1">
                            <div className="flex items-center rounded-lg border border-gray-200 bg-white px-3">
                              <span className="text-gray-500 pr-2">R</span>
                              <input
                                readOnly
                                className="w-full bg-transparent border-l border-l-gray-200 border-0 focus:ring-0 px-2 py-2.5 text-sm font-medium text-gray-900 focus:outline-none"
                                type="text"
                                value={priceRange[0]}
                              />
                            </div>
                          </div>
                          <span className="text-gray-500">to</span>
                          <div className="flex-1">
                            <div className="flex items-center rounded-lg border border-gray-300 bg-white px-3">
                              <span className="text-gray-500 pr-2">R</span>
                              <input
                                readOnly
                                className="w-full bg-transparent border-l border-l-gray-200 border-0 focus:ring-0 px-2 py-2.5 text-sm font-medium text-gray-900 focus:outline-none"
                                type="text"
                                value={priceRange[1]}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="relative w-full h-8 flex items-center">
                          <div className="absolute w-full h-2 rounded-full bg-gray-200"></div>
                          <div
                            className="absolute h-2 rounded-full bg-belims-blue"
                            style={{
                              left: "0%",
                              width: `${Math.min(
                                100,
                                (priceRange[1] / maxPrice) * 100,
                              )}%`,
                            }}
                          ></div>
                          <input
                            min="0"
                            max={maxPrice}
                            className="range-thumb"
                            type="range"
                            value={priceRange[0]}
                            onChange={(e) =>
                              setPriceRange([
                                parseInt(e.target.value),
                                Math.max(priceRange[1], priceRange[0]),
                              ])
                            }
                            style={{ zIndex: 3 }}
                          />
                          <input
                            min="0"
                            max={maxPrice}
                            className="range-thumb"
                            type="range"
                            value={priceRange[1]}
                            onChange={(e) =>
                              setPriceRange([
                                Math.min(priceRange[0], priceRange[1]),
                                parseInt(e.target.value),
                              ])
                            }
                            style={{ zIndex: 4 }}
                          />
                        </div>
                        <style>
                          {`
                        .range-thumb {
                          -webkit-appearance: none;
                          appearance: none;
                          pointer-events: none;
                          position: absolute;
                          height: 0;
                          width: 100%;
                          outline: none;
                          background: transparent;
                        }

                        .range-thumb::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          appearance: none;
                          pointer-events: auto;
                          width: 22px;
                          height: 22px;
                          border-radius: 50%;
                          border: 3px solid #322783;
                          background-color: #ffffff;
                          cursor: pointer;
                          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }

                        .range-thumb::-moz-range-thumb {
                          pointer-events: auto;
                          width: 22px;
                          height: 22px;
                          border-radius: 50%;
                          border: 3px solid #322783;
                          background-color: #ffffff;
                          cursor: pointer;
                          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                        }
                        `}
                        </style>
                      </div>
                    </details>
                  </div>

                  {/* Brand Filter (Dynamic) */}
                  {uniqueBrands.length > 0 && !brand && (
                    <div className="py-4 border-t border-gray-100">
                      <details className="group">
                        <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                          Brand
                          <ChevronDown size={20} className="text-gray-700" />
                        </summary>
                        <div className="mt-5">
                          <ul className="space-y-3">
                            {uniqueBrands.map((b) => (
                              <li
                                key={b}
                                className="flex items-center justify-between gap-3"
                              >
                                <label
                                  htmlFor={`brand-${b}`}
                                  className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                                >
                                  <span className="plp-radio plp-radio--subtle">
                                    <input
                                      id={`brand-${b}`}
                                      type="checkbox"
                                      className="plp-radio__input"
                                      checked={selectedFacetBrands.includes(b)}
                                      onChange={() => toggleBrand(b)}
                                    />
                                    <span className="plp-radio__symbol"></span>
                                  </span>
                                  <span>{b}</span>
                                </label>
                                <span className="text-xs text-gray-500">
                                  {brandCounts[b.toLowerCase()] || 0}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Range Filter */}
                  {rangeFilters.length > 0 && (
                    <div className="py-4 border-t border-gray-100">
                      <details className="group">
                        <summary className="w-full flex items-center justify-between cursor-pointer font-semibold text-gray-900 font-heading text-base  group-hover:text-belims-blue transition-colors">
                          Range
                          <ChevronDown size={20} className="text-gray-700" />
                        </summary>
                        <div className="mt-5">
                          <ul className="space-y-3">
                            {rangeFilters.map((r) => (
                              <li
                                key={r.slug}
                                className="flex items-center justify-between gap-3"
                              >
                                <label
                                  htmlFor={`range-${r.slug}`}
                                  className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                                >
                                  <span className="plp-radio plp-radio--subtle">
                                    <input
                                      id={`range-${r.slug}`}
                                      type="checkbox"
                                      className="plp-radio__input"
                                      checked={selectedRanges.includes(r.slug)}
                                      onChange={() => toggleRange(r.slug)}
                                    />
                                    <span className="plp-radio__symbol"></span>
                                  </span>
                                  <span>{r.name}</span>
                                </label>
                                <span className="text-xs text-gray-500">
                                  {r.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Color Filter */}
                  {colorFilters.length > 0 && (
                    <div className="py-4 border-t border-gray-100">
                      <details className="group">
                        <summary className="w-full flex items-center justify-between cursor-pointer text-base font-medium text-left text-gray-900">
                          Color
                          <ChevronDown size={20} className="text-gray-700" />
                        </summary>
                        <div className="mt-5">
                          <ul className="space-y-3">
                            {colorFilters.map((c) => (
                              <li
                                key={c.slug}
                                className="flex items-center justify-between gap-3"
                              >
                                <label
                                  htmlFor={`color-${c.slug}`}
                                  className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer"
                                >
                                  <span className="plp-radio plp-radio--subtle">
                                    <input
                                      id={`color-${c.slug}`}
                                      type="checkbox"
                                      className="plp-radio__input"
                                      checked={selectedColors.includes(c.slug)}
                                      onChange={() => toggleColor(c.slug)}
                                    />
                                    <span className="plp-radio__symbol"></span>
                                  </span>
                                  <span className="flex items-center">
                                    <span className="bg-gray-300 ring-1 ring-gray-200 rounded-full w-3.5 h-3.5 inline-block mr-2"></span>
                                    {c.name}
                                  </span>
                                </label>
                                <span className="text-xs text-gray-500">
                                  {c.count}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </aside>

          {/* Main Product Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-wrap gap-4 justify-between items-center mb-8 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 text-gray-500">
                <span className="font-medium text-gray-900">
                  {filteredProducts.length}
                </span>{" "}
                products
                <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-pressed={viewMode === "grid"}
                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                      viewMode === "grid"
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-pressed={viewMode === "list"}
                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                      viewMode === "list"
                        ? "bg-gray-900 text-white"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                    title="List view"
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  className="lg:hidden flex items-center gap-2 font-bold text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <Filter size={18} /> Filters
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 hidden sm:inline">
                    Sort by:
                  </span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none bg-transparent border-none py-2 pl-2 pr-8 text-gray-900 font-medium focus:ring-0 cursor-pointer text-sm"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name">Name: A-Z</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Grid */}
            {showSkeletons ? (
              <ul
                className={`grid ${
                  viewMode === "list"
                    ? "grid-cols-2 gap-6"
                    : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6"
                }`}
              >
                {Array.from({ length: 8 }).map((_, index) => (
                  <li key={`archive-skel-${index}`} className="grid__item">
                    <SkeletonProductCard className="rounded border border-[#E0E0E0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]" />
                  </li>
                ))}
              </ul>
            ) : filteredProducts.length > 0 ? (
              <ul
                className={`grid ${
                  viewMode === "list"
                    ? "grid-cols-2 sm-grid-cols-1 gap-4"
                    : "grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-5"
                }`}
              >
                <li className="grid__item">
                  <div className="relative h-full min-h-[320px] rounded border border-[#E0E0E0] overflow-hidden bg-[#0c1b2a]">
                    <div
                      className="absolute inset-0 bg-cover bg-no-repeat"
                      style={{
                        backgroundImage:
                          "url(/images/development/18920_d0e420f0-fd13-40c8-b17d-c5423b3805ac.webp)",
                        backgroundPosition: "center top",
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30" />
                    <div className="relative z-[1] flex h-full flex-col items-center text-center px-6 pt-8 pb-6">
                      <h3 className="text-white text-3xl font-bold font-heading">
                        Expert Help & Advice
                      </h3>
                      <p className="mt-3 text-lg font-semibold text-white/90 max-w-[260px]">
                        Find the right tools, best prices, and fastest delivery.
                      </p>
                      <button
                        type="button"
                        onClick={openChatBot}
                        className="group relative mt-auto h-12 w-full overflow-hidden rounded-pill bg-white text-gray-900 transition-colors"
                      >
                        <span className="absolute inset-0 origin-left scale-x-0 bg-gray-900 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                        <span className="relative z-10 font-heading font-bold transition-colors group-hover:text-white">
                          Get Started
                        </span>
                      </button>
                    </div>
                  </div>
                </li>
                {filteredProducts.slice(1).map((product) => (
                  <li key={product.id} className="grid__item">
                    <ProductCard
                      product={product}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      className="product-card h-full w-full max-w-full lg:!w-full lg:!min-w-0 lg:!max-w-full"
                      variant={
                        viewMode === "list" ? "flat-horizontal" : "default"
                      }
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <Search size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your filters or search query.
                </p>
                <button
                  onClick={() => {
                    setPriceRange([0, maxPrice]);
                    setSortBy("featured");
                    setFilterInStock(false);
                    setSelectedFacetBrands([]);
                  }}
                  className="px-6 py-2 bg-black text-white rounded-md font-medium hover:bg-gray-900 transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pt-2">
              <h3 className="font-bold text-xl font-heading">Filters</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Mobile Price */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">
                  Price
                </h4>
                <div className="flex gap-4 mb-4">
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Min"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([
                        parseInt(e.target.value) || 0,
                        priceRange[1],
                      ])
                    }
                  />
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Max"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([
                        priceRange[0],
                        parseInt(e.target.value) || maxPrice,
                      ])
                    }
                  />
                </div>
              </div>

              {/* Mobile Availability */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">
                  Availability
                </h4>
                <label className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                    checked={filterInStock}
                    onChange={(e) => setFilterInStock(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                    checked={filterBackOrder}
                    onChange={(e) => setFilterBackOrder(e.target.checked)}
                  />
                  <span>Back Order</span>
                </label>
              </div>

              {/* Mobile Current Offers */}
              <div>
                <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-500">
                  Current Offers
                </h4>
                <div className="space-y-3">
                  {dealTypeOptions.map((deal) => (
                    <label
                      key={deal.id}
                      className="flex items-center space-x-3"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-gray-300 text-belims-accent focus:ring-belims-accent"
                        checked={selectedDealTypes.includes(deal.id)}
                        onChange={() => toggleDealType(deal.id)}
                      />
                      <span>{deal.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-belims-accent text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function useWindowWidth() {
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? 1024 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}
