import { create } from "@bufbuild/protobuf";
import { queryOptions } from "@tanstack/react-query";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";
import { withUserSettingsDefaults } from "@chill-institute/api/settings-defaults";

import { createApi } from "@/lib/api";
import { toBingeSettings, type UserSettings } from "@/lib/types";

const FIVE_MINUTES = 5 * 60 * 1000;

const SETTINGS_STORAGE_KEY = "binge.catalog.settings.v1";
const LEGACY_SETTINGS_STORAGE_KEY = "chill.settings";

function warnCacheFailure(message: string, error: unknown) {
  console.warn(`[chill] ${message}`, error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidCachedSettings(value: unknown): value is UserSettings {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.catalog) &&
    isRecord(value.download) &&
    typeof value.catalog.moviesSource === "number" &&
    typeof value.catalog.tvShowsSource === "number"
  );
}

function legacySettingsFromCache(value: unknown): UserSettings | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.moviesSource !== "number" || typeof value.tvShowsSource !== "number") {
    return undefined;
  }

  const folderId = typeof value.downloadFolderId === "bigint" ? value.downloadFolderId : undefined;

  return withUserSettingsDefaults(
    create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: value.moviesSource,
        tvShowsSource: value.tvShowsSource,
      }),
      download: create(DownloadSettingsSchema, folderId === undefined ? {} : { folderId }),
    }),
  );
}

function parseCachedSettings(raw: string): unknown {
  return JSON.parse(raw, (_, v) =>
    typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
  );
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
      return withUserSettingsDefaults(parsed);
    }

    const legacyRaw = localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY);
    if (!legacyRaw) return undefined;
    const legacySettings = legacySettingsFromCache(parseCachedSettings(legacyRaw));
    if (!legacySettings) {
      console.warn("[chill] Ignoring cached settings with an unexpected shape");
      return undefined;
    }
    writeCachedSettings(legacySettings);
    return legacySettings;
  } catch (error) {
    warnCacheFailure("Failed to read cached settings", error);
    return undefined;
  }
}

export function writeCachedSettings(settings: UserSettings) {
  try {
    const appSettings = toBingeSettings(settings);
    const { downloadFolderId, ...catalogSettings } = appSettings;
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(
        {
          catalog: create(CatalogSettingsSchema, catalogSettings),
          download: create(
            DownloadSettingsSchema,
            downloadFolderId === undefined ? {} : { folderId: downloadFolderId },
          ),
        },
        (_, v) => (typeof v === "bigint" ? `${v}n` : v),
      ),
    );
  } catch (error) {
    warnCacheFailure("Failed to write cached settings", error);
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
