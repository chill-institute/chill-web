import { ConnectError, Code } from "@connectrpc/connect";

import { isAbortLikeError } from "@/lib/runtime-errors";

export type LocalizedErrorRecoveryAction =
  | {
      readonly kind: "retry";
      readonly label: string;
    }
  | {
      readonly kind: "sign-in-again";
      readonly label: string;
    };

type LocalizedErrorRecoverySuggestion = {
  readonly description?: string;
  readonly actions?: ReadonlyArray<LocalizedErrorRecoveryAction>;
};

type LocalizedError = {
  readonly message: string;
  readonly recoverySuggestion?: LocalizedErrorRecoverySuggestion;
};

function messageIncludesPutioProviderUnavailable(message: string) {
  return (
    message.includes("putio_provider_unavailable") || message.includes("putio provider unavailable")
  );
}

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
    message.includes("unsupported content type") ||
    message.includes("not a valid json object") ||
    message.includes("unexpected token '<'") ||
    message.includes("timed out") ||
    message.includes("timeout")
  );
}

export function isIgnorableAbortError(error: unknown) {
  if (error instanceof ConnectError) {
    return error.code === Code.Canceled;
  }
  return isAbortLikeError(error);
}

export function isPutioProviderUnavailableError(error: unknown) {
  if (error instanceof ConnectError) {
    const message = `${error.rawMessage} ${error.message}`.toLowerCase();
    return messageIncludesPutioProviderUnavailable(message);
  }
  if (error instanceof Error) {
    return messageIncludesPutioProviderUnavailable(error.message.toLowerCase());
  }
  return false;
}

export function isBackendUnavailableError(error: unknown) {
  if (isPutioProviderUnavailableError(error)) {
    return true;
  }
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
  return failureCount < 1 && isBackendUnavailableError(error);
}

export function localizeError(error: unknown): LocalizedError {
  if (isPutioProviderUnavailableError(error)) {
    return {
      message: "can't reach",
      recoverySuggestion: {
        description: "if this keeps happening, sign in again to refresh your put.io session.",
        actions: [
          { kind: "retry", label: "retry" },
          { kind: "sign-in-again", label: "sign in again" },
        ],
      },
    };
  }
  if (isBackendUnavailableError(error)) {
    return {
      message: "service down",
    };
  }
  if (error instanceof ConnectError) {
    if (error.code === Code.Unauthenticated || error.code === Code.PermissionDenied) {
      return {
        message: "session expired",
      };
    }
    if (error.rawMessage) {
      return {
        message: error.rawMessage,
      };
    }
  }
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }
  return {
    message: "something's wrong",
  };
}

export function toErrorMessage(error: unknown) {
  return localizeError(error).message;
}
