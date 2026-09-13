import { Skeleton } from "@/ui/components/ui/skeleton";
import { CheckboxGroup } from "@/ui/components/ui/checkbox-group";
import { SettingsSection } from "@/ui/components/settings-section";
import type { ChillSettings } from "@/lib/types";

import type { IndexerOption, PersistPatch } from "./types";

function IndexersSection({
  effective,
  indexerOptions,
  persistPatch,
  pending,
  disabled,
}: {
  pending: boolean;
  disabled: boolean;
  effective: ChillSettings;
  indexerOptions: IndexerOption[];
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search using the following trackers">
      <div className="min-h-5" aria-busy={pending}>
        {pending ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-5 w-24" />
            ))}
          </div>
        ) : (
          <CheckboxGroup
            disabled={disabled}
            options={indexerOptions}
            uncheckedItems={effective.disabledIndexerIds}
            onChange={(disabledIndexerIds) => persistPatch({ disabledIndexerIds })}
          />
        )}
      </div>
    </SettingsSection>
  );
}

export { IndexersSection };
