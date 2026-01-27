import { useState, useEffect } from "react";

interface UseScrollHideOptions {
  threshold?: number; // pixels to scroll before hiding
}

export const useScrollHide = (options: UseScrollHideOptions = {}) => {
  const { threshold = 80 } = options;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;

          // Scrolling down - hide
          if (currentScrollY > lastScrollY && currentScrollY > threshold) {
            setIsVisible(false);
          }
          // Scrolling up - show
          else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          }

          setLastScrollY(currentScrollY);
          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY, threshold]);

  return isVisible;
};
