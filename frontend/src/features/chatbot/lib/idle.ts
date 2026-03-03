export const createIdleDetector = (
  onIdle: () => void,
  timeoutMs = 60_000,
): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let idleTimer: number | undefined;

  const resetTimer = () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
    }
    idleTimer = window.setTimeout(() => {
      onIdle();
    }, timeoutMs);
  };

  const events: Array<keyof WindowEventMap> = [
    "mousemove",
    "keydown",
    "scroll",
    "click",
    "touchstart",
  ];

  events.forEach((eventName) => {
    window.addEventListener(eventName, resetTimer, { passive: true });
  });

  resetTimer();

  return () => {
    if (idleTimer) {
      window.clearTimeout(idleTimer);
    }
    events.forEach((eventName) => {
      window.removeEventListener(eventName, resetTimer);
    });
  };
};
