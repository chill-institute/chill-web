import { useSyncExternalStore } from "react";

// Experimental, device-local preference; promote to SearchSettings if it sticks.
const GROUP_RELEASES_STORAGE_KEY = "chill.search.groupReleases";

function readStored(): boolean {
  try {
    return window.localStorage.getItem(GROUP_RELEASES_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

let snapshot: boolean | undefined;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function handleStorage(event: StorageEvent) {
  if (event.key !== GROUP_RELEASES_STORAGE_KEY) return;
  snapshot = readStored();
  notify();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", handleStorage);
  };
}

function getSnapshot(): boolean {
  snapshot ??= readStored();
  return snapshot;
}

function setGroupReleases(next: boolean) {
  snapshot = next;
  try {
    if (next) window.localStorage.setItem(GROUP_RELEASES_STORAGE_KEY, "1");
    else window.localStorage.removeItem(GROUP_RELEASES_STORAGE_KEY);
  } catch {
    /* storage unavailable: the choice lasts for this page load */
  }
  notify();
}

export function useGroupReleases(): [boolean, (next: boolean) => void] {
  return [useSyncExternalStore(subscribe, getSnapshot, () => false), setGroupReleases];
}
