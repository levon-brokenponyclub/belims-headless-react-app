import React from "react";
import { Home, Wallet, Plus, Settings, User } from "lucide-react";

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

        {/* Wallet */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <Wallet className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Wallet</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Wallet
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Plus Button (Center) */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex items-center justify-center w-10 h-10 bg-belims-blue text-white rounded-full shadow-lg hover:bg-belims-blue/90 hover:scale-110 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
            <span className="sr-only">New item</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Create new
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Settings */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <Settings className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Settings</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Settings
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>

        {/* Profile */}
        <div className="relative group flex-1 flex justify-center">
          <button
            type="button"
            className="flex flex-col items-center justify-center w-12 h-12 rounded-full hover:bg-gray-100 transition-colors group"
          >
            <User className="w-6 h-6 text-gray-500 group-hover:text-belims-blue transition-colors" />
            <span className="sr-only">Profile</span>
          </button>
          <div className="absolute bottom-full mb-3 px-3 py-1 bg-belims-navy text-white text-[10px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
            Profile
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[5px] border-t-belims-navy" />
          </div>
        </div>
      </div>
    </div>
  );
};
