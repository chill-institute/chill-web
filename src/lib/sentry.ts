import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent } from "@sentry/react";
import type { ErrorInfo } from "react";

import { getClientRequestTimeoutDetails } from "@/api/request-timeout";

import { APP_NAME } from "./app-info";
import { isPreloadRecoveryPending } from "./runtime-errors";

const sentryEventIds = new WeakMap<object, string>();
const disabledDefaultIntegrationNames = new Set(["Breadcrumbs", "BrowserSession"]);

type AppBreadcrumbData = Record<string, boolean | number | string | null | undefined>;

function isSentryConfigured() {
  return Boolean(import.meta.env.VITE_PUBLIC_SENTRY_DSN);
}

function configureCrashReportingIntegrations<T extends { name: string }>(integrations: T[]) {
  return integrations
    .map((integration) => {
      if (integration.name === "GlobalHandlers") {
        return Sentry.globalHandlersIntegration({
          onerror: true,
          onunhandledrejection: false,
        });
      }

      return integration;
    })
    .filter((integration) => !disabledDefaultIntegrationNames.has(integration.name));
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
    integrations: configureCrashReportingIntegrations,
    initialScope: {
      tags: {
        app: APP_NAME,
      },
    },
    beforeBreadcrumb: keepAppBreadcrumbOnly,
    beforeSend: sanitizeSentryEvent,
  });
}

function sanitizeSentryEvent(
  event: ErrorEvent,
  hint?: { originalException?: unknown },
): ErrorEvent | null {
  const timeout = getClientRequestTimeoutDetails(hint?.originalException);
  return {
    ...event,
    tags: timeout
      ? {
          ...event.tags,
          "request.operation": timeout.operation,
          ...(timeout.surface ? { "request.surface": timeout.surface } : {}),
        }
      : event.tags,
    contexts: timeout
      ? {
          ...event.contexts,
          request_timeout: {
            request_id: timeout.requestId,
            timeout_ms: timeout.timeoutMs,
          },
        }
      : event.contexts,
    user: undefined,
    request: undefined,
  };
}

function shouldCaptureRuntimeError() {
  return !isPreloadRecoveryPending();
}

function createSentryReactErrorHandler() {
  if (!isSentryConfigured()) {
    return () => {};
  }

  return (error: unknown, info: ErrorInfo) => {
    if (!shouldCaptureRuntimeError()) return;

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
  if (!shouldCaptureRuntimeError()) return undefined;

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
  configureCrashReportingIntegrations,
  getSentryEventId,
  initSentry,
  keepAppBreadcrumbOnly,
  sanitizeSentryEvent,
  shouldCaptureRuntimeError,
};
