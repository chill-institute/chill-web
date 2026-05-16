import { useState } from "react";

import type { UserSettings } from "@/lib/types";
import { SortBy, SortDirection } from "@/lib/types";

export type FilterState = {
  resolution: UserSettings["resolutionFilters"];
  codec: UserSettings["codecFilters"];
  other: UserSettings["otherFilters"];
  sortBy: UserSettings["sortBy"];
  sortDirection: UserSettings["sortDirection"];
};

export type Action =
  | { type: "SET_RESOLUTION"; value: FilterState["resolution"] }
  | { type: "SET_CODEC"; value: FilterState["codec"] }
  | { type: "SET_OTHER"; value: FilterState["other"] }
  | { type: "SET_SORT"; value: FilterState["sortBy"] }
  | { type: "TOGGLE_SORT_DIR" };

function applyAction(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case "SET_RESOLUTION":
      return { ...state, resolution: action.value };
    case "SET_CODEC":
      return { ...state, codec: action.value };
    case "SET_OTHER":
      return { ...state, other: action.value };
    case "SET_SORT":
      return { ...state, sortBy: action.value };
    case "TOGGLE_SORT_DIR":
      return {
        ...state,
        sortDirection:
          state.sortDirection === SortDirection.ASC ? SortDirection.DESC : SortDirection.ASC,
      };
  }
}

const initialState: FilterState = {
  resolution: [],
  codec: [],
  other: [],
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
};

function toFilterState(settingsData: UserSettings | undefined): FilterState {
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

export function useSearchFilters(settingsData: UserSettings | undefined) {
  const [filters, setFilters] = useState<FilterState>(() => toFilterState(settingsData));
  const [lastSeenSettings, setLastSeenSettings] = useState(settingsData);

  if (settingsData !== lastSeenSettings) {
    setLastSeenSettings(settingsData);
    setFilters(toFilterState(settingsData));
  }

  function dispatch(action: Action): void {
    setFilters((prev) => applyAction(prev, action));
  }

  return { filters, dispatch };
}
