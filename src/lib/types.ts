import { create } from "@bufbuild/protobuf";
import {
  SEARCH_SETTINGS_FALLBACKS,
  withSearchSettingsDefaults,
  withUserSettingsDefaults,
} from "@/api/settings-defaults";
import {
  CodecFilter,
  DownloadSettingsSchema,
  OtherFilter,
  ResolutionFilter,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SearchSettingsSchema,
  SortBy,
  SortDirection,
  type DownloadSettings,
  type SearchResult,
  type SearchSettings,
  type UserSettings,
  type UserIndexer,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

export {
  CodecFilter,
  OtherFilter,
  ResolutionFilter,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SortBy,
  SortDirection,
};

export type { SearchResult, UserSettings, UserIndexer };

export type ChillSettings = Omit<SearchSettings, "$typeName"> & {
  download: Omit<DownloadSettings, "$typeName">;
};

type ChillSettingsDefaults = Omit<SearchSettings, "$typeName">;

export const resolutionFilters = [
  ResolutionFilter.RESOLUTION_FILTER_720P,
  ResolutionFilter.RESOLUTION_FILTER_1080P,
  ResolutionFilter.RESOLUTION_FILTER_2160P,
] as const;

export const resolutionFilterLabels: Record<(typeof resolutionFilters)[number], string> = {
  [ResolutionFilter.RESOLUTION_FILTER_720P]: "720p",
  [ResolutionFilter.RESOLUTION_FILTER_1080P]: "1080p",
  [ResolutionFilter.RESOLUTION_FILTER_2160P]: "2160p",
};

export const codecFilters = [CodecFilter.X264, CodecFilter.X265] as const;

export const codecFilterLabels: Record<(typeof codecFilters)[number], string> = {
  [CodecFilter.X264]: "x264",
  [CodecFilter.X265]: "x265",
};

export const otherFilters = [OtherFilter.HDR] as const;

export const otherFilterLabels: Record<(typeof otherFilters)[number], string> = {
  [OtherFilter.HDR]: "HDR",
};

export const searchResultDisplayBehaviors = [
  SearchResultDisplayBehavior.ALL,
  SearchResultDisplayBehavior.FASTEST,
] as const;

export const searchResultDisplayBehaviorLabels: Record<
  (typeof searchResultDisplayBehaviors)[number],
  string
> = {
  [SearchResultDisplayBehavior.ALL]: "Wait for all results",
  [SearchResultDisplayBehavior.FASTEST]: "Show fastest first",
};

export const searchResultTitleBehaviors = [
  SearchResultTitleBehavior.LINK,
  SearchResultTitleBehavior.TEXT,
] as const;

export const searchResultTitleBehaviorLabels: Record<
  (typeof searchResultTitleBehaviors)[number],
  string
> = {
  [SearchResultTitleBehavior.LINK]: "Link title to source",
  [SearchResultTitleBehavior.TEXT]: "Plain text title",
};

export const sortByValues = [
  SortBy.TITLE,
  SortBy.SEEDERS,
  SortBy.SIZE,
  SortBy.UPLOADED_AT,
  SortBy.SOURCE,
] as const;

export const sortByLabels: Record<(typeof sortByValues)[number], string> = {
  [SortBy.TITLE]: "Name",
  [SortBy.SEEDERS]: "Seeders",
  [SortBy.SIZE]: "Size",
  [SortBy.UPLOADED_AT]: "Age",
  [SortBy.SOURCE]: "Source",
};

const defaultUserSettings: ChillSettingsDefaults = {
  codecFilters: [],
  disabledIndexerIds: [],
  filterNastyResults: true,
  filterResultsWithNoSeeders: false,
  otherFilters: [],
  rememberQuickFilters: false,
  resolutionFilters: [],
  searchResultDisplayBehavior: SEARCH_SETTINGS_FALLBACKS.searchResultDisplayBehavior,
  searchResultTitleBehavior: SEARCH_SETTINGS_FALLBACKS.searchResultTitleBehavior,
  sortBy: SEARCH_SETTINGS_FALLBACKS.sortBy,
  sortDirection: SEARCH_SETTINGS_FALLBACKS.sortDirection,
};

export function toChillSettings(settings: UserSettings): ChillSettings {
  const normalized = withUserSettingsDefaults(settings);
  return {
    ...defaultUserSettings,
    ...normalized.search,
    download: {
      folderId: normalized.download?.folderId,
    },
  };
}

export function applyChillSettingsPatch(
  settings: UserSettings,
  patch: Partial<ChillSettings>,
): UserSettings {
  const normalized = withSearchSettingsDefaults(settings);
  const { download, ...searchPatch } = patch;
  const next = create(UserSettingsSchema, {
    ...normalized,
    search: create(SearchSettingsSchema, {
      codecFilters: normalized.search?.codecFilters ?? [],
      disabledIndexerIds: normalized.search?.disabledIndexerIds ?? [],
      filterNastyResults: normalized.search?.filterNastyResults ?? true,
      filterResultsWithNoSeeders: normalized.search?.filterResultsWithNoSeeders ?? false,
      otherFilters: normalized.search?.otherFilters ?? [],
      rememberQuickFilters: normalized.search?.rememberQuickFilters ?? false,
      resolutionFilters: normalized.search?.resolutionFilters ?? [],
      searchResultDisplayBehavior:
        normalized.search?.searchResultDisplayBehavior ??
        SEARCH_SETTINGS_FALLBACKS.searchResultDisplayBehavior,
      searchResultTitleBehavior:
        normalized.search?.searchResultTitleBehavior ??
        SEARCH_SETTINGS_FALLBACKS.searchResultTitleBehavior,
      sortBy: normalized.search?.sortBy ?? SEARCH_SETTINGS_FALLBACKS.sortBy,
      sortDirection: normalized.search?.sortDirection ?? SEARCH_SETTINGS_FALLBACKS.sortDirection,
      ...searchPatch,
    }),
  });
  if (download !== undefined || normalized.download !== undefined) {
    next.download = create(DownloadSettingsSchema, {
      folderId: download?.folderId ?? normalized.download?.folderId,
    });
  }
  return next;
}

export function resetChillSettings(settings: UserSettings): UserSettings {
  return create(UserSettingsSchema, {
    ...settings,
    search: create(SearchSettingsSchema, defaultUserSettings),
  });
}
