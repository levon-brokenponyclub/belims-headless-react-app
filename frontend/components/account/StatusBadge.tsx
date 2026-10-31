import React from "react";
import type { Order } from "../../types";
import { STATUS_META, StatusTone } from "./orderStatus";

const TONE_CLASS: Record<StatusTone, string> = {
  ok: "text-success",
  info: "text-belims-blue",
  warn: "text-stock-low",
  err: "text-error",
  neutral: "text-text-secondary",
};

/** One status system for the whole account: label + dot, never colour alone. */
export const StatusBadge: React.FC<{ status: Order["status"] | string }> = ({ status }) => {
  const meta = STATUS_META[status as Order["status"]] ?? { label: String(status), tone: "neutral" as StatusTone };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-current bg-white px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide ${TONE_CLASS[meta.tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
    </span>
  );
};
