import { create, toJsonString } from "@bufbuild/protobuf";
import * as v from "valibot";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserGetIndexersResponseSchema,
  UserIndexerSchema,
  UserSettingsSchema,
  type UserIndexer,
  type UserSettings,
} from "@chill-institute/contracts/chill/v4/api_pb";

const USER_SETTINGS_STORAGE_KEY = "chill.user-settings.v1";
const LEGACY_SEARCH_SETTINGS_STORAGE_KEY = "chill.search.settings.v1";
const LEGACY_CATALOG_SETTINGS_STORAGE_KEY = "chill.catalog.settings.v1";
const INDEXERS_STORAGE_KEY = "chill.indexers";

type SettingsDomain = "search" | "catalog";

const jsonInt64 = v.pipe(
  v.union([v.string(), v.number()]),
  v.check((value) => /^-?\d+$/.test(String(value))),
);

const cachedDownloadSettingsSchema = v.looseObject({
  folderId: v.optional(jsonInt64),
});

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
  download: cachedDownloadSettingsSchema,
});

const cachedCatalogSettingsSchema = v.looseObject({
  catalog: v.looseObject({
    moviesSource: v.number(),
    tvShowsSource: v.number(),
  }),
  download: cachedDownloadSettingsSchema,
});

const cachedIndexerSchema = v.looseObject({
  enabled: v.boolean(),
  id: v.string(),
  name: v.string(),
});

const cachedIndexersResponseSchema = v.looseObject({
  indexers: v.array(cachedIndexerSchema),
});

const legacyCachedIndexersSchema = v.array(cachedIndexerSchema);

type CachedDownloadSettings = v.InferOutput<typeof cachedDownloadSettingsSchema>;
type CachedSearchSettings = v.InferOutput<typeof cachedSearchSettingsSchema>;
type CachedCatalogSettings = v.InferOutput<typeof cachedCatalogSettingsSchema>;

function warnCacheFailure(message: string, error: unknown) {
  console.warn(`[chill] ${message}`, error);
}

function reviveLegacyBigInt(_key: string, value: unknown) {
  return typeof value === "string" && /^\d+n$/.test(value) ? value.slice(0, -1) : value;
}

function parseCachedSettingsJson(raw: string): unknown {
  return JSON.parse(raw, reviveLegacyBigInt);
}

function createDownloadSettings(download: CachedDownloadSettings) {
  const rawFolderId = download.folderId;
  return create(DownloadSettingsSchema, {
    folderId: rawFolderId === undefined ? undefined : BigInt(rawFolderId),
  });
}

function userSettingsFromSearchJson(value: CachedSearchSettings) {
  return create(UserSettingsSchema, {
    search: create(SearchSettingsSchema, value.search),
    download: createDownloadSettings(value.download),
  });
}

function userSettingsFromCatalogJson(value: CachedCatalogSettings) {
  return create(UserSettingsSchema, {
    catalog: create(CatalogSettingsSchema, value.catalog),
    download: createDownloadSettings(value.download),
  });
}

function parseCachedUserSettingsForDomain(raw: string, domain: SettingsDomain) {
  const json = parseCachedSettingsJson(raw);
  if (domain === "search") {
    const result = v.safeParse(cachedSearchSettingsSchema, json);
    return result.success ? userSettingsFromSearchJson(result.output) : undefined;
  }

  const result = v.safeParse(cachedCatalogSettingsSchema, json);
  return result.success ? userSettingsFromCatalogJson(result.output) : undefined;
}

function readCachedUserSettingsFrom(key: string, domain: SettingsDomain) {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  return parseCachedUserSettingsForDomain(raw, domain);
}

function readCachedUserSettings(domain: SettingsDomain): UserSettings | undefined {
  try {
    const cached = readCachedUserSettingsFrom(USER_SETTINGS_STORAGE_KEY, domain);
    if (cached) return cached;

    const legacyKey =
      domain === "search"
        ? LEGACY_SEARCH_SETTINGS_STORAGE_KEY
        : LEGACY_CATALOG_SETTINGS_STORAGE_KEY;
    const legacy = readCachedUserSettingsFrom(legacyKey, domain);
    if (legacy) return legacy;

    if (localStorage.getItem(USER_SETTINGS_STORAGE_KEY) || localStorage.getItem(legacyKey)) {
      console.warn("[chill] Ignoring cached settings with an unexpected shape");
    }
    return undefined;
  } catch (error) {
    warnCacheFailure("Failed to read cached settings", error);
    return undefined;
  }
}

function readAnyCachedUserSettings(): UserSettings | undefined {
  try {
    const raw = localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return undefined;

    const searchSettings = parseCachedUserSettingsForDomain(raw, "search");
    const catalogSettings = parseCachedUserSettingsForDomain(raw, "catalog");
    if (!searchSettings && !catalogSettings) return undefined;

    return create(UserSettingsSchema, {
      search: searchSettings?.search,
      catalog: catalogSettings?.catalog,
      download: searchSettings?.download ?? catalogSettings?.download,
    });
  } catch (error) {
    warnCacheFailure("Failed to read cached settings", error);
    return undefined;
  }
}

function writeCachedUserSettings(settings: UserSettings) {
  try {
    const cached = readAnyCachedUserSettings();
    const next: UserSettings = {
      ...settings,
      search: settings.search ?? cached?.search,
      catalog: settings.catalog ?? cached?.catalog,
      download: settings.download ?? cached?.download,
    };
    localStorage.setItem(
      USER_SETTINGS_STORAGE_KEY,
      toJsonString(UserSettingsSchema, next, {
        alwaysEmitImplicit: true,
        enumAsInteger: true,
      }),
    );
  } catch (error) {
    warnCacheFailure("Failed to write cached settings", error);
  }
}

export function readCachedSearchSettings() {
  return readCachedUserSettings("search");
}

export function readCachedCatalogSettings() {
  return readCachedUserSettings("catalog");
}

export function writeCachedSettings(settings: UserSettings) {
  writeCachedUserSettings(settings);
}

function createCachedIndexer(indexer: v.InferOutput<typeof cachedIndexerSchema>) {
  return create(UserIndexerSchema, indexer);
}

export function readCachedIndexers(): UserIndexer[] | undefined {
  try {
    const raw = localStorage.getItem(INDEXERS_STORAGE_KEY);
    if (!raw) return undefined;

    const json = parseCachedSettingsJson(raw);
    const responseResult = v.safeParse(cachedIndexersResponseSchema, json);
    if (responseResult.success) {
      return responseResult.output.indexers.map(createCachedIndexer);
    }

    const legacyResult = v.safeParse(legacyCachedIndexersSchema, json);
    if (legacyResult.success) {
      return legacyResult.output.map(createCachedIndexer);
    }

    throw new Error("Cached indexers must include id, name, and enabled");
  } catch (error) {
    warnCacheFailure("Failed to read cached indexers", error);
    return undefined;
  }
}

export function writeCachedIndexers(indexers: UserIndexer[]) {
  try {
    localStorage.setItem(
      INDEXERS_STORAGE_KEY,
      toJsonString(
        UserGetIndexersResponseSchema,
        create(UserGetIndexersResponseSchema, { indexers }),
        { alwaysEmitImplicit: true, enumAsInteger: true },
      ),
    );
  } catch (error) {
    warnCacheFailure("Failed to write cached indexers", error);
  }
}
