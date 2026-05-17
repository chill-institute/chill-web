import { useCallback, useMemo, type ReactNode } from "react";

import {
  createApi as createApiClient,
  getPutioStartURL as getPutioStartURLForBaseUrl,
  type ChillApi,
} from "@chill-institute/api";
import { ApiProvider, useAuth } from "@chill-institute/auth";
import { CardDisplayType } from "@chill-institute/contracts/chill/v4/api_pb";

import { getPublicAPIBaseURL } from "./env";
import { defaultUserSettings, normalizeBingeUserSettings, type UserSettings } from "./types";

export function withCatalogDefaults(settings: UserSettings): UserSettings {
  return normalizeBingeUserSettings({
    ...settings,
    cardDisplayType:
      settings.cardDisplayType === CardDisplayType.UNSPECIFIED
        ? defaultUserSettings.cardDisplayType
        : settings.cardDisplayType,
    moviesSource:
      settings.moviesSource === 0 ? defaultUserSettings.moviesSource : settings.moviesSource,
    tvShowsSource:
      settings.tvShowsSource === 0 ? defaultUserSettings.tvShowsSource : settings.tvShowsSource,
  });
}

export function createApi(authToken: string): ChillApi {
  return createApiClient({
    authToken,
    baseUrl: getPublicAPIBaseURL(),
    normalizeSettings: withCatalogDefaults,
  });
}

export function BingeApiProvider({ children }: { children: ReactNode }) {
  const { authToken } = useAuth();
  const baseUrl = getPublicAPIBaseURL();
  const api = useMemo(
    () =>
      createApiClient({
        authToken: authToken ?? "",
        baseUrl,
        normalizeSettings: withCatalogDefaults,
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
