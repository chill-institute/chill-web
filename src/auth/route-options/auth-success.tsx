import { redirect } from "@tanstack/react-router";

import { UNKNOWN_AUTH_ERROR } from "@/api/auth-errors";
import { AuthSuccessFallback } from "@/auth/components/auth-success-fallback";

import { authCallbackHref, consumeCallbackFailure, consumeCallbackToken } from "../auth-storage";

export const authSuccessRouteOptions = {
  beforeLoad: () => {
    const failure = consumeCallbackFailure();
    if (failure) {
      throw redirect({
        to: "/sign-in",
        search: { error: failure.error, callbackUrl: failure.callbackUrl },
      });
    }

    const redirectPath = consumeCallbackToken();
    if (redirectPath) {
      throw redirect({ href: authCallbackHref(redirectPath) });
    }
    throw redirect({
      to: "/sign-in",
      search: { error: UNKNOWN_AUTH_ERROR, callbackUrl: undefined },
    });
  },
  component: AuthSuccessFallback,
};
