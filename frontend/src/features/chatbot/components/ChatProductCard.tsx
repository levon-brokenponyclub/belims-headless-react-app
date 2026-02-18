import React from "react";
import { Product } from "../types";
import { formatCurrency } from "../../../../utils/price";

interface ChatProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    rating?: number;
    eta?: string | { etaLabel: string };
    stock?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | boolean;
  };
  type: string;
  onAddToCart: (product: any) => void;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({
  product,
  type,
  onAddToCart,
}) => {
  const badgeColor =
    {
      Good: "bg-green-100 text-green-800",
      Better: "bg-blue-100 text-blue-800",
      Best: "bg-purple-100 text-purple-800",
    }[type] || "bg-gray-100 text-gray-800";

  return (
    <div className="border rounded-lg p-3 w-48 flex-shrink-0 bg-white shadow-sm mr-2 flex flex-col">
      <div
        className={`text-xs font-bold uppercase mb-1 px-2 py-0.5 rounded-full w-max ${badgeColor}`}
      >
        {type}
      </div>
      <div className="w-full h-24 bg-gray-50 mb-2 flex items-center justify-center text-gray-400">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="text-xs">No Image</span>
        )}
      </div>
      <h4 className="text-sm font-semibold line-clamp-2 min-h-[2.5em]">
        {product.name}
      </h4>
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="font-bold text-gray-900">
          {formatCurrency(product.price)}
        </span>
        <button
          onClick={() => onAddToCart(product)}
          className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 transition"
        >
          Add
        </button>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        {typeof product.stock === "string"
          ? product.stock.replace("_", " ")
          : product.stock
            ? "In Stock"
            : "Out of Stock"}
      </div>
    </div>
  );
};
