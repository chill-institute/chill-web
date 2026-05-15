const LAST_TAB_STORAGE_KEY = "binge.last_tab";

export type CatalogTab = "movies" | "tv-shows";

export function readLastTab(): CatalogTab {
  if (typeof window === "undefined") return "movies";
  try {
    const raw = window.localStorage.getItem(LAST_TAB_STORAGE_KEY);
    if (raw === "movies" || raw === "tv-shows") return raw;
  } catch {
    // localStorage unavailable
  }
  return "movies";
}

export function writeLastTab(tab: CatalogTab): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_TAB_STORAGE_KEY, tab);
  } catch {
    // localStorage unavailable
  }
}
