import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { TOAST_EVENT, ToastItem, ToastType } from "../utils/toast";

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 4000;

const TYPE_STYLES: Record<ToastType, { accent: string; icon: React.ReactNode }> = {
  success: { accent: "border-l-stock-ok text-stock-ok", icon: <CheckCircle2 size={20} aria-hidden /> },
  error: { accent: "border-l-primary text-primary", icon: <AlertCircle size={20} aria-hidden /> },
  info: { accent: "border-l-belims-blue text-belims-blue", icon: <Info size={20} aria-hidden /> },
};

const ToastCard: React.FC<{ toast: ToastItem; onClose: (id: number) => void }> = ({ toast, onClose }) => {
  const [paused, setPaused] = useState(false);
  const { id, duration = DEFAULT_DURATION } = toast;

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => onClose(id), duration);
    return () => window.clearTimeout(timer);
  }, [paused, id, duration, onClose]);

  const { accent, icon } = TYPE_STYLES[toast.type];

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto flex items-start gap-3 rounded-md border-2 border-l-4 border-border bg-white p-3 animate-toast-in ${accent.split(" ")[0]}`}
    >
      <span className={`mt-0.5 flex-shrink-0 ${accent.split(" ")[1]}`}>{icon}</span>
      <div className="min-w-0 flex-1 text-text">
        <p className="text-base font-bold leading-snug">{toast.message}</p>
        {toast.detail && <p className="mt-0.5 truncate text-caption text-text-secondary">{toast.detail}</p>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onClose(id);
            }}
            className="mt-1.5 text-caption font-bold uppercase tracking-wide text-belims-blue underline underline-offset-4 hover:text-primary"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-text-tertiary transition-colors hover:text-text"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastStack: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const close = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const item = (e as CustomEvent<ToastItem>).detail;
      setToasts((prev) => [...prev, item].slice(-MAX_VISIBLE));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[9999] flex flex-col gap-2 md:inset-x-auto md:right-4 md:w-[380px]"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={close} />
      ))}
    </div>
  );
};
