import * as Sentry from "@sentry/react";
import type { Breadcrumb, ErrorEvent } from "@sentry/react";
import type { ErrorInfo } from "react";

import { getClientRequestTimeoutDetails } from "@/api/request-timeout";

import { APP_NAME } from "./app-info";
import { isPreloadRecoveryPending, moduleLoadRecoveryTags } from "./runtime-errors";

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

function exceptionValues(event: ErrorEvent) {
  return event.exception?.values ?? [];
}

function exceptionText(event: ErrorEvent, hint?: { originalException?: unknown }) {
  const fromHint =
    hint?.originalException instanceof Error
      ? `${hint.originalException.name}: ${hint.originalException.message}`
      : typeof hint?.originalException === "string"
        ? hint.originalException
        : "";
  const fromEvent = exceptionValues(event)
    .map((value) => `${value.type ?? ""}: ${value.value ?? ""}`)
    .join("\n");
  return `${fromHint}\n${fromEvent}\n${event.message ?? ""}`;
}

function isNoisyBrowserExtensionError(event: ErrorEvent, hint?: { originalException?: unknown }) {
  return exceptionText(event, hint).includes("__firefox__");
}

function isBlockedStorageAccessError(event: ErrorEvent, hint?: { originalException?: unknown }) {
  const text = exceptionText(event, hint);
  if (text.includes("Failed to read the 'localStorage' property from 'Window'")) {
    return true;
  }
  if (text.includes("Access is denied for this document") && text.includes("localStorage")) {
    return true;
  }
  if (text.includes("Cannot read properties of null (reading 'getItem')")) {
    return true;
  }
  if (text.includes("Can't find variable: localStorage") || text.includes("localStorage is null")) {
    return true;
  }
  return false;
}

function isRecoverableModuleLoadNoise(event: ErrorEvent) {
  const tags = event.tags ?? {};
  if (tags.module_load_failure !== "true") {
    return false;
  }
  // Keep terminal failures after recovery was already attempted.
  return tags.module_recovery_attempted !== "true";
}

function sanitizeSentryEvent(
  event: ErrorEvent,
  hint?: { originalException?: unknown },
): ErrorEvent | null {
  if (
    isNoisyBrowserExtensionError(event, hint) ||
    isBlockedStorageAccessError(event, hint) ||
    isRecoverableModuleLoadNoise(event)
  ) {
    return null;
  }

  const timeout = getClientRequestTimeoutDetails(hint?.originalException);
  return {
    ...event,
    fingerprint: timeout
      ? ["client-timeout", timeout.operation, timeout.surface ?? "unspecified"]
      : event.fingerprint,
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

    const eventId = Sentry.withScope((scope) => {
      scope.setTags(moduleLoadRecoveryTags(error));
      return Sentry.captureReactException(error, info);
    });

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
      ...moduleLoadRecoveryTags(error),
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
