import { create, type MessageInitShape } from "@bufbuild/protobuf";
import {
  CodecFilter,
  OtherFilter,
  ResolutionFilter,
  SearchSettingsSchema,
  SortBy,
  SortDirection,
} from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";
import { renderToString } from "react-dom/server";

import { filterStateForSearch, useSearchFilters } from "./use-search-filters";

const defaultSettings = {
  codecFilters: [],
  disabledIndexerIds: [],
  filterNastyResults: true,
  filterResultsWithNoSeeders: false,
  otherFilters: [],
  rememberQuickFilters: false,
  resolutionFilters: [],
  searchResultDisplayBehavior: 2,
  searchResultTitleBehavior: 2,
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
} satisfies MessageInitShape<typeof SearchSettingsSchema>;

function makeSettings(overrides: MessageInitShape<typeof SearchSettingsSchema> = {}) {
  return {
    ...create(SearchSettingsSchema, { ...defaultSettings, ...overrides }),
    download: {},
  };
}

function SearchFiltersHarness({
  savedSettings,
}: {
  savedSettings: Parameters<typeof useSearchFilters>[0];
}) {
  const { filters } = useSearchFilters(savedSettings);

  return <pre>{JSON.stringify(filters)}</pre>;
}

describe("useSearchFilters", () => {
  it("initializes from saved settings available on first render", () => {
    const saved = makeSettings({
      codecFilters: [CodecFilter.X265],
      otherFilters: [OtherFilter.HDR],
      rememberQuickFilters: true,
      resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });

    const html = renderToString(<SearchFiltersHarness savedSettings={saved} />);
    const serialized = html.replace("<pre>", "").replace("</pre>", "").replaceAll("&quot;", '"');

    expect(serialized).toBe(
      JSON.stringify({
        resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
        codec: [CodecFilter.X265],
        other: [],
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      }),
    );
  });

  it("keeps local quick filters when saved sort settings change", () => {
    const localQuickFilters = {
      searchKey: "movie",
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
    };
    const saved = makeSettings({ sortBy: SortBy.SIZE, sortDirection: SortDirection.ASC });

    expect(filterStateForSearch(saved, "movie", localQuickFilters)).toEqual({
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });

  it("syncs untouched quick filters from newly loaded settings", () => {
    const saved = makeSettings({
      codecFilters: [CodecFilter.X265],
      otherFilters: [OtherFilter.HDR],
      rememberQuickFilters: true,
      resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });

    expect(filterStateForSearch(saved, "movie", null)).toEqual({
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [CodecFilter.X265],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });

  it("resets temporary quick filters for a new search without changing sort", () => {
    const localQuickFilters = {
      searchKey: "movie",
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
    };
    const saved = makeSettings({ sortBy: SortBy.SIZE, sortDirection: SortDirection.ASC });

    expect(filterStateForSearch(saved, "show", localQuickFilters)).toEqual({
      resolution: [],
      codec: [],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });

  it("keeps untouched remembered quick-filter categories synced from settings", () => {
    const localQuickFilters = {
      searchKey: "movie",
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
    };
    const saved = makeSettings({
      codecFilters: [CodecFilter.X265],
      otherFilters: [OtherFilter.HDR],
      rememberQuickFilters: true,
    });

    expect(filterStateForSearch(saved, "movie", localQuickFilters)).toEqual({
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [CodecFilter.X265],
      other: [],
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    });
  });

  it("ignores saved quick filters when remembering is disabled", () => {
    const saved = makeSettings({
      codecFilters: [CodecFilter.X265],
      otherFilters: [OtherFilter.HDR],
      resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
    });

    expect(filterStateForSearch(saved, "movie", null)).toEqual({
      resolution: [],
      codec: [],
      other: [],
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    });
  });

  it("uses local sort before the saved preference catches up", () => {
    const saved = makeSettings();

    expect(
      filterStateForSearch(saved, "movie", null, {
        baseSettingsData: saved,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      }),
    ).toEqual({
      resolution: [],
      codec: [],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });

  it("lets changed saved sort settings override stale local sort", () => {
    const baseSettings = makeSettings();
    const resetSettings = makeSettings({ sortBy: SortBy.SIZE });

    expect(
      filterStateForSearch(resetSettings, "movie", null, {
        baseSettingsData: baseSettings,
        sortBy: SortBy.TITLE,
        sortDirection: SortDirection.ASC,
      }),
    ).toEqual({
      resolution: [],
      codec: [],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.DESC,
    });
  });

  it("falls back to the default sort when a removed title/source sort is saved", () => {
    const savedTitle = makeSettings({ sortBy: SortBy.TITLE, sortDirection: SortDirection.ASC });
    expect(filterStateForSearch(savedTitle, "movie", null)).toMatchObject({
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    });

    const savedSource = makeSettings({ sortBy: SortBy.SOURCE, sortDirection: SortDirection.ASC });
    expect(filterStateForSearch(savedSource, "movie", null)).toMatchObject({
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    });
  });
});
