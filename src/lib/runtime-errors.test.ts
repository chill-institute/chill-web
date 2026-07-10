import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  handleVitePreloadError,
  isAssetSkewReloadPending,
  isAbortLikeError,
  resetAssetSkewReloadGuardAfterSuccessfulRouteResolution,
  setupRuntimeErrorHandlers,
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

describe("setupRuntimeErrorHandlers", () => {
  const sessionStorage = new Map<string, string>();
  let eventTarget: EventTarget;
  let replaceStateSpy: ReturnType<typeof vi.fn>;
  let replaceSpy: ReturnType<typeof vi.fn>;

  function stubWindow(href: string) {
    eventTarget = Object.assign(new EventTarget(), {
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
    vi.stubGlobal("window", eventTarget);
  }

  beforeEach(() => {
    sessionStorage.clear();
    replaceStateSpy = vi.fn();
    replaceSpy = vi.fn();
    stubWindow("https://chill.institute/movies");
  });

  afterEach(() => {
    stubWindow("https://chill.institute/?__chill_reload=test-cleanup");
    resetAssetSkewReloadGuardAfterSuccessfulRouteResolution([{ status: "success" }]);
    vi.unstubAllGlobals();
  });

  it("keeps Vite preload failures rejected while scheduling the one-shot reload", async () => {
    const failure = new TypeError("Failed to fetch dynamically imported module");
    setupRuntimeErrorHandlers();

    const importResult = Promise.reject(failure).catch((error: unknown) => {
      const event = new Event("vite:preloadError", { cancelable: true });
      Object.defineProperty(event, "payload", { value: error });
      eventTarget.dispatchEvent(event);
      if (!event.defaultPrevented) throw error;
    });

    await expect(importResult).rejects.toBe(failure);
    handleVitePreloadError();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(String(replaceSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/chill\.institute\/movies\?__chill_reload=\d+$/,
    );
    expect(isAssetSkewReloadPending()).toBe(true);
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
    handleVitePreloadError();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(String(replaceSpy.mock.calls[0]?.[0])).toMatch(
      /^https:\/\/chill\.institute\/search\?__chill_reload=\d+$/,
    );
    expect(isAssetSkewReloadPending()).toBe(true);
  });

  it("lets preload errors surface when the URL already carries the reload marker", () => {
    stubWindow("https://chill.institute/search?__chill_reload=123");

    handleVitePreloadError();

    expect(replaceSpy).not.toHaveBeenCalled();
    expect(isAssetSkewReloadPending()).toBe(false);
  });

  it("keeps the reload guard through startup and clears it after route resolution", () => {
    sessionStorage.set("chill.asset-skew-reload.v1", "1");
    stubWindow("https://chill.institute/movies?__chill_reload=123&sort=recent");

    setupRuntimeErrorHandlers();

    expect(sessionStorage.get("chill.asset-skew-reload.v1")).toBe("1");
    expect(replaceStateSpy).not.toHaveBeenCalled();

    resetAssetSkewReloadGuardAfterSuccessfulRouteResolution([{ status: "success" }]);

    expect(sessionStorage.has("chill.asset-skew-reload.v1")).toBe(false);
    expect(replaceStateSpy).toHaveBeenCalledWith(
      { route: "movies" },
      "",
      new URL("https://chill.institute/movies?sort=recent"),
    );
  });

  it("keeps the one-shot guard when the route resolves into an error", () => {
    handleVitePreloadError();

    const cleared = resetAssetSkewReloadGuardAfterSuccessfulRouteResolution([
      { status: "success" },
      { status: "error" },
    ]);

    expect(cleared).toBe(false);
    expect(sessionStorage.get("chill.asset-skew-reload.v1")).toBe("1");
    expect(isAssetSkewReloadPending()).toBe(true);
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("clears a stale session guard after a successful redirect drops the URL marker", () => {
    sessionStorage.set("chill.asset-skew-reload.v1", "1");
    stubWindow("https://chill.institute/sign-in");

    resetAssetSkewReloadGuardAfterSuccessfulRouteResolution([{ status: "success" }]);

    expect(sessionStorage.has("chill.asset-skew-reload.v1")).toBe(false);
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
