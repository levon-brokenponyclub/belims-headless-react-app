import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CartHoldNoticeProps {
  /** When the cart's stock hold ends (ms); nothing renders without one. */
  expiresAt: number | null;
  onRehold: () => void;
  className?: string;
}

/** "Held for mm:ss" while the cart's stock is reserved; "No longer held" with a re-hold action after. */
export const CartHoldNotice: React.FC<CartHoldNoticeProps> = ({ expiresAt, onRehold, className = "" }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  if (!expiresAt) return null;

  const left = expiresAt - now;
  if (left > 0) {
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    return (
      <p className={`flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 text-sm text-text ${className}`}>
        <Clock size={16} className="shrink-0 text-belims-blue" aria-hidden />
        <span>
          Items held for{" "}
          <strong className="tabular-nums" aria-label={`${minutes} minutes`}>
            {minutes}:{String(seconds).padStart(2, "0")}
          </strong>
        </span>
      </p>
    );
  }

  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border-2 border-warning bg-stock-low-bg px-3 py-2 text-sm text-text ${className}`}
    >
      <span>
        <strong>No longer held.</strong> Items in your cart may sell out.
      </span>
      <button
        type="button"
        onClick={onRehold}
        className="font-bold text-belims-blue underline underline-offset-4 hover:text-primary"
      >
        Hold again
      </button>
    </div>
  );
};
