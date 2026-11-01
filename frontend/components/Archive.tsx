import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Product, CategoryNode } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CATEGORY_TREE, initializeCategoryTree } from "../categoryTree";
import { fetchProducts } from "../services/wooCommerceService";
import { isProductPurchasable, formatCurrency } from "../utils/price";
import { buildCategoryCounts, productsInCategory } from "../utils/categoryCounts";
import { SkeletonProductCard } from "./Skeleton";
import { ArchiveHero, ArchiveCrumb, ArchiveDiscoveryItem } from "./ArchiveHero";

interface ArchiveProps {
  products: Product[];
  isLoadingProducts?: boolean;
  /** Route segment from /shop/:categorySlug — a category slug, or a legacy category name. */
  categoryParam?: string;
  brand?: string;
  searchQuery?: string;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

type SortKey =
  | "recommended"
  | "best-sellers"
  | "new-in"
  | "price-asc"
  | "price-desc"
  | "name-asc"
  | "name-desc"
  | "top-rated";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Relevance" },
  { value: "best-sellers", label: "Best Sellers" },
  { value: "new-in", label: "New In" },
  { value: "price-asc", label: "Price Low-High" },
  { value: "price-desc", label: "Price High-Low" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "top-rated", label: "Top Rated" },
];

const OFFER_LABELS: Record<string, string> = {
  deal_of_day: "Deal of the Day",
  weekly_special: "Weekly Special",
  trade_special: "Trade Special",
  sale: "Sale",
  clearance: "Clearance",
  bundle: "Bundle",
  promo: "Promo",
};

const PER_PAGE = 24;
const LIST_SEPARATOR = ",";

const dealTypeOf = (p: Product): string | undefined =>
  p.deals_resolved?.consumer?.bestDeal?.type || p.deals_resolved?.trade?.bestDeal?.type;

const readList = (params: URLSearchParams, key: string) =>
  (params.get(key) || "").split(LIST_SEPARATOR).filter(Boolean);

const readInt = (params: URLSearchParams, key: string) => {
  const value = parseInt(params.get(key) || "", 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
};

const walk = (nodes: CategoryNode[], visit: (node: CategoryNode, path: CategoryNode[]) => boolean) => {
  const step = (list: CategoryNode[], path: CategoryNode[]): boolean =>
    list.some((node) => visit(node, path) || step(node.children ?? [], [...path, node]));
  step(nodes, []);
};

/** Resolve a route segment to its node and ancestor path: slug first, then name (legacy links). */
const resolveCategory = (tree: CategoryNode[], param: string) => {
  const key = param.trim().toLowerCase();
  const asName = key.replace(/-/g, " ");
  const matchers: ((node: CategoryNode) => boolean)[] = [
    (node) => node.id.toLowerCase() === key,
    (node) => node.label.toLowerCase() === key || node.label.toLowerCase() === asName,
  ];
  for (const matches of matchers) {
    let found: { node: CategoryNode; path: CategoryNode[] } | null = null;
    walk(tree, (node, path) => {
      if (!matches(node)) return false;
      found = { node, path: [...path, node] };
      return true;
    });
    if (found) return found as { node: CategoryNode; path: CategoryNode[] };
  }
  return null;
};

const matchesQuery = (p: Product, query: string) => {
  const q = query.toLowerCase();
  return (
    p.name.toLowerCase().includes(q) ||
    (p.sku || "").toLowerCase().includes(q) ||
    (p.brand || "").toLowerCase().includes(q)
  );
};

const pageList = (current: number, total: number): (number | "gap")[] => {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? ["gap" as const, n] : [n]));
};

const FacetSection: React.FC<{
  id: string;
  title: string;
  selectedCount?: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ id, title, selectedCount = 0, open, onToggle, children }) => (
  <div className="border-b border-border py-4">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`facet-${id}`}
      className="flex w-full items-center justify-between text-left"
    >
      <span className="flex items-center gap-2 font-heading font-condensed text-h5 font-extrabold uppercase text-text">
        {title}
        {selectedCount > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-badge bg-belims-blue px-1.5 text-xs font-bold text-white">
            {selectedCount}
          </span>
        )}
      </span>
      <ChevronDown
        size={18}
        aria-hidden="true"
        className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
      />
    </button>
    {open && (
      <div id={`facet-${id}`} className="mt-3">
        {children}
      </div>
    )}
  </div>
);

const FacetCheckbox: React.FC<{
  id: string;
  label: string;
  count: number;
  checked: boolean;
  onChange: () => void;
  round?: boolean;
}> = ({ id, label, count, checked, onChange, round = false }) => (
  <li>
    <label
      htmlFor={id}
      className="flex cursor-pointer select-none items-center justify-between gap-3 py-2.5 text-base text-text-secondary hover:text-text"
    >
      <span className="flex items-center gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className={`h-5 w-5 shrink-0 cursor-pointer border-border-strong accent-belims-blue ${round ? "rounded-full" : "rounded-xs"}`}
        />
        <span className={checked ? "font-semibold text-text" : ""}>{label}</span>
      </span>
      <span className="text-sm text-text-tertiary">{count}</span>
    </label>
  </li>
);

export const Archive: React.FC<ArchiveProps> = ({
  products,
  isLoadingProducts = false,
  categoryParam,
  brand,
  searchQuery,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── URL state (back-button safe) ──
  const sortBy = (SORT_OPTIONS.some((o) => o.value === searchParams.get("sort"))
    ? searchParams.get("sort")
    : "recommended") as SortKey;
  const viewMode = searchParams.get("view") === "list" ? "list" : "grid";
  const selectedSubs = readList(searchParams, "sub");
  const selectedBrands = readList(searchParams, "brands");
  const selectedOffers = readList(searchParams, "offer");
  const withinQuery = (searchParams.get("q") || "").trim();
  const priceMin = readInt(searchParams, "price_min");
  const priceMax = readInt(searchParams, "price_max");
  const requestedPage = Math.max(1, readInt(searchParams, "page") || 1);

  const updateParams = (
    changes: Record<string, string | null>,
    { keepPage = false, replace = false } = {},
  ) => {
    // Read the live URL: the router's `prev` is render-time state, so rapid clicks would drop values.
    const next = new URLSearchParams(window.location.search);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!keepPage && !("page" in changes)) next.delete("page");
    setSearchParams(next, { replace });
  };

  const toggleListParam = (key: string, value: string) => {
    const current = readList(new URLSearchParams(window.location.search), key);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    updateParams({ [key]: next.join(LIST_SEPARATOR) || null });
  };

  // ── Category tree + route resolution ──
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>(CATEGORY_TREE);
  const [treeReady, setTreeReady] = useState(CATEGORY_TREE.length > 0);

  useEffect(() => {
    let isMounted = true;
    initializeCategoryTree()
      .then((tree) => isMounted && setCategoryTree(tree))
      .catch(() => isMounted && setCategoryTree([]))
      .finally(() => isMounted && setTreeReady(true));
    return () => {
      isMounted = false;
    };
  }, []);

  const resolved = useMemo(
    () => (categoryParam ? resolveCategory(categoryTree, categoryParam) : null),
    [categoryTree, categoryParam],
  );
  const categoryNode = resolved?.node ?? null;
  const categoryPath = resolved?.path ?? [];

  // ── Scoped fetches (category / search / brand) ──
  const [categoryScoped, setCategoryScoped] = useState<Product[] | null>(null);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [searchScoped, setSearchScoped] = useState<Product[] | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [brandScoped, setBrandScoped] = useState<Product[] | null>(null);
  const [isBrandLoading, setIsBrandLoading] = useState(false);

  // Category: wait for the tree so the request uses the real CMS slug (e.g. "paint-paint").
  const categoryFetchKey = categoryParam ? (treeReady ? categoryNode?.id || categoryParam : null) : "";
  useEffect(() => {
    setCategoryScoped(null);
    if (categoryFetchKey === "") {
      setIsCategoryLoading(false);
      return;
    }
    setIsCategoryLoading(true);
    if (categoryFetchKey === null) return;

    let isMounted = true;
    const controller = new AbortController();
    fetchProducts(categoryFetchKey, undefined, { signal: controller.signal })
      .then((items) => isMounted && setCategoryScoped(items.filter(isProductPurchasable)))
      .catch(() => isMounted && setCategoryScoped(null))
      .finally(() => isMounted && setIsCategoryLoading(false));
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [categoryFetchKey]);

  useEffect(() => {
    setSearchScoped(null);
    if (!searchQuery) {
      setIsSearchLoading(false);
      return;
    }
    let isMounted = true;
    const controller = new AbortController();
    setIsSearchLoading(true);
    fetchProducts(undefined, searchQuery, { signal: controller.signal })
      .then((items) => isMounted && setSearchScoped(items.filter(isProductPurchasable)))
      .catch(() => isMounted && setSearchScoped(null))
      .finally(() => isMounted && setIsSearchLoading(false));
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    setBrandScoped(null);
    if (!brand) {
      setIsBrandLoading(false);
      return;
    }
    let isMounted = true;
    const controller = new AbortController();
    setIsBrandLoading(true);
    const brandSlug = brand.toLowerCase().replace(/\s+/g, "-");
    fetchProducts(undefined, undefined, { brand: brandSlug, signal: controller.signal })
      .then((items) => {
        if (!isMounted) return;
        const valid = items.filter(isProductPurchasable);
        setBrandScoped(valid.length > 0 ? valid : null);
      })
      .catch(() => isMounted && setBrandScoped(null))
      .finally(() => isMounted && setIsBrandLoading(false));
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [brand]);

  const scopedProducts = searchScoped || categoryScoped || brandScoped;
  const showSkeletons =
    isCategoryLoading || isSearchLoading || isBrandLoading || (!scopedProducts && isLoadingProducts);

  // Everything on this page before facets: route scope (category / brand / search) + within-search.
  const scopeProducts = useMemo(() => {
    let list = scopedProducts || products;
    // Server scoping failed → narrow the full catalogue to the category subtree client-side.
    if (categoryNode && !categoryScoped && !searchScoped) list = productsInCategory(categoryNode, list);
    if (brand) {
      const slug = brand.toLowerCase().replace(/\s+/g, "-");
      list = list.filter(
        (p) => p.brand_slug === slug || (p.brand || "").toLowerCase() === brand.toLowerCase(),
      );
    }
    if (searchQuery && !searchScoped) list = list.filter((p) => matchesQuery(p, searchQuery));
    if (withinQuery) list = list.filter((p) => matchesQuery(p, withinQuery));
    return list;
  }, [products, scopedProducts, categoryScoped, searchScoped, categoryNode, brand, searchQuery, withinQuery]);

  const maxPrice = useMemo(() => {
    const highest = scopeProducts.reduce((max, p) => Math.max(max, p.price || 0), 0);
    return Math.max(100, Math.ceil(highest / 100) * 100);
  }, [scopeProducts]);
  const priceRange: [number, number] = [
    Math.min(priceMin ?? 0, maxPrice),
    Math.min(Math.max(priceMax ?? maxPrice, priceMin ?? 0), maxPrice),
  ];
  const isPriceFiltered = priceMin !== null || priceMax !== null;

  // Facet options: the current node's children, or departments on /shop.
  const facetCategories = categoryNode ? categoryNode.children ?? [] : categoryTree;
  const selectedSubNodes = facetCategories.filter((node) => selectedSubs.includes(node.id));

  type Facet = "category" | "brand" | "offer" | "price";
  const applyFacets = (list: Product[], except?: Facet) => {
    let out = list;
    if (except !== "category" && selectedSubNodes.length > 0) {
      const ids = new Set(selectedSubNodes.flatMap((node) => productsInCategory(node, out)).map((p) => p.id));
      out = out.filter((p) => ids.has(p.id));
    }
    if (except !== "brand" && selectedBrands.length > 0) {
      out = out.filter((p) => p.brand && selectedBrands.includes(p.brand));
    }
    if (except !== "offer" && selectedOffers.length > 0) {
      out = out.filter((p) => {
        const type = dealTypeOf(p);
        return !!type && selectedOffers.includes(type);
      });
    }
    if (except !== "price" && isPriceFiltered) {
      out = out.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    }
    return out;
  };

  const filteredProducts = useMemo(() => {
    const sorted = [...applyFacets(scopeProducts)];
    switch (sortBy) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "best-sellers":
        sorted.sort((a, b) => (b.total_sales ?? 0) - (a.total_sales ?? 0));
        break;
      case "new-in":
        sorted.sort((a, b) => Date.parse(b.date_created ?? "") - Date.parse(a.date_created ?? "") || 0);
        break;
      case "top-rated":
        sorted.sort((a, b) => (b.average_rating ?? 0) - (a.average_rating ?? 0));
        break;
    }
    return sorted;
    // applyFacets reads the URL-derived selections listed below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeProducts, sortBy, searchParams, facetCategories]);

  // Each facet counts against every other active facet, not itself.
  const categoryOptions = useMemo(() => {
    const counts = buildCategoryCounts(facetCategories, applyFacets(scopeProducts, "category"));
    return facetCategories
      .map((node) => ({ node, count: counts.get(node.id) || 0 }))
      .filter(({ node, count }) => count > 0 || selectedSubs.includes(node.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeProducts, searchParams, facetCategories]);

  const brandOptions = useMemo(() => {
    const counts = new Map<string, number>();
    applyFacets(scopeProducts, "brand").forEach((p) => {
      if (p.brand) counts.set(p.brand, (counts.get(p.brand) || 0) + 1);
    });
    selectedBrands.forEach((b) => counts.has(b) || counts.set(b, 0));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeProducts, searchParams, facetCategories]);

  const offerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    applyFacets(scopeProducts, "offer").forEach((p) => {
      const type = dealTypeOf(p);
      if (type) counts.set(type, (counts.get(type) || 0) + 1);
    });
    selectedOffers.forEach((t) => counts.has(t) || counts.set(t, 0));
    return [...counts.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeProducts, searchParams, facetCategories]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageProducts = filteredProducts.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const goToPage = (page: number) => {
    updateParams({ page: page > 1 ? String(page) : null });
    resultsRef.current?.scrollIntoView({ block: "start" });
  };

  // ── Price draft (inputs + slider) committed to the URL once settled ──
  const [priceDraft, setPriceDraft] = useState<[number, number]>(priceRange);
  useEffect(() => {
    setPriceDraft(priceRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange[0], priceRange[1]]);

  useEffect(() => {
    if (priceDraft[0] === priceRange[0] && priceDraft[1] === priceRange[1]) return;
    const timer = setTimeout(() => {
      const [min, max] = priceDraft;
      updateParams({
        price_min: min > 0 ? String(min) : null,
        price_max: max < maxPrice ? String(max) : null,
      });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceDraft]);

  const setDraftBound = (index: 0 | 1, raw: string) => {
    const value = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    const safe = Number.isFinite(value) ? Math.min(Math.max(value, 0), maxPrice) : index === 0 ? 0 : maxPrice;
    setPriceDraft((prev) =>
      index === 0 ? [Math.min(safe, prev[1]), prev[1]] : [prev[0], Math.max(safe, prev[0])],
    );
  };

  // ── Page copy ──
  const title = brand
    ? `${brand} products`
    : categoryNode
      ? categoryNode.label
      : categoryParam
        ? categoryParam.replace(/-/g, " ")
        : searchQuery
          ? `Results for “${searchQuery}”`
          : "All products";

  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | Belims`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  const crumbs: ArchiveCrumb[] = [
    { label: "Home", to: "/" },
    { label: "Shop", to: "/shop" },
    ...(brand ? [{ label: brand }] : []),
    ...categoryPath.map((node) => ({ label: node.label, to: `/shop/${encodeURIComponent(node.id)}` })),
    ...(!categoryPath.length && categoryParam ? [{ label: title }] : []),
    ...(searchQuery && !brand && !categoryParam ? [{ label: "Search" }] : []),
  ];

  const isAllProducts = !categoryParam && !brand && !searchQuery;
  const discovery: ArchiveDiscoveryItem[] = useMemo(() => {
    if (searchQuery) return [];
    const source = categoryNode ? categoryNode.children ?? [] : categoryTree;
    const counts = buildCategoryCounts(source, scopeProducts);
    return source
      .map((node) => ({
        id: node.id,
        label: node.label,
        count: counts.get(node.id) || 0,
        image: productsInCategory(node, scopeProducts).find((p) => p.image)?.image,
      }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [categoryNode, categoryTree, scopeProducts, searchQuery]);

  const dealTypes = [...new Set(scopeProducts.map(dealTypeOf).filter(Boolean))] as string[];
  const dealCount = scopeProducts.filter((p) => dealTypeOf(p)).length;
  const brandCount = new Set(scopeProducts.map((p) => p.brand).filter(Boolean)).size;
  const countText = `${filteredProducts.length} ${filteredProducts.length === 1 ? "product" : "products"}`;

  // ── Active filter chips ──
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...selectedSubNodes.map((node) => ({
      key: `sub-${node.id}`,
      label: node.label,
      onRemove: () => toggleListParam("sub", node.id),
    })),
    ...selectedBrands.map((b) => ({
      key: `brand-${b}`,
      label: b,
      onRemove: () => toggleListParam("brands", b),
    })),
    ...selectedOffers.map((t) => ({
      key: `offer-${t}`,
      label: OFFER_LABELS[t] || t,
      onRemove: () => toggleListParam("offer", t),
    })),
    ...(isPriceFiltered
      ? [{
          key: "price",
          label: `${formatCurrency(priceRange[0])} – ${formatCurrency(priceRange[1])}`,
          onRemove: () => updateParams({ price_min: null, price_max: null }),
        }]
      : []),
    ...(withinQuery
      ? [{ key: "q", label: `“${withinQuery}”`, onRemove: () => updateParams({ q: null }) }]
      : []),
  ];

  const clearAllFilters = () =>
    updateParams({ sub: null, brands: null, offer: null, price_min: null, price_max: null, q: null });

  // ── Sidebar / drawer ──
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    category: true,
    price: true,
    offers: true,
    brand: true,
  });
  const toggleSection = (key: string) => setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileFiltersOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileFiltersOpen]);

  const renderFilterContent = (idPrefix: string) => {
    const visibleCategories = showAllCategories ? categoryOptions : categoryOptions.slice(0, 8);
    const pct = (value: number) => (value / maxPrice) * 100;
    return (
      <div className={idPrefix === "side" ? "border-t-4 border-belims-blue" : ""}>
        {categoryOptions.length > 0 && (
          <FacetSection
            id={`${idPrefix}-category`}
            title={categoryNode ? "Category" : "Department"}
            selectedCount={selectedSubNodes.length}
            open={openSections.category}
            onToggle={() => toggleSection("category")}
          >
            <ul>
              {visibleCategories.map(({ node, count }) => (
                <FacetCheckbox
                  key={node.id}
                  id={`${idPrefix}-cat-${node.id}`}
                  label={node.label}
                  count={count}
                  checked={selectedSubs.includes(node.id)}
                  onChange={() => toggleListParam("sub", node.id)}
                  round
                />
              ))}
            </ul>
            {categoryOptions.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((v) => !v)}
                className="mt-2 text-sm font-semibold text-belims-blue underline-offset-4 hover:underline"
              >
                {showAllCategories ? "Show fewer" : `Show all ${categoryOptions.length}`}
              </button>
            )}
          </FacetSection>
        )}

        <FacetSection
          id={`${idPrefix}-price`}
          title="Price"
          selectedCount={isPriceFiltered ? 1 : 0}
          open={openSections.price}
          onToggle={() => toggleSection("price")}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            {([0, 1] as const).map((index) => (
              <React.Fragment key={index}>
                {index === 1 && <span className="pb-3 text-text-secondary" aria-hidden="true">–</span>}
                <div className="min-w-0">
                  <label htmlFor={`${idPrefix}-price-${index}`} className="mb-1.5 block text-sm font-semibold text-text-secondary">
                    {index === 0 ? "Min (R)" : "Max (R)"}
                  </label>
                  <input
                    id={`${idPrefix}-price-${index}`}
                    type="text"
                    inputMode="numeric"
                    value={priceDraft[index]}
                    onChange={(e) => setDraftBound(index, e.target.value)}
                    className="h-12 w-full rounded-md border-2 border-border px-3 text-lg text-text focus:border-belims-blue focus:outline-none md:text-base"
                  />
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="relative mt-4 flex h-6 items-center">
            <div className="absolute h-1 w-full rounded-xs bg-border" />
            <div
              className="absolute h-1 rounded-xs bg-belims-blue"
              style={{ left: `${pct(priceDraft[0])}%`, width: `${Math.max(0, pct(priceDraft[1]) - pct(priceDraft[0]))}%` }}
            />
            {([0, 1] as const).map((index) => (
              <input
                key={index}
                type="range"
                min={0}
                max={maxPrice}
                step={10}
                value={priceDraft[index]}
                aria-label={index === 0 ? "Minimum price" : "Maximum price"}
                onChange={(e) => setDraftBound(index, e.target.value)}
                className="archive-range absolute w-full appearance-none bg-transparent"
              />
            ))}
          </div>
          <p className="mt-2 text-sm text-text-tertiary">Up to {formatCurrency(maxPrice)}</p>
        </FacetSection>

        {offerOptions.length > 0 && (
          <FacetSection
            id={`${idPrefix}-offers`}
            title="Offers"
            selectedCount={selectedOffers.length}
            open={openSections.offers}
            onToggle={() => toggleSection("offers")}
          >
            <ul>
              {offerOptions.map(([type, count]) => (
                <FacetCheckbox
                  key={type}
                  id={`${idPrefix}-offer-${type}`}
                  label={OFFER_LABELS[type] || type}
                  count={count}
                  checked={selectedOffers.includes(type)}
                  onChange={() => toggleListParam("offer", type)}
                />
              ))}
            </ul>
          </FacetSection>
        )}

        {!brand && brandOptions.length > 0 && (
          <FacetSection
            id={`${idPrefix}-brand`}
            title="Brand"
            selectedCount={selectedBrands.length}
            open={openSections.brand}
            onToggle={() => toggleSection("brand")}
          >
            <ul className="no-scrollbar max-h-60 overflow-y-auto">
              {brandOptions.map(([name, count]) => (
                <FacetCheckbox
                  key={name}
                  id={`${idPrefix}-brand-${name}`}
                  label={name}
                  count={count}
                  checked={selectedBrands.includes(name)}
                  onChange={() => toggleListParam("brands", name)}
                />
              ))}
            </ul>
          </FacetSection>
        )}
      </div>
    );
  };

  const toolbarButton = (active: boolean) =>
    `grid h-10 w-10 place-items-center transition-colors ${
      active ? "bg-belims-blue text-white" : "bg-white text-text-secondary hover:text-belims-blue"
    }`;

  return (
    <div className="min-h-screen bg-white">
      <ArchiveHero
        variant={isAllProducts ? "banner" : "compact"}
        title={title}
        crumbs={crumbs}
        countText={countText}
        eyebrow={isAllProducts ? "Shop" : undefined}
        description={
          isAllProducts
            ? "Tools, fasteners, paint and hardware for site and home — delivered, or ready to collect in store."
            : undefined
        }
        brandCount={brandCount}
        dealCount={dealCount}
        dealsHref={dealTypes.length ? `/shop?offer=${dealTypes.join(LIST_SEPARATOR)}` : undefined}
        discovery={discovery}
        discoveryLabel={categoryNode ? "Subcategories" : "Departments"}
        withinSearch={
          isAllProducts
            ? undefined
            : {
                value: withinQuery,
                placeholder: `Search in ${categoryNode?.label || brand || "these results"}`,
                onSubmit: (value) => updateParams({ q: value || null }),
              }
        }
      />

      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="flex items-start gap-8">
          <aside className="sticky top-28 hidden w-64 shrink-0 lg:block xl:w-72" aria-label="Filters">
            {renderFilterContent("side")}
          </aside>

          <main className="min-w-0 flex-1" ref={resultsRef} id="archive-results">
            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-border-strong px-3.5 font-heading font-condensed text-button font-bold uppercase text-belims-blue lg:hidden"
                >
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  Filter{chips.length > 0 && ` (${chips.length})`}
                </button>
                <p className="text-base text-text-secondary" aria-live="polite">
                  {showSkeletons ? "Loading products…" : countText}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <h2 className="sr-only">Products</h2>
                <label htmlFor="archive-sort" className="hidden text-sm font-semibold text-text-secondary sm:block">
                  Sort by
                </label>
                <div className="relative">
                  <select
                    id="archive-sort"
                    value={sortBy}
                    onChange={(e) =>
                      updateParams({ sort: e.target.value === "recommended" ? null : e.target.value })
                    }
                    className="h-10 cursor-pointer appearance-none rounded-md border-2 border-border bg-white pl-3 pr-8 text-lg text-text focus:border-belims-blue focus:outline-none md:text-base"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary"
                  />
                </div>
                <div className="hidden overflow-hidden rounded-md border border-border-strong sm:flex" role="group" aria-label="View">
                  <button
                    type="button"
                    onClick={() => updateParams({ view: null }, { keepPage: true })}
                    className={toolbarButton(viewMode === "grid")}
                    aria-pressed={viewMode === "grid"}
                    aria-label="Grid view"
                  >
                    <LayoutGrid size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParams({ view: "list" }, { keepPage: true })}
                    className={`${toolbarButton(viewMode === "list")} border-l border-border-strong`}
                    aria-pressed={viewMode === "list"}
                    aria-label="List view"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove filter ${chip.label}`}
                    className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-border bg-surface-muted pl-3.5 pr-2.5 text-sm font-semibold text-text transition-colors hover:border-belims-blue"
                  >
                    {chip.label}
                    <X size={14} aria-hidden="true" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="px-2 text-sm font-semibold text-text underline underline-offset-4 hover:text-primary"
                >
                  Clear all
                </button>
              </div>
            )}

            {showSkeletons ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <SkeletonProductCard key={`archive-skel-${index}`} className="rounded-md border border-border bg-white p-4" />
                ))}
              </div>
            ) : pageProducts.length > 0 ? (
              <div
                className={`grid ${
                  viewMode === "list"
                    ? "grid-cols-1 gap-4"
                    : "grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4"
                }`}
              >
                {pageProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={onBuyNow}
                    onCompare={onCompare}
                    className="h-full w-full"
                    isAuthenticated={isAuthenticated}
                    isTradeApproved={isTradeApproved}
                    customizations={PRODUCT_CARD_PRESETS.archiveCard}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border px-6 py-16 text-center">
                <Search size={40} className="mx-auto mb-3 text-text-tertiary" aria-hidden="true" />
                <h2 className="font-heading font-condensed text-h4 font-bold uppercase text-text">No products found</h2>
                <p className="mx-auto mb-5 mt-1 max-w-sm text-base text-text-secondary">
                  Try removing a filter or searching for something else.
                </p>
                {chips.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="h-11 rounded-md bg-primary px-5 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-belims-blue"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!showSkeletons && totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="grid h-10 w-10 place-items-center rounded-md border border-border-strong text-belims-blue disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>
                {pageList(currentPage, totalPages).map((item, i) =>
                  item === "gap" ? (
                    <span key={`gap-${i}`} className="px-1 text-text-tertiary" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => goToPage(item)}
                      aria-current={item === currentPage ? "page" : undefined}
                      aria-label={`Page ${item}`}
                      className={`h-10 min-w-[40px] rounded-md border px-2 text-base font-bold ${
                        item === currentPage
                          ? "border-belims-blue bg-belims-blue text-white"
                          : "border-border-strong text-text hover:border-belims-blue"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="grid h-10 w-10 place-items-center rounded-md border border-border-strong text-belims-blue disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            )}
          </main>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[1300] flex justify-start bg-black/50"
          onClick={() => setMobileFiltersOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-filter-title"
            className="flex h-full w-full max-w-sm flex-col bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex min-h-16 items-center justify-between bg-belims-blue px-5 py-4 text-white sm:px-6">
              <h2 id="archive-filter-title" className="font-heading font-condensed text-h4 font-extrabold uppercase">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-md transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close filters"
              >
                <X size={28} strokeWidth={2.5} />
              </button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 sm:px-6">{renderFilterContent("drawer")}</div>
            <div className="grid grid-cols-[auto_1fr] gap-3 border-t border-border bg-white p-4 sm:p-5">
              <button
                type="button"
                onClick={clearAllFilters}
                disabled={chips.length === 0}
                className="min-h-12 rounded-md border-2 border-belims-blue px-4 font-heading font-condensed text-button font-bold uppercase text-belims-blue transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="min-h-12 rounded-md bg-primary px-4 font-heading font-condensed text-button font-bold uppercase text-white transition-colors hover:bg-belims-blue"
              >
                Show {filteredProducts.length.toLocaleString()} {filteredProducts.length === 1 ? "result" : "results"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .archive-range { pointer-events: none; }
        .archive-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; pointer-events: auto; cursor: pointer;
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--color-belims-blue); background: #fff;
        }
        .archive-range::-moz-range-thumb {
          pointer-events: auto; cursor: pointer;
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--color-belims-blue); background: #fff;
        }
      `}</style>
    </div>
  );
};
