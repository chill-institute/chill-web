import { create } from "@bufbuild/protobuf";
import { createClient, type Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  CatalogOriginSchema,
  MoviesSource,
  TVShowsSource,
  UserService,
  type CatalogOrigin,
  type AddTransferResponse,
  type GetDownloadFolderResponse,
  type GetFolderResponse,
  type GetMoviesResponse,
  type GetTVShowDetailResponse,
  type GetTVShowSeasonDownloadsResponse,
  type GetTVShowSeasonResponse,
  type GetTVShowsResponse,
  type SearchResponse,
  type UserIndexer,
  type UserProfile,
  type UserSettings,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { isAuthFailure } from "./auth-failure";
import { setClientMetadata } from "./client-metadata";
import { ClientRequestTimeoutError, withTimeoutSignal } from "./request-timeout";
import {
  withSaveUserSettingsResponseDefaults,
  withUserSettingsDefaults,
} from "./settings-defaults";

export type CatalogOriginInput =
  | { media: "movie"; source: MoviesSource }
  | { media: "tv"; source: TVShowsSource };

export function toCatalogOrigin(origin: CatalogOriginInput | undefined): CatalogOrigin | undefined {
  if (!origin) {
    return undefined;
  }
  if (origin.media === "movie") {
    if (origin.source === MoviesSource.UNSPECIFIED) {
      return undefined;
    }
    return create(CatalogOriginSchema, {
      catalog: { case: "moviesSource", value: origin.source },
    });
  }
  if (origin.source === TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED) {
    return undefined;
  }
  return create(CatalogOriginSchema, {
    catalog: { case: "tvShowsSource", value: origin.source },
  });
}

const REQUEST_TIMEOUT_MS = 8000;
const SETTINGS_TIMEOUT_MS = 20000;
const SEARCH_TIMEOUT_MS = 30000;

function newRequestID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const requestMetadataInterceptor: Interceptor = (next) => async (request) => {
  setClientMetadata(request.header, import.meta.env.VITE_PUBLIC_VERSION);
  return next(request);
};

function authHeader(authToken?: string): HeadersInit | undefined {
  if (!authToken) return undefined;
  return { Authorization: `Bearer ${authToken}` };
}

export type ChillApi = ReturnType<typeof createApi>;

export type CreateApiOptions = {
  authToken: string;
  baseUrl: string;
  normalizeSettings?: (settings: UserSettings) => UserSettings;
  onAuthFailure?: (error: unknown) => void;
};

export function createApi({
  authToken,
  baseUrl,
  normalizeSettings,
  onAuthFailure,
}: CreateApiOptions) {
  const transport = createConnectTransport({
    baseUrl: `${baseUrl}/v4`,
    interceptors: [requestMetadataInterceptor],
  });
  const userClient = createClient(UserService, transport);
  const headers = authHeader(authToken);

  async function call<T>(
    label: string,
    fn: (signal: AbortSignal, requestHeaders: Headers) => Promise<T>,
    signal?: AbortSignal,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const requestId = newRequestID();
    const requestHeaders = new Headers(headers);
    requestHeaders.set("X-Request-Id", requestId);
    const timed = withTimeoutSignal(signal, timeoutMs);
    try {
      return await fn(timed.signal, requestHeaders);
    } catch (error) {
      if (timed.didTimeout()) {
        throw new ClientRequestTimeoutError(label, { requestId, timeoutMs });
      }
      if (isAuthFailure(error)) {
        onAuthFailure?.(error);
      }
      throw error;
    } finally {
      timed.cleanup();
    }
  }

  function applySettingsDefaults(settings: UserSettings): UserSettings {
    const withDefaults = withUserSettingsDefaults(settings);
    return normalizeSettings ? normalizeSettings(withDefaults) : withDefaults;
  }

  return {
    getUserProfile: (signal?: AbortSignal): Promise<UserProfile> =>
      call(
        "Profile request",
        (s, requestHeaders) =>
          userClient.getUserProfile({}, { headers: requestHeaders, signal: s }),
        signal,
      ),

    search: (query: string, indexerId?: string, signal?: AbortSignal): Promise<SearchResponse> =>
      call(
        "Search",
        (s, requestHeaders) =>
          userClient.search(
            { query, indexerId: indexerId || undefined },
            { headers: requestHeaders, signal: s },
          ),
        signal,
        SEARCH_TIMEOUT_MS,
      ),

    getIndexers: async (signal?: AbortSignal): Promise<UserIndexer[]> => {
      const response = await call(
        "Indexers request",
        (s, requestHeaders) => userClient.getIndexers({}, { headers: requestHeaders, signal: s }),
        signal,
      );
      return response.indexers;
    },

    getUserSettings: async (signal?: AbortSignal): Promise<UserSettings> => {
      const response = await call(
        "Settings request",
        (s, requestHeaders) =>
          userClient.getUserSettings({}, { headers: requestHeaders, signal: s }),
        signal,
        SETTINGS_TIMEOUT_MS,
      );
      return applySettingsDefaults(response);
    },

    saveUserSettings: async (settings: UserSettings): Promise<UserSettings> => {
      const response = await call(
        "Save settings request",
        (s, requestHeaders) =>
          userClient.saveUserSettings({ settings }, { headers: requestHeaders, signal: s }),
        undefined,
        SETTINGS_TIMEOUT_MS,
      );
      const withDefaults = withSaveUserSettingsResponseDefaults({ fallback: settings, response });
      return normalizeSettings ? normalizeSettings(withDefaults) : withDefaults;
    },

    addTransfer: (url: string, catalogOrigin?: CatalogOriginInput): Promise<AddTransferResponse> =>
      call("Add transfer request", (s, requestHeaders) =>
        userClient.addTransfer(
          { url, catalogOrigin: toCatalogOrigin(catalogOrigin) },
          { headers: requestHeaders, signal: s },
        ),
      ),

    getDownloadFolder: (signal?: AbortSignal): Promise<GetDownloadFolderResponse> =>
      call(
        "Download folder request",
        (s, requestHeaders) =>
          userClient.getDownloadFolder({}, { headers: requestHeaders, signal: s }),
        signal,
      ),

    getFolder: (id: bigint, signal?: AbortSignal): Promise<GetFolderResponse> =>
      call(
        "Folder request",
        (s, requestHeaders) => userClient.getFolder({ id }, { headers: requestHeaders, signal: s }),
        signal,
      ),

    getMovies: (signal?: AbortSignal): Promise<GetMoviesResponse> =>
      call(
        "Movies request",
        (s, requestHeaders) => userClient.getMovies({}, { headers: requestHeaders, signal: s }),
        signal,
      ),

    getTVShows: (
      source: TVShowsSource | undefined,
      signal?: AbortSignal,
    ): Promise<GetTVShowsResponse> =>
      call(
        "TV shows request",
        (s, requestHeaders) =>
          userClient.getTVShows({ source }, { headers: requestHeaders, signal: s }),
        signal,
      ),

    getTVShowDetail: (imdbId: string, signal?: AbortSignal): Promise<GetTVShowDetailResponse> =>
      call(
        "TV show detail request",
        (s, requestHeaders) =>
          userClient.getTVShowDetail({ imdbId }, { headers: requestHeaders, signal: s }),
        signal,
      ),

    getTVShowSeason: (
      imdbId: string,
      seasonNumber: number,
      signal?: AbortSignal,
    ): Promise<GetTVShowSeasonResponse> =>
      call(
        "TV show season request",
        (s, requestHeaders) =>
          userClient.getTVShowSeason(
            { imdbId, seasonNumber },
            { headers: requestHeaders, signal: s },
          ),
        signal,
      ),

    getTVShowSeasonDownloads: (
      imdbId: string,
      seasonNumber: number,
      signal?: AbortSignal,
    ): Promise<GetTVShowSeasonDownloadsResponse> =>
      call(
        "TV show season downloads request",
        (s, requestHeaders) =>
          userClient.getTVShowSeasonDownloads(
            { imdbId, seasonNumber },
            { headers: requestHeaders, signal: s },
          ),
        signal,
      ),
  };
}

export function getPutioStartURL(baseUrl: string, successURL?: string): string {
  const url = new URL(`${baseUrl}/auth/putio/start`);
  const trimmed = successURL?.trim() ?? "";
  if (trimmed.length > 0) {
    url.searchParams.set("success_url", trimmed);
  }
  return url.toString();
}
