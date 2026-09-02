import { redirect } from "@tanstack/react-router";

import { UNKNOWN_AUTH_ERROR } from "@/api/auth-errors";
import { AuthSuccessFallback } from "@/auth/components/auth-success-fallback";

import { authCallbackHref, consumeCallbackFailure, consumeCallbackToken } from "../auth-storage";

type AuthSuccessRedirect =
  | { kind: "href"; href: string }
  | { kind: "sign-in"; error: string | undefined; callbackUrl: string | undefined };

// The callback helpers consume the one-time nonce and rewrite the URL, so
// they are safe to run exactly once per landing. The router may invoke
// beforeLoad more than once for the same entry (it did from
// @tanstack/react-router 1.170.19), so the first decision is cached and
// replayed until a different auth-success URL is entered.
let lastDecision: { key: string; redirect: AuthSuccessRedirect } | null = null;

function decideAuthSuccessRedirect(): AuthSuccessRedirect {
  const failure = consumeCallbackFailure();
  if (failure) {
    return { kind: "sign-in", error: failure.error, callbackUrl: failure.callbackUrl };
  }
  const redirectPath = consumeCallbackToken();
  if (redirectPath) {
    return { kind: "href", href: authCallbackHref(redirectPath) };
  }
  return { kind: "sign-in", error: UNKNOWN_AUTH_ERROR, callbackUrl: undefined };
}

function throwAuthSuccessRedirect(decision: AuthSuccessRedirect): never {
  if (decision.kind === "href") {
    throw redirect({ href: decision.href });
  }
  throw redirect({
    to: "/sign-in",
    search: { error: decision.error, callbackUrl: decision.callbackUrl },
  });
}

export const authSuccessRouteOptions = {
  beforeLoad: ({ preload }: { preload: boolean }) => {
    if (preload) return;
    const key = `${window.location.search}${window.location.hash}`;
    if (key === "" && lastDecision) {
      // The helpers already stripped this landing's params; replay the decision.
      throwAuthSuccessRedirect(lastDecision.redirect);
    }
    const decision = decideAuthSuccessRedirect();
    lastDecision = { key, redirect: decision };
    throwAuthSuccessRedirect(decision);
  },
  component: AuthSuccessFallback,
};
