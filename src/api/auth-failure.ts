import { Code, ConnectError } from "@connectrpc/connect";

import {
  buildSessionExpiredSignInPath,
  clearStoredAuthState,
  readCurrentCallbackPath,
  writePendingAuthRedirectSearch,
} from "@/auth/auth-storage";

export function isAuthFailure(error: unknown): boolean {
  if (error instanceof ConnectError) {
    if (error.code === Code.Unauthenticated || error.code === Code.PermissionDenied) {
      return true;
    }
    return matchesLegacyAuthMessage(`${error.rawMessage} ${error.message}`);
  }
  if (error instanceof Error) {
    return matchesLegacyAuthMessage(error.message);
  }
  return false;
}

function matchesLegacyAuthMessage(raw: string): boolean {
  const message = raw.toLowerCase();
  return (
    message.includes("invalid auth token") ||
    message.includes("missing api key or auth token") ||
    message.includes("missing credentials") ||
    message.includes("unauthorized") ||
    message.includes("401")
  );
}

export function redirectToSignInOnAuthFailure(error: unknown): void {
  if (!isAuthFailure(error)) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname === "/sign-in" || window.location.pathname === "/sign-out") {
    return;
  }
  const callbackPath = readCurrentCallbackPath();
  try {
    clearStoredAuthState();
    writePendingAuthRedirectSearch(callbackPath);
  } catch {
    /* empty */
  }
  window.location.replace(buildSessionExpiredSignInPath(callbackPath));
}
