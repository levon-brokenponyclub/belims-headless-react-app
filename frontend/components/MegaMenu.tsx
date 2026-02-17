import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { CategoryNode, Product } from "../types";
import { CURRENCY_SYMBOL } from "../constants";

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
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      className="fixed left-0 right-0 w-full bg-surface border-b border-subtle z-[9999] animate-fadeIn"
      style={{ top: "201px" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="container mx-auto flex min-h-[500px]">
        {/* Left Column: Parent Categories */}
        <div className="w-1/5 bg-soft border-r border-subtle flex flex-col max-h-[600px]">
          <div className="flex-1 overflow-y-auto py-6">
            <div
              className="px-6 py-4 cursor-pointer font-bold text-lg flex justify-between items-center font-heading transition-colors text-ink hover:bg-gray-200 border-l-4 border-transparent"
              onClick={handleShopAll}
            >
              Shop All
            </div>
            {categoryTree.map((cat: CategoryNode) => {
              const isActive = activeMegaCategory?.id === cat.id;
              return (
                <div
                  key={cat.id}
                  className={`px-6 py-4 cursor-pointer font-bold text-lg flex justify-between items-center font-heading transition-colors ${
                    isActive
                      ? "bg-gray-200 text-ink border-l-4 border-gray-400"
                      : "hover:bg-gray-100 text-ink border-l-4 border-transparent"
                  }`}
                  onMouseEnter={() => setActiveMegaCategory(cat)}
                >
                  {cat.label}
                </div>
              );
            })}
            <div className="my-4 border-t border-subtle mx-6"></div>
            <div className="px-6 py-3 hover:text-brand cursor-pointer text-base font-bold text-ink">
              Contractor Deals
            </div>
            <div className="px-6 py-3 hover:text-brand cursor-pointer text-base font-bold text-ink">
              New Products
            </div>
          </div>
        </div>

        {/* Middle Columns: Child Categories */}
        <div className="w-2/5 p-8 bg-surface overflow-y-auto max-h-[600px]">
          {activeMegaCategory ? (
            <div className="animate-fadeIn">
              {activeMegaCategory.children &&
              activeMegaCategory.children.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                  {activeMegaCategory.children.map((section) => (
                    <div key={section.id} className="break-inside-avoid">
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(section.label)}
                          className="font-bold text-ink text-base hover:text-brand transition-colors"
                        >
                          {section.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCategorySelect(section.label)}
                          className="text-xs font-bold text-accent hover:underline"
                        >
                          →
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {section.children && section.children.length > 0 ? (
                          section.children.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() =>
                                handleCategorySelect(child.label)
                              }
                              className="text-sm text-muted hover:text-brand transition-all text-left block"
                            >
                              {child.label}
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleCategorySelect(section.label)
                            }
                            className="text-sm text-muted hover:text-brand text-left"
                          >
                            Shop {section.label}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-start justify-center h-64 text-muted">
                  <p className="text-lg font-bold text-ink">
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
            <p className="text-sm text-muted">
              Select a category to see subcategories.
            </p>
          )}
        </div>

        {/* Right Column: Trending Products */}
        <div className="w-2/5 p-8 bg-soft border-l border-subtle">
          <h4 className="font-bold text-xl text-ink font-heading mb-6">
            Trending Now
          </h4>
          <div className="grid grid-cols-2 gap-6">
            {products.slice(0, 2).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group cursor-pointer"
              >
                <div className="bg-canvas rounded-lg overflow-hidden border border-subtle hover:border-brand transition-colors mb-3">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <h5 className="font-bold text-sm text-ink hover:text-brand transition-colors line-clamp-2">
                  {product.name}
                </h5>
                <p className="text-sm text-brand font-bold mt-1">
                  {CURRENCY_SYMBOL}
                  {product.price}
                </p>
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="w-full mt-6 py-2 bg-brand text-white font-bold rounded-md hover:bg-brand/90 transition-colors"
          >
            View All Products
          </button>
        </div>
      </div>
    </div>
  );
};
