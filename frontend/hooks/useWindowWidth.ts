import { useEffect, useState } from "react";

export const useWindowWidth = (fallback = 1024) => {
  const [width, setWidth] = useState<number>(() =>
    typeof window === "undefined" ? fallback : window.innerWidth,
  );

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
};
