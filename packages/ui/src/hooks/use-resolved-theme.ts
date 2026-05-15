import { useEffect, useState } from "react";

type ResolvedTheme = "light" | "dark";

function readIsDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useResolvedTheme(): ResolvedTheme {
  const [isDark, setIsDark] = useState(() => readIsDark());
  useEffect(() => {
    const update = () => setIsDark(readIsDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    update();
    return () => observer.disconnect();
  }, []);
  return isDark ? "dark" : "light";
}
