// Shared control styles — one source for buttons, fields and page titles across the storefront,
// cart, checkout and auth. Colours are CSS-var tokens, so avoid Tailwind opacity modifiers (`/40`) on them.

const buttonBase =
  "inline-flex h-12 items-center justify-center gap-2 rounded-md px-4 font-heading font-condensed text-button font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

/** Buying actions only: add to cart, checkout, pay. */
export const buyButtonClass = `${buttonBase} bg-primary text-white hover:bg-belims-blue focus-visible:ring-primary`;

/** Every other primary action (sign in, continue, save). */
export const primaryButtonClass = `${buttonBase} bg-belims-blue text-white hover:bg-primary focus-visible:ring-belims-blue`;

export const outlineButtonClass =
  "inline-flex h-12 items-center justify-center gap-2.5 rounded-md border-2 border-border bg-white px-4 text-base font-bold text-text transition-colors hover:border-text disabled:pointer-events-none disabled:opacity-50";

/** 16px on mobile so iOS Safari doesn't zoom on focus; 15px from md. */
export const inputClass =
  "flex h-12 w-full rounded-md border-2 border-border bg-white px-3 text-lg text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-belims-blue disabled:cursor-not-allowed disabled:opacity-50 md:text-base";

export const labelClass = "text-base font-bold text-text";

export const errorClass = "rounded-md border-2 border-error bg-stock-out-bg px-3 py-2.5 text-base text-error";
export const successClass = "rounded-md border-2 border-success bg-stock-ok-bg px-3 py-2.5 text-base text-success";

/** Page-level <h1> on non-hero pages (cart, checkout states, account-style pages). */
export const pageTitleClass = "font-heading font-condensed text-h2 font-bold uppercase leading-tight text-text md:text-h1";
