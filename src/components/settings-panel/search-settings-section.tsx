import { CheckboxField } from "@/ui/components/checkbox-field";
import { SettingsSection } from "@/ui/components/settings-section";
import type { ChillSettings } from "@/lib/types";

import type { PersistPatch } from "./types";

function SearchSettingsSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search settings">
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
          Hide results with no seeders
        </CheckboxField>
        <CheckboxField
          id="remember-filters"
          checked={effective.rememberQuickFilters}
          onCheckedChange={(checked) => {
            if (!checked) {
              persistPatch({
                rememberQuickFilters: false,
                codecFilters: [],
                resolutionFilters: [],
                otherFilters: [],
              });
              return;
            }
            persistPatch({ rememberQuickFilters: true });
          }}
        >
          Remember quick filters
        </CheckboxField>
      </div>
    </SettingsSection>
  );
}

export { SearchSettingsSection };
