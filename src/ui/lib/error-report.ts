import { APP_NAME } from "@/lib/app-info";

type ErrorReport = {
  app: string;
  componentStack?: string;
  error: {
    message: string;
    name: string;
    stack?: string;
  };
  notes?: string;
  occurredAt: string;
  release: string;
  routePath: string;
  sentryEventId?: string;
  userAgent: string;
};

type BuildErrorReportOptions = {
  componentStack?: string;
  notes?: string;
  occurredAt: string;
  release: string;
  routePath: string;
  sentryEventId?: string;
  userAgent: string;
};

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack || undefined,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      name: "Error",
      stack: undefined,
    };
  }

  return {
    message: "Unknown error",
    name: "Error",
    stack: undefined,
  };
}

function normalizeRoutePath(routePath: string) {
  if (!routePath.startsWith("/")) {
    return "/";
  }
  return routePath;
}

function buildErrorReport(
  error: unknown,
  {
    componentStack,
    notes,
    occurredAt,
    release,
    routePath,
    sentryEventId,
    userAgent,
  }: BuildErrorReportOptions,
): ErrorReport {
  const normalizedNotes = notes?.trim();
  const normalizedComponentStack = componentStack?.trim();

  return {
    app: APP_NAME,
    componentStack: normalizedComponentStack || undefined,
    error: normalizeError(error),
    notes: normalizedNotes || undefined,
    occurredAt,
    release,
    routePath: normalizeRoutePath(routePath),
    sentryEventId,
    userAgent,
  };
}

function formatErrorReport(report: ErrorReport) {
  return JSON.stringify(report, null, 2);
}

export { buildErrorReport, formatErrorReport };
