import { ArrowDown, ArrowUp } from "lucide-react";

import { CheckboxField } from "@/ui/components/checkbox-field";
import { Button } from "@/ui/components/ui/button";
import { FieldLegend, FieldSet } from "@/ui/components/ui/field";
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
  type ChillSettings,
} from "@/lib/types";

type Props = {
  filters: FilterState;
  onResolutionChange: (next: FilterState["resolution"]) => void;
  onCodecChange: (next: FilterState["codec"]) => void;
  onOtherChange: (next: FilterState["other"]) => void;
  onSort: (sortBy: ChillSettings["sortBy"]) => void;
};

const quickFilterCheckboxClassName = "size-3.5 after:-inset-x-1.5 [&_svg]:size-2.5";
const quickFilterFieldClassName = "gap-1";
const quickFilterLabelClassName = "leading-4";

export function SearchFilterBar({
  filters,
  onResolutionChange,
  onCodecChange,
  onOtherChange,
  onSort,
}: Props) {
  return (
    <div className="flex flex-col gap-4 lg:items-center lg:gap-6">
      <FieldSet className="m-0 flex-col items-center gap-0 border-0 p-0">
        <FieldLegend className="sr-only">Quick filters</FieldLegend>
        <div
          id="quick-filters"
          className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2"
        >
          <div className="flex flex-row gap-1.5">
            {resolutionFilters.map((filter) => {
              const checked = filters.resolution.includes(filter);
              return (
                <CheckboxField
                  key={filter}
                  id={`res-${String(filter)}`}
                  size="sm"
                  className={quickFilterCheckboxClassName}
                  fieldClassName={quickFilterFieldClassName}
                  labelClassName={quickFilterLabelClassName}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked
                      ? [...filters.resolution, filter]
                      : filters.resolution.filter((v) => v !== filter);
                    onResolutionChange(next);
                  }}
                >
                  {resolutionFilterLabels[filter]}
                </CheckboxField>
              );
            })}
          </div>

          <span aria-hidden="true" className="bg-border-hairline h-3.5 w-px" />

          <div className="flex flex-row gap-1.5">
            {codecFilters.map((filter) => {
              const checked = filters.codec.includes(filter);
              return (
                <CheckboxField
                  key={filter}
                  id={`codec-${String(filter)}`}
                  size="sm"
                  className={quickFilterCheckboxClassName}
                  fieldClassName={quickFilterFieldClassName}
                  labelClassName={quickFilterLabelClassName}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked
                      ? [...filters.codec, filter]
                      : filters.codec.filter((v) => v !== filter);
                    onCodecChange(next);
                  }}
                >
                  {codecFilterLabels[filter]}
                </CheckboxField>
              );
            })}
          </div>

          <span aria-hidden="true" className="bg-border-hairline h-3.5 w-px" />

          <div className="flex flex-row gap-1.5">
            {otherFilters.map((filter) => {
              const checked = filters.other.includes(filter);
              return (
                <CheckboxField
                  key={filter}
                  id={`other-${String(filter)}`}
                  size="sm"
                  className={quickFilterCheckboxClassName}
                  fieldClassName={quickFilterFieldClassName}
                  labelClassName={quickFilterLabelClassName}
                  checked={checked}
                  onCheckedChange={(isChecked) => {
                    const next = isChecked ? [filter] : [];
                    onOtherChange(next);
                  }}
                >
                  {otherFilterLabels[filter]}
                </CheckboxField>
              );
            })}
          </div>
        </div>
      </FieldSet>

      <FieldSet className="m-0 gap-0 border-0 p-0 lg:hidden">
        <FieldLegend className="sr-only">Sort by</FieldLegend>
        <div id="sort-options" className="flex flex-wrap items-center justify-center gap-2">
          {sortByValues.map((option) => {
            const active = filters.sortBy === option;
            return (
              <Button
                key={option}
                aria-pressed={active}
                variant={active ? "default" : "outline"}
                size="sm"
                className="min-w-0 px-2.5 text-sm [min-height:2rem]"
                onClick={() => onSort(option)}
              >
                <span>{sortByLabels[option].toLowerCase()}</span>
                {active ? (
                  filters.sortDirection === SortDirection.ASC ? (
                    <ArrowUp data-icon="inline-end" className="size-3" />
                  ) : (
                    <ArrowDown data-icon="inline-end" className="size-3" />
                  )
                ) : null}
              </Button>
            );
          })}
        </div>
      </FieldSet>
    </div>
  );
}
