import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  GetDownloadFolderResponseSchema,
  GetFolderResponseSchema,
  UserProfileSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import type { ChillApi } from "@/api/api";

import { downloadFolderQueryOptions, folderQueryOptions, userProfileQueryOptions } from "./options";

function unusedCall() {
  return Promise.reject(new Error("unused api method"));
}

function createApiStub() {
  return {
    getUserProfile: vi.fn(async () => create(UserProfileSchema, { username: "tester" })),
    search: unusedCall,
    getIndexers: unusedCall,
    getUserSettings: unusedCall,
    saveUserSettings: unusedCall,
    addTransfer: unusedCall,
    getDownloadFolder: vi.fn(async () => create(GetDownloadFolderResponseSchema, {})),
    getFolder: vi.fn(async () => create(GetFolderResponseSchema, {})),
    getMovies: unusedCall,
    getTVShows: unusedCall,
    getTVShowDetail: unusedCall,
    getTVShowSeason: unusedCall,
    getTVShowSeasonDownloads: unusedCall,
  } satisfies ChillApi;
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe("auth query options", () => {
  it("gates user profile queries by auth token and keeps signed-out data apart", async () => {
    const api = createApiStub();
    const disabled = userProfileQueryOptions(api, null);
    const enabled = userProfileQueryOptions(api, "token");

    expect(disabled.enabled).toBe(false);
    expect(enabled.enabled).toBe(true);
    expect(disabled.queryKey).not.toEqual(enabled.queryKey);

    const client = createQueryClient();
    await client.fetchQuery(enabled);

    expect(api.getUserProfile).toHaveBeenCalledWith(expect.any(AbortSignal));
  });

  it("loads the download folder and caches each browsed folder apart", async () => {
    const api = createApiStub();
    const client = createQueryClient();

    await client.fetchQuery(downloadFolderQueryOptions(api));
    await client.fetchQuery(folderQueryOptions(api, 42n));

    expect(folderQueryOptions(api, 42n).queryKey).not.toEqual(
      folderQueryOptions(api, 43n).queryKey,
    );
    expect(api.getDownloadFolder).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.getFolder).toHaveBeenCalledWith(42n, expect.any(AbortSignal));
  });
});
