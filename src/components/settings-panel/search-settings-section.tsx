import { QuickFilters } from "@/components/quick-filters";
import { CheckboxField } from "@/ui/components/checkbox-field";
import { SettingsSection } from "@/ui/components/settings-section";
import type { FilterState } from "@/hooks/use-search-filters";
import type { ChillSettings } from "@/lib/types";

import type { PersistPatch } from "./types";

const NO_OTHER_FILTERS: FilterState["other"] = [];

function SearchSettingsSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  const filters: FilterState = {
    resolution: effective.resolutionFilters,
    codec: effective.codecFilters,
    other: NO_OTHER_FILTERS,
    sortBy: effective.sortBy,
    sortDirection: effective.sortDirection,
  };

  return (
    <SettingsSection title="Search preferences">
      <QuickFilters
        className="mb-3"
        filters={filters}
        // These are the persisted preferences, so remembering is implied.
        onResolutionChange={(next) =>
          persistPatch({ resolutionFilters: next, rememberQuickFilters: true })
        }
        onCodecChange={(next) => persistPatch({ codecFilters: next, rememberQuickFilters: true })}
        onSortChange={(next) =>
          persistPatch({ sortBy: next.sortBy, sortDirection: next.sortDirection })
        }
      />
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
        <CheckboxField
          id="filter-nasty"
          checked={effective.filterNastyResults}
          onCheckedChange={(checked) => persistPatch({ filterNastyResults: checked === true })}
        >
          Try to filter out nasty stuff
        </CheckboxField>
        <CheckboxField
          id="filter-no-seeders"
          checked={effective.filterResultsWithNoSeeders}
          onCheckedChange={(checked) =>
            persistPatch({ filterResultsWithNoSeeders: checked === true })
          }
        >
          Hide results with no peers
        </CheckboxField>
      </div>
    </SettingsSection>
  );
}

export { SearchSettingsSection };
