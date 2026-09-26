import React from "react";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";
import { CategoryNode, Product } from "../types";

interface MegaMenuProps {
  isOpen: boolean;
  categoryTree: CategoryNode[];
  activeMegaCategory: CategoryNode | null;
  setActiveMegaCategory: (category: CategoryNode | null) => void;
  handleShopAll: () => void;
  handleCategorySelect: (label: string) => void;
  products: Product[];
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export const MegaMenu: React.FC<MegaMenuProps> = ({
  isOpen,
  categoryTree,
  activeMegaCategory,
  setActiveMegaCategory,
  handleShopAll,
  handleCategorySelect,
  products,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [activeChildCategory, setActiveChildCategory] =
    React.useState<CategoryNode | null>(null);

  React.useEffect(() => {
    if (
      activeMegaCategory?.children &&
      activeMegaCategory.children.length > 0
    ) {
      setActiveChildCategory(activeMegaCategory.children[0]);
    } else {
      setActiveChildCategory(null);
    }
  }, [activeMegaCategory]);

  const saleProducts = React.useMemo(() => {
    return products
      .filter(
        (product) =>
          Boolean((product as any).onSale) ||
          Boolean(
            product.sale_price &&
            product.regular_price &&
            product.sale_price < product.regular_price,
          ) ||
          product.deals_resolved?.consumer?.bestDeal?.type === "sale",
      )
      .slice(0, 2);
  }, [products]);

  const displayProducts = React.useMemo(() => {
    if (saleProducts.length >= 2) return saleProducts.slice(0, 2);

    const saleIds = new Set(saleProducts.map((product) => product.id));
    const fallbackProducts = products
      .filter((product) => !saleIds.has(product.id))
      .slice(0, 2 - saleProducts.length);

    return [...saleProducts, ...fallbackProducts];
  }, [products, saleProducts]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute left-0 right-0 top-full w-full bg-surface border-b border-border z-[1200] animate-fadeIn shadow-pop"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="container mx-auto grid min-h-[500px]"
        style={{ gridTemplateColumns: "20% 20% 20% 40%" }}
      >
        {/* Left Column: Parent Categories */}
        <div className="bg-white border-r border-border flex flex-col max-h-[600px]">
          {/* <div className="px-5 py-4 border-b border-border">
            <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary">
              Shop by Category
            </span>
          </div> */}

          <div className="flex-1 overflow-y-auto py-3 px-3">
            <button
              type="button"
              className="w-full mb-3 px-4 py-2.5 rounded-pill text-left text-[15px] font-semibold font-heading bg-primary text-white hover:bg-primary/90 transition-colors"
              onClick={handleShopAll}
            >
              Shop All
            </button>

            {categoryTree.map((cat: CategoryNode) => {
              const isActive = activeMegaCategory?.id === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  className={`w-full px-4 py-2.5 rounded-md text-left text-[15px] font-semibold font-heading flex justify-between items-center transition-colors ${
                    isActive
                      ? "bg-surface-muted text-text"
                      : "hover:bg-surface-muted text-text"
                  }`}
                  onMouseEnter={() => setActiveMegaCategory(cat)}
                  onClick={() => handleCategorySelect(cat.label)}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Column 2: Child Categories of hovered parent */}
        <div className="p-6 bg-surface border-r border-border overflow-y-auto max-h-[600px]">
          {activeMegaCategory ? (
            <div className="animate-fadeIn">
              {activeMegaCategory.children &&
              activeMegaCategory.children.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <div className="px-2 pb-3 mb-3 border-b border-border">
                    <span className="font-heading text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                      {activeMegaCategory.label}
                    </span>
                  </div>

                  {activeMegaCategory.children.map((childCategory) => {
                    const isChildActive =
                      activeChildCategory?.id === childCategory.id;

                    return (
                      <button
                        type="button"
                        key={childCategory.id}
                        onMouseEnter={() =>
                          setActiveChildCategory(childCategory)
                        }
                        onClick={() =>
                          handleCategorySelect(childCategory.label)
                        }
                        className={`w-full px-4 py-2.5 rounded-md text-left text-[14px] font-semibold font-heading flex items-center justify-between transition-colors ${
                          isChildActive
                            ? "bg-surface-muted text-text"
                            : "text-text hover:bg-surface-muted"
                        }`}
                      >
                        <span className="truncate">{childCategory.label}</span>
                        <span className="text-xs font-bold text-text-secondary">→</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-center h-64 text-text-secondary">
                  <p className="text-lg font-bold text-text">
                    {activeMegaCategory.label}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCategorySelect(activeMegaCategory.label)
                    }
                    className="mt-4 btn-primary"
                  >
                    Shop Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-secondary"></p>
          )}
        </div>

        {/* Column 3: Flyout sibling + subcategory context */}
        <div className="p-6 bg-surface border-r border-border overflow-y-auto max-h-[600px]">
          {activeMegaCategory?.children &&
          activeMegaCategory.children.length > 0 ? (
            <div className="h-full animate-fadeIn">
              <div className="px-2 pb-3 mb-3 border-b border-border">
                <h4 className="font-heading text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                  {activeChildCategory?.label || "Subcategories"}
                </h4>
              </div>

              <div className="flex flex-col gap-1 mb-5">
                {/* {activeMegaCategory.children.map((sibling) => {
                  const isSiblingActive =
                    activeChildCategory?.id === sibling.id;
                  return (
                    <button
                      key={sibling.id}
                      type="button"
                      onMouseEnter={() => setActiveChildCategory(sibling)}
                      onClick={() => handleCategorySelect(sibling.label)}
                      className={`w-full px-4 py-3 rounded-md text-left font-bold text-sm font-heading flex items-center justify-between transition-colors ${
                        isSiblingActive
                          ? "bg-surface-muted text-text"
                          : "text-text hover:bg-surface-muted"
                      }`}
                    >
                      <span className="truncate">{sibling.label}</span>
                      <span className="text-xs font-bold text-text-secondary">→</span>
                    </button>
                  );
                })} */}
              </div>

              <div className="px-2">
                {/* <div className="text-[11px] font-black uppercase tracking-widest text-text-secondary mb-3">
                  {activeChildCategory?.label || "Subcategories"}
                </div> */}

                {activeChildCategory?.children &&
                activeChildCategory.children.length > 0 ? (
                  <div className="flex flex-col gap-y-3">
                    {activeChildCategory.children.map((subCategory) => (
                      <button
                        key={subCategory.id}
                        type="button"
                        onClick={() => handleCategorySelect(subCategory.label)}
                        className="text-[14px] text-text-secondary hover:text-primary text-left transition-colors w-full"
                      >
                        {subCategory.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      activeChildCategory &&
                      handleCategorySelect(activeChildCategory.label)
                    }
                    className="text-[14px] font-semibold text-primary hover:underline"
                  >
                    Shop{" "}
                    {activeChildCategory?.label || activeMegaCategory.label}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full p-6 flex items-center justify-center text-text-secondary"></div>
          )}
        </div>

        {/* Right Column: On Sale products */}
        <div className="p-6 bg-white overflow-y-auto max-h-[600px]">
          <div className="px-2 pb-3 mb-3 border-b border-border">
            <h4 className="font-heading text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
              On Sale
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {displayProducts.length > 0 ? (
              displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  addToCart={() => {}}
                  className="h-full"
                  customizations={PRODUCT_CARD_PRESETS.searchCard}
                />
              ))
            ) : (
              <div className="rounded-md border border-border bg-white p-4 text-sm text-text-secondary">
                No sale products currently.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
