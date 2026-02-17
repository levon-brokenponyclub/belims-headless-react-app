import React from "react";
import { ChevronRight } from "lucide-react";

interface ProductAccordionsProps {
  ecommercePolicies: any;
  expandedPolicy: string | null;
  setExpandedPolicy: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ProductAccordions: React.FC<ProductAccordionsProps> = ({
  ecommercePolicies,
  expandedPolicy,
  setExpandedPolicy,
}) => {
  return (
    <div className="space-y-0">
      {/* 15-Days Return Policy */}
      <div className="border-b border-subtle rounded overflow-hidden">
        <button
          onClick={() =>
            setExpandedPolicy(expandedPolicy === "return" ? null : "return")
          }
          className="w-full flex items-center justify-between p-6 px-0 bg-white transition-colors text-left group"
        >
          <span className="text-2xl font-bold text-grey transition-colors">
            15-Days Return Policy
          </span>
          <ChevronRight
            size={20}
            className={`text-grey transition-transform ${expandedPolicy === "return" ? "rotate-90" : ""}`}
          />
        </button>
        {expandedPolicy === "return" && (
          <div className="pb-6 px-0 bg-white animate-fadeIn">
            <div
              className="text-base text-grey-medium prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: ecommercePolicies?.return_policy || "Loading...",
              }}
            />
          </div>
        )}
      </div>

      {/* Change of Mind Return */}
      <div className="border-b border-subtle rounded overflow-hidden">
        <button
          onClick={() =>
            setExpandedPolicy(
              expandedPolicy === "change_mind" ? null : "change_mind",
            )
          }
          className="w-full flex items-center justify-between p-6 px-0 bg-white transition-colors text-left group"
        >
          <span className="text-2xl font-bold text-grey transition-colors">
            Change of Mind Return
          </span>
          <ChevronRight
            size={20}
            className={`text-grey transition-transform ${expandedPolicy === "change_mind" ? "rotate-90" : ""}`}
          />
        </button>
        {expandedPolicy === "change_mind" && (
          <div className="pb-6 px-0 bg-white animate-fadeIn">
            <div
              className="text-base text-grey-medium prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: ecommercePolicies?.change_of_mind || "Loading...",
              }}
            />
          </div>
        )}
      </div>

      {/* Warranty */}
      <div className="border-b border-subtle rounded overflow-hidden">
        <button
          onClick={() =>
            setExpandedPolicy(expandedPolicy === "warranty" ? null : "warranty")
          }
          className="w-full flex items-center justify-between p-6 px-0 bg-white transition-colors text-left group"
        >
          <span className="text-2xl font-bold text-grey transition-colors">
            Warranty
          </span>
          <ChevronRight
            size={20}
            className={`text-grey transition-transform ${expandedPolicy === "warranty" ? "rotate-90" : ""}`}
          />
        </button>
        {expandedPolicy === "warranty" && (
          <div className="pb-6 px-0 bg-white animate-fadeIn">
            <div
              className="text-base text-grey-medium prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: ecommercePolicies?.warranty || "Loading...",
              }}
            />
          </div>
        )}
      </div>

      {/* Delivery and Shipping */}
      <div className="border-b border-subtle rounded overflow-hidden">
        <button
          onClick={() =>
            setExpandedPolicy(expandedPolicy === "shipping" ? null : "shipping")
          }
          className="w-full flex items-center justify-between p-6 px-0 bg-white transition-colors text-left group"
        >
          <span className="text-2xl font-bold text-grey transition-colors">
            Delivery and Shipping
          </span>
          <ChevronRight
            size={20}
            className={`text-grey transition-transform ${expandedPolicy === "shipping" ? "rotate-90" : ""}`}
          />
        </button>
        {expandedPolicy === "shipping" && (
          <div className="pb-6 px-0 bg-white animate-fadeIn">
            <div
              className="text-base text-grey-medium prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{
                __html: ecommercePolicies?.shipping || "Loading...",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
