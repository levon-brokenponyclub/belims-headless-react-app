import React, { useState, useEffect, useRef } from "react";
import { Home, Search, LayoutGrid, ShoppingCart, User } from "lucide-react";

export const MobileBottomNav: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);
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

  // Detect sticky add to cart bar visibility
  useEffect(() => {
    const stickyBar = document.querySelector("[data-sticky-cart-bar]");
    if (!stickyBar) return;

    const observer = new MutationObserver(() => {
      const isBarVisible = stickyBar.classList.contains("translate-y-0");
      setStickyBarVisible(isBarVisible);
    });

    observer.observe(stickyBar, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Initial check
    const isBarVisible = stickyBar.classList.contains("translate-y-0");
    setStickyBarVisible(isBarVisible);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`lg:hidden fixed left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4 transition-all duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-[80px]"
      } ${stickyBarVisible ? "bottom-[77px]" : "bottom-4"}`}
    >
      <div className="h-16 bg-white/90 backdrop-blur-lg border border-gray-200 rounded-full shadow-2xl flex items-center justify-between px-2">
        {/* Home */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <Home className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Home</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Home
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Search */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <Search className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Search</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Search
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Departments */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full bg-red-600 transition-colors"
          >
            <LayoutGrid className="w-6 h-6 text-white" />
            <span className="sr-only">Departments</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Departments
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Cart */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <ShoppingCart className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Cart</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Cart
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Account */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <User className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Account</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Account
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>
      </div>
    </div>
  );
};
