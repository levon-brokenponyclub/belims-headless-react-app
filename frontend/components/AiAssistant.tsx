import React, { useState } from "react";
import { Sparkles, X, ArrowRight, Loader2 } from "lucide-react";
import { getPersonalizedRecommendations } from "../services/geminiService";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";

interface AiAssistantProps {
  onClose: () => void;
  onNavigateToProduct: (product: Product) => void;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  onClose,
  onNavigateToProduct,
  addToCart,
  onBuyNow,
  onCompare,
  isAuthenticated = false,
  isTradeApproved = false,
}) => {
  const [projectDesc, setProjectDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmed = projectDesc.trim();
    if (!trimmed) {
      setError("Tell us a bit about your project to get recommendations.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const results = await getPersonalizedRecommendations("personal", trimmed);
      setRecommendations(results);
    } catch (err) {
      console.error("AI Assistant error:", err);
      setError("We could not generate recommendations right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl bg-[#f6f6f7] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-orange-500">
            <Sparkles className="h-4 w-4" />
            Gemini AI Analysis
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 py-10">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-heading">
            What are you working on?
          </h2>
          <p className="mt-3 text-lg text-gray-500">
            Describe your project. We will check stock and pricing instantly.
          </p>

          <div className="mt-8">
            <textarea
              value={projectDesc}
              onChange={(event) => setProjectDesc(event.target.value)}
              placeholder="E.g. I'm building a floating deck in the backyard, about 4x4 meters..."
              className="w-full min-h-[180px] md:min-h-[220px] rounded-3xl border-2 border-blue-600/80 bg-white px-6 py-5 text-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
            {error && (
              <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
            )}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <button
              onClick={onClose}
              className="text-gray-500 font-semibold hover:text-gray-900 transition"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-blue-600 px-10 py-4 text-white font-semibold text-lg shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate Recommendations
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="border-t border-gray-200 bg-white px-8 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="mt-3 text-sm">Finding the best matches...</p>
            </div>
          ) : recommendations.length > 0 ? (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                Recommended products
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendations.map((product) => (
                  <div
                    key={product.id}
                    className="transform hover:-translate-y-1 transition-transform duration-300"
                    onClick={() => onNavigateToProduct(product)}
                  >
                    <ProductCard
                      product={product}
                      addToCart={addToCart}
                      onBuyNow={onBuyNow}
                      onCompare={onCompare}
                      className="h-full border-none shadow-md hover:shadow-xl ring-1 ring-black/5"
                      isAuthenticated={isAuthenticated}
                      isTradeApproved={isTradeApproved}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Tell us about your project to see recommendations.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
