import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
  Scale,
  X,
} from "lucide-react";
import { CategoryNode, Product } from "../types";
import { formatCurrency } from "../utils/price";
import { initializeCategoryTree } from "../categoryTree";

interface SearchCategoryResult {
  id: string;
  label: string;
  fullPath: string;
}

const flattenCategoryTree = (
  nodes: CategoryNode[],
  parentPath = "",
): SearchCategoryResult[] => {
  return nodes.flatMap((node) => {
    const fullPath = parentPath ? `${parentPath} / ${node.label}` : node.label;
    const current: SearchCategoryResult = {
      id: node.id,
      label: node.label,
      fullPath,
    };

    if (!node.children || node.children.length === 0) {
      return [current];
    }

    return [current, ...flattenCategoryTree(node.children, fullPath)];
  });
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCompare?: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onCompare,
}) => {
  const navigate = useNavigate();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    categories: SearchCategoryResult[];
    products: Product[];
  } | null>(null);
  const [activeSearchTab, setActiveSearchTab] = useState<
    "products" | "categories"
  >("products");
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [searchCategory, setSearchCategory] = useState("All Departments");
  const [isSearchCategoryDropdownOpen, setIsSearchCategoryDropdownOpen] =
    useState(false);

  const flatCategoryList = useMemo(
    () => flattenCategoryTree(categoryTree),
    [categoryTree],
  );

  useEffect(() => {
    if (!isOpen) return;

    const loadCategories = async () => {
      const tree = await initializeCategoryTree();
      setCategoryTree(tree);
    };
    loadCategories();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (searchQuery.length > 1) {
      const lowerQuery = searchQuery.toLowerCase();

      const matchedCats = flatCategoryList.filter(
        (cat) =>
          cat.label.toLowerCase().includes(lowerQuery) ||
          cat.fullPath.toLowerCase().includes(lowerQuery),
      );
      const matchedProds = products.filter(
        (p) =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery),
      );
      setSearchResults({ categories: matchedCats, products: matchedProds });
      if (matchedProds.length === 0 && matchedCats.length > 0) {
        setActiveSearchTab("categories");
      } else if (matchedProds.length > 0 && matchedCats.length === 0) {
        setActiveSearchTab("products");
      }
    } else {
      setSearchResults(null);
    }
  }, [searchQuery, flatCategoryList, products, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      setIsOpening(true);
      const rafId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsOpening(false));
      });

      return () => window.cancelAnimationFrame(rafId);
    }

    if (!shouldRender) return;

    setIsOpening(false);
    setIsClosing(true);
    const timer = setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      setSearchQuery("");
      setSearchResults(null);
      setIsSearchCategoryDropdownOpen(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, shouldRender]);

  const handleProductSelect = (product: Product) => {
    navigate(`/product/${product.id}`);
    onClose();
  };

  const handleSearchSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      onClose();
    }
  };

  const handleCategorySelect = (category: string) => {
    navigate(`/shop/${encodeURIComponent(category)}`);
    onClose();
  };

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen && !isClosing ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        data-state={isOpen && !isClosing ? "open" : "closed"}
        className={`group lg:hidden fixed bottom-0 left-0 right-0 z-[1000] bg-white rounded-t-3xl flex flex-col items-center mx-auto max-w-4xl border-t border-x border-slate-100 shadow-2xl h-[80vh] overflow-hidden gap-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen && !isClosing ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-full h-9 flex items-center justify-center px-0 rounded-t-3xl hover:bg-slate-50 transition-colors"
          aria-label="Close search"
        >
          <span className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </button>

        <div className="w-full px-0 pb-0 h-full flex flex-col gap-0 overflow-y-auto">
          <div className="px-4 mt-6 mb-4 flex-shrink-0 sticky top-0 bg-white z-10 pt-2">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white border rounded-full border-gray-200 overflow-hidden"
            >
              <div className="relative h-full hidden sm:block">
                <button
                  type="button"
                  onClick={() =>
                    setIsSearchCategoryDropdownOpen(
                      !isSearchCategoryDropdownOpen,
                    )
                  }
                  className="h-full py-3 pl-4 pr-3 text-gray-700 text-[12px] font-bold border-r border-gray-200 flex items-center gap-2 hover:bg-gray-50 bg-gray-50 transition-colors uppercase tracking-tight"
                  style={{ minWidth: "150px" }}
                >
                  <span className="truncate max-w-[100px]">
                    {searchCategory}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-gray-400 ${
                      isSearchCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSearchCategoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSearchCategoryDropdownOpen(false)}
                    />
                    <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white rounded-xl border border-gray-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 pb-2 mb-2 border-b border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          Shop by Category
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCategory("All Departments");
                          setIsSearchCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                          searchCategory === "All Departments"
                            ? "bg-belims-blue text-white"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        All Departments
                        <ChevronRight
                          size={14}
                          className={
                            searchCategory === "All Departments"
                              ? "text-white/50"
                              : "text-gray-300 group-hover:text-belims-blue"
                          }
                        />
                      </button>
                      {categoryTree.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSearchCategory(cat.label);
                            setIsSearchCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                            searchCategory === cat.label
                              ? "bg-belims-blue text-white"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {cat.label}
                          <ChevronRight
                            size={14}
                            className={
                              searchCategory === cat.label
                                ? "text-white/50"
                                : "text-gray-300 group-hover:text-belims-blue"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                type="text"
                placeholder="Search everything at Belims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchCategoryDropdownOpen(false)}
                className="flex-1 py-3 px-4 text-black text-[16px] focus:outline-none font-medium placeholder:text-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="mr-2 bg-belims-blue p-2.5 rounded-full text-white hover:bg-belims-navy transition-all hover:scale-105 active:scale-95"
              >
                <Search size={18} />
              </button>
            </form>
          </div>

          {searchResults &&
            (searchResults.categories.length > 0 ||
              searchResults.products.length > 0) && (
              <div className="h-full flex flex-col gap-0 justify-between">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                    {searchResults.categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCategorySelect(c.label)}
                        className="px-4 py-2 bg-gray-100 rounded-full text-xs font-bold text-gray-700 whitespace-nowrap hover:bg-belims-blue hover:text-white transition-colors flex-shrink-0"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-400 mt-2">
                    {searchResults.products.length} results
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="p-0 pb-20">
                    {searchResults.products.length > 0 ? (
                      searchResults.products.map((p) => (
                        <div
                          key={p.id}
                          className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-4 items-center group"
                          onClick={() => handleProductSelect(p)}
                        >
                          <div className="w-12 h-12 bg-white rounded border border-gray-100 p-1 flex-shrink-0">
                            <img
                              src={p.image}
                              className="w-full h-full object-contain"
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 truncate font-heading group-hover:text-belims-blue mb-0.5">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {p.category}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-gray-900 whitespace-nowrap">
                            {formatCurrency(p.price)}
                          </div>

                          {onCompare && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompare(p);
                              }}
                              className="p-1.5 rounded-full hover:bg-belims-blue hover:text-white text-gray-300 transition-colors ml-1"
                              title="Compare"
                            >
                              <span className="sr-only">Compare</span>
                              <Scale size={16} />
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-12 text-sm text-gray-400 text-center flex flex-col items-center gap-2">
                        <Search size={24} className="opacity-20" />
                        <span>No products found matching "{searchQuery}"</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border-t text-center">
                  <button
                    onClick={() => handleSearchSubmit()}
                    className="mt-0 w-full rounded bg-belims-blue font-heading text-sm font-semibold text-white transition-colors hover:bg-red-600 h-11 flex items-center justify-center gap-1"
                  >
                    View all results <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-center p-4 h-full">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-belims-blue text-white px-6 py-5 flex items-center justify-between rounded-t-lg">
            <div className="flex items-center gap-3">
              <Search size={20} />
              <h2 className="font-bold font-heading text-base">Search</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-6 space-y-4">
            <form
              onSubmit={handleSearchSubmit}
              className="relative flex items-center bg-white rounded-full overflow-hidden transition-all border border-gray-200"
            >
              <div className="relative h-full hidden sm:block">
                <button
                  type="button"
                  onClick={() =>
                    setIsSearchCategoryDropdownOpen(
                      !isSearchCategoryDropdownOpen,
                    )
                  }
                  className="h-full py-3 pl-4 pr-3 text-gray-700 text-[12px] font-bold border-r border-gray-200 flex items-center gap-2 hover:bg-gray-50 bg-gray-50 transition-colors uppercase tracking-tight"
                  style={{ minWidth: "150px" }}
                >
                  <span className="truncate max-w-[100px]">
                    {searchCategory}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-gray-400 ${
                      isSearchCategoryDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isSearchCategoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSearchCategoryDropdownOpen(false)}
                    />
                    <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-white rounded-xl border border-gray-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 pb-2 mb-2 border-b border-gray-100">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                          Shop by Category
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchCategory("All Departments");
                          setIsSearchCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                          searchCategory === "All Departments"
                            ? "bg-belims-blue text-white"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        All Departments
                        <ChevronRight
                          size={14}
                          className={
                            searchCategory === "All Departments"
                              ? "text-white/50"
                              : "text-gray-300 group-hover:text-belims-blue"
                          }
                        />
                      </button>
                      {categoryTree.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSearchCategory(cat.label);
                            setIsSearchCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-5 py-2.5 text-sm transition-colors flex items-center justify-between group ${
                            searchCategory === cat.label
                              ? "bg-belims-blue text-white"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {cat.label}
                          <ChevronRight
                            size={14}
                            className={
                              searchCategory === cat.label
                                ? "text-white/50"
                                : "text-gray-300 group-hover:text-belims-blue"
                            }
                          />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input
                type="text"
                placeholder="Search everything at Belims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchCategoryDropdownOpen(false)}
                className="flex-1 py-3 px-4 text-black text-base focus:outline-none font-medium placeholder:text-gray-400"
                autoFocus
              />
              <button
                type="submit"
                className="mr-2 bg-belims-blue p-2.5 rounded-full text-white hover:bg-belims-navy transition-all hover:scale-105 active:scale-95"
              >
                <Search size={18} />
              </button>
            </form>

            {searchResults &&
              (searchResults.categories.length > 0 ||
                searchResults.products.length > 0) && (
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  {searchResults.categories.length > 0 && (
                    <div className="p-2 bg-gray-50">
                      <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 font-heading">
                        Categories
                      </h4>
                      {searchResults.categories.map((c) => (
                        <div
                          key={c.id}
                          className="px-2 py-1.5 hover:bg-white hover:text-belims-blue cursor-pointer rounded text-sm font-medium"
                          onClick={() => handleCategorySelect(c.label)}
                        >
                          <div className="flex items-center justify-between">
                            <span>{c.label}</span>
                            <ChevronRight size={12} className="text-gray-300" />
                          </div>
                          <div className="text-[11px] text-gray-500 font-normal truncate">
                            {c.fullPath}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults.products.length > 0 && (
                    <div className="p-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase px-2 mb-1 mt-1 font-heading">
                        Products
                      </h4>
                      {searchResults.products.map((p) => (
                        <div
                          key={p.id}
                          className="px-2 py-2 hover:bg-gray-50 cursor-pointer rounded flex gap-3 items-center group"
                          onClick={() => handleProductSelect(p)}
                        >
                          <img
                            src={p.image}
                            className="w-10 h-10 object-contain rounded bg-white border border-gray-100"
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate font-heading group-hover:text-belims-blue">
                              {p.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {p.category}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-belims-blue">
                            {formatCurrency(p.price)}
                          </div>

                          {onCompare && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCompare(p);
                              }}
                              className="p-1.5 rounded-full hover:bg-belims-blue hover:text-white text-gray-400 transition-colors ml-2"
                              title="Compare"
                            >
                              <span className="sr-only">Compare</span>
                              <Scale size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 bg-gray-50 border-t text-center">
                    <button
                      onClick={() => handleSearchSubmit()}
                      className="text-sm font-bold text-belims-blue hover:underline flex items-center justify-center gap-1 w-full"
                    >
                      View all results <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};
