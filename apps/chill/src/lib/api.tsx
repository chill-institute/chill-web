import { useCallback, useMemo, type ReactNode } from "react";

import {
  createApi as createApiClient,
  getPutioStartURL as getPutioStartURLForBaseUrl,
  type ChillApi,
} from "@chill-institute/api";
import { ApiProvider, useAuth } from "@chill-institute/auth";

import { getPublicAPIBaseURL } from "./env";

export function createApi(authToken: string): ChillApi {
  return createApiClient({
    authToken,
    baseUrl: getPublicAPIBaseURL(),
  });
}

export function ChillApiProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const baseUrl = getPublicAPIBaseURL();
  const api = useMemo(
    () => createApiClient({ authToken: authToken ?? "", baseUrl }),
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
