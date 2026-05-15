import { queryOptions } from "@tanstack/react-query";

import { createApi } from "@/lib/api";
import { normalizeBingeUserSettings, type UserSettings } from "@/lib/types";

const FIVE_MINUTES = 5 * 60 * 1000;

const SETTINGS_STORAGE_KEY = "chill.settings";

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
    isNumberArray(value.codecFilters) &&
    isStringArray(value.disabledIndexerIds) &&
    isBoolean(value.filterNastyResults) &&
    isBoolean(value.filterResultsWithNoSeeders) &&
    isNumberArray(value.otherFilters) &&
    isBoolean(value.rememberQuickFilters) &&
    isNumberArray(value.resolutionFilters) &&
    typeof value.searchResultDisplayBehavior === "number" &&
    typeof value.searchResultTitleBehavior === "number" &&
    isBoolean(value.showMovies) &&
    isBoolean(value.showTvShows) &&
    typeof value.sortBy === "number" &&
    typeof value.sortDirection === "number" &&
    typeof value.cardDisplayType === "number" &&
    typeof value.moviesSource === "number" &&
    typeof value.tvShowsSource === "number"
  );
}

export function readCachedSettings(): UserSettings | undefined {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw, (_, v) =>
      typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
    );
    if (!isValidCachedSettings(parsed)) {
      console.warn("[chill] Ignoring cached settings with an unexpected shape");
      return undefined;
    }
    return normalizeBingeUserSettings(parsed);
  } catch (error) {
    warnCacheFailure("Failed to read cached settings", error);
    return undefined;
  }
}

export function writeCachedSettings(settings: UserSettings) {
  try {
    const normalizedSettings = normalizeBingeUserSettings(settings);
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizedSettings, (_, v) => (typeof v === "bigint" ? `${v}n` : v)),
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
