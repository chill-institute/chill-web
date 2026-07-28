import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { annotateClientRequestTimeout, ClientRequestTimeoutError } from "@/api/request-timeout";

import {
  handleVitePreloadError,
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution,
} from "./runtime-errors";
import {
  configureCrashReportingIntegrations,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
  shouldCaptureRuntimeError,
} from "./sentry";

afterEach(() => {
  vi.stubGlobal("window", {
    history: {
      state: null,
      replaceState: vi.fn(),
    },
    location: {
      href: "https://chill.institute/?__chill_reload=test-cleanup",
    },
  });
  resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution([{ status: "success" }]);
  vi.unstubAllGlobals();
});

describe("shouldCaptureRuntimeError", () => {
  it("does not report runtime errors while preload recovery is replacing the page", () => {
    const replace = vi.fn();
    vi.stubGlobal("window", {
      history: {
        state: null,
        replaceState: vi.fn(),
      },
      location: {
        href: "https://chill.institute/search",
        replace,
      },
      sessionStorage: {
        removeItem() {
          throw new Error("storage blocked");
        },
        setItem() {
          throw new Error("storage blocked");
        },
      },
    });

    expect(shouldCaptureRuntimeError()).toBe(true);
    expect(handleVitePreloadError({ preventDefault: vi.fn() })).toBe(true);
    expect(shouldCaptureRuntimeError()).toBe(false);
    expect(replace).toHaveBeenCalledTimes(1);

    vi.stubGlobal("window", {
      history: {
        state: null,
        replaceState: vi.fn(),
      },
      location: {
        href: "https://chill.institute/search?__chill_reload=1",
      },
    });
    resetPreloadRecoveryFallbackAfterSuccessfulRouteResolution([{ status: "success" }]);
    expect(shouldCaptureRuntimeError()).toBe(true);
  });
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

  it("adds safe timeout correlation without retaining request data", () => {
    const error = new ClientRequestTimeoutError("Settings request", {
      requestId: "request-123",
      timeoutMs: 8000,
    });
    annotateClientRequestTimeout(error, {
      operation: "settings.read",
      surface: "movies.source-sync",
    });

    const event = sanitizeSentryEvent(
      {
        type: undefined,
        request: { data: "private" },
      },
      { originalException: error },
    );

    expect(event).toMatchObject({
      tags: {
        "request.operation": "settings.read",
        "request.surface": "movies.source-sync",
      },
      contexts: {
        request_timeout: {
          request_id: "request-123",
          timeout_ms: 8000,
        },
      },
    });
    expect(event?.request).toBeUndefined();
  });
});
