import React from "react";

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  widthClassName?: string;
  heightClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  overlayClassName?: string;
  panelClassName?: string;
  containerClassName?: string;
  showHandle?: boolean;
}

export const BottomDrawer: React.FC<BottomDrawerProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabel,
  widthClassName = "w-full max-w-[min(1400px,96vw)]",
  heightClassName = "h-[96vh] lg:h-[90vh]",
  initialFocusRef,
  overlayClassName,
  panelClassName,
  containerClassName,
  showHandle = true,
}) => {
  const [shouldRenderDrawer, setShouldRenderDrawer] = React.useState(isOpen);
  const [isDrawerVisible, setIsDrawerVisible] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);
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

    if (!shouldRenderDrawer) {
      return;
    }

    setIsDrawerVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRenderDrawer(false);
    }, DRAWER_TRANSITION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen, shouldRenderDrawer]);

  React.useEffect(() => {
    if (!shouldRenderDrawer) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shouldRenderDrawer, onClose]);

  React.useEffect(() => {
    if (!shouldRenderDrawer || !isDrawerVisible) {
      return;
    }

    const focusTarget = initialFocusRef?.current ?? drawerRef.current;
    focusTarget?.focus();
  }, [shouldRenderDrawer, isDrawerVisible, initialFocusRef]);

  if (!shouldRenderDrawer) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[1300] flex items-end justify-center p-0 pointer-events-none ${
        containerClassName || ""
      }`}
    >
      <div
        className={`pointer-events-auto absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          overlayClassName || ""
        } ${isDrawerVisible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`pointer-events-auto relative z-[1] ${widthClassName} ${heightClassName} rounded-t-[18px] md:rounded-t-[22px] border border-black/10 bg-white shadow-[0_-16px_45px_rgba(15,23,42,0.18)] transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
          panelClassName || ""
        } ${isDrawerVisible ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="pointer-events-none absolute inset-0 rounded-t-[inherit] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" />
        {showHandle && (
          <div className="relative h-8 flex items-center justify-center border-b border-gray-100/80 bg-white">
            <span className="w-12 h-1 bg-slate-300 rounded-full" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
