import React from "react";
import { ChatMessage, Product } from "../types";
import { ChatProductCard } from "./ChatProductCard";

interface ChatMessageItemProps {
  message: ChatMessage;
  onAddToCart: (product: Product) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onAddToCart,
}) => {
  const isBot = message.sender === "bot";

  const getProductType = (index: number): "Good" | "Better" | "Best" => {
    switch (index) {
      case 0:
        return "Good";
      case 1:
        return "Better";
      case 2:
        return "Best";
      default:
        return "Good";
    }
  };

  return (
    <div
      className={`mb-4 flex flex-col ${isBot ? "items-start" : "items-end"}`}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
          isBot
            ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
            : "bg-red-600 text-white rounded-tr-none"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>

      {/* NEW: Render Cards (GBB & Project Kits) */}
      {isBot && message.cards && message.cards.length > 0 && (
        <div className="flex flex-col gap-4 w-full mt-2">
          {message.cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
            >
              <h4 className="font-bold text-sm mb-1">{card.title}</h4>
              <p className="text-xs text-gray-500 mb-2">{card.why}</p>

              {/* Product GBB Carousel */}
              {card.kind === "PRODUCT_GBB" && (
                <div className="flex overflow-x-auto gap-3 pb-2 px-1 snap-x scrollbar-hide">
                  {card.products.map((p) => (
                    <div key={p.id} className="snap-center flex-shrink-0">
                      <ChatProductCard
                        product={{
                          ...p,
                          stock: p.stock, // Ensure stock matches simplified type
                        }}
                        type={p.tier} // "GOOD" | "BETTER" | "BEST"
                        onAddToCart={(prod) =>
                          onAddToCart({
                            ...prod,
                            image: "",
                            eta: "",
                            sku: "",
                            inStock: true,
                            specs: {},
                            description: "",
                            category: "",
                            rating: 0,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Project Kit Tiers */}
              {card.kind === "PROJECT_KIT_TIERS" && (
                <div className="space-y-2">
                  {card.tiers.map((tier) => (
                    <div
                      key={tier.tier}
                      className="border rounded p-2 text-xs flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold block">{tier.tier} Kit</span>
                        <span className="text-gray-500">
                          {tier.items.length} items
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">
                          ${tier.totalPrice.toFixed(2)}
                        </span>
                        {tier.savingsLabel && (
                          <span className="text-green-600 text-[10px]">
                            {tier.savingsLabel}
                          </span>
                        )}
                      </div>
                      <button
                        className="ml-2 bg-gray-100 px-2 py-1 rounded text-red-600 font-bold hover:bg-gray-200"
                        onClick={() =>
                          onAddToCart({
                            id: `bundle-${tier.tier}`,
                            name: `${tier.tier} Kit`,
                            price: tier.totalPrice,
                            image: "",
                            sku: "",
                            inStock: true,
                            eta: "",
                            rating: 0,
                            category: "Kit",
                            specs: {},
                            description: "Bundle",
                          })
                        }
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legacy Product Carousel */}
      {isBot &&
        message.products &&
        message.products.length > 0 &&
        !message.cards && (
          <div className="flex overflow-x-auto gap-3 w-full pb-4 px-1 snap-x scrollbar-hide mt-2">
            {message.products.map((p, idx) => (
              <div key={p.id} className="snap-center flex-shrink-0">
                <ChatProductCard
                  product={p}
                  type={getProductType(idx)}
                  onAddToCart={onAddToCart}
                />
              </div>
            ))}
          </div>
        )}
    </div>
  );
};
