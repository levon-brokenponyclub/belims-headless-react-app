import React from "react";
import { Check } from "lucide-react";
import type { Order } from "../../types";
import { ORDER_STEPS, stepIndex } from "./orderStatus";

/** Placed → Processing → Shipped → Delivered. Renders nothing for cancelled / refunded / failed orders. */
export const OrderStatusTracker: React.FC<{ status: Order["status"] }> = ({ status }) => {
  const current = stepIndex(status);
  if (current === null) return null;
  const allDone = status === "completed";

  return (
    <ol
      className="grid grid-cols-4"
      aria-label={`Order progress: ${allDone ? "all steps complete" : `step ${current + 1} of 4, ${ORDER_STEPS[current]}`}`}
    >
      {ORDER_STEPS.map((label, index) => {
        const state = allDone || index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className={`relative flex flex-col items-center gap-1.5 px-0.5 text-center text-[12px] ${
              state === "todo" ? "font-semibold text-text-tertiary" : state === "current" ? "font-extrabold text-text" : "font-semibold text-text"
            } ${index > 0 ? "before:absolute before:right-1/2 before:top-[13px] before:h-0.5 before:w-full before:content-['']" : ""} ${
              state === "todo" ? "before:bg-border" : "before:bg-belims-blue"
            }`}
          >
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 bg-white text-[12px] font-bold ${
                state === "done"
                  ? "border-belims-blue bg-belims-blue text-white"
                  : state === "current"
                    ? "border-[3px] border-primary text-primary"
                    : "border-border"
              }`}
            >
              {state === "done" ? <Check size={14} aria-hidden="true" /> : index + 1}
            </span>
            <span>
              {label}
              <span className="sr-only"> ({state === "done" ? "complete" : state === "current" ? "current" : "upcoming"})</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
