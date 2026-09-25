import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Variant = "popover" | "sheet";

interface DeliveryDetailsPopoverProps {
  open: boolean;
  variant?: Variant;
  onClose: () => void;
  onDismiss: () => void;
  onAddDetails: () => void;
  onLogin: () => void;
}

export const DeliveryDetailsPopover: React.FC<DeliveryDetailsPopoverProps> = ({
  open,
  variant = "popover",
  onClose,
  onDismiss,
  onAddDetails,
  onLogin,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  const bodyCopy = (
    <p className="text-sm leading-relaxed text-text">
      To view <strong className="font-bold">product availability</strong> and{" "}
      <strong className="font-bold">local pricing</strong> for your area, please
      add your delivery details before you start shopping.
    </p>
  );

  const actions = (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 min-w-[140px] rounded-pill border border-border bg-white px-5 py-3 text-sm font-bold text-text-secondary hover:bg-surface-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          Do this later
        </button>
        <button
          type="button"
          onClick={onAddDetails}
          className="flex-1 min-w-[180px] rounded-pill bg-belims-blue px-5 py-3 text-sm font-bold text-white underline underline-offset-4 hover:bg-belims-blue/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/60"
        >
          Add delivery details
        </button>
      </div>
      <button
        type="button"
        onClick={onLogin}
        className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 self-start"
      >
        Log in to see your saved addresses
      </button>
    </div>
  );

  if (variant === "sheet") {
    return (
      <>
        <div
          className="fixed inset-0 z-[1400] bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Add delivery details"
          className="fixed bottom-0 left-0 right-0 z-[1401] rounded-t-2xl bg-white p-5 pb-8 shadow-[0_-12px_40px_-8px_rgba(0,0,0,0.25)]"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-text-tertiary hover:text-text"
          >
            <X size={20} />
          </button>
          <div className="space-y-5">
            {bodyCopy}
            {actions}
          </div>
        </div>
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Add delivery details"
      className="absolute left-0 top-full z-[1300] mt-3 w-[380px] rounded-xl bg-white p-5 text-text shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)]"
    >
      <span
        aria-hidden="true"
        className="absolute -top-2 left-8 h-4 w-4 rotate-45 bg-white"
      />
      <div className="relative space-y-4">
        {bodyCopy}
        {actions}
      </div>
    </div>
  );
};
