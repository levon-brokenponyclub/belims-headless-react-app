const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (value: Date): Date => {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
};

const dayDiffFromToday = (target: Date): number => {
  const today = startOfDay(new Date());
  const normalizedTarget = startOfDay(target);
  return Math.max(
    0,
    Math.ceil((normalizedTarget.getTime() - today.getTime()) / DAY_MS),
  );
};

const parseDate = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value.trim());
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

export const normalizeEtaDays = (
  etaDate?: string,
  etaText?: string,
): number | undefined => {
  const fromDate = parseDate(etaDate);
  if (fromDate) {
    return dayDiffFromToday(fromDate);
  }

  const text = (etaText ?? "").toLowerCase();
  if (!text) {
    return undefined;
  }

  if (text.includes("today")) {
    return 0;
  }

  if (text.includes("tomorrow")) {
    return 1;
  }

  const range = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(business\s*)?days?/i);
  if (range) {
    return Number(range[1]);
  }

  const single = text.match(/(\d+)\s*(business\s*)?days?/i);
  if (single) {
    return Number(single[1]);
  }

  if (text.includes("this week")) {
    return 5;
  }

  return undefined;
};
