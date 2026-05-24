import { SESSION_EXPIRED_ERROR } from "@/api/auth-errors";

const AUTH_TOKEN_STORAGE_KEY = "chill.auth_token";
const AUTH_CALLBACK_STORAGE_KEY = "chill.auth_callback";
const AUTH_NONCE_STORAGE_KEY = "chill.auth_nonce";
const AUTH_REDIRECT_STORAGE_KEY = "chill.auth_redirect";
const AUTH_NONCE_QUERY_PARAM = "nonce";
const SIGN_IN_PATH = "/sign-in";
const SIGN_OUT_PATH = "/sign-out";
const AUTH_ROUTE_PREFIX = "/auth/";

type AuthRedirectSearch = {
  error: string | undefined;
  callbackUrl: string | undefined;
};

function readStoredToken() {
  const raw = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const token = raw?.trim() ?? "";
  return token.length > 0 ? token : null;
}

function storeAuthToken(token: string) {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function storePendingCallbackURL(url: string) {
  const normalized = normalizeCallbackPath(url);
  if (!normalized) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(AUTH_CALLBACK_STORAGE_KEY, normalized);
}

function consumePendingCallbackURL() {
  const stored = window.sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY)?.trim() ?? "";
  window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  return stored.length > 0 ? stored : null;
}

function clearStoredAuthState() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

function storeAuthNonce(nonce: string) {
  window.sessionStorage.setItem(AUTH_NONCE_STORAGE_KEY, nonce);
}

function consumeAuthNonce(location: Pick<Location, "search">): boolean {
  const stored = window.sessionStorage.getItem(AUTH_NONCE_STORAGE_KEY)?.trim() ?? "";
  window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
  if (!stored) {
    return false;
  }
  const received = new URLSearchParams(location.search).get(AUTH_NONCE_QUERY_PARAM)?.trim() ?? "";
  return received !== "" && received === stored;
}

function clearPendingAuthRedirectSearch() {
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

function writePendingAuthRedirectSearch(callbackUrl: string | null) {
  window.sessionStorage.setItem(
    AUTH_REDIRECT_STORAGE_KEY,
    JSON.stringify({
      error: SESSION_EXPIRED_ERROR,
      callbackUrl: callbackUrl ?? undefined,
    }),
  );
}

function readPendingAuthRedirectSearch(fallbackCallbackUrl: null | string): AuthRedirectSearch {
  const fallbackCallback = normalizeCallbackPath(fallbackCallbackUrl);
  const fallback = { error: undefined, callbackUrl: fallbackCallback ?? undefined };
  const raw = window.sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return fallback;
    }
    const rawError = Reflect.get(parsed, "error");
    const rawCallback = Reflect.get(parsed, "callbackUrl");
    const error = typeof rawError === "string" && rawError.trim() ? rawError.trim() : undefined;
    const callbackUrl =
      typeof rawCallback === "string" ? (normalizeCallbackPath(rawCallback) ?? undefined) : null;
    return {
      error,
      callbackUrl: callbackUrl ?? fallback.callbackUrl,
    };
  } catch {
    return fallback;
  }
}

function normalizeCallbackPath(raw: null | string | undefined): null | string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const origin = readWindowOrigin();
    const parsed = new URL(trimmed, origin);
    if (parsed.origin !== origin) {
      return null;
    }
    if (isAuthPath(parsed.pathname)) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function readWindowOrigin() {
  const origin = window.location.origin;
  if (origin) return origin;
  return "http://localhost";
}

function authCallbackHref(raw: null | string | undefined): string {
  return normalizeCallbackPath(raw) ?? "/";
}

function readCurrentCallbackPath(): null | string {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeCallbackPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

function buildSessionExpiredSignInPath(callbackPath: string | null): string {
  const params = new URLSearchParams({ error: SESSION_EXPIRED_ERROR });
  if (callbackPath) {
    params.set("callbackUrl", callbackPath);
  }
  return `${SIGN_IN_PATH}?${params.toString()}`;
}

function readAuthTokenFromLocation(location: Pick<Location, "hash">): string {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  return (fragment.get("auth_token") ?? "").trim();
}

function consumeCallbackToken(): string | null {
  if (!consumeAuthNonce(window.location)) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return null;
  }

  const token = readAuthTokenFromLocation(window.location);
  if (!token) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return null;
  }

  storeAuthToken(token);
  window.history.replaceState(null, "", "/auth/success");

  const pending = consumePendingCallbackURL();
  const callbackPath = normalizeCallbackPath(pending);

  return callbackPath ?? "/";
}

function isAuthPath(pathname: string) {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname.startsWith(AUTH_ROUTE_PREFIX)
  );
}

export {
  AUTH_NONCE_QUERY_PARAM,
  buildSessionExpiredSignInPath,
  clearPendingAuthRedirectSearch,
  clearStoredAuthState,
  consumeCallbackToken,
  consumePendingCallbackURL,
  authCallbackHref,
  readAuthTokenFromLocation,
  readCurrentCallbackPath,
  readPendingAuthRedirectSearch,
  readStoredToken,
  storeAuthNonce,
  storeAuthToken,
  storePendingCallbackURL,
  writePendingAuthRedirectSearch,
  normalizeCallbackPath,
};
