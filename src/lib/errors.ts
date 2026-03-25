import { ConnectError, Code } from "@connectrpc/connect";

function messageIncludesBackendFailure(message: string) {
  return (
    message.includes("provider unavailable") ||
    message.includes("lookup redis") ||
    message.includes("dial tcp") ||
    message.includes("connection refused") ||
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("networkerror") ||
    message.includes("network error") ||
    message.includes("bad gateway") ||
    message.includes("gateway timeout") ||
    message.includes("upstream connect error") ||
    message.includes("service unavailable") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

export function isIgnorableAbortError(error: unknown) {
  if (error instanceof ConnectError) {
    return error.code === Code.Canceled;
  }
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("aborted") || message.includes("canceled") || message.includes("cancelled")
    );
  }
  return false;
}

export function isBackendUnavailableError(error: unknown) {
  if (error instanceof ConnectError) {
    if (error.code === Code.Unavailable || error.code === Code.DeadlineExceeded) {
      return true;
    }
    const message = `${error.rawMessage} ${error.message}`.toLowerCase();
    return messageIncludesBackendFailure(message);
  }
  if (error instanceof Error) {
    return messageIncludesBackendFailure(error.message.toLowerCase());
  }
  return false;
}

export function shouldRetryQueryError(failureCount: number, error: unknown) {
  return failureCount < 2 && isBackendUnavailableError(error);
}

export function toErrorMessage(error: unknown) {
  if (isBackendUnavailableError(error)) {
    return "Service temporarily unavailable. Please try again shortly.";
  }
  if (error instanceof ConnectError) {
    if (error.code === Code.Unauthenticated || error.code === Code.PermissionDenied) {
      return "Session expired. Please sign in again.";
    }
    if (error.rawMessage) {
      return error.rawMessage;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}
