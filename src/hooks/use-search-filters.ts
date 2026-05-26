import { useEffect, useRef, useState } from "react";

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
  resolution: boolean;
  codec: boolean;
  other: boolean;
};

const initialState: FilterState = {
  resolution: [],
  codec: [],
  other: [],
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
};

const cleanQuickFilters: DirtyQuickFilters = {
  resolution: false,
  codec: false,
  other: false,
};

function toFilterState(settingsData: ChillSettings | undefined): FilterState {
  if (!settingsData) {
    return initialState;
  }

  return {
    resolution: settingsData.resolutionFilters,
    codec: settingsData.codecFilters,
    other: settingsData.otherFilters,
    sortBy: settingsData.sortBy,
    sortDirection: settingsData.sortDirection,
  };
}

export function syncFilterStateWithSettings(
  state: FilterState,
  settingsData: ChillSettings | undefined,
  dirtyQuickFilters: DirtyQuickFilters,
): FilterState {
  const next = toFilterState(settingsData);
  return {
    ...next,
    resolution: dirtyQuickFilters.resolution ? state.resolution : next.resolution,
    codec: dirtyQuickFilters.codec ? state.codec : next.codec,
    other: dirtyQuickFilters.other ? state.other : next.other,
  };
}

export function useSearchFilters(settingsData: ChillSettings | undefined) {
  const [filters, setFilters] = useState<FilterState>(() => toFilterState(settingsData));
  const dirtyQuickFiltersRef = useRef<DirtyQuickFilters>(cleanQuickFilters);

  useEffect(() => {
    setFilters((prev) =>
      syncFilterStateWithSettings(prev, settingsData, dirtyQuickFiltersRef.current),
    );
  }, [settingsData]);

  function setResolution(resolution: FilterState["resolution"]): void {
    dirtyQuickFiltersRef.current = {
      ...dirtyQuickFiltersRef.current,
      resolution: true,
    };
    setFilters((prev) => ({ ...prev, resolution }));
  }

  function setCodec(codec: FilterState["codec"]): void {
    dirtyQuickFiltersRef.current = {
      ...dirtyQuickFiltersRef.current,
      codec: true,
    };
    setFilters((prev) => ({ ...prev, codec }));
  }

  function setOther(other: FilterState["other"]): void {
    dirtyQuickFiltersRef.current = {
      ...dirtyQuickFiltersRef.current,
      other: true,
    };
    setFilters((prev) => ({ ...prev, other }));
  }

  function setSortBy(sortBy: FilterState["sortBy"]): void {
    setFilters((prev) => ({ ...prev, sortBy }));
  }

  function toggleSortDirection(): void {
    setFilters((prev) => ({
      ...prev,
      sortDirection:
        prev.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
    }));
  }

  return { filters, setCodec, setOther, setResolution, setSortBy, toggleSortDirection };
}
