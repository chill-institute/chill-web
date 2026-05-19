import { useSyncExternalStore } from "react";

type ResolvedTheme = "light" | "dark";

function readSnapshot(): ResolvedTheme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getServerSnapshot(): ResolvedTheme {
  return "light";
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot);
}
