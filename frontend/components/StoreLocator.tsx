import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { Store, Product } from "../types";

interface StoreLocatorProps {
  currentStore: Store | null;
  stores: Store[];
  pickupSchedule?: { date: string; time: string } | null;
  onSelectStore: (store: Store) => void;
  onSaveSchedule: (date: string, time: string) => void;
  onClose: () => void;
  checkingProduct?: Product;
}

export const StoreLocator: React.FC<StoreLocatorProps> = ({
  currentStore,
  stores,
  pickupSchedule,
  onSelectStore,
  onSaveSchedule,
  onClose,
  checkingProduct,
}) => {
  const [storeList, setStoreList] = useState(stores);
  const [searchTerm, setSearchTerm] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [isScheduleSaved, setIsScheduleSaved] = useState(false);
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  useEffect(() => {
    let nextStores = stores;
    try {
      const rawDistance = localStorage.getItem("selectedPickupStoreDistance");
      if (rawDistance) {
        const parsed = JSON.parse(rawDistance) as {
          id?: string;
          distance?: number;
        };
        if (parsed?.id && typeof parsed.distance === "number") {
          nextStores = stores.map((store) =>
            store.id === parsed.id
              ? { ...store, distance: parsed.distance }
              : store,
          );
        }
      }
    } catch {
      nextStores = stores;
    }
    setStoreList(nextStores);
  }, [stores]);

  useEffect(() => {
    if (pickupSchedule?.date) {
      setPickupDate(pickupSchedule.date);
    }
    if (pickupSchedule?.time) {
      setPickupTime(pickupSchedule.time);
    }
  }, [pickupSchedule?.date, pickupSchedule?.time]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const toRadians = (value: number) => (value * Math.PI) / 180;
          const getDistanceKm = (
            lat1: number,
            lon1: number,
            lat2: number,
            lon2: number,
          ) => {
            const earthRadiusKm = 6371;
            const deltaLat = toRadians(lat2 - lat1);
            const deltaLon = toRadians(lon2 - lon1);
            const a =
              Math.sin(deltaLat / 2) ** 2 +
              Math.cos(toRadians(lat1)) *
                Math.cos(toRadians(lat2)) *
                Math.sin(deltaLon / 2) ** 2;
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return Math.round(earthRadiusKm * c * 10) / 10;
          };

          const withDistances = storeList.map((store) => {
            if (
              typeof store.latitude !== "number" ||
              typeof store.longitude !== "number"
            ) {
              return store;
            }
            return {
              ...store,
              distance: getDistanceKm(
                latitude,
                longitude,
                store.latitude,
                store.longitude,
              ),
            };
          });

          const sorted = [...withDistances].sort(
            (a, b) => (a.distance || 0) - (b.distance || 0),
          );
          setStoreList(sorted);

          const selectedId = currentStore?.id;
          if (selectedId) {
            const matched = sorted.find((store) => store.id === selectedId);
            if (matched && typeof matched.distance === "number") {
              localStorage.setItem(
                "selectedPickupStoreDistance",
                JSON.stringify({
                  id: matched.id,
                  distance: matched.distance,
                }),
              );
              localStorage.setItem(
                "selectedPickupStore",
                JSON.stringify(matched),
              );
            }
          }
        },
        () => {},
      );
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) {
      setPickupDate("");
      setIsScheduleSaved(false);
      return;
    }
    if (!isDateSelectable(value)) {
      setPickupDate("");
      setPickupTime("");
      setIsScheduleSaved(false);
      return;
    }
    setPickupDate(value);
    setIsScheduleSaved(false);
  };

  const parseTimeToMinutes = (value?: string) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map((part) => Number(part));
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const getHoursForDate = (dateValue: string) => {
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    const dayKey = dayKeys[parsed.getDay()];
    return currentStore?.hours?.[dayKey] || null;
  };

  const isDateSelectable = (dateValue: string) => {
    const hours = getHoursForDate(dateValue);
    if (!hours || hours.closed) return false;
    if (!hours.open || !hours.close) return false;
    return true;
  };

  const getAvailableTimes = (dateValue?: string | null) => {
    if (!dateValue) return [] as string[];
    const hours = getHoursForDate(dateValue);
    if (!hours || hours.closed) return [] as string[];
    const openMinutes = parseTimeToMinutes(hours.open);
    const closeMinutes = parseTimeToMinutes(hours.close);
    if (openMinutes === null || closeMinutes === null) return [] as string[];
    const breakStart = parseTimeToMinutes(hours.breakStart);
    const breakEnd = parseTimeToMinutes(hours.breakEnd);

    return timeOptions.filter((option) => {
      const minutes = parseTimeToMinutes(option);
      if (minutes === null) return false;
      if (minutes < openMinutes || minutes > closeMinutes) return false;
      if (
        breakStart !== null &&
        breakEnd !== null &&
        minutes >= breakStart &&
        minutes < breakEnd
      ) {
        return false;
      }
      return true;
    });
  };

  const timeOptions = Array.from({ length: 48 }, (_, index) => {
    const minutes = index * 30;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  });

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (!value) {
      setPickupTime("");
      setIsScheduleSaved(false);
      return;
    }
    const available = getAvailableTimes(pickupDate);
    if (!pickupDate || !available.includes(value)) {
      setPickupTime("");
      setIsScheduleSaved(false);
      return;
    }
    setPickupTime(value);
    setIsScheduleSaved(false);
  };

  const handleSaveSchedule = () => {
    if (!pickupDate || !pickupTime) {
      alert("Please select a pickup date and time.");
      return;
    }

    onSaveSchedule(pickupDate, pickupTime);
    setIsScheduleSaved(true);
    onClose();
  };

  useEffect(() => {
    if (!pickupDate) {
      if (pickupTime) setPickupTime("");
      return;
    }
    const available = getAvailableTimes(pickupDate);
    if (pickupTime && !available.includes(pickupTime)) {
      setPickupTime("");
    }
  }, [pickupDate, currentStore]);

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

  const formatTime12 = (value?: string) => {
    if (!value) return "";
    const [hoursValue, minutesValue] = value.split(":").map(Number);
    if (Number.isNaN(hoursValue) || Number.isNaN(minutesValue)) return value;
    const suffix = hoursValue >= 12 ? "pm" : "am";
    const normalizedHours = hoursValue % 12 || 12;
    if (minutesValue === 0) {
      return `${normalizedHours}${suffix}`;
    }
    return `${normalizedHours}:${String(minutesValue).padStart(2, "0")}${suffix}`;
  };

  const getStoreStatus = (store: Store) => {
    const now = new Date();
    const hours = store.hours?.[dayKeys[now.getDay()]] || null;
    if (!hours || hours.closed || !hours.open || !hours.close) {
      return {
        label: "Closed",
        detail: "Hours unavailable",
        isOpen: false,
      };
    }

    const openMinutes = parseTimeToMinutes(hours.open);
    const closeMinutes = parseTimeToMinutes(hours.close);
    if (openMinutes === null || closeMinutes === null) {
      return {
        label: "Closed",
        detail: "Hours unavailable",
        isOpen: false,
      };
    }

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const breakStart = parseTimeToMinutes(hours.breakStart);
    const breakEnd = parseTimeToMinutes(hours.breakEnd);
    const isOnBreak =
      breakStart !== null &&
      breakEnd !== null &&
      nowMinutes >= breakStart &&
      nowMinutes < breakEnd;

    if (nowMinutes >= openMinutes && nowMinutes < closeMinutes && !isOnBreak) {
      return {
        label: "Open",
        detail: `Closes ${formatTime12(hours.close)}`,
        isOpen: true,
      };
    }

    if (isOnBreak && breakEnd !== null) {
      return {
        label: "Closed",
        detail: `Reopens ${formatTime12(hours.breakEnd)}`,
        isOpen: false,
      };
    }

    if (nowMinutes < openMinutes) {
      return {
        label: "Closed",
        detail: `Opens today ${formatTime12(hours.open)}`,
        isOpen: false,
      };
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowHours = store.hours?.[dayKeys[tomorrow.getDay()]] || null;
    const tomorrowOpen = tomorrowHours?.open
      ? formatTime12(tomorrowHours.open)
      : "";
    return {
      label: "Closed",
      detail: tomorrowOpen
        ? `Opens tomorrow ${tomorrowOpen}`
        : "Hours unavailable",
      isOpen: false,
    };
  };

  const filteredStores = storeList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.address || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const availableTimesForDate = pickupDate ? getAvailableTimes(pickupDate) : [];
  const isTimeDisabled = availableTimesForDate.length === 0;

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative bg-white w-full max-w-md rounded-lg shadow-sm overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5  bg-belims-blue flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-lg bg-blue-50 text-belims-blue flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Schedule pickup
              </h2>

              <p className="text-sm text-white/90 line-clamp-1 max-w-[300px]">
                Choose your preferred pickup date and time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white bg-[#3b308e] hover:bg-[#251e62] w-[40px] h-[40px] rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* <div className="p-4 border-b bg-gray-50">
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
        </div> */}

        {/* <div className="overflow-y-auto flex-1 p-4 pb-2 space-y-0">
          {filteredStores.map((store) => {
            const stock = getStockStatus(store.id);
            return (
              <div
                key={store.id}
                className={`border p-3 rounded-lg cursor-pointer hover:border-belims-blue transition-all ${currentStore?.id === store.id ? "mt-3 bg-gray-50 p-4 rounded-md border border-gray-200 space-y-1" : "border-gray-100 hover:bg-gray-50"}`}
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
                      {(() => {
                        const status = getStoreStatus(store);
                        return (
                          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-bold">
                            <span
                              className={
                                status.isOpen
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {status.label}
                            </span>
                            <span className="text-gray-500">
                              {status.detail ? ` - ${status.detail}` : ""}
                            </span>
                          </span>
                        );
                      })()}
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
                      {typeof store.distance === "number"
                        ? `${store.distance} km`
                        : "Distance unavailable"}
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
        </div> */}

        <div className="p-4">
          <div className="">
            <div className="text-sm font-semibold text-gray-900">
              Schedule pickup
            </div>
            <div className="mt-1 text-xs text-gray-600">
              Choose your preferred pickup date and time.
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="text-xs font-semibold text-gray-700">
                Date
                <input
                  type="date"
                  value={pickupDate}
                  onChange={handleDateChange}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-belims-blue outline-none"
                />
              </label>
              <label className="text-xs font-semibold text-gray-700">
                Time
                <input
                  type="time"
                  value={pickupTime}
                  onChange={handleTimeChange}
                  step={1800}
                  disabled={isTimeDisabled}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-belims-blue outline-none disabled:bg-gray-100 disabled:text-gray-400"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleSaveSchedule}
              className="mt-4 w-full rounded bg-belims-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-belims-navy"
            >
              Save pickup time
            </button>
            {isScheduleSaved && (
              <div className="mt-2 text-[11px] font-semibold text-green-600">
                Pickup time saved.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
