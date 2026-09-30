import React, { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Product, CategoryNode } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
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
import {
  fetchProducts,
  fetchProductFilters,
} from "../services/wooCommerceService";
import { isProductPurchasable, formatCurrency } from "../utils/price";
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
  category?: string;
  brand?: string;
  range?: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<
    "recommended" | "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc"
  >("recommended");

  const initialMin = Math.max(
    0,
    parseInt(searchParams.get("price_min") || "0", 10) || 0,
  );
  const initialMax = Math.max(
    initialMin,
    parseInt(searchParams.get("price_max") || "10000", 10) || 10000,
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([
    initialMin,
    initialMax,
  ]);
  const [priceInput, setPriceInput] = useState<[string, string]>([
    String(initialMin),
    String(initialMax),
  ]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [categoryScopedProducts, setCategoryScopedProducts] = useState<
    Product[] | null
  >(null);
  const [isCategoryScopedLoading, setIsCategoryScopedLoading] = useState(false);
  const [searchScopedProducts, setSearchScopedProducts] = useState<
    Product[] | null
  >(null);
  const [isSearchScopedLoading, setIsSearchScopedLoading] = useState(false);
  const showSkeletons =
    isLoadingProducts || isCategoryScopedLoading || isSearchScopedLoading;
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);

  // Accordion open/close states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    availability: true,
    offers: true,
    brand: true,
    range: true,
    color: true,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Category View More / Less state
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Filters state
  const [filterInStock, setFilterInStock] = useState(false);
  const [selectedDealTypes, setSelectedDealTypes] = useState<string[]>([]);
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    category ? [category] : [],
  );
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedFacetBrands, setSelectedFacetBrands] = useState<string[]>([]);

  const [rangeFilters, setRangeFilters] = useState<FilterOption[]>([]);
  const [colorFilters, setColorFilters] = useState<FilterOption[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadFilters = async () => {
      try {
        const data = await fetchProductFilters();
        if (isMounted && data) {
          if (Array.isArray(data.range) && data.range.length > 0)
            setRangeFilters(data.range);
          if (Array.isArray(data.color) && data.color.length > 0)
            setColorFilters(data.color);
        }
      } catch {
        // Silently fall back to locally computed filters from products catalog
      }
    };
    loadFilters();
    return () => {
      isMounted = false;
    };
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

  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [products]);

  useEffect(() => {
    setSelectedCategories(category ? [category] : []);
  }, [category]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (!category) {
      setCategoryScopedProducts(null);
      setIsCategoryScopedLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsCategoryScopedLoading(true);
    fetchProducts(category, undefined, { signal: controller.signal })
      .then((items) => {
        if (!isMounted) return;
        const validItems = items.filter(isProductPurchasable);
        setCategoryScopedProducts(validItems);
      })
      .catch(() => {
        if (!isMounted) return;
        setCategoryScopedProducts(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsCategoryScopedLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [category]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (!searchQuery) {
      setSearchScopedProducts(null);
      setIsSearchScopedLoading(false);
      return () => {
        isMounted = false;
      };
    }

    setIsSearchScopedLoading(true);
    fetchProducts(undefined, searchQuery, { signal: controller.signal })
      .then((items) => {
        if (!isMounted) return;
        const validItems = items.filter(isProductPurchasable);
        setSearchScopedProducts(validItems);
      })
      .catch(() => {
        if (!isMounted) return;
        setSearchScopedProducts(null);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsSearchScopedLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [searchQuery]);

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

  const getCategoryMatches = (
    rootLabel: string,
    nodes: CategoryNode[],
  ): string[] => {
    let matches: string[] = [];
    for (const node of nodes) {
      if (node.label.toLowerCase() === rootLabel.toLowerCase()) {
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
      if (node.children) {
        const childMatches = getCategoryMatches(rootLabel, node.children);
        if (childMatches.length > 0) return childMatches;
      }
    }
    return matches;
  };

  const findCategoryNode = (
    rootLabel: string,
    nodes: CategoryNode[],
  ): CategoryNode | null => {
    for (const node of nodes) {
      if (node.label.toLowerCase() === rootLabel.toLowerCase()) return node;
      if (node.children) {
        const match = findCategoryNode(rootLabel, node.children);
        if (match) return match;
      }
    }
    return null;
  };

  const getCategoryBreadcrumbPath = (
    targetLabel: string,
    nodes: CategoryNode[],
  ): string[] => {
    const path: string[] = [];
    const findPath = (label: string, nodeList: CategoryNode[]): boolean => {
      for (const node of nodeList) {
        if (node.label.toLowerCase() === label.toLowerCase()) {
          path.push(node.label);
          return true;
        }
        if (node.children) {
          if (findPath(label, node.children)) {
            path.unshift(node.label);
            return true;
          }
        }
      }
      return false;
    };
    findPath(targetLabel, nodes);
    return path;
  };

  // Filter Logic
  const filteredProducts = useMemo(() => {
    let sourceProducts = products;
    if (searchScopedProducts) {
      sourceProducts = searchScopedProducts;
    } else if (categoryScopedProducts) {
      sourceProducts = categoryScopedProducts;
    }

    let filtered = [...sourceProducts];
    const activeCategoryTree = categoryTree.length
      ? categoryTree
      : CATEGORY_TREE;

    // 1. Filter by Category
    if (selectedCategories.length > 0) {
      const selectedLabels = selectedCategories.map((label) =>
        label.toLowerCase(),
      );
      const validCategories = new Set<string>();

      selectedCategories.forEach((selected) => {
        const matches = getCategoryMatches(selected, activeCategoryTree);
        if (matches.length > 0) {
          matches.forEach((match) => validCategories.add(match.toLowerCase()));
        } else {
          validCategories.add(selected.toLowerCase());
        }
        validCategories.add(selected.toLowerCase());
      });

      filtered = filtered.filter((p) => {
        const productCategory = (p.category || "").toLowerCase();
        const breadcrumbLabels = (p.breadcrumbs || [])
          .map((crumb) => (crumb.label || "").toLowerCase())
          .filter(Boolean);

        if (validCategories.has(productCategory)) return true;
        if (breadcrumbLabels.some((label) => validCategories.has(label)))
          return true;
        if (selectedLabels.some((label) => productCategory.includes(label)))
          return true;
        return breadcrumbLabels.some((crumbLabel) =>
          selectedLabels.some((selectedLabel) =>
            crumbLabel.includes(selectedLabel),
          ),
        );
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
          p.description?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query),
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

    // 5.5 Availability & Deals
    if (filterInStock) {
      filtered = filtered.filter((p) => p.stock > 0);
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
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "featured":
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
      case "recommended":
      default:
        break;
    }

    return filtered;
  }, [
    products,
    categoryScopedProducts,
    searchScopedProducts,
    brand,
    searchQuery,
    priceRange,
    sortBy,
    filterInStock,
    selectedDealTypes,
    selectedFacetBrands,
    selectedCategories,
    categoryTree,
    selectedRanges,
  ]);

  const categoryCountsSourceProducts = useMemo(() => {
    const sourceProducts =
      searchScopedProducts || categoryScopedProducts || products;
    let filtered = [...sourceProducts];

    if (brand) {
      filtered = filtered.filter(
        (p) => p.brand && p.brand.toLowerCase() === brand.toLowerCase(),
      );
    }

    if (selectedFacetBrands.length > 0) {
      filtered = filtered.filter(
        (p) => p.brand && selectedFacetBrands.includes(p.brand),
      );
    }

    if (searchQuery && !searchScopedProducts) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query),
      );
    }

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

    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
    );

    if (filterInStock) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    if (selectedDealTypes.length > 0) {
      filtered = filtered.filter((p) => {
        const dealType =
          p.deals_resolved?.consumer?.bestDeal?.type ||
          p.deals_resolved?.trade?.bestDeal?.type;
        return dealType ? selectedDealTypes.includes(dealType) : false;
      });
    }

    return filtered;
  }, [
    products,
    categoryScopedProducts,
    searchScopedProducts,
    brand,
    searchQuery,
    priceRange,
    filterInStock,
    selectedDealTypes,
    selectedFacetBrands,
    selectedRanges,
  ]);

  const productCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    categoryCountsSourceProducts.forEach((product) => {
      let leafCategory: string | undefined;
      if (product.breadcrumbs && product.breadcrumbs.length > 0) {
        const lastBreadcrumb =
          product.breadcrumbs[product.breadcrumbs.length - 1];
        if (
          lastBreadcrumb.label &&
          lastBreadcrumb.label.toLowerCase() !== "shop"
        ) {
          leafCategory = lastBreadcrumb.label.toLowerCase();
        }
      }
      if (!leafCategory && product.category) {
        leafCategory = product.category.toLowerCase();
      }
      if (leafCategory) {
        counts[leafCategory] = (counts[leafCategory] || 0) + 1;
      }
    });
    return counts;
  }, [categoryCountsSourceProducts]);

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
    filteredProducts.forEach((product) => {
      if (product.stock > 0) inStock += 1;
    });
    return { inStock };
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

  const maxPrice = useMemo(() => {
    return Math.max(...products.map((p) => p.price), 1000);
  }, [products]);

  useEffect(() => {
    setPriceInput([String(priceRange[0]), String(priceRange[1])]);
  }, [priceRange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const [min, max] = priceRange;
      if (min === 0 && max >= maxPrice) {
        searchParams.delete("price_min");
        searchParams.delete("price_max");
      } else {
        searchParams.set("price_min", String(min));
        searchParams.set("price_max", String(max));
      }
      setSearchParams(searchParams, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [priceRange, maxPrice, searchParams, setSearchParams]);

  const title = brand
    ? `${brand} Products`
    : category
      ? category
      : searchQuery
        ? `Search: "${searchQuery}"`
        : "All Products";

  const parsePrice = (
    raw: string,
    fallback: number,
    min = 0,
    max = maxPrice,
  ) => {
    const cleaned = raw.replace(/[^0-9]/g, "");
    const num = parseInt(cleaned, 10);
    if (!Number.isFinite(num) || cleaned === "") return fallback;
    return Math.max(min, Math.min(max, num));
  };

  const toggleBrand = (b: string) => {
    setSelectedFacetBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  };

  const toggleRange = (r: string) => {
    setSelectedRanges((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  const toggleColor = (c: string) => {
    setSelectedColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const toggleDealType = (type: string) => {
    setSelectedDealTypes((prev) =>
      prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
    );
  };

  const activeCategoryNode = category
    ? findCategoryNode(
        category,
        categoryTree.length ? categoryTree : CATEGORY_TREE,
      )
    : null;
  const subcategories = activeCategoryNode?.children || [];

  const toggleCategory = (categoryLabel: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryLabel)) {
        return prev.filter((item) => item !== categoryLabel);
      }
      const isChildOfCurrent = subcategories.some(
        (sub) => sub.label.toLowerCase() === categoryLabel.toLowerCase(),
      );
      if (isChildOfCurrent && category && prev.includes(category)) {
        return [
          ...prev.filter(
            (item) => item.toLowerCase() !== category.toLowerCase(),
          ),
          categoryLabel,
        ];
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
      const match = rangeFilters.find((r) => r.slug === slug);
      if (!match) return;
      chips.push({
        key: `range-${slug}`,
        label: match.name,
        onRemove: () =>
          setSelectedRanges((prev) => prev.filter((item) => item !== slug)),
      });
    });

    selectedColors.forEach((slug) => {
      const match = colorFilters.find((c) => c.slug === slug);
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

    selectedCategories.forEach((catName) => {
      if (catName !== category) {
        chips.push({
          key: `cat-${catName}`,
          label: catName,
          onRemove: () =>
            setSelectedCategories((prev) =>
              prev.filter((item) => item !== catName),
            ),
        });
      }
    });

    if (priceRange[0] > 0 || priceRange[1] < maxPrice) {
      chips.push({
        key: "price-range",
        label: `R${priceRange[0]} – R${priceRange[1]}`,
        onRemove: () => setPriceRange([0, maxPrice]),
      });
    }

    return chips;
  }, [
    filterInStock,
    selectedDealTypes,
    selectedRanges,
    selectedColors,
    selectedFacetBrands,
    selectedCategories,
    category,
    priceRange,
    maxPrice,
    dealTypeOptions,
    rangeFilters,
    colorFilters,
  ]);

  const clearAllFilters = () => {
    setFilterInStock(false);
    setSelectedDealTypes([]);
    setSelectedRanges([]);
    setSelectedColors([]);
    setSelectedFacetBrands([]);
    setSelectedCategories(category ? [category] : []);
    setPriceRange([0, maxPrice]);
    setSortBy("recommended");
  };

  const categoryList = category
    ? activeCategoryNode?.children || []
    : categoryTree.length
      ? categoryTree
      : CATEGORY_TREE;

  const filteredCategoryList = useMemo(() => {
    const query = sidebarSearch.trim().toLowerCase();
    if (!query) return categoryList;
    return categoryList.filter((sub) =>
      sub.label.toLowerCase().includes(query),
    );
  }, [categoryList, sidebarSearch]);

  const visibleCategoryList = showAllCategories
    ? filteredCategoryList
    : filteredCategoryList.slice(0, 6);

  // Sidebar Filter Component Content (TailGrids Collapsible Cards)
  const renderFilterContent = () => (
    <div className="space-y-4">
      {/* Filter By Header Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs flex items-center justify-between">
        <h4 className="text-base font-semibold text-[#111928]">Filter By</h4>
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-sm font-medium text-[#3758F9] hover:underline cursor-pointer"
        >
          Clear All
        </button>
      </div>

      {/* 1. Product Category Collapsible Card */}
      {categoryList.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("category")}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#111928]">
                Product Category
              </h3>
              {selectedCategories.length > 0 && (
                <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#3758F9]/10 px-1.5 text-xs font-semibold text-[#3758F9]">
                  {selectedCategories.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
                openSections.category ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSections.category && (
            <div className="mt-4 space-y-3">
              {/* Category Search Input */}
              <div className="relative">
                <label htmlFor="category-search" className="sr-only">
                  Search Category
                </label>
                <input
                  id="category-search"
                  type="text"
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search Category"
                  className="w-full rounded-md border border-[#E5E7EB] bg-white py-2 pl-9 pr-3 text-sm text-[#111928] placeholder-[#9CA3AF] focus:border-[#3758F9] focus:outline-none transition-colors"
                />
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none"
                />
              </div>

              {/* Category Checkboxes */}
              <ul className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar pt-1">
                {visibleCategoryList.map((sub) => {
                  const isChecked = selectedCategories.some(
                    (selected) =>
                      selected.toLowerCase() === sub.label.toLowerCase(),
                  );
                  return (
                    <li
                      key={sub.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <label
                        htmlFor={`category-${sub.id}`}
                        className="flex items-center gap-2.5 text-sm text-[#637381] cursor-pointer hover:text-[#111928] transition-colors select-none"
                      >
                        <input
                          id={`category-${sub.id}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(sub.label)}
                          className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                        />
                        <span className={isChecked ? "font-semibold text-[#111928]" : ""}>
                          {sub.label}
                        </span>
                      </label>
                      <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                        {categoryCounts[sub.label.toLowerCase()] || 0}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {filteredCategoryList.length === 0 && (
                <p className="text-xs text-[#8899A8] pt-1">
                  No matching categories.
                </p>
              )}

              {filteredCategoryList.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#111928] hover:text-[#3758F9] transition-colors pt-1 cursor-pointer"
                >
                  {showAllCategories ? "View less" : "View more"}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showAllCategories ? "rotate-180" : ""
                    }`}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Price Range Collapsible Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection("price")}
          className="flex w-full items-center justify-between text-left cursor-pointer"
        >
          <h3 className="text-base font-semibold text-[#111928]">Price Range</h3>
          <ChevronDown
            className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
              openSections.price ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSections.price && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-[#637381]">
              The highest price is {formatCurrency(maxPrice)}
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <label className="sr-only" htmlFor="min-price">
                  Min Price
                </label>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#637381]">
                  R
                </span>
                <input
                  id="min-price"
                  type="text"
                  inputMode="numeric"
                  value={priceInput[0]}
                  onChange={(e) => {
                    const next = parsePrice(
                      e.target.value,
                      priceRange[0],
                      0,
                      priceRange[1],
                    );
                    setPriceInput([String(next), priceInput[1]]);
                    setPriceRange([next, priceRange[1]]);
                  }}
                  className="w-full rounded-md border border-[#E5E7EB] bg-white pl-7 pr-2 py-2 text-sm font-medium text-[#111928] focus:border-[#3758F9] focus:outline-none transition-colors"
                  placeholder="0.00"
                />
              </div>

              <span className="text-sm text-[#637381]">to</span>

              <div className="flex-1 relative">
                <label className="sr-only" htmlFor="max-price">
                  Max Price
                </label>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#637381]">
                  R
                </span>
                <input
                  id="max-price"
                  type="text"
                  inputMode="numeric"
                  value={priceInput[1]}
                  onChange={(e) => {
                    const next = parsePrice(
                      e.target.value,
                      priceRange[1],
                      priceRange[0],
                      maxPrice,
                    );
                    setPriceInput([priceInput[0], String(next)]);
                    setPriceRange([priceRange[0], next]);
                  }}
                  className="w-full rounded-md border border-[#E5E7EB] bg-white pl-7 pr-2 py-2 text-sm font-medium text-[#111928] focus:border-[#3758F9] focus:outline-none transition-colors"
                  placeholder={String(maxPrice)}
                />
              </div>
            </div>

            {/* Slider track */}
            <div className="relative w-full h-6 flex items-center pt-2">
              <div className="absolute w-full h-1.5 rounded-full bg-[#E5E7EB]" />
              <div
                className="absolute h-1.5 rounded-full bg-[#3758F9]"
                style={{
                  left: `${(priceRange[0] / maxPrice) * 100}%`,
                  width: `${Math.max(
                    0,
                    ((priceRange[1] - priceRange[0]) / maxPrice) * 100,
                  )}%`,
                }}
              />
              <input
                min="0"
                max={maxPrice}
                className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
                type="range"
                value={priceRange[0]}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPriceRange([
                    Math.min(val, priceRange[1]),
                    Math.max(priceRange[1], val),
                  ]);
                }}
              />
              <input
                min="0"
                max={maxPrice}
                className="range-thumb absolute w-full pointer-events-none appearance-none bg-transparent"
                type="range"
                value={priceRange[1]}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPriceRange([
                    Math.min(priceRange[0], val),
                    Math.max(val, priceRange[0]),
                  ]);
                }}
              />
            </div>
            <style>
              {`
                .range-thumb::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  appearance: none;
                  pointer-events: auto;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  border: 2px solid #3758F9;
                  background-color: #ffffff;
                  cursor: pointer;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                }
                .range-thumb::-moz-range-thumb {
                  pointer-events: auto;
                  width: 18px;
                  height: 18px;
                  border-radius: 50%;
                  border: 2px solid #3758F9;
                  background-color: #ffffff;
                  cursor: pointer;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                }
              `}
            </style>
          </div>
        )}
      </div>

      {/* 3. Availability Collapsible Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection("availability")}
          className="flex w-full items-center justify-between text-left cursor-pointer"
        >
          <h3 className="text-base font-semibold text-[#111928]">Availability</h3>
          <ChevronDown
            className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
              openSections.availability ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSections.availability && (
          <div className="mt-4">
            <label className="flex items-center justify-between gap-2 text-sm text-[#637381] cursor-pointer hover:text-[#111928] select-none">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={filterInStock}
                  onChange={(e) => setFilterInStock(e.target.checked)}
                  className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                />
                <span className={filterInStock ? "font-semibold text-[#111928]" : ""}>
                  In Stock Only
                </span>
              </div>
              <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                {availabilityCounts.inStock}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* 4. Current Offers Collapsible Card */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
        <button
          type="button"
          onClick={() => toggleSection("offers")}
          className="flex w-full items-center justify-between text-left cursor-pointer"
        >
          <h3 className="text-base font-semibold text-[#111928]">Current Offers</h3>
          <ChevronDown
            className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
              openSections.offers ? "rotate-180" : ""
            }`}
          />
        </button>

        {openSections.offers && (
          <div className="mt-4">
            <ul className="space-y-2.5">
              {dealTypeOptions.map((deal) => {
                const isChecked = selectedDealTypes.includes(deal.id);
                return (
                  <li
                    key={deal.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <label
                      htmlFor={`deal-${deal.id}`}
                      className="flex items-center gap-2.5 text-sm text-[#637381] cursor-pointer hover:text-[#111928] select-none"
                    >
                      <input
                        id={`deal-${deal.id}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDealType(deal.id)}
                        className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                      />
                      <span className={isChecked ? "font-semibold text-[#111928]" : ""}>
                        {deal.label}
                      </span>
                    </label>
                    <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                      {dealTypeCounts[deal.id] || 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* 5. Brand Collapsible Card */}
      {uniqueBrands.length > 0 && !brand && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("brand")}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-[#111928]">Brand</h3>
              {selectedFacetBrands.length > 0 && (
                <span className="inline-flex min-w-[20px] h-5 items-center justify-center rounded-full bg-[#3758F9]/10 px-1.5 text-xs font-semibold text-[#3758F9]">
                  {selectedFacetBrands.length}
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
                openSections.brand ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSections.brand && (
            <div className="mt-4">
              <ul className="space-y-2.5 max-h-52 overflow-y-auto no-scrollbar">
                {uniqueBrands.map((b) => {
                  const isChecked = selectedFacetBrands.includes(b);
                  return (
                    <li
                      key={b}
                      className="flex items-center justify-between gap-2"
                    >
                      <label
                        htmlFor={`brand-${b}`}
                        className="flex items-center gap-2.5 text-sm text-[#637381] cursor-pointer hover:text-[#111928] select-none"
                      >
                        <input
                          id={`brand-${b}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleBrand(b)}
                          className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                        />
                        <span className={isChecked ? "font-semibold text-[#111928]" : ""}>
                          {b}
                        </span>
                      </label>
                      <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                        {brandCounts[b.toLowerCase()] || 0}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 6. Range Collapsible Card */}
      {rangeFilters.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("range")}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <h3 className="text-base font-semibold text-[#111928]">Range</h3>
            <ChevronDown
              className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
                openSections.range ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSections.range && (
            <div className="mt-4">
              <ul className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                {rangeFilters.map((r) => {
                  const isChecked = selectedRanges.includes(r.slug);
                  return (
                    <li
                      key={r.slug}
                      className="flex items-center justify-between gap-2"
                    >
                      <label
                        htmlFor={`range-${r.slug}`}
                        className="flex items-center gap-2.5 text-sm text-[#637381] cursor-pointer hover:text-[#111928] select-none"
                      >
                        <input
                          id={`range-${r.slug}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleRange(r.slug)}
                          className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                        />
                        <span className={isChecked ? "font-semibold text-[#111928]" : ""}>
                          {r.name}
                        </span>
                      </label>
                      <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                        {r.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 7. Color Collapsible Card */}
      {colorFilters.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <button
            type="button"
            onClick={() => toggleSection("color")}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <h3 className="text-base font-semibold text-[#111928]">Color</h3>
            <ChevronDown
              className={`w-5 h-5 text-[#637381] transition-transform duration-200 ${
                openSections.color ? "rotate-180" : ""
              }`}
            />
          </button>

          {openSections.color && (
            <div className="mt-4">
              <ul className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar">
                {colorFilters.map((c) => {
                  const isChecked = selectedColors.includes(c.slug);
                  return (
                    <li
                      key={c.slug}
                      className="flex items-center justify-between gap-2"
                    >
                      <label
                        htmlFor={`color-${c.slug}`}
                        className="flex items-center gap-2.5 text-sm text-[#637381] cursor-pointer hover:text-[#111928] select-none"
                      >
                        <input
                          id={`color-${c.slug}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleColor(c.slug)}
                          className="w-4 h-4 rounded border-[#D1D5DB] text-[#3758F9] focus:ring-[#3758F9] cursor-pointer"
                        />
                        <span className={isChecked ? "font-semibold text-[#111928]" : ""}>
                          {c.name}
                        </span>
                      </label>
                      <span className="rounded-full bg-[#F4F7FF] px-2.5 py-0.5 text-xs font-medium text-[#637381]">
                        {c.count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section className="bg-[#F4F7FF] py-6 sm:py-8 min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Bar */}
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-xs sm:text-sm text-[#637381]">
            <li>
              <Link
                to="/"
                className="hover:text-[#3758F9] transition-colors font-medium"
              >
                Home
              </Link>
            </li>
            <li>
              <ChevronRight size={14} className="text-[#9CA3AF]" />
            </li>
            {brand && (
              <li>
                <span className="font-semibold text-[#111928]">{brand}</span>
              </li>
            )}
            {category && (
              <>
                {(() => {
                  const activeCatTree = categoryTree.length
                    ? categoryTree
                    : CATEGORY_TREE;
                  const breadcrumbPath = getCategoryBreadcrumbPath(
                    category,
                    activeCatTree,
                  );
                  return breadcrumbPath.length > 0 ? (
                    breadcrumbPath.map((catName, idx) => (
                      <React.Fragment key={idx}>
                        <li>
                          <span className="font-semibold text-[#111928]">
                            {catName}
                          </span>
                        </li>
                        {idx < breadcrumbPath.length - 1 && (
                          <li>
                            <ChevronRight
                              size={14}
                              className="text-[#9CA3AF]"
                            />
                          </li>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <li>
                      <span className="font-semibold text-[#111928]">
                        {category}
                      </span>
                    </li>
                  );
                })()}
              </>
            )}
            {!category && !brand && (
              <li>
                <span className="font-semibold text-[#111928]">Shop</span>
              </li>
            )}
          </ol>
        </nav>

        {/* Top Header Card (Matching TailGrids Reference and Screenshot) */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-5 sm:p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Mobile Filter Button + Title & Results */}
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-[#111928] shadow-xs hover:bg-[#F4F7FF] transition-colors"
            >
              <Filter size={16} />
              <span>Filter</span>
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#111928]">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#637381] mt-0.5">
                Showing 1-{filteredProducts.length} of {products.length} Results
              </p>
            </div>
          </div>

          {/* Right Controls: Sort By + Grid/List View Switch */}
          <div className="flex items-center justify-between sm:justify-end gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#637381] whitespace-nowrap">
                Sort by
              </span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-[#E5E7EB] bg-white py-2 pl-3.5 pr-8 text-sm font-medium text-[#111928] shadow-xs focus:border-[#3758F9] focus:outline-none cursor-pointer appearance-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price, Low to high</option>
                  <option value="price-desc">Price, high to low</option>
                  <option value="name-asc">Alphabetically, A-Z</option>
                  <option value="name-desc">Alphabetically, Z-A</option>
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#637381]"
                />
              </div>
            </div>

            {/* View Mode Nav Toggle (Side-by-side grouped buttons) */}
            <nav className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#3758F9]/10 text-[#3758F9]"
                    : "text-[#637381] hover:bg-gray-50"
                }`}
                title="Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid size={18} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors border-l border-[#E5E7EB] ${
                  viewMode === "list"
                    ? "bg-[#3758F9]/10 text-[#3758F9]"
                    : "text-[#637381] hover:bg-gray-50"
                }`}
                title="List View"
                aria-label="List View"
              >
                <List size={18} />
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Collapsible Sidebar Filters (Desktop) */}
          <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-24">
            {renderFilterContent()}
          </aside>

          {/* Product Grid / List Area */}
          <main className="flex-1 min-w-0 w-full">
            {/* Active Filter Chips */}
            {selectedFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#637381] mr-1">
                  Active:
                </span>
                {selectedFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-medium text-[#111928] shadow-xs hover:border-[#3758F9] hover:text-[#3758F9] transition-colors"
                  >
                    <span>{chip.label}</span>
                    <X size={13} className="text-[#9CA3AF]" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-[#3758F9] hover:underline ml-2 transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Product Cards Container (Responsive 4/3/2, No Expert Help Block) */}
            {showSkeletons ? (
              <div
                className={`grid ${
                  viewMode === "list"
                    ? "grid-cols-1 gap-4"
                    : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                }`}
              >
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`archive-skel-${index}`}>
                    <SkeletonProductCard className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-xs" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div
                className={`grid ${
                  viewMode === "list"
                    ? "grid-cols-1 gap-4"
                    : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5"
                }`}
              >
                {filteredProducts.map((product) => (
                  <div key={product.id}>
                    <ProductCard
                      product={product}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      className="h-full w-full"
                      variant={
                        viewMode === "list" ? "flat-horizontal" : "default"
                      }
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                      customizations={PRODUCT_CARD_PRESETS.compactCard}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-[#E5E7EB] p-8 shadow-xs">
                <Search
                  size={44}
                  className="mx-auto text-[#9CA3AF] mb-3"
                />
                <h3 className="text-lg font-bold text-[#111928] mb-1 font-heading">
                  No products found
                </h3>
                <p className="text-sm text-[#637381] mb-5 max-w-sm mx-auto">
                  Try adjusting or clearing your filters to discover matching
                  products.
                </p>
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#111928] text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-[#3758F9] transition-colors shadow-xs"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Slide-Over Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[1300] bg-black/50 backdrop-blur-xs flex justify-end transition-opacity"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-[#F4F7FF] h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E5E7EB] bg-white">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg text-[#111928]">
                  Filters
                </h3>
                {selectedFilterChips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-[#3758F9]"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-full text-[#637381]"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              {renderFilterContent()}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#E5E7EB] bg-white">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-[#3758F9] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#2e4bd6] transition-colors shadow-xs"
              >
                Show Results ({filteredProducts.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Archive;
