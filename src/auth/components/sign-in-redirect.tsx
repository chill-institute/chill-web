import { Navigate } from "@tanstack/react-router";

import { readCurrentCallbackPath, readPendingAuthRedirectSearch } from "../auth";

export function SignInRedirect() {
  return (
    <Navigate
      to="/sign-in"
      search={readPendingAuthRedirectSearch(readCurrentCallbackPath())}
      replace
    />
  );
}
