import { describe, expect, it } from "vite-plus/test";

import {
  configureCrashReportingIntegrations,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
} from "./sentry";

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
});
