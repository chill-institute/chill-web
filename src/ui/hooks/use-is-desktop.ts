import { useSyncExternalStore } from "react";

const DESKTOP_MIN_WIDTH = "(min-width: 640px)";

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      if (typeof window === "undefined") return () => {};
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    },
    () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_MIN_WIDTH);
}
