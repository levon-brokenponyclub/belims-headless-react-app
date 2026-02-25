import React from "react";
import { X, Cookie } from "lucide-react";

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
            className={`pointer-events-auto relative z-[1] w-full max-w-[500px] rounded-t-xl bg-white border border-gray-200 shadow-2xl p-6 pt-4 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[85vh] overflow-y-auto ${
              isDrawerVisible ? "translate-y-0" : "translate-y-full"
            }`}
            role="dialog"
            aria-label="Cookies Settings"
          >
            <button
              type="button"
              onClick={onClose}
              className="w-full h-1 flex items-center justify-center rounded-t-2xl"
              aria-label="Close cookies settings"
            >
              <span className="w-12 h-1 bg-slate-300 rounded-full" />
            </button>

            <div className="mb-3  flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                Cookie Settings
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-600">
              We use cookies to improve functionality and personalize your
              experience. You can manage your settings anytime. Read our
              <a
                href="/cookies-policy"
                className="ml-1 font-semibold text-belims-blue underline-offset-2 hover:underline"
              >
                Cookie Policy
              </a>
              .
            </p>

            <div className="flex flex-row flex-wrap items-center justify-start gap-3">
              <button
                type="button"
                onClick={onAccept}
                className="group relative flex h-10 items-center justify-center overflow-hidden rounded-full border border-grey-light bg-grey-light px-6 py-2 text-sm font-bold text-grey transition-colors hover:border-grey hover:text-white"
              >
                <span className="absolute inset-0 origin-left scale-x-0 bg-grey transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
                <span className="relative z-10 flex items-center gap-3">
                  <span className="font-heading font-semibold transition-colors group-hover:text-white">
                    Accept Cookies
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="border-0 bg-transparent p-0 text-sm font-semibold text-gray-700 underline-offset-2 transition-colors hover:text-gray-900 hover:underline"
              >
                Manage Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
