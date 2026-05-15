import { ArrowDown, ArrowUp } from "lucide-react";

import { Checkbox } from "@chill-institute/ui/components/ui/checkbox";
import type { FilterState } from "@/hooks/use-search-filters";
import {
  SortDirection,
  codecFilterLabels,
  codecFilters,
  otherFilterLabels,
  otherFilters,
  resolutionFilterLabels,
  resolutionFilters,
  sortByLabels,
  sortByValues,
  type UserSettings,
} from "@/lib/types";

type Props = {
  filters: FilterState;
  onResolutionChange: (next: FilterState["resolution"]) => void;
  onCodecChange: (next: FilterState["codec"]) => void;
  onOtherChange: (next: FilterState["other"]) => void;
  onSort: (sortBy: UserSettings["sortBy"]) => void;
};

export function SearchFilterBar({
  filters,
  onResolutionChange,
  onCodecChange,
  onOtherChange,
  onSort,
}: Props) {
  return (
    <div className="flex flex-col gap-6 lg:items-center">
      <fieldset className="m-0 flex flex-col items-start border-0 p-0 lg:items-center">
        <legend className="sr-only">Quick filters</legend>
        <div id="quick-filters" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex flex-row gap-2">
            {resolutionFilters.map((filter) => {
              const checked = filters.resolution.includes(filter);
              return (
                <Checkbox
                  key={filter}
                  id={`res-${String(filter)}`}
                  label={resolutionFilterLabels[filter]}
                  variant="small"
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked
                      ? [...filters.resolution, filter]
                      : filters.resolution.filter((v) => v !== filter);
                    onResolutionChange(next);
                  }}
                />
              );
            })}
          </div>

          <span aria-hidden="true" className="bg-border-hairline h-4 w-px" />

          <div className="flex flex-row gap-2">
            {codecFilters.map((filter) => {
              const checked = filters.codec.includes(filter);
              return (
                <Checkbox
                  key={filter}
                  id={`codec-${String(filter)}`}
                  label={codecFilterLabels[filter]}
                  variant="small"
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked
                      ? [...filters.codec, filter]
                      : filters.codec.filter((v) => v !== filter);
                    onCodecChange(next);
                  }}
                />
              );
            })}
          </div>

          <span aria-hidden="true" className="bg-border-hairline h-4 w-px" />

          <div className="flex flex-row gap-2">
            {otherFilters.map((filter) => {
              const checked = filters.other.includes(filter);
              return (
                <Checkbox
                  key={filter}
                  id={`other-${String(filter)}`}
                  label={otherFilterLabels[filter]}
                  variant="small"
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked ? [filter] : [];
                    onOtherChange(next);
                  }}
                />
              );
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="m-0 border-0 p-0 lg:hidden">
        <legend className="sr-only">Sort by</legend>
        <div id="sort-options" className="flex flex-wrap gap-1.5">
          {sortByValues.map((option) => {
            const active = filters.sortBy === option;
            return (
              <button
                key={option}
                type="button"
                className={`btn ${active ? "bg-active" : ""}`}
                onClick={() => onSort(option)}
              >
                <span>{sortByLabels[option].toLowerCase()}</span>
                {active ? (
                  <span className="text-xs">
                    {filters.sortDirection === SortDirection.ASC ? <ArrowUp /> : <ArrowDown />}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
