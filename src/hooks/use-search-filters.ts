import { useState } from "react";

import type { ChillSettings } from "@/lib/types";
import { SortBy, SortDirection } from "@/lib/types";

export type FilterState = {
  resolution: ChillSettings["resolutionFilters"];
  codec: ChillSettings["codecFilters"];
  other: ChillSettings["otherFilters"];
  sortBy: ChillSettings["sortBy"];
  sortDirection: ChillSettings["sortDirection"];
};

type DirtyQuickFilters = {
  searchKey: string;
  resolution?: FilterState["resolution"];
  codec?: FilterState["codec"];
  other?: FilterState["other"];
};

type LocalSort = {
  baseSettingsData: ChillSettings | undefined;
  sortBy: FilterState["sortBy"];
  sortDirection: FilterState["sortDirection"];
};

type LocalSortPatch = Pick<LocalSort, "sortBy" | "sortDirection">;

const initialState: FilterState = {
  resolution: [],
  codec: [],
  other: [],
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
};

const emptyQuickFilters = {
  resolution: [],
  codec: [],
  other: [],
};

function savedQuickFilters(settingsData: ChillSettings | undefined) {
  if (!settingsData?.rememberQuickFilters) {
    return emptyQuickFilters;
  }
  return {
    resolution: settingsData.resolutionFilters,
    codec: settingsData.codecFilters,
    // The HDR/other filter has no UI control anymore, so a previously saved
    // otherFilters value would otherwise apply as an invisible, unclearable filter.
    other: [],
  };
}

export function filterStateForSearch(
  settingsData: ChillSettings | undefined,
  searchKey: string,
  localQuickFilters: DirtyQuickFilters | null,
  localSort: LocalSort | null = null,
): FilterState {
  const quickFilters =
    localQuickFilters?.searchKey === searchKey
      ? {
          ...savedQuickFilters(settingsData),
          ...localQuickFilters,
        }
      : savedQuickFilters(settingsData);
  const activeLocalSort =
    localSort &&
    (settingsData === localSort.baseSettingsData ||
      (settingsData?.sortBy === localSort.sortBy &&
        settingsData.sortDirection === localSort.sortDirection));

  return {
    resolution: quickFilters.resolution,
    codec: quickFilters.codec,
    other: quickFilters.other,
    sortBy: activeLocalSort ? localSort.sortBy : (settingsData?.sortBy ?? initialState.sortBy),
    sortDirection: activeLocalSort
      ? localSort.sortDirection
      : (settingsData?.sortDirection ?? initialState.sortDirection),
  };
}

function nextLocalQuickFilters(
  previous: DirtyQuickFilters | null,
  searchKey: string,
  patch: Partial<Pick<FilterState, "resolution" | "codec" | "other">>,
): DirtyQuickFilters {
  return {
    ...(previous?.searchKey === searchKey ? previous : null),
    searchKey,
    ...patch,
  };
}

export function useSearchFilters(settingsData: ChillSettings | undefined, searchKey = "") {
  const [localQuickFilters, setLocalQuickFilters] = useState<DirtyQuickFilters | null>(null);
  const [localSort, setLocalSort] = useState<LocalSort | null>(null);
  const filters = filterStateForSearch(settingsData, searchKey, localQuickFilters, localSort);

  function setResolution(resolution: FilterState["resolution"]): void {
    setLocalQuickFilters((prev) => nextLocalQuickFilters(prev, searchKey, { resolution }));
  }

  function setCodec(codec: FilterState["codec"]): void {
    setLocalQuickFilters((prev) => nextLocalQuickFilters(prev, searchKey, { codec }));
  }

  function setOther(other: FilterState["other"]): void {
    setLocalQuickFilters((prev) => nextLocalQuickFilters(prev, searchKey, { other }));
  }

  function setSort(sort: LocalSortPatch): void {
    setLocalSort({ ...sort, baseSettingsData: settingsData });
  }

  return { filters, setCodec, setOther, setResolution, setSort };
}
