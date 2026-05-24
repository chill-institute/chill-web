import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import {
  filterCrashReportingIntegrations,
  isExpectedRouteNotFound,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
} from "./sentry";

describe("filterCrashReportingIntegrations", () => {
  it("removes default integrations that emit non-crash telemetry", () => {
    const integrations = filterCrashReportingIntegrations([
      { name: "GlobalHandlers" },
      { name: "Breadcrumbs" },
      { name: "BrowserSession" },
      { name: "Dedupe" },
    ]);

    expect(integrations.map((integration) => integration.name)).toEqual([
      "GlobalHandlers",
      "Dedupe",
    ]);
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

describe("isExpectedRouteNotFound", () => {
  it("recognizes TanStack Router not-found control flow objects", () => {
    expect(isExpectedRouteNotFound({ isNotFound: true })).toBe(true);
    expect(isExpectedRouteNotFound({ isNotFound: false })).toBe(false);
    expect(isExpectedRouteNotFound(new Error("boom"))).toBe(false);
    expect(isExpectedRouteNotFound(null)).toBe(false);
  });
});

describe("sanitizeSentryEvent", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("drops expected dynamic import errors after scheduling an asset-skew reload", () => {
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => (key === "chill.asset-skew-reload.v1" ? "1" : null),
      },
    });

    const event = sanitizeSentryEvent({
      type: undefined,
      exception: {
        values: [
          {
            type: "TypeError",
            value: "Failed to fetch dynamically imported module",
          },
        ],
      },
    });

    expect(event).toBeNull();
  });
});
