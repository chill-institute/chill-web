import { create } from "@bufbuild/protobuf";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";
import {
  DownloadSettingsSchema,
  UserIndexerSchema,
  SearchSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/lib/api";
import { readStorageValue, writeStorageValue } from "@/lib/storage-codec";
import { toChillSettings, type UserSettings, type UserIndexer } from "@/lib/types";
import { INDEXERS_QUERY_KEY, USER_SETTINGS_QUERY_KEY } from "@/queries/keys";

const FIVE_MINUTES = 5 * 60 * 1000;

const SETTINGS_STORAGE_KEY = "chill.search.settings.v1";
const INDEXERS_STORAGE_KEY = "chill.indexers";

const cachedSearchSettingsSchema = v.looseObject({
  search: v.looseObject({
    codecFilters: v.array(v.number()),
    disabledIndexerIds: v.array(v.string()),
    filterNastyResults: v.boolean(),
    filterResultsWithNoSeeders: v.boolean(),
    otherFilters: v.array(v.number()),
    rememberQuickFilters: v.boolean(),
    resolutionFilters: v.array(v.number()),
    searchResultDisplayBehavior: v.number(),
    searchResultTitleBehavior: v.number(),
    sortBy: v.number(),
    sortDirection: v.number(),
  }),
  download: v.looseObject({
    folderId: v.optional(v.bigint()),
  }),
});

const cachedIndexersSchema = v.array(
  v.looseObject({
    enabled: v.boolean(),
    id: v.string(),
    name: v.string(),
  }),
);

export function readCachedSettings(): UserSettings | undefined {
  return readStorageValue({
    key: SETTINGS_STORAGE_KEY,
    schema: cachedSearchSettingsSchema,
    failureMessage: "Failed to read cached settings",
    invalidMessage: "Ignoring cached settings with an unexpected shape",
    createValue: (parsed) =>
      create(UserSettingsSchema, {
        search: create(SearchSettingsSchema, parsed.search),
        download: create(DownloadSettingsSchema, parsed.download),
      }),
  });
}

export function writeCachedSettings(settings: UserSettings) {
  writeStorageValue({
    key: SETTINGS_STORAGE_KEY,
    value: settings,
    failureMessage: "Failed to write cached settings",
    createStoredValue: (nextSettings) => {
      const appSettings = toChillSettings(nextSettings);
      const { download, ...searchSettings } = appSettings;
      return {
        search: create(SearchSettingsSchema, searchSettings),
        download: create(DownloadSettingsSchema, download),
      };
    },
  });
}

export function readCachedIndexers(): UserIndexer[] | undefined {
  return readStorageValue({
    key: INDEXERS_STORAGE_KEY,
    schema: cachedIndexersSchema,
    failureMessage: "Failed to read cached indexers",
    invalidMessage: "Ignoring cached indexers with an unexpected shape",
    createValue: (indexers) =>
      indexers.map(({ enabled, id, name }) =>
        create(UserIndexerSchema, {
          enabled,
          id,
          name,
        }),
      ),
  });
}

export function writeCachedIndexers(indexers: UserIndexer[]) {
  writeStorageValue({
    key: INDEXERS_STORAGE_KEY,
    value: indexers,
    failureMessage: "Failed to write cached indexers",
    createStoredValue: (nextIndexers) => nextIndexers,
  });
}

export function settingsQueryOptions(token: string) {
  return settingsQueryOptionsForApi(createApi(token));
}

export function settingsQueryOptionsForApi(api: ReturnType<typeof createApi>) {
  return queryOptions({
    queryKey: USER_SETTINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const settings = await api.getUserSettings(signal);
      writeCachedSettings(settings);
      return settings;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: readCachedSettings(),
  });
}

export function indexersQueryOptions(token: string) {
  return indexersQueryOptionsForApi(createApi(token));
}

export function indexersQueryOptionsForApi(api: ReturnType<typeof createApi>) {
  return queryOptions({
    queryKey: INDEXERS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const indexers = await api.getIndexers(signal);
      writeCachedIndexers(indexers);
      return indexers;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: readCachedIndexers(),
  });
}
