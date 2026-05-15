import { useSyncExternalStore } from "react";

const MODE_KEY = "chill.search.displayMode";
const LEGACY_STORAGE_KEYS = ["chill.search.showMetaLine"] as const;
const MODE_DEFAULT: SearchDisplayMode = "detailed";

export type SearchDisplayMode = "raw" | "detailed";

export const SEARCH_DISPLAY_MODES: ReadonlyArray<SearchDisplayMode> = ["raw", "detailed"];

export const SEARCH_DISPLAY_MODE_LABELS: Record<SearchDisplayMode, string> = {
  raw: "Release name only",
  detailed: "Release name with details",
};

export function isSearchDisplayMode(value: string | null): value is SearchDisplayMode {
  return value === "raw" || value === "detailed";
}

function migrateLegacyValue(raw: string | null): SearchDisplayMode | null {
  if (raw === "legacy") return "raw";
  if (raw === "clean" || raw === "full") return "detailed";
  return null;
}

function readFromStorage(): SearchDisplayMode {
  if (typeof window === "undefined") return MODE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(MODE_KEY);
    if (isSearchDisplayMode(raw)) return raw;
    const migrated = migrateLegacyValue(raw);
    if (migrated) {
      window.localStorage.setItem(MODE_KEY, migrated);
      return migrated;
    }
  } catch {
    // localStorage unavailable
  }
  return MODE_DEFAULT;
}

let snapshot: SearchDisplayMode = readFromStorage();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) {
    window.addEventListener("storage", handleStorageEvent);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined" && listeners.size === 0) {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== MODE_KEY) return;
  const next = isSearchDisplayMode(event.newValue) ? event.newValue : MODE_DEFAULT;
  if (next === snapshot) return;
  snapshot = next;
  notify();
}

function getSnapshot(): SearchDisplayMode {
  return snapshot;
}

function getServerSnapshot(): SearchDisplayMode {
  return MODE_DEFAULT;
}

function setMode(next: SearchDisplayMode): void {
  if (next === snapshot) return;
  snapshot = next;
  try {
    window.localStorage.setItem(MODE_KEY, next);
  } catch (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[chill] failed to persist search display mode", error);
    }
  }
  notify();
}

if (typeof window !== "undefined") {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // localStorage unavailable; nothing to clean up
    }
  }
}

export function useSearchDisplay(): {
  mode: SearchDisplayMode;
  setMode: (next: SearchDisplayMode) => void;
} {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { mode, setMode };
}
