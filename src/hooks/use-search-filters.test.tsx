import { create } from "@bufbuild/protobuf";
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

import { syncFilterStateWithSettings, useSearchFilters } from "./use-search-filters";

function SearchFiltersHarness({ settings }: { settings: Parameters<typeof useSearchFilters>[0] }) {
  const { filters } = useSearchFilters(settings);

  return <pre>{JSON.stringify(filters)}</pre>;
}

describe("useSearchFilters", () => {
  it("initializes from saved settings available on first render", () => {
    const settings = {
      ...create(SearchSettingsSchema, {
        codecFilters: [CodecFilter.X265],
        disabledIndexerIds: [],
        filterNastyResults: true,
        filterResultsWithNoSeeders: false,
        otherFilters: [OtherFilter.HDR],
        rememberQuickFilters: true,
        resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
        searchResultDisplayBehavior: 2,
        searchResultTitleBehavior: 2,
        sortBy: SortBy.TITLE,
        sortDirection: SortDirection.ASC,
      }),
      download: {},
    };

    const html = renderToString(<SearchFiltersHarness settings={settings} />);
    const serialized = html.replace("<pre>", "").replace("</pre>", "").replaceAll("&quot;", '"');

    expect(serialized).toBe(
      JSON.stringify({
        resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
        codec: [CodecFilter.X265],
        other: [OtherFilter.HDR],
        sortBy: SortBy.TITLE,
        sortDirection: SortDirection.ASC,
      }),
    );
  });

  it("keeps local quick filters when saved sort settings change", () => {
    const state = {
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [],
      other: [],
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    };
    const settings = {
      ...create(SearchSettingsSchema, {
        codecFilters: [],
        disabledIndexerIds: [],
        filterNastyResults: true,
        filterResultsWithNoSeeders: false,
        otherFilters: [],
        rememberQuickFilters: false,
        resolutionFilters: [],
        searchResultDisplayBehavior: 2,
        searchResultTitleBehavior: 2,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      }),
      download: {},
    };

    expect(
      syncFilterStateWithSettings(state, settings, {
        resolution: true,
        codec: false,
        other: false,
      }),
    ).toEqual({
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [],
      other: [],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });

  it("syncs untouched quick filters from newly loaded settings", () => {
    const state = {
      resolution: [],
      codec: [],
      other: [],
      sortBy: SortBy.SEEDERS,
      sortDirection: SortDirection.DESC,
    };
    const settings = {
      ...create(SearchSettingsSchema, {
        codecFilters: [CodecFilter.X265],
        disabledIndexerIds: [],
        filterNastyResults: true,
        filterResultsWithNoSeeders: false,
        otherFilters: [OtherFilter.HDR],
        rememberQuickFilters: true,
        resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
        searchResultDisplayBehavior: 2,
        searchResultTitleBehavior: 2,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      }),
      download: {},
    };

    expect(
      syncFilterStateWithSettings(state, settings, {
        resolution: false,
        codec: false,
        other: false,
      }),
    ).toEqual({
      resolution: [ResolutionFilter.RESOLUTION_FILTER_2160P],
      codec: [CodecFilter.X265],
      other: [OtherFilter.HDR],
      sortBy: SortBy.SIZE,
      sortDirection: SortDirection.ASC,
    });
  });
});
