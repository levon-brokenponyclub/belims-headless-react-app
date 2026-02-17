import React from "react";

interface StockBarProps {
  current: number;
  max: number;
}

export const StockBar: React.FC<StockBarProps> = ({ current, max }) => {
  const percentage = Math.min((current / max) * 100, 100);

  let badgeBgClass = "bg-[#ddf0df]";
  let badgeTextClass = "text-[#337239]";
  let dotClass = "bg-[#337239]";
  let progressClass = "bg-[#337239]";
  let text = "In stock";
  let caption = "Available now";

  if (current <= 0) {
    badgeBgClass = "bg-[#f7e5e5]";
    badgeTextClass = "text-[#922c2c]";
    dotClass = "bg-[#922c2c]";
    progressClass = "bg-[#922c2c]";
    text = "Out of stock";
    caption = "Available on backorder";
  } else if (current <= 3) {
    badgeBgClass = "bg-[#f8e1cb]";
    badgeTextClass = "text-[#bd6b1b]";
    dotClass = "bg-[#bd6b1b]";
    progressClass = "bg-[#bd6b1b]";
    text = `Only ${current} left`;
    caption = "Low inventory - Order soon";
  } else if (current <= 10) {
    badgeBgClass = "bg-[#f8e1cb]";
    badgeTextClass = "text-[#bd6b1b]";
    dotClass = "bg-[#bd6b1b]";
    progressClass = "bg-[#bd6b1b]";
    text = "Low stock";
    caption = "Limited stock available";
  }

  return (
    <div className="w-full mt-2">
      <div className="flex items-center gap-4">
        <div
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-tighter ${badgeBgClass} ${badgeTextClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          <span>{text}</span>
        </div>
        <div className="text-sm text-gray-500">{caption}</div>
      </div>
      <div className="mt-3 h-[5px] w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full transition-all duration-500 ease-out ${progressClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
