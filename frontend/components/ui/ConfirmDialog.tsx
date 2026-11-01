import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { buyButtonClass, outlineButtonClass } from "./classes";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small confirm step for destructive actions. Escape or the backdrop cancels; focus starts on Cancel. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? "confirm-dialog-message" : undefined}
        className="relative w-full max-w-sm rounded-t-lg border-2 border-border bg-white p-6 sm:rounded-lg"
      >
        <h2 id="confirm-dialog-title" className="text-h5 font-bold text-text">
          {title}
        </h2>
        {message && (
          <p id="confirm-dialog-message" className="mt-2 text-base text-text-secondary">
            {message}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className={outlineButtonClass}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className={buyButtonClass}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
