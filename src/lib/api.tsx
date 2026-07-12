import { useCallback, useMemo, type ReactNode } from "react";

import {
  createApi as createApiClient,
  getPutioStartURL as getPutioStartURLForBaseUrl,
  type ChillApi,
} from "@/api/api";
import { ApiProvider } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { redirectToSignInOnAuthFailure } from "@/auth/auth-failure";

import { getPublicAPIBaseURL } from "./env";

export function createApi(authToken: string): ChillApi {
  return createApiClient({
    authToken,
    baseUrl: getPublicAPIBaseURL(),
    onAuthFailure: redirectToSignInOnAuthFailure,
  });
}

export function ChillApiProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const baseUrl = getPublicAPIBaseURL();
  const api = useMemo(
    () =>
      createApiClient({
        authToken: authToken ?? "",
        baseUrl,
        onAuthFailure: redirectToSignInOnAuthFailure,
      }),
    [authToken, baseUrl],
  );
  const getPutioStartURL = useCallback(
    (successURL?: string) => getPutioStartURLForBaseUrl(baseUrl, successURL),
    [baseUrl],
  );
  return (
    <ApiProvider api={api} getPutioStartURL={getPutioStartURL}>
      {children}
    </ApiProvider>
  );
}
