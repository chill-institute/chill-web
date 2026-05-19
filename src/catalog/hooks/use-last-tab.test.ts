import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { readLastTab, writeLastTab } from "./use-last-tab";

const storage = new Map<string, string>();

function installWindowStorage() {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
    },
  });
}

beforeEach(() => {
  storage.clear();
  installWindowStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("last catalog tab storage", () => {
  it("defaults to movies without a stored tab", () => {
    expect(readLastTab()).toBe("movies");
  });

  it("round-trips the last selected tab", () => {
    writeLastTab("tv-shows");

    expect(storage.get("chill.catalog.last_tab")).toBe("tv-shows");
    expect(readLastTab()).toBe("tv-shows");
  });

  it("ignores unrecognized stored values", () => {
    storage.set("chill.catalog.last_tab", "settings");

    expect(readLastTab()).toBe("movies");
  });

  it("keeps rendering defaults when storage is unavailable", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });

    expect(readLastTab()).toBe("movies");
    expect(() => writeLastTab("tv-shows")).not.toThrow();
  });
});
