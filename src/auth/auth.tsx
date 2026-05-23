import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

const AUTH_TOKEN_STORAGE_KEY = "chill.auth_token";
const AUTH_CALLBACK_STORAGE_KEY = "chill.auth_callback";
const AUTH_NONCE_STORAGE_KEY = "chill.auth_nonce";
const AUTH_REDIRECT_STORAGE_KEY = "chill.auth_redirect";
const AUTH_NONCE_QUERY_PARAM = "nonce";

type AuthContextValue = {
  authToken: string | null;
  isAuthenticated: boolean;
  setAuthToken: (token: string) => void;
  setPendingCallbackURL: (url: string) => void;
  consumePendingCallbackURL: () => string | null;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function readStoredToken() {
  const raw = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  const token = raw?.trim() ?? "";
  return token.length > 0 ? token : null;
}

export function storePendingCallbackURL(url: string) {
  const normalized = normalizeCallbackPath(url);
  if (!normalized) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return;
  }
  window.sessionStorage.setItem(AUTH_CALLBACK_STORAGE_KEY, normalized);
}

export function clearStoredAuthState() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

// crypto.getRandomValues (not crypto.randomUUID) so non-secure contexts and pre-Safari-15.4 / pre-FF-95 / pre-Chrome-92 still work.
function generateAuthNonce(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

export function prepareAuthSuccessURL(rawSuccessURL: string): string {
  const nonce = generateAuthNonce();
  window.sessionStorage.setItem(AUTH_NONCE_STORAGE_KEY, nonce);
  const url = new URL(rawSuccessURL);
  url.searchParams.set(AUTH_NONCE_QUERY_PARAM, nonce);
  return url.toString();
}

export function prepareSignInAgainURL(getPutioStartURL: (successURL?: string) => string): string {
  const callbackPath = readCurrentCallbackPath();
  if (callbackPath) {
    storePendingCallbackURL(callbackPath);
  }
  const successURL = new URL("/auth/success", window.location.origin).toString();
  return getPutioStartURL(prepareAuthSuccessURL(successURL));
}

type AuthRedirectSearch = {
  error: string | undefined;
  callbackUrl: string | undefined;
};

export function clearPendingAuthRedirectSearch() {
  window.sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
}

export function readPendingAuthRedirectSearch(
  fallbackCallbackUrl: null | string,
): AuthRedirectSearch {
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(() => readStoredToken());
  const queryClient = useQueryClient();

  const setAuthToken = useCallback((token: string) => {
    const trimmed = token.trim();
    if (trimmed.length === 0) return;
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, trimmed);
    setAuthTokenState(trimmed);
  }, []);

  const setPendingCallbackURL = useCallback((url: string) => {
    storePendingCallbackURL(url);
  }, []);

  const consumePendingCallbackURL = useCallback(() => {
    const stored = window.sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY)?.trim() ?? "";
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return stored.length > 0 ? stored : null;
  }, []);

  const signOut = useCallback(() => {
    clearStoredAuthState();
    setAuthTokenState(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authToken,
      isAuthenticated: authToken !== null,
      setAuthToken,
      setPendingCallbackURL,
      consumePendingCallbackURL,
      signOut,
    }),
    [authToken, setAuthToken, setPendingCallbackURL, consumePendingCallbackURL, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = use(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function normalizeCallbackPath(raw: null | string | undefined): null | string {
  const trimmed = raw?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }
    if (
      parsed.pathname === "/sign-in" ||
      parsed.pathname === "/sign-out" ||
      parsed.pathname.startsWith("/auth/")
    ) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function authCallbackHref(raw: null | string | undefined): string {
  return normalizeCallbackPath(raw) ?? "/";
}

export function readCurrentCallbackPath(): null | string {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeCallbackPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

export function readAuthTokenFromLocation(location: Pick<Location, "hash">): string {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ""));
  return (fragment.get("auth_token") ?? "").trim();
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

export function consumeCallbackToken(): string | null {
  if (!consumeAuthNonce(window.location)) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return null;
  }

  const token = readAuthTokenFromLocation(window.location);
  if (!token) {
    window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
    return null;
  }

  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.history.replaceState(null, "", "/auth/success");

  const pending = window.sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY)?.trim() ?? "";
  window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  const callbackPath = normalizeCallbackPath(pending || null);

  return callbackPath ?? "/";
}
