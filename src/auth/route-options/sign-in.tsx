import { redirect } from "@tanstack/react-router";

import { SignInPage } from "@/auth/components/sign-in-page";
import { authCallbackHref, clearPendingAuthRedirectSearch, readStoredToken } from "@/auth/auth";
import { signInSearchSchema, type SignInSearch } from "@/routes/-search-params";

type SignInBeforeLoadContext = {
  preload: boolean;
  search: SignInSearch;
};

function handleSignInBeforeLoad({ preload, search }: SignInBeforeLoadContext) {
  if (preload) return;

  clearPendingAuthRedirectSearch();

  if (!search.error && readStoredToken()) {
    throw redirect({ href: authCallbackHref(search.callbackUrl), replace: true });
  }
}

export const signInRouteOptions = {
  validateSearch: signInSearchSchema,
  beforeLoad: handleSignInBeforeLoad,
  component: SignInPage,
};
