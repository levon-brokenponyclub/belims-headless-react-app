import {
  buyButtonClass,
  inputClass,
  labelClass as sharedLabelClass,
  outlineButtonClass,
  primaryButtonClass,
} from "../ui/classes";

/** One button / field system for every account view (Tailwind class strings). */
/** Blue: every non-buying action (save, track, start shopping). */
export const btnPrimary = primaryButtonClass;

/** Red: buying actions only (reorder adds to the cart). */
export const btnBuy = buyButtonClass;

export const btnOutline = outlineButtonClass;

export const btnText =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-1 font-bold text-belims-blue underline underline-offset-4 transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50";

export const btnTextDanger =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 px-1 font-bold text-error underline underline-offset-4 transition-colors hover:text-belims-blue disabled:cursor-not-allowed disabled:opacity-50";

export const labelClass = `mb-1 block ${sharedLabelClass}`;

export const fieldClass = `${inputClass} read-only:bg-surface-muted read-only:text-text-secondary`;

export const cardClass = "rounded-md border-2 border-border bg-white";
export const cardHeadClass = "flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4";
export const h2Class = "font-heading font-condensed text-h4 font-extrabold uppercase";
