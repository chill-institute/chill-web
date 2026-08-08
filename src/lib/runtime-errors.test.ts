import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  handleVitePreloadError,
  isAbortLikeError,
  isPreloadRecoveryPending,
  moduleLoadRecoveryTags,
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution,
} from "./runtime-errors";

describe("isAbortLikeError", () => {
  it("recognizes browser and text abort errors", () => {
    expect(isAbortLikeError(new DOMException("The user aborted a request.", "AbortError"))).toBe(
      true,
    );
    expect(isAbortLikeError(new Error("Request canceled"))).toBe(true);
    expect(isAbortLikeError("operation cancelled")).toBe(true);
    expect(isAbortLikeError(new Error("provider unavailable"))).toBe(false);
  });
});

describe("preload recovery without session storage", () => {
  let replaceSpy: ReturnType<typeof vi.fn>;
  let replaceStateSpy: ReturnType<typeof vi.fn>;

  function stubWindow({
    href,
    storageEntries = [],
    storageThrows,
  }: {
    href: string;
    storageEntries?: [string, string][];
    storageThrows: boolean;
  }) {
    const storage = new Map(storageEntries);
    replaceSpy = vi.fn();
    replaceStateSpy = vi.fn();
    vi.stubGlobal("window", {
      history: {
        state: { route: "search" },
        replaceState: replaceStateSpy,
      },
      location: {
        href,
        replace: replaceSpy,
      },
      sessionStorage: {
        getItem(key: string) {
          if (storageThrows) throw new Error("storage blocked");
          return storage.get(key) ?? null;
        },
        removeItem() {
          if (storageThrows) throw new Error("storage blocked");
        },
        setItem() {
          if (storageThrows) throw new Error("storage blocked");
        },
      },
    });
  }

  beforeEach(() => {
    stubWindow({ href: "https://chill.institute/search", storageThrows: false });
  });

  afterEach(() => {
    stubWindow({
      href: "https://chill.institute/?__chill_reload=test-cleanup",
      storageThrows: false,
    });
    resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution([{ status: "success" }]);
    vi.unstubAllGlobals();
  });

  it("defers to TanStack Router when session storage works", () => {
    const event = { preventDefault: vi.fn() };

    expect(handleVitePreloadError(event)).toBe(false);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("reloads once with a URL guard when session storage throws", () => {
    stubWindow({ href: "https://chill.institute/search", storageThrows: true });
    const firstEvent = { preventDefault: vi.fn() };
    const secondEvent = { preventDefault: vi.fn() };

    expect(handleVitePreloadError(firstEvent)).toBe(true);
    expect(handleVitePreloadError(secondEvent)).toBe(false);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(isPreloadRecoveryPending()).toBe(true);
    expect(String(replaceSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/chill\.institute\/search\?__chill_reload=\d+$/,
    );
    expect(firstEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(secondEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("does not reload when the fallback marker is already present", () => {
    stubWindow({
      href: "https://chill.institute/search?__chill_reload=123",
      storageThrows: true,
    });

    const event = { preventDefault: vi.fn() };

    expect(handleVitePreloadError(event)).toBe(false);
    expect(replaceSpy).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it("keeps the marker through errors and clears it after route success", () => {
    stubWindow({
      href: "https://chill.institute/search?__chill_reload=123&q=matrix",
      storageThrows: false,
    });

    expect(resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution([{ status: "error" }])).toBe(
      false,
    );
    expect(replaceStateSpy).not.toHaveBeenCalled();

    expect(
      resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution([{ status: "success" }]),
    ).toBe(true);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      { route: "search" },
      "",
      new URL("https://chill.institute/search?q=matrix"),
    );
  });
});

describe("moduleLoadRecoveryTags", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("identifies a terminal Safari module failure after the TanStack reload", () => {
    const message = "Importing a module script failed.";
    vi.stubGlobal("window", {
      location: { href: "https://chill.institute/movies" },
      sessionStorage: {
        getItem: (key: string) => (key === `tanstack_router_reload:${message}` ? "1" : null),
      },
    });

    expect(moduleLoadRecoveryTags(new TypeError(message))).toEqual({
      module_load_failure: "true",
      module_recovery_attempted: "true",
      module_recovery_strategy: "tanstack_session",
    });
  });

  it("identifies a recoverable module failure before the TanStack reload", () => {
    vi.stubGlobal("window", {
      location: { href: "https://chill.institute/movies" },
      sessionStorage: { getItem: () => null },
    });

    expect(moduleLoadRecoveryTags(new TypeError("Importing a module script failed."))).toEqual({
      module_load_failure: "true",
      module_recovery_attempted: "false",
      module_recovery_strategy: "tanstack_session",
    });
  });

  it("keeps recovery state unknown when session storage is blocked", () => {
    vi.stubGlobal("window", {
      location: { href: "https://chill.institute/movies" },
      sessionStorage: {
        getItem() {
          throw new Error("storage blocked");
        },
      },
    });

    expect(moduleLoadRecoveryTags(new TypeError("Importing a module script failed."))).toEqual({
      module_load_failure: "true",
      module_recovery_attempted: "unknown",
      module_recovery_strategy: "vite_url",
    });
  });

  it("identifies the URL fallback after storage-unavailable recovery", () => {
    vi.stubGlobal("window", {
      location: { href: "https://chill.institute/search?__chill_reload=123" },
      sessionStorage: {
        getItem() {
          throw new Error("storage blocked");
        },
      },
    });

    expect(moduleLoadRecoveryTags(new TypeError("Importing a module script failed."))).toEqual({
      module_load_failure: "true",
      module_recovery_attempted: "true",
      module_recovery_strategy: "vite_url",
    });
  });

  it("does not tag unrelated application errors", () => {
    expect(moduleLoadRecoveryTags(new Error("provider unavailable"))).toEqual({});
  });
});
