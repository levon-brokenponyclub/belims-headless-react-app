import React from "react";
import { DealResolvedInfo } from "../types";

interface DealBadgeProps {
  deal?: DealResolvedInfo;
  className?: string;
}

export const DealBadge: React.FC<DealBadgeProps> = ({
  deal,
  className = "",
}) => {
  if (!deal?.label) return null;

  let bgClass = "bg-red-600"; // default
  if (deal.badgeStyle === "trade") bgClass = "bg-belims-accent";
  else if (deal.badgeStyle === "clearance") bgClass = "bg-orange-600";
  else if (deal.badgeStyle === "info") bgClass = "bg-gray-600";

  return (
    <div
      className={`absolute top-4 left-4 z-20 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm uppercase tracking-wide font-heading ${bgClass} ${className}`}
    >
      {deal.label}
    </div>
  );
};
