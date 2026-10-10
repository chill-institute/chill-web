import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { isThemePreference } from "./use-theme";

const bootScript = readFileSync(new URL("../../../index.html", import.meta.url), "utf8");

// index.html paints the theme before the app loads; the store must repaint the same colors.
function bootColor(name: "darkColor" | "lightColor") {
  const color = bootScript.match(new RegExp(`const ${name} = "([^"]+)"`))?.[1];
  if (!color) throw new Error(`index.html boot script has no ${name}`);
  return color;
}

function createMapStorage() {
  const storage = new Map<string, string>();

  return {
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
    removeItem(key: string) {
      storage.delete(key);
    },
  };
}

function installThemeDOM(systemDark = false) {
  const localStorage = createMapStorage();
  const root = {
    classList: {
      toggle: vi.fn(),
    },
    style: {
      cssText: "",
    },
  };
  const meta = {
    setAttribute: vi.fn(),
  };
  let storageListener: ((event: Event) => void) | null = null;
  let systemListener: (() => void) | null = null;

  vi.stubGlobal("window", {
    localStorage,
    matchMedia: vi.fn(() => ({
      matches: systemDark,
      addEventListener: vi.fn((_eventName: string, listener: () => void) => {
        systemListener = listener;
      }),
      removeEventListener: vi.fn(),
    })),
    addEventListener: vi.fn((eventName: string, listener: EventListenerOrEventListenerObject) => {
      if (eventName === "storage" && typeof listener === "function") {
        storageListener = listener;
      }
    }),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal("document", {
    documentElement: root,
    querySelector: vi.fn(() => meta),
  });

  return {
    emitStorage(key: string, newValue: string | null) {
      const event = Object.assign(new Event("storage"), { key, newValue });
      storageListener?.(event);
    },
    emitSystemThemeChange() {
      systemListener?.();
    },
    localStorage,
    meta,
    root,
  };
}

async function loadThemeStore() {
  return await import("./theme-store");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("isThemePreference", () => {
  it("accepts the three valid preferences", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });

  it("rejects null, empty strings, and unknown values", () => {
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference("Dark")).toBe(false);
    expect(isThemePreference("auto")).toBe(false);
  });
});

describe("themeStore", () => {
  it("uses SSR-safe default snapshots", async () => {
    const themeStore = await loadThemeStore();

    expect(themeStore.getThemeServerSnapshot()).toBe("system");
    expect(themeStore.getSystemThemeServerSnapshot()).toBe(false);
    expect(themeStore.getSystemThemeSnapshot()).toBe(false);
  });

  it("reads stored preference snapshots on module load", async () => {
    const dom = installThemeDOM();
    dom.localStorage.setItem("chill.theme", "dark");

    const themeStore = await loadThemeStore();

    expect(themeStore.getThemeSnapshot()).toBe("dark");
  });

  it("persists and applies explicit theme updates", async () => {
    const dom = installThemeDOM();
    const themeStore = await loadThemeStore();

    themeStore.setThemeStore("dark");

    expect(dom.localStorage.getItem("chill.theme")).toBe("dark");
    expect(dom.root.classList.toggle).toHaveBeenLastCalledWith("dark", true);
    expect(dom.root.style.cssText).toContain("color-scheme: dark");
    expect(dom.root.style.cssText).toContain(`background-color: ${bootColor("darkColor")}`);
    expect(dom.meta.setAttribute).toHaveBeenLastCalledWith("content", bootColor("darkColor"));

    themeStore.setThemeStore("light");

    expect(dom.root.classList.toggle).toHaveBeenLastCalledWith("dark", false);
    expect(dom.root.style.cssText).toContain("color-scheme: light");
    expect(dom.root.style.cssText).toContain(`background-color: ${bootColor("lightColor")}`);
    expect(dom.meta.setAttribute).toHaveBeenLastCalledWith("content", bootColor("lightColor"));
  });

  it("syncs storage events into the preference snapshot", async () => {
    const dom = installThemeDOM();
    const themeStore = await loadThemeStore();
    const listener = vi.fn();
    const unsubscribe = themeStore.subscribeTheme(listener);

    dom.emitStorage("chill.theme", "dark");

    expect(themeStore.getThemeSnapshot()).toBe("dark");
    expect(dom.root.classList.toggle).toHaveBeenLastCalledWith("dark", true);
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("applies the current theme when subscribing to system theme changes", async () => {
    const dom = installThemeDOM(true);
    const themeStore = await loadThemeStore();
    const listener = vi.fn();

    const unsubscribe = themeStore.subscribeSystemTheme(listener);

    expect(dom.root.classList.toggle).toHaveBeenLastCalledWith("dark", true);
    expect(dom.root.style.cssText).toContain("color-scheme: dark");

    dom.emitSystemThemeChange();

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });
});
