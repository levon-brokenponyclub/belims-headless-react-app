import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, ShoppingCart, User, Search } from "lucide-react";

interface MobileBottomNavProps {
  onSearch?: () => void;
  onCart?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onSearch,
  onCart,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show menu when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isHomeActive = location.pathname === "/";
  const isShopActive = location.pathname.startsWith("/shop");
  const itemClass = (isActive: boolean) =>
    `flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
      isActive ? "text-brand" : "text-grey"
    }`;

  return (
    <div
      className={`lg:hidden fixed left-0 right-0 z-[100] transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      } bottom-0`}
    >
      <div className="border-t border-subtle bg-white/95 backdrop-blur-sm shadow-[0_-4px_18px_rgb(0_0_0_/_0.08)]">
        <nav
          className="grid grid-cols-5 items-center px-2 py-2"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            className={itemClass(isHomeActive)}
            onClick={() => navigate("/")}
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-none">Home</span>
          </button>

          <button type="button" className={itemClass(false)} onClick={onSearch}>
            <Search className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-none">
              Search
            </span>
          </button>

          <button
            type="button"
            className={itemClass(isShopActive)}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("belims:open-mobile-menu"))
            }
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-none">
              Departments
            </span>
          </button>

          <button type="button" className={itemClass(false)} onClick={onCart}>
            <ShoppingCart className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-none">Cart</span>
          </button>

          <button
            type="button"
            className={itemClass(false)}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("belims:open-account-panel"))
            }
          >
            <User className="h-5 w-5" />
            <span className="text-[11px] font-semibold leading-none">
              Account
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
};
