import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { STORES } from "../constants";
import { Store, Product } from "../types";

interface StoreLocatorProps {
  currentStore: Store | null;
  onSelectStore: (store: Store) => void;
  onClose: () => void;
  checkingProduct?: Product;
}

export const StoreLocator: React.FC<StoreLocatorProps> = ({
  currentStore,
  onSelectStore,
  onClose,
  checkingProduct,
}) => {
  const [stores, setStores] = useState(STORES);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [searchMode, setSearchMode] = useState<"list" | "manual">("list");

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Mock distance sort
          const sorted = [...stores].sort(
            (a, b) => (a.distance || 0) - (b.distance || 0),
          );
          setStores(sorted);
          alert("Location found! Showing closest stores.");
        },
        (error) => {
          alert("Could not fetch location. Please search manually.");
          setSearchMode("manual");
        },
      );
    }
  };

  const getStockStatus = (storeId: string) => {
    if (!checkingProduct) return null;
    // Mock logic: Randomize stock status for demo
    // In real CMS, this would query `wooCommerceService.checkStock(storeId, productId)`
    const hash = (storeId.charCodeAt(0) + checkingProduct.id.charCodeAt(0)) % 3;
    if (hash === 0)
      return {
        status: "In Stock",
        color: "text-green-600",
        icon: <CheckCircle size={14} />,
      };
    if (hash === 1)
      return {
        status: "Low Stock",
        color: "text-yellow-600",
        icon: <AlertTriangle size={14} />,
      };
    return {
      status: "Out of Stock",
      color: "text-red-500",
      icon: <XCircle size={14} />,
    };
  };

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.address.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 bg-belims-blue text-white flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 font-heading">
              <MapPin size={20} />{" "}
              {checkingProduct ? "Check Availability" : "Find a Store"}
            </h2>
            {checkingProduct && (
              <p className="text-xs text-blue-200 line-clamp-1 max-w-[300px]">
                {checkingProduct.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="City, Zip, or Address"
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-belims-blue outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              onClick={handleLocateMe}
              className="bg-white border border-gray-300 px-3 py-2 rounded text-belims-blue hover:bg-gray-100 transition-colors"
              title="Use Current Location"
            >
              <Navigation size={18} />
            </button>
          </div>
          <div
            className="text-xs text-gray-500 text-center cursor-pointer hover:underline"
            onClick={() =>
              setSearchMode(searchMode === "list" ? "manual" : "list")
            }
          >
            {searchMode === "list"
              ? "Or enter a specific street address"
              : "Back to list"}
          </div>
        </div>

        {searchMode === "manual" ? (
          <div className="p-6 text-center">
            <h3 className="font-bold text-gray-800 mb-2">
              Enter Delivery Address
            </h3>
            <input
              type="text"
              placeholder="Street Address, Suburb"
              className="w-full border p-2 rounded mb-4"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
            />
            <button
              className="bg-belims-blue text-white w-full py-2 rounded font-bold"
              onClick={() => {
                alert(`Address set to: ${manualAddress}`);
                onClose();
              }}
            >
              Update Location
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {filteredStores.map((store) => {
              const stock = getStockStatus(store.id);
              return (
                <div
                  key={store.id}
                  className={`border p-3 rounded-lg cursor-pointer hover:border-belims-blue transition-all ${currentStore?.id === store.id ? "border-belims-blue bg-blue-50 shadow-sm" : "border-gray-100 hover:bg-gray-50"}`}
                  onClick={() => {
                    onSelectStore(store);
                    onClose();
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 text-sm">
                        {store.name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-1">
                        {store.address}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold">
                          Open until 9PM
                        </span>
                        {stock && (
                          <span
                            className={`text-[10px] flex items-center gap-1 font-bold ${stock.color}`}
                          >
                            {stock.icon} {stock.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 block">
                        {store.distance} km
                      </span>
                      {currentStore?.id === store.id && (
                        <span className="text-[10px] font-bold text-white bg-belims-blue px-2 py-0.5 rounded-full mt-2 inline-block">
                          Selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
