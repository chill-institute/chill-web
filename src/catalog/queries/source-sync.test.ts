import { create, fromJson, toJson, type JsonValue } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  MoviesSource,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { getClientRequestTimeoutDetails } from "@/api/request-timeout";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";

import { syncMovieSourceFromSearch } from "./source-sync";

const storage = new Map<string, string>();

function settings(moviesSource: MoviesSource) {
  return create(UserSettingsSchema, {
    catalog: create(CatalogSettingsSchema, { moviesSource }),
  });
}

function settingsResponse(moviesSource: MoviesSource) {
  return new Response(JSON.stringify(toJson(UserSettingsSchema, settings(moviesSource))), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

beforeEach(() => {
  storage.clear();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("syncMovieSourceFromSearch", () => {
  it("labels settings read timeouts separately from write timeouts", async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      await new Promise<void>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), {
          once: true,
        });
      });
      return new Response();
    });

    const attempt = syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.YTS,
      token: "placeholder",
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(20000);
    const error = await attempt;

    expect(getClientRequestTimeoutDetails(error)).toMatchObject({
      operation: "settings.read",
      surface: "movies.source-sync",
      timeoutMs: 20000,
    });
  });

  it("refetches invalidated settings before deciding whether to save", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, settings(MoviesSource.IMDB_MOVIEMETER));
    await queryClient.invalidateQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
    const methods: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const method = new URL(new Request(input).url).pathname.split("/").at(-1) ?? "unknown";
      methods.push(method);
      if (method === "GetUserSettings") return settingsResponse(MoviesSource.YTS);
      throw new Error(`Unexpected RPC: ${method}`);
    });

    await syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.YTS,
      token: "placeholder",
    });

    expect(methods).toEqual(["GetUserSettings"]);
  });

  it("lets the latest overlapping source sync win", async () => {
    const queryClient = createQueryClient();
    const serverSource = MoviesSource.ROTTEN_TOMATOES;
    let releaseFirstRead!: () => void;
    const firstReadGate = new Promise<void>((resolve) => {
      releaseFirstRead = resolve;
    });
    let reads = 0;
    const savedSources: number[] = [];

    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const method = new URL(request.url).pathname.split("/").at(-1);
      if (method === "GetUserSettings") {
        reads += 1;
        if (reads === 1) await firstReadGate;
        return settingsResponse(serverSource);
      }
      if (method !== "SaveUserSettings") throw new Error(`Unexpected RPC: ${method}`);

      const body = (await request.clone().json()) as { settings?: JsonValue };
      if (body.settings === undefined) {
        throw new Error("SaveUserSettings missing settings");
      }
      const saved = fromJson(UserSettingsSchema, body.settings);
      const nextSource = saved.catalog?.moviesSource;
      if (nextSource === undefined) {
        throw new Error("SaveUserSettings missing moviesSource");
      }
      savedSources.push(nextSource);
      return settingsResponse(nextSource);
    });

    const first = syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.YTS,
      token: "placeholder",
    });
    await vi.waitFor(() => expect(reads).toBe(1));

    const second = syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.IMDB_MOVIEMETER,
      token: "placeholder",
    });
    releaseFirstRead();
    await Promise.all([first, second]);

    expect(savedSources).toEqual([MoviesSource.IMDB_MOVIEMETER]);
  });

  it("reconciles a timed-out save with a fresh read before writing again", async () => {
    vi.useFakeTimers();
    const queryClient = createQueryClient();
    let serverSource = MoviesSource.IMDB_MOVIEMETER;
    let saveCalls = 0;
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const method = new URL(request.url).pathname.split("/").at(-1);
      if (method === "GetUserSettings") return settingsResponse(serverSource);
      if (method !== "SaveUserSettings") throw new Error(`Unexpected RPC: ${method}`);

      saveCalls += 1;
      await new Promise<void>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => reject(request.signal.reason), {
          once: true,
        });
      });
      return new Response();
    });

    const firstAttempt = syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.YTS,
      token: "placeholder",
    }).catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(20000);
    const error = await firstAttempt;

    expect(getClientRequestTimeoutDetails(error)).toMatchObject({
      operation: "settings.write",
      surface: "movies.source-sync",
      timeoutMs: 20000,
    });

    serverSource = MoviesSource.YTS;
    await syncMovieSourceFromSearch({
      queryClient,
      source: MoviesSource.YTS,
      token: "placeholder",
    });

    expect(saveCalls).toBe(1);
  });
});
