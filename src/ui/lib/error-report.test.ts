import { describe, expect, it } from "vite-plus/test";

import { APP_NAME } from "@/lib/app-info";

import { buildErrorReport, formatErrorReport } from "./error-report";

describe("buildErrorReport", () => {
  it("normalizes error objects into a copyable report", () => {
    const error = new Error("kaboom");
    error.name = "ExplosionError";

    const report = buildErrorReport(error, {
      componentStack: "\n    at AppShell",
      notes: "  I opened settings.  ",
      occurredAt: "2026-03-15T01:23:45.000Z",
      release: "test-release",
      routePath: "/settings",
      sentryEventId: "event-123",
      userAgent: "Unit Test Browser",
    });

    expect(report).toEqual({
      app: APP_NAME,
      componentStack: "at AppShell",
      error: {
        message: "kaboom",
        name: "ExplosionError",
        stack: error.stack,
      },
      notes: "I opened settings.",
      occurredAt: "2026-03-15T01:23:45.000Z",
      release: "test-release",
      routePath: "/settings",
      sentryEventId: "event-123",
      userAgent: "Unit Test Browser",
    });
  });

  it("falls back gracefully for non-Error values", () => {
    const report = buildErrorReport("oops", {
      occurredAt: "2026-03-15T01:23:45.000Z",
      release: "test-release",
      routePath: "search",
      sentryEventId: undefined,
      userAgent: "Unit Test Browser",
    });

    expect(report).toEqual({
      app: APP_NAME,
      componentStack: undefined,
      error: {
        message: "oops",
        name: "Error",
        stack: undefined,
      },
      notes: undefined,
      occurredAt: "2026-03-15T01:23:45.000Z",
      release: "test-release",
      routePath: "/",
      sentryEventId: undefined,
      userAgent: "Unit Test Browser",
    });
  });
});

describe("formatErrorReport", () => {
  it("renders stable pretty JSON", () => {
    const output = formatErrorReport(
      buildErrorReport(new Error("kaboom"), {
        occurredAt: "2026-03-15T01:23:45.000Z",
        release: "test-release",
        routePath: "/",
        userAgent: "Unit Test Browser",
      }),
    );

    expect(output).toContain('"app": "chill-web"');
    expect(output).toContain('"routePath": "/"');
    expect(output).toContain('"release": "test-release"');
  });
});
