import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent } from "@sentry/react";
import type { ErrorInfo } from "react";

import { APP_NAME } from "./app-info";

const sentryEventIds = new WeakMap<object, string>();
const disabledDefaultIntegrationNames = new Set(["Breadcrumbs", "BrowserSession"]);

type AppBreadcrumbData = Record<string, boolean | number | string | null | undefined>;

function isSentryConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_SENTRY_DSN);
}

function filterCrashReportingIntegrations<T extends { name: string }>(integrations: T[]) {
  return integrations.filter(
    (integration) => !disabledDefaultIntegrationNames.has(integration.name),
  );
}

function rememberSentryEventId(error: unknown, eventId: string) {
  if (error !== null && (typeof error === "object" || typeof error === "function")) {
    sentryEventIds.set(error, eventId);
  }
}

function getSentryEventId(error: unknown) {
  if (error !== null && (typeof error === "object" || typeof error === "function")) {
    return sentryEventIds.get(error);
  }

  return undefined;
}

function keepAppBreadcrumbOnly(breadcrumb: Breadcrumb) {
  return breadcrumb.category === "app" ? breadcrumb : null;
}

function addAppBreadcrumb(message: string, data?: AppBreadcrumbData) {
  if (!isSentryConfigured()) return;

  Sentry.addBreadcrumb({
    category: "app",
    data,
    level: "info",
    message,
  });
}

function initSentry() {
  if (!isSentryConfigured()) return;

  const release = import.meta.env.VITE_PUBLIC_RELEASE || "dev";
  const environment = import.meta.env.VITE_PUBLIC_SENTRY_ENVIRONMENT || import.meta.env.MODE;

  Sentry.init({
    dsn: import.meta.env.VITE_PUBLIC_SENTRY_DSN,
    environment,
    release,
    sendDefaultPii: false,
    sendClientReports: false,
    enableLogs: false,
    enableMetrics: false,
    maxBreadcrumbs: 20,
    integrations: filterCrashReportingIntegrations,
    initialScope: {
      tags: {
        app: APP_NAME,
      },
    },
    beforeBreadcrumb: keepAppBreadcrumbOnly,
    beforeSend: sanitizeSentryEvent,
  });
}

function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent | null {
  return {
    ...event,
    user: undefined,
    request: undefined,
  };
}

function createSentryReactErrorHandler() {
  if (!isSentryConfigured()) {
    return () => {};
  }

  return (error: unknown, info: ErrorInfo) => {
    const eventId = Sentry.captureReactException(error, info);

    rememberSentryEventId(error, eventId);
  };
}

function captureAppException(
  error: unknown,
  {
    componentStack,
    release,
    routePath,
  }: {
    componentStack?: string;
    release?: string;
    routePath?: string;
  } = {},
) {
  const existing = getSentryEventId(error);
  if (existing) return existing;

  if (!isSentryConfigured()) return undefined;

  const eventId = Sentry.captureException(error, {
    tags: {
      app: APP_NAME,
      release: release ?? "dev",
    },
    contexts: componentStack
      ? {
          react: {
            componentStack,
          },
        }
      : undefined,
    extra: {
      routePath,
    },
  });

  rememberSentryEventId(error, eventId);
  return eventId;
}

export {
  addAppBreadcrumb,
  captureAppException,
  createSentryReactErrorHandler,
  filterCrashReportingIntegrations,
  getSentryEventId,
  initSentry,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
};
