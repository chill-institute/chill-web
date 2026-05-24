import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  AUTH_NONCE_QUERY_PARAM,
  clearStoredAuthState,
  consumePendingCallbackURL as consumeStoredPendingCallbackURL,
  readCurrentCallbackPath,
  readStoredToken,
  storeAuthNonce,
  storeAuthToken,
  storePendingCallbackURL,
} from "./auth-storage";
export {
  authCallbackHref,
  clearPendingAuthRedirectSearch,
  clearStoredAuthState,
  consumeCallbackToken,
  normalizeCallbackPath,
  readAuthTokenFromLocation,
  readCurrentCallbackPath,
  readPendingAuthRedirectSearch,
  readStoredToken,
  storePendingCallbackURL,
} from "./auth-storage";

type AuthContextValue = {
  authToken: string | null;
  isAuthenticated: boolean;
  setAuthToken: (token: string) => void;
  setPendingCallbackURL: (url: string) => void;
  consumePendingCallbackURL: () => string | null;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
  storeAuthNonce(nonce);
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | null>(() => readStoredToken());
  const queryClient = useQueryClient();

  const setAuthToken = useCallback(
    (token: string) => {
      const trimmed = token.trim();
      if (trimmed.length === 0) return;
      storeAuthToken(trimmed);
      setAuthTokenState(trimmed);
      queryClient.clear();
    },
    [queryClient],
  );

  const setPendingCallbackURL = useCallback((url: string) => {
    storePendingCallbackURL(url);
  }, []);

  const consumePendingCallbackURL = useCallback(() => {
    return consumeStoredPendingCallbackURL();
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
