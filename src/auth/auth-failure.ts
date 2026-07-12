import { isAuthFailure } from "@/api/auth-failure";
import {
  buildSessionExpiredSignInPath,
  clearStoredAuthState,
  readCurrentCallbackPath,
  writePendingAuthRedirectSearch,
} from "@/auth/auth-storage";

export function redirectToSignInOnAuthFailure(error: unknown): void {
  if (!isAuthFailure(error) || typeof window === "undefined") {
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
