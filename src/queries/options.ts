import { create } from "@bufbuild/protobuf";
import { queryOptions } from "@tanstack/react-query";
import {
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/lib/api";
import { toChillSettings, type UserSettings, type UserIndexer } from "@/lib/types";

const FIVE_MINUTES = 5 * 60 * 1000;

const SETTINGS_STORAGE_KEY = "chill.search.settings.v1";
const INDEXERS_STORAGE_KEY = "chill.indexers";

function warnCacheFailure(message: string, error: unknown) {
  console.warn(`[chill] ${message}`, error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isValidCachedSettings(value: unknown): value is UserSettings {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.search) &&
    isRecord(value.download) &&
    isNumberArray(value.search.codecFilters) &&
    isStringArray(value.search.disabledIndexerIds) &&
    isBoolean(value.search.filterNastyResults) &&
    isBoolean(value.search.filterResultsWithNoSeeders) &&
    isNumberArray(value.search.otherFilters) &&
    isBoolean(value.search.rememberQuickFilters) &&
    isNumberArray(value.search.resolutionFilters) &&
    typeof value.search.searchResultDisplayBehavior === "number" &&
    typeof value.search.searchResultTitleBehavior === "number" &&
    typeof value.search.sortBy === "number" &&
    typeof value.search.sortDirection === "number"
  );
}

function parseCachedSettings(raw: string): unknown {
  return JSON.parse(raw, (_, v) =>
    typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
  );
}

function isValidCachedIndexer(value: unknown): value is UserIndexer {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.enabled === "boolean"
  );
}

function isValidCachedIndexers(value: unknown): value is UserIndexer[] {
  return Array.isArray(value) && value.every(isValidCachedIndexer);
}

export function readCachedSettings(): UserSettings | undefined {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = parseCachedSettings(raw);
      if (!isValidCachedSettings(parsed)) {
        console.warn("[chill] Ignoring cached settings with an unexpected shape");
        return undefined;
      }
      return create(UserSettingsSchema, {
        search: create(SearchSettingsSchema, parsed.search),
        download: create(DownloadSettingsSchema, parsed.download),
      });
    }
  } catch (error) {
    warnCacheFailure("Failed to read cached settings", error);
    return undefined;
  }
}

export function writeCachedSettings(settings: UserSettings) {
  try {
    const appSettings = toChillSettings(settings);
    const { download, ...searchSettings } = appSettings;
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        {
          search: create(SearchSettingsSchema, searchSettings),
          download: create(DownloadSettingsSchema, download),
        },
        (_, v) => (typeof v === "bigint" ? `${v}n` : v),
      ),
    );
  } catch (error) {
    warnCacheFailure("Failed to write cached settings", error);
  }
}

export function readCachedIndexers(): UserIndexer[] | undefined {
  try {
    const raw = localStorage.getItem(INDEXERS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (!isValidCachedIndexers(parsed)) {
      console.warn("[chill] Ignoring cached indexers with an unexpected shape");
      return undefined;
    }
    return parsed;
  } catch (error) {
    warnCacheFailure("Failed to read cached indexers", error);
    return undefined;
  }
}

export function writeCachedIndexers(indexers: UserIndexer[]) {
  try {
    localStorage.setItem(INDEXERS_STORAGE_KEY, JSON.stringify(indexers));
  } catch (error) {
    warnCacheFailure("Failed to write cached indexers", error);
  }
}

export function settingsQueryOptions(token: string) {
  const api = createApi(token);
  return queryOptions({
    queryKey: ["user-settings"],
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
  const api = createApi(token);
  return queryOptions({
    queryKey: ["indexers"],
    queryFn: async ({ signal }) => {
      const indexers = await api.getIndexers(signal);
      writeCachedIndexers(indexers);
      return indexers;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: readCachedIndexers(),
  });
}
