import { useEffect, useState, useSyncExternalStore } from "react";

export type ThemePreference = "dark" | "light" | "system";

const THEME_STORAGE_KEY = "chill.theme";
const LIGHT_THEME_COLOR = "#d6d3d1";
const DARK_THEME_COLOR = "#292524";

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* empty */
  }
  return "system";
}

let themeSnapshot: ThemePreference = readStoredTheme();
const themeListeners = new Set<() => void>();

function notifyTheme(): void {
  for (const listener of themeListeners) listener();
}

function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  if (typeof window !== "undefined" && themeListeners.size === 1) {
    window.addEventListener("storage", handleThemeStorageEvent);
  }
  return () => {
    themeListeners.delete(listener);
    if (typeof window !== "undefined" && themeListeners.size === 0) {
      window.removeEventListener("storage", handleThemeStorageEvent);
    }
  };
}

function handleThemeStorageEvent(event: StorageEvent): void {
  if (event.key !== THEME_STORAGE_KEY) return;
  const next = isThemePreference(event.newValue) ? event.newValue : "system";
  if (next === themeSnapshot) return;
  themeSnapshot = next;
  notifyTheme();
}

function getThemeSnapshot(): ThemePreference {
  return themeSnapshot;
}

function getThemeServerSnapshot(): ThemePreference {
  return "system";
}

function useSystemTheme() {
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return systemDark;
}

function applyTheme(theme: ThemePreference, systemDark: boolean) {
  const isDark = theme === "dark" || (theme === "system" && systemDark);
  const color = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.cssText = `color-scheme: ${isDark ? "dark" : "light"}; background-color: ${color};`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
}

function setThemeStore(next: ThemePreference): void {
  if (next === themeSnapshot) return;
  themeSnapshot = next;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[chill] failed to persist theme preference", error);
    }
  }
  notifyTheme();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const systemDark = useSystemTheme();

  useEffect(() => {
    applyTheme(theme, systemDark);
  }, [theme, systemDark]);

  return { theme, setTheme: setThemeStore, systemDark };
}
