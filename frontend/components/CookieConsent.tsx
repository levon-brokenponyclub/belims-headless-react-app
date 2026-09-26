import React from "react";
import { Cookie } from "lucide-react";

interface CookieConsentProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onAccept: () => void;
  onCancel: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({
  isOpen,
  onOpen,
  onAccept,
  onClose,
}) => {
  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Cookie settings"
          className="fixed bottom-4 right-4 z-[85] flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition-colors hover:bg-black"
        >
          <Cookie size={19} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 left-1/2 z-[1300] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-xl">
          <div className="flex items-center gap-6">
            <p className="flex-1 text-sm text-gray-700">
              We use cookies to improve functionality and personalise your
              experience. You can manage your settings anytime.{" "}
              <a
                href="/cookies-policy"
                className="font-semibold text-belims-blue hover:underline underline-offset-2"
              >
                Cookies Policy
              </a>
            </p>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="rounded-xl bg-belims-blue px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-belims-blue/90"
              >
                Okay
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss"
                className="text-gray-400 transition-colors hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
