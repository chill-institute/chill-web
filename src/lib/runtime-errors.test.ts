import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  handleVitePreloadError,
  handleUnhandledRejection,
  isAbortLikeError,
  isServiceWorkerRegistrationError,
  resetAssetSkewReloadGuardAfterReload,
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

describe("isServiceWorkerRegistrationError", () => {
  it("recognizes generated service worker registration failures", () => {
    const rejected = new Error("Rejected");
    rejected.stack = "Error: Rejected\n    at /registerSW.js:1:98\n    at serviceWorker.register";

    expect(isServiceWorkerRegistrationError(rejected)).toBe(true);
    expect(
      isServiceWorkerRegistrationError(
        new TypeError("Script https://chill.institute/sw.js load failed"),
      ),
    ).toBe(true);
    expect(isServiceWorkerRegistrationError(new Error("Rejected"))).toBe(false);
  });
});

describe("setupRuntimeErrorHandlers", () => {
  const sessionStorage = new Map<string, string>();
  let replaceStateSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  function stubWindow(href: string) {
    vi.stubGlobal("window", {
      history: {
        state: { route: "movies" },
        replaceState: replaceStateSpy,
      },
      location: {
        href,
        replace: replaceSpy,
      },
      sessionStorage: {
        getItem: (key: string) => sessionStorage.get(key) ?? null,
        removeItem: (key: string) => sessionStorage.delete(key),
        setItem: (key: string, value: string) => sessionStorage.set(key, value),
      },
    });
  }

  beforeEach(() => {
    sessionStorage.clear();
    replaceStateSpy = vi.fn();
    replaceSpy = vi.fn();
    stubWindow("https://chill.institute/movies");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prevents Vite preload errors only when scheduling the one-shot reload", () => {
    let firstPrevented = false;
    let secondPrevented = false;

    handleVitePreloadError({
      preventDefault() {
        firstPrevented = true;
      },
    });
    handleVitePreloadError({
      preventDefault() {
        secondPrevented = true;
      },
    });

    expect(firstPrevented).toBe(true);
    expect(secondPrevented).toBe(false);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(String(replaceSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/chill\.institute\/movies\?__chill_reload=\d+$/,
    );
  });

  it("still schedules the one-shot preload recovery when session storage is unavailable", () => {
    vi.stubGlobal("window", {
      history: {
        state: null,
        replaceState: replaceStateSpy,
      },
      location: {
        href: "https://chill.institute/search",
        replace: replaceSpy,
      },
      sessionStorage: {
        getItem() {
          throw new Error("storage blocked");
        },
        removeItem() {
          throw new Error("storage blocked");
        },
        setItem() {
          throw new Error("storage blocked");
        },
      },
    });
    let defaultPrevented = false;

    handleVitePreloadError({
      preventDefault() {
        defaultPrevented = true;
      },
    });

    expect(defaultPrevented).toBe(true);
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(String(replaceSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/chill\.institute\/search\?__chill_reload=\d+$/,
    );
  });

  it("lets preload errors surface when the URL already carries the reload marker", () => {
    stubWindow("https://chill.institute/search?__chill_reload=123");
    let defaultPrevented = false;

    handleVitePreloadError({
      preventDefault() {
        defaultPrevented = true;
      },
    });

    expect(defaultPrevented).toBe(false);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("clears the Vite preload reload guard after a cache-busted reload succeeds", () => {
    sessionStorage.set("chill.asset-skew-reload.v1", "1");
    stubWindow("https://chill.institute/movies?__chill_reload=123&sort=recent");

    resetAssetSkewReloadGuardAfterReload();

    expect(sessionStorage.has("chill.asset-skew-reload.v1")).toBe(false);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      { route: "movies" },
      "",
      new URL("https://chill.institute/movies?sort=recent"),
    );
  });

  it("prevents global reporting for unhandled abort rejections", () => {
    let defaultPrevented = false;
    let propagationStopped = false;

    handleUnhandledRejection({
      reason: new DOMException("The user aborted a request.", "AbortError"),
      preventDefault() {
        defaultPrevented = true;
      },
      stopImmediatePropagation() {
        propagationStopped = true;
      },
    });

    expect(defaultPrevented).toBe(true);
    expect(propagationStopped).toBe(true);
  });

  it("prevents global reporting for generated service worker registration failures", () => {
    const rejected = new Error("Rejected");
    rejected.stack = "Error: Rejected\n    at /registerSW.js:1:98\n    at serviceWorker.register";
    let defaultPrevented = false;
    let propagationStopped = false;

    handleUnhandledRejection({
      reason: rejected,
      preventDefault() {
        defaultPrevented = true;
      },
      stopImmediatePropagation() {
        propagationStopped = true;
      },
    });

    expect(defaultPrevented).toBe(true);
    expect(propagationStopped).toBe(true);
  });
});
