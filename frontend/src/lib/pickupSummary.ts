import { Store } from "../../types";

export type PickupStatus = {
  label: string;
  detail?: string;
  isOpen: boolean;
};

const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const parseTimeToMinutes = (value?: string) => {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatTimeLabel = (value?: string) => {
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

const getNextOpenDay = (
  hours: NonNullable<Store["hours"]>,
  startIndex: number,
) => {
  for (let offset = 1; offset <= 7; offset += 1) {
    const index = (startIndex + offset) % 7;
    const dayKey = dayKeys[index];
    const dayHours = hours[dayKey];
    if (!dayHours || dayHours.closed) continue;
    if (!dayHours.open || !dayHours.close) continue;
    return { index, dayHours };
  }
  return null;
};

export const getPickupStatus = (store?: Store | null): PickupStatus | null => {
  if (!store?.hours) return null;

  const now = new Date();
  const dayKey = dayKeys[now.getDay()];
  const dayHours = store.hours[dayKey];

  if (!dayHours || dayHours.closed) {
    const nextOpen = getNextOpenDay(store.hours, now.getDay());
    if (nextOpen) {
      const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
      const nextLabel = isTomorrow
        ? "opens tomorrow"
        : `opens ${dayLabels[nextOpen.index]}`;
      return {
        label: "Closed",
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { label: "Closed", isOpen: false };
  }

  const openMinutes = parseTimeToMinutes(dayHours.open);
  const closeMinutes = parseTimeToMinutes(dayHours.close);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (openMinutes === null || closeMinutes === null) {
    return { label: "Closed", isOpen: false };
  }

  const breakStartMinutes = parseTimeToMinutes(dayHours.breakStart);
  const breakEndMinutes = parseTimeToMinutes(dayHours.breakEnd);

  if (
    breakStartMinutes !== null &&
    breakEndMinutes !== null &&
    nowMinutes >= breakStartMinutes &&
    nowMinutes < breakEndMinutes
  ) {
    return {
      label: "Closed",
      detail: `reopens ${formatTimeLabel(dayHours.breakEnd)}`,
      isOpen: false,
    };
  }

  if (nowMinutes < openMinutes) {
    return {
      label: "Closed",
      detail: `opens ${formatTimeLabel(dayHours.open)}`,
      isOpen: false,
    };
  }

  if (nowMinutes >= closeMinutes) {
    const nextOpen = getNextOpenDay(store.hours, now.getDay());
    if (nextOpen) {
      const isTomorrow = nextOpen.index === (now.getDay() + 1) % 7;
      const nextLabel = isTomorrow
        ? "opens tomorrow"
        : `opens ${dayLabels[nextOpen.index]}`;
      return {
        label: "Closed",
        detail: `${nextLabel} ${formatTimeLabel(nextOpen.dayHours.open)}`,
        isOpen: false,
      };
    }
    return { label: "Closed", isOpen: false };
  }

  if (nowMinutes >= closeMinutes - 60) {
    return {
      label: "Open",
      detail: `closing soon - closing at ${formatTimeLabel(dayHours.close)}`,
      isOpen: true,
    };
  }

  return {
    label: "Open",
    detail: `closing at ${formatTimeLabel(dayHours.close)}`,
    isOpen: true,
  };
};

export const formatScheduledPickup = (dateValue: string, timeValue: string) => {
  const parsed = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(parsed.getTime())) {
    return `${dateValue} at ${timeValue}`;
  }
  const dayLabel = parsed.toLocaleDateString("en-ZA", { weekday: "long" });
  const dateLabel = parsed.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
  });
  return `${dayLabel} ${dateLabel} at ${timeValue}`;
};

export const getStoredPickupDistance = (storeId?: string) => {
  if (!storeId || typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selectedPickupStoreDistance");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: string; distance?: number };
    if (parsed?.id === storeId && typeof parsed.distance === "number") {
      return parsed.distance;
    }
  } catch {
    return null;
  }
  return null;
};

export const formatPickupDistance = (distance?: number | null) => {
  if (typeof distance !== "number") return "Unavailable";
  return `${distance.toFixed(1)} km away from you`;
};
