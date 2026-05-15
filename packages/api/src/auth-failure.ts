import { Code, ConnectError } from "@connectrpc/connect";

import { SESSION_EXPIRED_ERROR } from "./auth-errors";

const AUTH_TOKEN_STORAGE_KEY = "chill.auth_token";
const AUTH_CALLBACK_STORAGE_KEY = "chill.auth_callback";
const AUTH_NONCE_STORAGE_KEY = "chill.auth_nonce";

// Don't broaden the matchers without a test — false positives bounce real
// users to /sign-out. Legacy string matchers cover older backends still in rotation.
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
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
  } catch {
    // Best-effort; the redirect is what matters.
  }
  window.location.replace(`/sign-out?error=${encodeURIComponent(SESSION_EXPIRED_ERROR)}`);
}
