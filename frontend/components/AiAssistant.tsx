import React, { useState } from "react";
import { Sparkles, ArrowRight, Loader2, X } from "lucide-react";
import { getPersonalizedRecommendations } from "../services/geminiService";
import { Product } from "../types";
import { ProductCard } from "./ProductCard";
import { SkeletonProductCard } from "./Skeleton";

interface AiAssistantProps {
  products: Product[];
  onClose: () => void;
  onNavigateToProduct: (product: Product) => void;
  addToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onCompare?: (product: Product) => void;
  isAuthenticated?: boolean;
  isTradeApproved?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  products,
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
      const results = await getPersonalizedRecommendations(
        "personal",
        trimmed,
        products,
      );
      if (results.length === 0) {
        setError("No products available to recommend yet.");
      }
      setRecommendations(results);
    } catch (err) {
      console.error("AI Assistant error:", err);
      setError("We could not generate recommendations right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-belims-blue">
          <div className="flex items-center gap-2 text-lg font-semibold font-heading letterspacing-tight text-white">
            <Sparkles className="h-4 w-4" />
            Gemini AI Analysis
          </div>
          <button
            onClick={onClose}
            className="text-white bg-[#3b308e] hover:bg-[#251e62] w-[40px] h-[40px] rounded-full transition-colors pl-2.5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-6 py-6">
            <h2 className="text-xl font-semibold text-gray-900 font-heading letterspacing-tight mb-1">
              Need help finding the right product?
            </h2>
            <p className="mt-1 text text-gray-600">
              Describe what you're working on, and we'll recommend the best
              tools and materials for the job.
            </p>

            <div className="mt-4">
              <textarea
                value={projectDesc}
                onChange={(event) => setProjectDesc(event.target.value)}
                placeholder="E.g. I'm building a floating deck in the backyard, about 4x4 meters..."
                className="min-h-[180px] md:min-h-[70px] border border-gray-300 p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-belims-blue focus:border-transparent placeholder:text-gray-600"
              />
              {error && (
                <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
              )}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center justify-center gap-3 mt-0 w-full rounded bg-belims-blue font-heading text-sm font-semibold text-white transition-colors hover:bg-red-600 h-11 disabled:cursor-not-allowed disabled:opacity-70"
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

          <div className="border-t border-gray-200 bg-white px-6 py-4">
            {loading ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Recommended products
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <SkeletonProductCard
                      key={`ai-skel-${index}`}
                      className="rounded border border-[#E0E0E0] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                    />
                  ))}
                </div>
              </div>
            ) : recommendations.length > 0 ? (
              <div>
                <h3 className="font-heading leading-[1.35] text-gray-900 font-semibold tracking-tight text-[15px] mb-6">
                  Recommended products
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((product) => (
                    <div
                      key={product.id}
                      className="transform hover:-translate-y-1 transition-transform duration-300 border border-[#E0E0E0]"
                      onClick={() => onNavigateToProduct(product)}
                    >
                      <ProductCard
                        product={product}
                        addToCart={addToCart}
                        onBuyNow={onBuyNow}
                        onCompare={onCompare}
                        className="h-full border-none"
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
    </div>
  );
};
