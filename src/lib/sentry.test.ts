import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  configureCrashReportingIntegrations,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
} from "./sentry";
import {
  handleVitePreloadError,
  isAssetSkewReloadPending,
  resetAssetSkewReloadGuardAfterSuccessfulRouteResolution,
} from "./runtime-errors";

function stubWindow(href = "https://chill.institute/search") {
  const sessionStorage = new Map<string, string>();
  vi.stubGlobal("window", {
    history: {
      state: null,
      replaceState: vi.fn(),
    },
    location: {
      href,
      replace: vi.fn(),
    },
    sessionStorage: {
      getItem: (key: string) => sessionStorage.get(key) ?? null,
      removeItem: (key: string) => sessionStorage.delete(key),
      setItem: (key: string, value: string) => sessionStorage.set(key, value),
    },
  });
}

afterEach(() => {
  stubWindow("https://chill.institute/?__chill_reload=test-cleanup");
  resetAssetSkewReloadGuardAfterSuccessfulRouteResolution([{ status: "success" }]);
  vi.unstubAllGlobals();
});

describe("configureCrashReportingIntegrations", () => {
  it("keeps global errors while disabling global unhandled rejections", () => {
    const defaultGlobalHandlers = { name: "GlobalHandlers" };
    const integrations = configureCrashReportingIntegrations([
      defaultGlobalHandlers,
      { name: "Breadcrumbs" },
      { name: "BrowserSession" },
      { name: "Dedupe" },
    ]);

    expect(integrations.map((integration) => integration.name)).toEqual([
      "GlobalHandlers",
      "Dedupe",
    ]);
    expect(integrations).not.toContain(defaultGlobalHandlers);
  });
});

describe("keepAppBreadcrumbOnly", () => {
  it("keeps only breadcrumbs created by app code", () => {
    expect(
      keepAppBreadcrumbOnly({
        category: "app",
        data: {
          path: "/search",
        },
        message: "route",
      }),
    ).toEqual({
      category: "app",
      data: {
        path: "/search",
      },
      message: "route",
    });

    expect(
      keepAppBreadcrumbOnly({
        category: "fetch",
        data: {
          url: "https://api.chill.institute/v4/search?q=private",
        },
      }),
    ).toBeNull();
  });
});

describe("sanitizeSentryEvent", () => {
  it("removes user and request details before sending browser crash events", () => {
    const event = sanitizeSentryEvent({
      type: undefined,
      user: {
        id: "putio-user",
        email: "person@example.test",
      },
      request: {
        cookies: {
          session: "secret",
        },
        data: "body",
        headers: {
          authorization: "Bearer secret",
        },
        query_string: "q=private-search",
        url: "https://chill.institute/search?q=private-search#top",
      },
    });

    expect(event).not.toBeNull();
    if (!event) throw new Error("expected sanitized event");
    expect(event.user).toBeUndefined();
    expect(event.request).toBeUndefined();
  });

  it.each([
    "Failed to fetch dynamically imported module: /assets/search-old.js",
    "Importing a module script failed.",
    "Error loading dynamically imported module",
    "Unable to preload CSS for /assets/search-old.css",
  ])("drops an expected preload failure while its recovery reload is pending: %s", (message) => {
    stubWindow();
    handleVitePreloadError();

    const event = sanitizeSentryEvent({
      type: undefined,
      exception: {
        values: [{ type: "TypeError", value: message }],
      },
    });

    expect(isAssetSkewReloadPending()).toBe(true);
    expect(event).toBeNull();
  });

  it("reports a preload failure when the recovery reload also fails", () => {
    stubWindow("https://chill.institute/search?__chill_reload=123");
    handleVitePreloadError();

    const event = sanitizeSentryEvent({
      type: undefined,
      exception: {
        values: [{ type: "TypeError", value: "Failed to fetch dynamically imported module" }],
      },
    });

    expect(isAssetSkewReloadPending()).toBe(false);
    expect(event).not.toBeNull();
  });

  it("does not hide unrelated errors while a recovery reload is pending", () => {
    stubWindow();
    handleVitePreloadError();

    const event = sanitizeSentryEvent({
      type: undefined,
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Cannot read properties of undefined (reading 'component')",
          },
        ],
      },
    });

    expect(event).not.toBeNull();
  });
});
