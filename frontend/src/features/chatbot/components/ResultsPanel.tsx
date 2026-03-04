import React from "react";
import {
  ArrowUpDown,
  BadgePercent,
  Bot,
  CheckCircle2,
  Package,
  Search,
  SlidersHorizontal,
  Truck,
  Zap,
} from "lucide-react";
import {
  ActiveResults,
  ChatMessage,
  FulfillmentContext,
  Product,
  StockStatus,
} from "../types.ts";
import { ChatProductCard } from "./ChatProductCard";

interface ResultsPanelProps {
  activeResults: ActiveResults;
  isLoading: boolean;
  messages: ChatMessage[];
  onAddToCart: (productId: string) => void;
  onBuyNow: (productId: string) => void;
  onCheckStock: (productId: string) => void;
  onSuggestionSelect?: (prompt: string) => void;
  fulfillment: FulfillmentContext;
  onOpenDeliveryLocation: () => void;
  onOpenDeliveryOptions: () => void;
  focusedProduct?: Product;
  onFocusProduct?: (productId: string) => void;
}

const ResultsPanelSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`result-skel-${index}`}
          className="border border-gray-200 rounded-lg p-3 bg-white animate-pulse"
        >
          <div className="h-28 bg-gray-200 rounded mb-3" />
          <div className="h-4 bg-gray-200 rounded mb-2" />
          <div className="h-3 bg-gray-100 rounded w-2/3 mb-4" />
          <div className="h-8 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
};

const EmptyState: React.FC<{
  onSuggestionSelect?: (prompt: string) => void;
}> = ({ onSuggestionSelect }) => (
  <div className="h-full flex items-center justify-center p-6">
    <div className="max-w-lg text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-violet-100 text-violet-500 inline-flex items-center justify-center">
        <Bot size={34} strokeWidth={1.6} />
      </div>
      <h4 className="text-xl font-semibold text-gray-900 mb-2">
        Let’s find something great.
      </h4>
      <p className="text-sm text-gray-600">
        I can find products, compare options, track orders, and apply promotions
        in seconds.
      </p>
      <div className="mt-5 grid gap-2 text-left">
        <button
          type="button"
          onClick={() =>
            onSuggestionSelect?.("Find cordless drills under R2500")
          }
          className="w-full inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:-translate-y-0.5 hover:shadow-sm transition-all"
        >
          <Search size={16} className="text-violet-600" />
          Find cordless drills under R2500
        </button>
        <button
          type="button"
          onClick={() =>
            onSuggestionSelect?.("Show delivery options to postal code 8001")
          }
          className="w-full inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:-translate-y-0.5 hover:shadow-sm transition-all"
        >
          <Truck size={16} className="text-violet-600" />
          Show delivery options to postal code 8001
        </button>
        <button
          type="button"
          onClick={() =>
            onSuggestionSelect?.("Check Trade Accounts Programme status")
          }
          className="w-full inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:-translate-y-0.5 hover:shadow-sm transition-all"
        >
          <BadgePercent size={16} className="text-violet-600" />
          Check Trade Accounts Programme status
        </button>
      </div>
    </div>
  </div>
);

const StockBlock: React.FC<{ productId: string; status: StockStatus }> = ({
  productId,
  status,
}) => (
  <div className="p-4">
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-900 mb-1 inline-flex items-center gap-2">
        <Package size={15} className="text-violet-700" />
        Stock status
      </div>
      <div className="text-xs text-gray-600 mb-2">Product: {productId}</div>
      <div className="text-sm text-gray-800">
        {status.inStock
          ? `In stock${typeof status.qty === "number" ? ` (${status.qty} available)` : ""}`
          : "Out of stock"}
      </div>
      <div className="text-[11px] text-gray-500 mt-1">
        Updated: {status.updatedAt}
      </div>
    </div>
  </div>
);

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  activeResults,
  isLoading,
  messages,
  onAddToCart,
  onBuyNow,
  onCheckStock,
  onSuggestionSelect,
  fulfillment,
  onOpenDeliveryLocation,
  onOpenDeliveryOptions,
  focusedProduct,
  onFocusProduct,
}) => {
  const [sort, setSort] = React.useState("relevance");
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [needItFast, setNeedItFast] = React.useState(false);

  const latestUserMessage = React.useMemo(() => {
    const reversed = [...messages].reverse();
    return (
      reversed.find((message) => message.role === "user")?.content ??
      "latest query"
    );
  }, [messages]);

  const products = React.useMemo(() => {
    if (activeResults.kind !== "products") {
      return [] as Product[];
    }

    let filtered = inStockOnly
      ? activeResults.items.filter((item) => item.inStock !== false)
      : activeResults.items;

    if (needItFast && fulfillment.deliveryLocationSet) {
      filtered = filtered.filter(
        (item) =>
          item.deliveryEtaDays === undefined || item.deliveryEtaDays <= 3,
      );
      filtered = [...filtered].sort(
        (a, b) =>
          (a.deliveryEtaDays ?? Number.MAX_SAFE_INTEGER) -
          (b.deliveryEtaDays ?? Number.MAX_SAFE_INTEGER),
      );
    }

    if (sort === "price-asc") {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (sort === "price-desc") {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    if (sort === "rating") {
      return [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    const withFastestFlag = filtered.map((item, index) => ({
      ...item,
      isFastestOption: needItFast && index === 0,
    }));

    return withFastestFlag;
  }, [
    activeResults,
    fulfillment.deliveryLocationSet,
    inStockOnly,
    needItFast,
    sort,
  ]);

  return (
    <div className="h-full min-h-0 bg-gradient-to-b from-violet-50/40 to-white flex flex-col">
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/92 backdrop-blur-md px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-violet-100 text-violet-800 px-3 py-1 text-xs font-medium max-w-full">
            Results for:{" "}
            {activeResults.kind === "products"
              ? activeResults.query
              : latestUserMessage}
          </span>

          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 hover:-translate-y-0.5 transition-all"
            title="TODO: connect filters to backend"
          >
            <SlidersHorizontal size={14} />
            Filter
          </button>

          <div className="inline-flex items-center gap-1 text-xs border border-gray-200 rounded-full pl-2 pr-1 py-1 bg-white">
            <ArrowUpDown size={14} className="text-gray-500" />
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="text-xs bg-transparent border-none outline-none"
              aria-label="Sort results"
            >
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>

          <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-700">
            <CheckCircle2 size={14} className="text-green-600" />
            In Stock only
            <button
              type="button"
              onClick={() => setInStockOnly((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                inStockOnly ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  inStockOnly ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          <button
            type="button"
            onClick={onOpenDeliveryLocation}
            className="inline-flex items-center gap-1 text-xs border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50"
          >
            <Truck size={13} className="text-violet-700" />
            {fulfillment.deliveryLocationSet
              ? `Deliver to: ${fulfillment.deliveryAddress?.postalCode ?? "set"}`
              : "Deliver to: Add address"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!fulfillment.deliveryLocationSet) {
                onOpenDeliveryLocation();
                return;
              }
              setNeedItFast((prev) => !prev);
            }}
            title={
              fulfillment.deliveryLocationSet
                ? "Prioritize fastest delivery options"
                : "Add delivery address to see delivery speeds"
            }
            className={`inline-flex items-center gap-1 text-xs border rounded-full px-3 py-1 transition-colors ${
              fulfillment.deliveryLocationSet
                ? needItFast
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-gray-200 hover:bg-gray-50"
                : "border-gray-200 text-gray-400"
            }`}
            aria-disabled={!fulfillment.deliveryLocationSet}
          >
            <Zap size={13} />
            Need it fast?
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <ResultsPanelSkeleton />
        ) : activeResults.kind === "products" ? (
          <div>
            {products.length === 0 ? (
              <div className="p-6">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
                  <p className="font-semibold text-gray-900">
                    No matching products found
                  </p>
                  <p className="mt-1 text-gray-600">
                    Try a broader search term, remove filters, or ask for
                    alternatives.
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onSuggestionSelect?.("Show popular circular saws")
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    Show popular products
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 p-4">
                {products.map((product, index) => (
                  <div
                    key={product.id}
                    style={{
                      animation: "resultFadeIn 240ms ease-out",
                      animationDelay: `${index * 80}ms`,
                      animationFillMode: "both",
                    }}
                  >
                    <ChatProductCard
                      product={product}
                      variant="grid"
                      onAddToCart={onAddToCart}
                      onBuyNow={onBuyNow}
                      onCheckStock={onCheckStock}
                      highlight={Boolean(
                        product.isBestFit || focusedProduct?.id === product.id,
                      )}
                      deliveryLocationSet={fulfillment.deliveryLocationSet}
                      onRequestDeliveryAddress={
                        fulfillment.deliveryLocationSet
                          ? onOpenDeliveryOptions
                          : onOpenDeliveryLocation
                      }
                      onFocusProduct={onFocusProduct}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeResults.kind === "order" ? (
          <div className="p-4">
            <div className="bg-white border border-blue-200 border-l-[6px] rounded-2xl p-4 text-sm text-blue-900 shadow-sm">
              <div className="font-semibold">
                Order {activeResults.order.orderId}
              </div>
              <div>Status: {activeResults.order.status}</div>
              {activeResults.order.eta && (
                <div>ETA: {activeResults.order.eta}</div>
              )}
              {activeResults.order.trackingUrl && (
                <a
                  className="text-xs inline-flex items-center gap-1 underline"
                  href={activeResults.order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Truck size={12} />
                  Track shipment
                </a>
              )}
            </div>
          </div>
        ) : activeResults.kind === "promo" ? (
          <div className="p-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-800 shadow-sm">
              <div className="font-semibold">
                Promo {activeResults.promo.code}
              </div>
              <div className="text-lg font-bold mt-1">
                {activeResults.promo.discountText}
              </div>
              <div className="text-xs mt-1">
                Applied · {activeResults.promo.message}
              </div>
            </div>
          </div>
        ) : activeResults.kind === "stock" ? (
          <StockBlock
            productId={activeResults.productId}
            status={activeResults.status}
          />
        ) : activeResults.kind === "trade_account" ? (
          <div className="p-4">
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 text-sm text-violet-900">
              <div className="font-semibold">Trade Accounts Programme</div>
              <div>
                Status:{" "}
                {activeResults.tradeAccount.approved
                  ? "Approved"
                  : "Pending approval"}
              </div>
              {activeResults.tradeAccount.accountNumber && (
                <div>Account: {activeResults.tradeAccount.accountNumber}</div>
              )}
              {activeResults.tradeAccount.pricingSummary && (
                <div className="text-xs mt-1">
                  {activeResults.tradeAccount.pricingSummary}
                </div>
              )}
              {activeResults.tradeAccount.nextStep && (
                <div className="text-xs mt-1">
                  Next step: {activeResults.tradeAccount.nextStep}
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyState onSuggestionSelect={onSuggestionSelect} />
        )}
      </div>

      <style>
        {`@keyframes resultFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}
      </style>
    </div>
  );
};
