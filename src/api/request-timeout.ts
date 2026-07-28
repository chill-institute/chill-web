import { Code, ConnectError } from "@connectrpc/connect";

type TimeoutSignal = {
  cleanup: () => void;
  didTimeout: () => boolean;
  signal: AbortSignal;
};

export type ClientRequestTimeoutDetails = {
  operation: string;
  requestId?: string;
  surface?: string;
  timeoutMs?: number;
};

const clientRequestTimeoutDetails = new WeakMap<object, ClientRequestTimeoutDetails>();

export class ClientRequestTimeoutError extends ConnectError {
  constructor(label: string, details?: Omit<ClientRequestTimeoutDetails, "operation">) {
    super(`${label} timed out`, Code.DeadlineExceeded);
    clientRequestTimeoutDetails.set(this, { operation: label, ...details });
  }
}

export function isClientRequestTimeoutError(error: unknown): error is ClientRequestTimeoutError {
  return typeof error === "object" && error !== null && clientRequestTimeoutDetails.has(error);
}

export function annotateClientRequestTimeout(
  error: unknown,
  details: Partial<Pick<ClientRequestTimeoutDetails, "operation" | "surface">>,
) {
  if (typeof error !== "object" || error === null) return;

  const current = clientRequestTimeoutDetails.get(error);
  if (current) clientRequestTimeoutDetails.set(error, { ...current, ...details });
}

export function getClientRequestTimeoutDetails(error: unknown) {
  return typeof error === "object" && error !== null
    ? clientRequestTimeoutDetails.get(error)
    : undefined;
}

export function withTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): TimeoutSignal {
  const controller = new AbortController();
  let didTimeout = false;

  const abortFromParent = () => {
    controller.abort(parent?.reason);
  };

  if (parent?.aborted) {
    abortFromParent();
  } else if (parent) {
    parent.addEventListener("abort", abortFromParent, { once: true });
  }

  const timeout = globalThis.setTimeout(() => {
    didTimeout = true;
    controller.abort(new DOMException("Search timed out", "TimeoutError"));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => didTimeout,
    cleanup: () => {
      globalThis.clearTimeout(timeout);
      if (parent) {
        parent.removeEventListener("abort", abortFromParent);
      }
    },
  };
}
