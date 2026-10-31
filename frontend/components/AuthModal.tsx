import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { AuthPage } from "./AuthPage";
import { UserData } from "../services/authService";

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: "login" | "register";
  onClose: () => void;
  onSuccess: (user: UserData) => void;
  showToast: (message: string, type: "success" | "error") => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = "login",
  onClose,
  onSuccess,
  showToast,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Start on the requested tab every time the modal opens.
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  // Escape closes, Tab stays inside the dialog, focus returns to the trigger, page scroll locks.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Portal to <body>: inside the sticky header's stacking context the modal sat below the cookie banner.
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "Sign in" : "Create account"}
        className="relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-lg border-2 border-border bg-white sm:rounded-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-md text-text-secondary transition-colors hover:text-text"
        >
          <X size={22} aria-hidden />
        </button>

        {/* Form */}
        <div className="overflow-y-auto p-6 pt-0">
          <AuthPage
            key={mode}
            mode={mode}
            layout="modal"
            onSuccess={(user) => { onSuccess(user); onClose(); }}
            showToast={showToast}
            onSwitchMode={() => setMode(mode === "login" ? "register" : "login")}
            onClose={onClose}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
