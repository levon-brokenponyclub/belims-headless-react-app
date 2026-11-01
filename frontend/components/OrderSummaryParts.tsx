import React from "react";
import { RotateCcw, ShieldCheck, Tag, Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD } from "../constants";
import { formatCurrency } from "../utils/price";

// Building blocks for the order summary card shared by the cart page and checkout.

export const summaryCardClass = "overflow-hidden rounded-lg border-2 border-border bg-white";

const smallOutlineButtonClass =
  "h-10 shrink-0 rounded-md border-2 border-border bg-white px-4 text-base font-bold text-text transition-colors hover:border-text disabled:pointer-events-none disabled:opacity-50";

export const SummaryHeading: React.FC<{ itemCount: number; className?: string }> = ({ itemCount, className = "" }) => (
  <header className={`flex items-center gap-2 bg-surface-muted px-5 py-4 ${className}`}>
    <h2 className="text-xl font-semibold leading-7 text-text">Order summary</h2>
    <span className="text-base text-text-secondary">
      ({itemCount} {itemCount === 1 ? "item" : "items"})
    </span>
  </header>
);

interface CouponFieldProps {
  value: string;
  onChange: (value: string) => void;
  onApply: () => void;
  /** When set, an applied coupon can be removed (the field locks until then). */
  onRemove?: () => void;
  appliedCode?: string | null;
  error?: string | null;
  loading?: boolean;
}

export const CouponField: React.FC<CouponFieldProps> = ({
  value,
  onChange,
  onApply,
  onRemove,
  appliedCode,
  error,
  loading,
}) => {
  const locked = Boolean(appliedCode && onRemove);
  return (
    <section className="border-t border-border px-5 py-4">
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!locked && value.trim()) onApply();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" aria-hidden />
          <input
            aria-label="Discount code"
            placeholder="Discount code"
            value={value}
            disabled={locked}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full rounded-md border-2 border-border bg-white pl-10 pr-3 text-lg text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-belims-blue disabled:bg-surface-muted disabled:text-text-tertiary md:text-base"
          />
        </div>
        {locked ? (
          <button type="button" onClick={onRemove} className={smallOutlineButtonClass}>
            Remove
          </button>
        ) : (
          <button type="submit" disabled={!value.trim() || loading} className={smallOutlineButtonClass}>
            {loading ? "…" : "Apply"}
          </button>
        )}
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-error">
          {error}
        </p>
      ) : null}
      {appliedCode ? <p className="mt-2 text-sm text-success">{appliedCode} applied</p> : null}
    </section>
  );
};

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
  tone?: "success";
}

export const SummaryTotals: React.FC<{ rows: SummaryRow[]; total: number }> = ({ rows, total }) => (
  <section className="border-t border-border px-5 py-4">
    <dl className="space-y-2 text-base leading-5 text-text tabular-nums">
      {rows.map(({ label, value, tone }) => (
        <div key={label} className={`flex justify-between ${tone === "success" ? "text-success" : ""}`}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
    <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4 text-text">
      <span className="text-lg font-semibold leading-6">Total</span>
      <data value={total} className="text-lg font-semibold leading-6 tabular-nums">
        {formatCurrency(total)}
      </data>
    </div>
  </section>
);

const TRUST_TILES = [
  { Icon: ShieldCheck, lines: ["Secure", "checkout"] },
  { Icon: RotateCcw, lines: ["15-day", "returns"] },
  { Icon: Truck, lines: ["Free delivery", `over ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`] },
];

export const TrustTiles: React.FC = () => (
  <footer className="grid grid-cols-3 gap-2 border-t border-border bg-surface-muted px-5 py-4">
    {TRUST_TILES.map(({ Icon, lines }) => (
      <div key={lines[0]} className="flex flex-col items-center p-2.5 text-center">
        <Icon className="mb-1 h-4 w-4 text-text-secondary" aria-hidden />
        <span className="text-xs leading-4 text-text">
          {lines[0]}
          <br />
          {lines[1]}
        </span>
      </div>
    ))}
  </footer>
);
