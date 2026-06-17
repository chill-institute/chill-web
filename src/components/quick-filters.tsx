import { CheckboxField } from "@/ui/components/checkbox-field";
import { NativeSelect } from "@/ui/components/ui/native-select";
import { cn } from "@/ui/lib/cn";
import type { FilterState } from "@/hooks/use-search-filters";
import {
  SortBy,
  SortDirection,
  codecFilterLabels,
  codecFilters,
  resolutionFilterLabels,
  resolutionFilters,
  type ChillSettings,
} from "@/lib/types";

type QuickFilterSort = {
  sortBy: ChillSettings["sortBy"];
  sortDirection: ChillSettings["sortDirection"];
};

type Props = {
  filters: FilterState;
  onResolutionChange: (next: FilterState["resolution"]) => void;
  onCodecChange: (next: FilterState["codec"]) => void;
  onSortChange: (next: QuickFilterSort) => void;
  className?: string;
};

// One friendly option per sort field; direction is implied by the option.
const sortOptions = [
  { label: "most seeders", sortBy: SortBy.SEEDERS, sortDirection: SortDirection.DESC },
  { label: "largest", sortBy: SortBy.SIZE, sortDirection: SortDirection.DESC },
  { label: "newest", sortBy: SortBy.UPLOADED_AT, sortDirection: SortDirection.DESC },
  { label: "name", sortBy: SortBy.TITLE, sortDirection: SortDirection.ASC },
  { label: "source", sortBy: SortBy.SOURCE, sortDirection: SortDirection.ASC },
] as const;

// Descending resolution and codec order to match the agreed layout (2160p → 720p, x265 → x264).
const resolutionOrder = [...resolutionFilters].reverse();
const codecOrder = [...codecFilters].reverse();

function toggle<T>(values: readonly T[], value: T, checked: boolean): T[] {
  return checked ? [...values, value] : values.filter((v) => v !== value);
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-fg-3 w-20 shrink-0 text-sm @2xl:hidden @4xl:inline @4xl:w-auto">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">{children}</div>
    </div>
  );
}

export function QuickFilters({
  filters,
  onResolutionChange,
  onCodecChange,
  onSortChange,
  className,
}: Props) {
  return (
    <div className={cn("@container", className)}>
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:items-center @2xl:gap-x-4 @2xl:gap-y-2">
        <FilterGroup label="resolution">
          {resolutionOrder.map((filter) => (
            <CheckboxField
              key={String(filter)}
              id={`qf-res-${String(filter)}`}
              checked={filters.resolution.includes(filter)}
              onCheckedChange={(checked) =>
                onResolutionChange(toggle(filters.resolution, filter, checked))
              }
            >
              {resolutionFilterLabels[filter]}
            </CheckboxField>
          ))}
        </FilterGroup>

        <span aria-hidden="true" className="bg-border-hairline hidden h-3.5 w-px @2xl:block" />

        <FilterGroup label="codec">
          {codecOrder.map((filter) => (
            <CheckboxField
              key={String(filter)}
              id={`qf-codec-${String(filter)}`}
              checked={filters.codec.includes(filter)}
              onCheckedChange={(checked) => onCodecChange(toggle(filters.codec, filter, checked))}
            >
              {codecFilterLabels[filter]}
            </CheckboxField>
          ))}
        </FilterGroup>

        <div className="hidden @2xl:block @2xl:flex-1" />

        <div className="flex items-center gap-3">
          <span className="text-fg-3 w-20 shrink-0 text-sm @2xl:w-auto">sort by</span>
          <NativeSelect
            aria-label="Sort results"
            wrapperClassName="@2xl:w-44"
            value={String(filters.sortBy)}
            onChange={(event) => {
              const option = sortOptions.find((o) => String(o.sortBy) === event.target.value);
              if (option) {
                onSortChange({ sortBy: option.sortBy, sortDirection: option.sortDirection });
              }
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.label} value={String(option.sortBy)}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </div>
  );
}
