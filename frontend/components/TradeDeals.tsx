import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { ProductCard, PRODUCT_CARD_PRESETS } from "./ProductCard";

interface TradeDealsProps {
  products: Product[];
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const TradeDeals: React.FC<TradeDealsProps> = ({
  products,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const navigate = useNavigate();

  const handToolsProducts = useMemo(() => {
    return products
      .filter(
        (product) =>
          product.category?.trim().toLowerCase() === "hand tools" ||
          product.category?.trim().toLowerCase().includes("hand tools"),
      )
      .slice(0, 6);
  }, [products]);

  const topRowProducts = handToolsProducts.slice(0, 3);
  const bottomRowProducts = handToolsProducts.slice(3, 6);

  return (
    <section className="py-14 bg-white" aria-label="Hand tools">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-[560px_minmax(0,1fr)] gap-5">
          <div className="hidden lg:block lg:row-span-2 rounded-xl overflow-hidden relative group min-h-[380px]">
            <img
              src="/images/development/midsection-worker-using-circular-saw-workshop.webp"
              alt="Hand tools"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-[0.82]"
            />
            <div className="absolute inset-0 p-6 flex flex-col justify-center items-start text-left">
              <h3 className="text-white text-3xl font-bold font-heading">
                Hand Tools
              </h3>
              <p className="mt-3 text-base font-semibold text-white/90 max-w-[260px]">
                Built for daily use on site and at home—shop dependable hand
                tools for every project.
              </p>
              <button
                type="button"
                onClick={() => navigate("/shop/hand-tools")}
                className="group relative mt-auto h-12 w-full overflow-hidden rounded-pill bg-white text-gray-900 transition-colors"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-gray-900 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                <span className="relative z-10 font-heading font-bold transition-colors group-hover:text-white">
                  Shop Hand Tools
                </span>
              </button>
            </div>
          </div>

          {handToolsProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-5 lg:hidden">
                {handToolsProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={onBuyNow}
                    onCompare={onCompare}
                    isAuthenticated={isAuthenticated}
                    isTradeApproved={isTradeApproved}
                    className="h-full"
                    customizations={PRODUCT_CARD_PRESETS.compactCard}
                  />
                ))}
              </div>

              <div className="hidden lg:grid lg:grid-cols-3 gap-5 lg:col-start-2">
                {topRowProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={onBuyNow}
                    onCompare={onCompare}
                    isAuthenticated={isAuthenticated}
                    isTradeApproved={isTradeApproved}
                    className="h-full"
                    customizations={PRODUCT_CARD_PRESETS.compactCard}
                  />
                ))}
              </div>

              <div className="hidden lg:grid lg:grid-cols-3 gap-5 lg:col-start-2">
                {bottomRowProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    addToCart={addToCart}
                    onBuyNow={onBuyNow}
                    onCompare={onCompare}
                    isAuthenticated={isAuthenticated}
                    isTradeApproved={isTradeApproved}
                    className="h-full"
                    customizations={PRODUCT_CARD_PRESETS.compactCard}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="lg:col-start-2 text-center py-12 text-gray-500 bg-white rounded-xl border border-black/10">
              <p>No hand tools products currently.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
