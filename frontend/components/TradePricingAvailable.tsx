import React from "react";

interface TradePricingAvailableProps {
  onShowTradeDeal: () => void;
}

export const TradePricingAvailable: React.FC<TradePricingAvailableProps> = ({
  onShowTradeDeal,
}) => {
  return (
    <div className="collapsedBlock">
      <div className="text-sm font-bold text-gray-900 mb-1">
        Trade pricing available
      </div>
      <div className="text-xs text-gray-600 mb-5">
        Available to contractors with a Belims trade account.
      </div>
      <button
        type="button"
        onClick={onShowTradeDeal}
        className="w-full border-2 border-belims-blue text-belims-blue bg-white font-bold text-sm py-2.5 px-4 rounded hover:bg-belims-blue hover:text-white transition-all"
      >
        VIEW TRADE DEAL
      </button>
      <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-4 mt-2">
        <a
          href="/trade-accounts"
          className="mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
        >
          Learn about the Belims trade accounts
        </a>
        <a
          href="/trade-accounts"
          className="inline mt-3 text-center text-xs text-gray-500 underline hover:text-gray-700"
        >
          Register for a Belims trade account
        </a>
      </div>
    </div>
  );
};
