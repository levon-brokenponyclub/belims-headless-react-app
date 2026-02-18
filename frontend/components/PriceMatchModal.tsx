import React, { useState, useEffect } from "react";
import { X, Search, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Product, PriceMatchResult } from "../types";
import { findCompetitorPrices } from "../services/geminiService";
import ReactMarkdown from "react-markdown";
import { formatCurrency } from "../utils/price";

interface PriceMatchModalProps {
  product: Product;
  onClose: () => void;
}

export const PriceMatchModal: React.FC<PriceMatchModalProps> = ({
  product,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PriceMatchResult | null>(null);

  useEffect(() => {
    let mounted = true;
    const scanPrices = async () => {
      const data = await findCompetitorPrices(product);
      if (mounted) {
        setResult(data);
        setLoading(false);
      }
    };
    scanPrices();
    return () => {
      mounted = false;
    };
  }, [product]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-belims-blue text-white p-5 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-heading flex items-center gap-2">
              <Search size={20} /> AI Price Match Guarantee
            </h2>
            <p className="text-blue-200 text-xs">
              We scan major SA retailers to ensure you get the best deal.
            </p>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-16 h-16 object-contain border rounded p-1"
            />
            <div>
              <div className="text-xs text-gray-500">{product.brand}</div>
              <h3 className="font-bold text-gray-900">{product.name}</h3>
              <div className="text-belims-blue font-bold font-heading">
                Our Price: {formatCurrency(product.price)}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2
                size={48}
                className="text-belims-blue animate-spin mb-4"
              />
              <p className="font-bold text-gray-800 animate-pulse">
                Scanning competitors...
              </p>
              <div className="flex gap-2 mt-2 text-xs text-gray-400">
                <span>Builders</span> &bull; <span>Makro</span> &bull;{" "}
                <span>Leroy Merlin</span> &bull; <span>Takealot</span>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
                <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  Market Analysis
                </h4>
                <div className="prose prose-sm text-gray-700">
                  {/* Render Markdown analysis from Gemini */}
                  <ReactMarkdown>
                    {result?.analysis || "No analysis available."}
                  </ReactMarkdown>
                </div>
              </div>

              {result?.sources && result.sources.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold text-gray-900 mb-2 text-sm">
                    Verified Sources
                  </h4>
                  <div className="space-y-2">
                    {result.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 border rounded hover:bg-blue-50 hover:border-belims-blue transition-colors group"
                      >
                        <span className="text-sm text-gray-600 font-medium group-hover:text-belims-blue truncate max-w-[80%]">
                          {source.title}
                        </span>
                        <ExternalLink
                          size={14}
                          className="text-gray-400 group-hover:text-belims-blue"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-belims-blue rounded p-4 flex items-start gap-3">
                <AlertCircle
                  className="text-belims-blue flex-shrink-0 mt-0.5"
                  size={20}
                />
                <div>
                  <h4 className="font-bold text-belims-blue text-sm">
                    Found a lower price?
                  </h4>
                  <p className="text-xs text-gray-600 mb-3">
                    If the AI found a cheaper price at a verified retailer, we
                    will match it plus give you 10% of the difference.
                  </p>
                  <button
                    className="bg-belims-blue text-white px-4 py-2 rounded text-xs font-bold font-heading hover:bg-belims-light transition-colors"
                    onClick={() =>
                      alert(
                        "Request sent to sales team! We will review and update your cart shortly.",
                      )
                    }
                  >
                    Request Price Match
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
