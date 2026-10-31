/** Store-wide date format: "29 Oct 2026" (en-ZA). */
export const formatDate = (value: string | number | Date): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
};
