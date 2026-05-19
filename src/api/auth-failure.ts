import { Code, ConnectError } from "@connectrpc/connect";

import { SESSION_EXPIRED_ERROR } from "./auth-errors";

const AUTH_TOKEN_STORAGE_KEY = "chill.auth_token";
const AUTH_CALLBACK_STORAGE_KEY = "chill.auth_callback";
const AUTH_NONCE_STORAGE_KEY = "chill.auth_nonce";
const AUTH_REDIRECT_STORAGE_KEY = "chill.auth_redirect";
const SIGN_IN_PATH = "/sign-in";
const SIGN_OUT_PATH = "/sign-out";
const AUTH_ROUTE_PREFIX = "/auth/";

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
  if (window.location.pathname === SIGN_IN_PATH || window.location.pathname === SIGN_OUT_PATH) {
    return;
  }
  const callbackPath = readCurrentCallbackPath();
  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
    window.sessionStorage.setItem(
      AUTH_REDIRECT_STORAGE_KEY,
      JSON.stringify({
        error: SESSION_EXPIRED_ERROR,
        callbackUrl: callbackPath ?? undefined,
      }),
    );
  } catch {
    /* empty */
  }
  window.location.replace(buildSessionExpiredSignInPath(callbackPath));
}

function readCurrentCallbackPath(): string | null {
  const { pathname, search, hash } = window.location;
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname.startsWith(AUTH_ROUTE_PREFIX)
  ) {
    return null;
  }
  return `${pathname}${search}${hash}`;
}

function buildSessionExpiredSignInPath(callbackPath: string | null): string {
  const params = new URLSearchParams({ error: SESSION_EXPIRED_ERROR });
  if (callbackPath) {
    params.set("callbackUrl", callbackPath);
  }
  return `${SIGN_IN_PATH}?${params.toString()}`;
}
