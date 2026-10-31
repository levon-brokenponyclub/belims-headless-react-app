export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  /** Secondary line under the message (e.g. the product name). */
  detail?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

export interface ToastItem extends ToastOptions {
  id: number;
  message: string;
  type: ToastType;
}

export const TOAST_EVENT = "belims:toast";

let nextToastId = 1;

/** Fire a toast from anywhere (components or services); rendered by <ToastStack />. */
export const pushToast = (message: string, type: ToastType = "success", options: ToastOptions = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, { detail: { id: nextToastId++, message, type, ...options } }),
  );
};
