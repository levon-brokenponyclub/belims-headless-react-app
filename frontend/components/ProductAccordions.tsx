import React from "react";
import { Minus, Plus } from "lucide-react";

interface ProductAccordionsProps {
  ecommercePolicies: any;
  expandedPolicy: string | null;
  setExpandedPolicy: React.Dispatch<React.SetStateAction<string | null>>;
}

// Copy comes from Site Settings → Ecommerce policies; items with no text are hidden.
const POLICIES = [
  { key: "return", title: "Returns", field: "return_policy" },
  { key: "change_mind", title: "Change of mind", field: "change_of_mind" },
  { key: "warranty", title: "Warranty", field: "warranty" },
  { key: "shipping", title: "Delivery & collection", field: "shipping" },
] as const;

export const ProductAccordions: React.FC<ProductAccordionsProps> = ({
  ecommercePolicies,
  expandedPolicy,
  setExpandedPolicy,
}) => {
  const items = POLICIES.filter(({ field }) => ecommercePolicies?.[field]);
  if (!ecommercePolicies) {
    return <p className="py-4 text-base text-text-tertiary">Loading policies…</p>;
  }

  return (
    <div>
      {items.map(({ key, title, field }) => {
        const isOpen = expandedPolicy === key;
        return (
          <div key={key} className="border-b border-border">
            <h3>
              <button
                type="button"
                id={`policy-${key}`}
                aria-expanded={isOpen}
                aria-controls={`policy-${key}-panel`}
                onClick={() => setExpandedPolicy(isOpen ? null : key)}
                className="flex w-full items-center justify-between py-4 text-left font-heading text-base font-bold text-text hover:text-belims-blue"
              >
                {title}
                {isOpen ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              </button>
            </h3>
            {isOpen && (
              <div
                id={`policy-${key}-panel`}
                role="region"
                aria-labelledby={`policy-${key}`}
                className="prose prose-sm max-w-none pb-5 text-base text-text-secondary"
                dangerouslySetInnerHTML={{ __html: ecommercePolicies[field] }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
