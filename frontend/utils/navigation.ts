/** Route changes requested from outside React components (services, toast actions); handled in App. */
export const NAVIGATE_EVENT = "belims:navigate";

export const requestNavigation = (path: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(NAVIGATE_EVENT, { detail: path }));
};
