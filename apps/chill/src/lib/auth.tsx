import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

const AUTH_TOKEN_STORAGE_KEY = "chill.auth_token";
const AUTH_CALLBACK_STORAGE_KEY = "chill.auth_callback";
const AUTH_NONCE_STORAGE_KEY = "chill.auth_nonce";
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

// clearStoredAuthState wipes every storage key the auth flow writes. Kept as
// a standalone export so the API client's 401 handler can reuse the same
// cleanup contract that signOut uses without depending on React state.
export function clearStoredAuthState() {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_NONCE_STORAGE_KEY);
}

// generateAuthNonce returns 128 bits of cryptographic randomness as a 32-char
// hex string. Uses crypto.getRandomValues — available in every browser since
// IE 11 and in non-secure contexts — instead of crypto.randomUUID, which is
// gated behind secure-context + Safari 15.4+ / Firefox 95+ / Chrome 92+.
function generateAuthNonce(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
}

// prepareAuthSuccessURL stamps a per-flow nonce onto the success URL and
// records it in sessionStorage so /auth/success can verify the browser is
// the one that started this flow. The engine preserves the success_url
// query string and only appends the auth_token as a URL fragment, so the
// nonce round-trips through the put.io OAuth dance.
export function prepareAuthSuccessURL(rawSuccessURL: string): string {
  const nonce = generateAuthNonce();
  window.sessionStorage.setItem(AUTH_NONCE_STORAGE_KEY, nonce);
  const url = new URL(rawSuccessURL);
  url.searchParams.set(AUTH_NONCE_QUERY_PARAM, nonce);
  return url.toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(() => readStoredToken());

  const value = useMemo<AuthContextValue>(() => {
    return {
      authToken,
      isAuthenticated: authToken !== null,
      setAuthToken: (token: string) => {
        const trimmed = token.trim();
        if (trimmed.length === 0) {
          return;
        }
        window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, trimmed);
        setAuthTokenState(trimmed);
      },
      setPendingCallbackURL: (url: string) => {
        storePendingCallbackURL(url);
      },
      consumePendingCallbackURL: () => {
        const value = window.sessionStorage.getItem(AUTH_CALLBACK_STORAGE_KEY)?.trim() ?? "";
        window.sessionStorage.removeItem(AUTH_CALLBACK_STORAGE_KEY);
        return value.length > 0 ? value : null;
      },
      signOut: () => {
        clearStoredAuthState();
        setAuthTokenState(null);
      },
    };
  }, [authToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function normalizeCallbackPath(raw: null | string): null | string {
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

export function readCurrentCallbackPath(): null | string {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeCallbackPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
}

// readAuthTokenFromLocation only reads auth_token from the URL fragment.
// The engine puts the token in the fragment (which is not sent to servers
// and doesn't leak in Referer). Accepting it from location.search would
// let a phishing link plant an attacker-issued token via referer-leaking
// transports.
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
