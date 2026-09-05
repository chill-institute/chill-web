import { MoviesSource, TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";
import { Code, ConnectError } from "@connectrpc/connect";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { queryClient } from "@/query-client";
import { createApi, toCatalogOrigin } from "./api";
import { getClientRequestEvidence } from "./request-evidence";
import { getClientRequestTimeoutDetails } from "./request-timeout";

describe("toCatalogOrigin", () => {
  it("omits unknown and unspecified origins", () => {
    expect(toCatalogOrigin(undefined)).toBeUndefined();
    expect(toCatalogOrigin({ media: "movie", source: MoviesSource.UNSPECIFIED })).toBeUndefined();
    expect(
      toCatalogOrigin({
        media: "tv",
        source: TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED,
      }),
    ).toBeUndefined();
  });

  it("maps movie and tv origins", () => {
    expect(toCatalogOrigin({ media: "movie", source: MoviesSource.TRAKT })).toEqual(
      expect.objectContaining({
        catalog: { case: "moviesSource", value: MoviesSource.TRAKT },
      }),
    );
    expect(
      toCatalogOrigin({
        media: "tv",
        source: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    ).toEqual(
      expect.objectContaining({
        catalog: { case: "tvShowsSource", value: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX },
      }),
    );
  });
});

describe("createApi request metadata", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sends client metadata on Connect requests", async () => {
    let capturedRequest: Request | undefined;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedRequest = new Request(input, init);
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    await api.getUserProfile();

    expect(capturedRequest).toBeDefined();
    expect(capturedRequest?.headers.get("X-Chill-Client")).toBe("web");
    expect(capturedRequest?.headers.get("X-Chill-Client-Version")).toBe(
      import.meta.env.VITE_PUBLIC_VERSION?.trim() || "unknown",
    );
    expect(capturedRequest?.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("sends catalog origin on attributed AddTransfer requests", async () => {
    let capturedBody: unknown;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      capturedBody = await request.json();
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    await api.addTransfer("magnet:?xt=urn:btih:abc", {
      media: "movie",
      source: MoviesSource.TRAKT,
    });

    expect(capturedBody).toEqual(
      expect.objectContaining({
        url: "magnet:?xt=urn:btih:abc",
        catalogOrigin: { moviesSource: "MOVIES_SOURCE_TRAKT" },
      }),
    );
  });

  it("omits catalog origin on direct AddTransfer requests", async () => {
    let capturedBody: unknown;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      capturedBody = await request.json();
      return new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    await api.addTransfer("magnet:?xt=urn:btih:abc");

    expect(capturedBody).toEqual({ url: "magnet:?xt=urn:btih:abc" });
  });

  it("keeps timeout evidence aligned with the request sent to the API", async () => {
    vi.useFakeTimers();
    let capturedRequestId: string | null = null;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      capturedRequestId = request.headers.get("X-Request-Id");
      await new Promise<void>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), {
          once: true,
        });
      });
      return new Response();
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    const request = api.getUserSettings().catch((error: unknown) => error);

    await vi.advanceTimersByTimeAsync(20000);
    const error = await request;

    expect(capturedRequestId).toBeTruthy();
    expect(getClientRequestTimeoutDetails(error)).toEqual({
      operation: "Settings request",
      requestId: capturedRequestId,
      timeoutMs: 20000,
    });
  });

  it("keeps transport failure evidence aligned with the request sent to the API", async () => {
    let capturedRequestId: string | null = null;
    const cause = new TypeError("Load failed");
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      capturedRequestId = request.headers.get("X-Request-Id");
      throw cause;
    });

    const api = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
    });
    const error = await api.getMovies().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ConnectError);
    expect(error).toMatchObject({ code: Code.Unavailable, cause });
    expect(capturedRequestId).toBeTruthy();
    expect(getClientRequestEvidence(error)).toEqual({
      operation: "Movies request",
      requestId: capturedRequestId,
    });
  });

  it("recovers a settings query after one browser fetch failure", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Load failed"))
      .mockResolvedValue(
        new Response("{}", {
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const client = new QueryClient({
      defaultOptions: {
        queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
      },
    });
    const api = createApi({ authToken: "placeholder", baseUrl: "https://api.example.test" });
    try {
      await expect(
        client.fetchQuery({
          queryKey: ["settings-network-recovery"],
          queryFn: ({ signal }) => api.getUserSettings(signal),
        }),
      ).resolves.toBeDefined();
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally {
      client.clear();
    }
  });

  it("preserves cancellation instead of classifying it as unavailable", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("Aborted", "AbortError");
    });
    const api = createApi({ authToken: "placeholder", baseUrl: "https://api.example.test" });
    await expect(api.getUserSettings()).rejects.toMatchObject({ code: Code.Canceled });
  });

  it("preserves server errors and failures outside fetch", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response('{"code":"internal","message":"server failure"}', {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const api = createApi({ authToken: "placeholder", baseUrl: "https://api.example.test" });
    await expect(api.getUserSettings()).rejects.toMatchObject({ code: Code.Internal });

    vi.stubGlobal(
      "fetch",
      async () => new Response("{}", { headers: { "Content-Type": "application/json" } }),
    );
    const cause = new TypeError("settings mapping failed");
    const mappingApi = createApi({
      authToken: "placeholder",
      baseUrl: "https://api.example.test",
      normalizeSettings: () => {
        throw cause;
      },
    });
    await expect(mappingApi.getUserSettings()).rejects.toBe(cause);
  });
});
