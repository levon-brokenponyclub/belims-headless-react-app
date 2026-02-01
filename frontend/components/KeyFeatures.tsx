import React from "react";
import { Check } from "lucide-react";

interface KeyFeaturesProps {
  features?: string[];
  className?: string;
}

export const KeyFeatures: React.FC<KeyFeaturesProps> = ({
  features = [],
  className = "",
}) => {
  // Limit to 5 features
  const displayFeatures = features.slice(0, 5);

  if (displayFeatures.length === 0) {
    return null;
  }

  return (
    <div
      className={`border border-gray-200 rounded-lg bg-white p-4 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900 font-heading">
          Key features
        </h3>
      </div>

      <ul className="space-y-2.5">
        {displayFeatures.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
