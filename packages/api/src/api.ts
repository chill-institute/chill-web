import { Code, ConnectError, createClient, type Interceptor } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import {
  UserService,
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

import { redirectToSignInOnAuthFailure } from "./auth-failure";
import { withTimeoutSignal } from "./request-timeout";
import { withSearchSettingsDefaults } from "./settings-defaults";

const REQUEST_TIMEOUT_MS = 8000;
const SEARCH_TIMEOUT_MS = 10000;

function newRequestID(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const requestIDInterceptor: Interceptor = (next) => async (request) => {
  request.header.set("X-Request-Id", newRequestID());
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
};

export function createApi({ authToken, baseUrl, normalizeSettings }: CreateApiOptions) {
  const transport = createConnectTransport({
    baseUrl: `${baseUrl}/v4`,
    interceptors: [requestIDInterceptor],
  });
  const userClient = createClient(UserService, transport);
  const headers = authHeader(authToken);

  async function call<T>(
    label: string,
    fn: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const timed = withTimeoutSignal(signal, timeoutMs);
    try {
      return await fn(timed.signal);
    } catch (error) {
      if (timed.didTimeout()) {
        throw new ConnectError(`${label} timed out`, Code.DeadlineExceeded);
      }
      redirectToSignInOnAuthFailure(error);
      throw error;
    } finally {
      timed.cleanup();
    }
  }

  function applySettingsDefaults(settings: UserSettings): UserSettings {
    const withSearch = withSearchSettingsDefaults(settings);
    return normalizeSettings ? normalizeSettings(withSearch) : withSearch;
  }

  return {
    getUserProfile: (signal?: AbortSignal): Promise<UserProfile> =>
      call("Profile request", (s) => userClient.getUserProfile({}, { headers, signal: s }), signal),

    search: (query: string, indexerId?: string, signal?: AbortSignal): Promise<SearchResponse> =>
      call(
        "Search",
        (s) =>
          userClient.search({ query, indexerId: indexerId || undefined }, { headers, signal: s }),
        signal,
        SEARCH_TIMEOUT_MS,
      ),

    getIndexers: async (signal?: AbortSignal): Promise<UserIndexer[]> => {
      const response = await call(
        "Indexers request",
        (s) => userClient.getIndexers({}, { headers, signal: s }),
        signal,
      );
      return response.indexers;
    },

    getUserSettings: async (signal?: AbortSignal): Promise<UserSettings> => {
      const response = await call(
        "Settings request",
        (s) => userClient.getUserSettings({}, { headers, signal: s }),
        signal,
      );
      return applySettingsDefaults(response);
    },

    saveUserSettings: async (settings: UserSettings): Promise<UserSettings> => {
      const response = await call("Save settings request", (s) =>
        userClient.saveUserSettings({ settings }, { headers, signal: s }),
      );
      return applySettingsDefaults(response);
    },

    addTransfer: (url: string): Promise<AddTransferResponse> =>
      call("Add transfer request", (s) => userClient.addTransfer({ url }, { headers, signal: s })),

    getDownloadFolder: (signal?: AbortSignal): Promise<GetDownloadFolderResponse> =>
      call(
        "Download folder request",
        (s) => userClient.getDownloadFolder({}, { headers, signal: s }),
        signal,
      ),

    getFolder: (id: bigint, signal?: AbortSignal): Promise<GetFolderResponse> =>
      call("Folder request", (s) => userClient.getFolder({ id }, { headers, signal: s }), signal),

    getMovies: (signal?: AbortSignal): Promise<GetMoviesResponse> =>
      call("Movies request", (s) => userClient.getMovies({}, { headers, signal: s }), signal),

    getTVShows: (signal?: AbortSignal): Promise<GetTVShowsResponse> =>
      call("TV shows request", (s) => userClient.getTVShows({}, { headers, signal: s }), signal),

    getTVShowDetail: (imdbId: string, signal?: AbortSignal): Promise<GetTVShowDetailResponse> =>
      call(
        "TV show detail request",
        (s) => userClient.getTVShowDetail({ imdbId }, { headers, signal: s }),
        signal,
      ),

    getTVShowSeason: (
      imdbId: string,
      seasonNumber: number,
      signal?: AbortSignal,
    ): Promise<GetTVShowSeasonResponse> =>
      call(
        "TV show season request",
        (s) => userClient.getTVShowSeason({ imdbId, seasonNumber }, { headers, signal: s }),
        signal,
      ),

    getTVShowSeasonDownloads: (
      imdbId: string,
      seasonNumber: number,
      signal?: AbortSignal,
    ): Promise<GetTVShowSeasonDownloadsResponse> =>
      call(
        "TV show season downloads request",
        (s) =>
          userClient.getTVShowSeasonDownloads({ imdbId, seasonNumber }, { headers, signal: s }),
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
