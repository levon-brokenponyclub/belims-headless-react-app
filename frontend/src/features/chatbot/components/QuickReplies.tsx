import React from "react";
import {
  BadgePercent,
  Building2,
  ImageUp,
  LifeBuoy,
  Package,
  Search,
  Truck,
} from "lucide-react";

interface QuickRepliesProps {
  onIntent: (intent: string) => void;
  decisionModeActive?: boolean;
  decisionAcceleratorChips?: string[];
}

export const FINDER_QUICK_REPLY_LABELS = ["Help me find it"] as const;

const PRIMARY_ACTION_CHIPS = [
  {
    label: "Help me choose",
    intent: "DECISION_START",
    Icon: Search,
  },
  {
    label: FINDER_QUICK_REPLY_LABELS[0],
    intent: "FINDER_START",
    Icon: Search,
  },
  {
    label: "Recommend for me",
    intent: "RECOMMEND_PRODUCTS",
    Icon: Search,
  },
] as const;

const SECONDARY_ACTION_CHIPS = [
  { label: "Find by image", intent: "FIND_BY_IMAGE", Icon: ImageUp },
  { label: "Track order", intent: "TRACK_ORDER", Icon: Truck },
  { label: "Apply discount", intent: "APPLY_DISCOUNT", Icon: BadgePercent },
  { label: "Check stock", intent: "CHECK_STOCK", Icon: Package },
  {
    label: "Trade account",
    intent: "TRADE_ACCOUNT",
    Icon: Building2,
  },
  { label: "Talk to support", intent: "TALK_TO_SUPPORT", Icon: LifeBuoy },
] as const;

const mapDecisionChipToIntent = (label: string): string => {
  const normalized = label.toLowerCase();
  if (normalized.includes("cheapest")) return "DECISION_COMPARE:cheapest";
  if (normalized.includes("best value")) return "DECISION_COMPARE:best_value";
  if (normalized.includes("top rated")) return "DECISION_COMPARE:top_rated";
  if (normalized.includes("fast delivery"))
    return "DECISION_COMPARE:fastest_delivery";
  if (normalized.includes("pickup today")) return "DECISION_URGENCY:today";
  if (normalized.includes("deliver this week"))
    return "DECISION_URGENCY:this_week";
  return label;
};

export const QuickReplies: React.FC<QuickRepliesProps> = ({
  onIntent,
  decisionModeActive = false,
  decisionAcceleratorChips = [],
}) => {
  return (
    <div className="mt-1 space-y-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PRIMARY_ACTION_CHIPS.map((reply, index) => (
          <button
            key={reply.intent}
            onClick={() => onIntent(reply.intent)}
            className={`inline-flex items-center gap-2 text-sm rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 ${
              index === 0
                ? "bg-gradient-to-r from-violet-700 to-purple-700 text-white shadow-md hover:shadow-lg"
                : "bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200"
            }`}
          >
            <reply.Icon size={17} />
            {reply.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {SECONDARY_ACTION_CHIPS.map((reply) => (
          <button
            key={reply.intent}
            onClick={() => onIntent(reply.intent)}
            className="inline-flex items-center gap-2 text-xs bg-white text-gray-700 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-50 hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            <reply.Icon size={15} className="text-violet-600" />
            {reply.label}
          </button>
        ))}
      </div>

      {decisionModeActive && decisionAcceleratorChips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {decisionAcceleratorChips.map((label) => (
            <button
              key={label}
              onClick={() => onIntent(mapDecisionChipToIntent(label))}
              className="inline-flex items-center gap-2 text-xs rounded-full px-3 py-1.5 bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 transition-all whitespace-nowrap"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
