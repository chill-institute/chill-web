import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import {
  handleVitePreloadError,
  isAbortLikeError,
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

  function stubWindow({ href, storageThrows }: { href: string; storageThrows: boolean }) {
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
