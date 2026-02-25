import React from "react";
import {
  X,
  Check,
  Minus,
  ShoppingCart,
  Trash2,
  Scale,
  Loader2,
} from "lucide-react";
import { Product } from "../types";
import { formatCurrency } from "../utils/price";

interface ComparisonModalProps {
  products: Product[];
  onClose: () => void;
  onRemove: (id: string) => void;
  addToCart: (product: Product) => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  products,
  onClose,
  onRemove,
  addToCart,
}) => {
  const [addingProductId, setAddingProductId] = React.useState<string | null>(
    null,
  );
  const BUTTON_SPINNER_MIN_MS = 450;

  const handleAddToCart = (product: Product) => {
    if (addingProductId === product.id) return;

    setAddingProductId(product.id);
    const startedAt = Date.now();

    try {
      addToCart(product);
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, BUTTON_SPINNER_MIN_MS - elapsed);

      window.setTimeout(() => {
        setAddingProductId((current) =>
          current === product.id ? null : current,
        );
      }, remaining);
    }
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <Scale className="text-belims-blue" />
            <h2 className="text-xl font-bold font-heading text-gray-800">
              Compare Products ({products.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-auto flex-1 p-6 bg-white">
          <div className="min-w-max">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-48 p-4 bg-gray-50 sticky left-0 z-20 border-b border-r border-gray-200 font-bold text-gray-600">
                    Product Details
                  </th>
                  {products.map((p) => (
                    <th
                      key={p.id}
                      className="w-64 p-4 align-top border-b border-r border-gray-200 relative group bg-white min-w-[250px]"
                    >
                      <button
                        onClick={() => onRemove(p.id)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        title="Remove from comparison"
                      >
                        <Trash2 size={18} />
                      </button>
                      <div className="h-40 flex items-center justify-center mb-4 p-2">
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2 line-clamp-2 h-10 leading-snug">
                        {p.name}
                      </h3>
                      <div className="text-xl font-bold text-belims-blue font-heading mb-4">
                        {formatCurrency(p.price)}
                      </div>
                      <button
                        onClick={() => handleAddToCart(p)}
                        disabled={addingProductId === p.id}
                        className="w-full bg-belims-blue text-white py-2 rounded font-bold text-sm hover:bg-belims-light flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {addingProductId === p.id ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={16} /> Add to Cart
                          </>
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-200">
                {/* Brand */}
                <tr>
                  <td className="p-4 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r">
                    Brand
                  </td>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 border-r text-center font-medium"
                    >
                      {p.brand || "-"}
                    </td>
                  ))}
                </tr>
                {/* Rating */}
                <tr>
                  <td className="p-4 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r">
                    Rating
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-yellow-500">
                          {p.rating}
                        </span>
                        <span className="text-gray-400 text-xs">
                          ({p.reviews})
                        </span>
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Category */}
                <tr>
                  <td className="p-4 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r">
                    Category
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r text-center">
                      {p.category}
                    </td>
                  ))}
                </tr>
                {/* Features */}
                <tr>
                  <td className="p-4 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r">
                    Key Features
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r align-top">
                      {p.features && p.features.length > 0 ? (
                        <ul className="list-disc list-inside text-xs space-y-1.5 text-gray-600 text-left">
                          {p.features.slice(0, 3).map((f, i) => (
                            <li key={i} className="leading-tight">
                              {f}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          No features listed
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Stock */}
                <tr>
                  <td className="p-4 font-bold text-gray-600 sticky left-0 bg-gray-50 z-10 border-r">
                    Availability
                  </td>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 border-r text-center">
                      {p.stock > 0 ? (
                        <span className="text-green-600 font-bold flex items-center justify-center gap-1 text-xs uppercase tracking-wide">
                          <Check size={14} /> In Stock
                        </span>
                      ) : (
                        <span className="text-red-500 font-bold flex items-center justify-center gap-1 text-xs uppercase tracking-wide">
                          <Minus size={14} /> Out of Stock
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-belims-blue font-bold text-sm"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
};
