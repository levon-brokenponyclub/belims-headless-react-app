import React from "react";
import { Home, Search, LayoutGrid, ShoppingCart, User } from "lucide-react";

export const MobileBottomNav: React.FC = () => {
  return (
    <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-4">
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
