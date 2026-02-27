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
  onClose,
  onAccept,
  onCancel,
}) => {
  const [shouldRenderDrawer, setShouldRenderDrawer] = React.useState(isOpen);
  const [isDrawerVisible, setIsDrawerVisible] = React.useState(false);
  const DRAWER_TRANSITION_MS = 300;

  React.useEffect(() => {
    if (isOpen) {
      setShouldRenderDrawer(true);
      setIsDrawerVisible(false);

      const frameId = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setIsDrawerVisible(true);
        });
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    if (!shouldRenderDrawer) return;

    setIsDrawerVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRenderDrawer(false);
    }, DRAWER_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, shouldRenderDrawer]);

  return (
    <>
      {!isOpen && !shouldRenderDrawer && (
        <button
          type="button"
          onClick={onOpen}
          className="fixed bottom-4 h-11 w-11 right-4 z-[85] inline-flex items-center gap-2 rounded-full bg-gray-900 p-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-black"
        >
          <Cookie size={19} />
        </button>
      )}

      {shouldRenderDrawer && (
        <div className="fixed inset-0 z-[1300] flex items-end justify-center p-0 pointer-events-none">
          <div
            className={`pointer-events-auto absolute inset-0 bg-black/50 transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isDrawerVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={onClose}
          />

          <div
            className={`pointer-events-auto relative z-[1] w-full rounded-t-3xl bg-white border border-gray-200 shadow-2xl px-0 pb-0 pt-4 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[85vh] overflow-y-auto ${
              isDrawerVisible ? "translate-y-0" : "translate-y-full"
            }`}
            style={{
              borderTopLeftRadius: "1.5rem",
              borderTopRightRadius: "1.5rem",
            }}
            role="dialog"
            aria-label="Cookies Settings"
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full h-1 flex items-center justify-center rounded-t-2xl mb-6"
              aria-label="Close cookies settings"
            >
              <span className="w-12 h-1 bg-slate-300 rounded-full" />
            </button>

            <div className="relative mb-1 flex items-center justify-center text-center">
              <h3 className="text-3xl font-bold text-gray-900">
                Your privacy matters.
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="group absolute right-6 -top-1 z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-gray-300 bg-white text-gray-900 transition-colors"
                aria-label="Close"
              >
                <span className="absolute inset-0 translate-y-[-100%] bg-gray-900 transition-transform duration-300 ease-out group-hover:translate-y-0" />
                <span className="relative z-10 text-gray-900 transition-colors group-hover:text-white">
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    stroke="currentColor"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    role="presentation"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 15L15 5M5 5L15 15"
                    />
                  </svg>
                </span>
              </button>
            </div>

            <p className="mb-8 text-lg text-gray-600 text-center">
              We use essential cookies and optional cookies to improve your
              experience.
              {/* <a
                href="/cookies-policy"
                className="ml-1 font-semibold text-belims-blue underline-offset-2 hover:underline"
              >
                Cookie Policy
              </a>
              . */}
            </p>

            <div className="mt-2 border-t bg-surface py-5">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onAccept}
                  className="group relative flex h-11 w-[280px] max-w-full items-center justify-center overflow-hidden rounded-full border border-grey bg-grey px-4 py-2 transition-colors hover:border-belims-blue"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-belims-blue transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative z-10 font-heading font-bold text-white transition-colors group-hover:text-white">
                    Accept
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onAccept}
                  className="group relative flex h-11 w-[280px] max-w-full items-center justify-center overflow-hidden rounded-full border border-red bg-grey-light px-4 py-2 transition-colors hover:border-red-muted"
                >
                  <span className="absolute inset-0 origin-left scale-x-0 bg-red-muted transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <span className="relative z-10 font-heading font-bold text-grey transition-colors group-hover:text-white">
                    Reject
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
