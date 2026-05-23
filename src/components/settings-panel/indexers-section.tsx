import { CheckboxGroup } from "@/ui/components/ui/checkbox-group";
import { SettingsSection } from "@/ui/components/settings-section";
import type { ChillSettings } from "@/lib/types";

import type { IndexerOption, PersistPatch } from "./types";

function IndexersSection({
  effective,
  indexerOptions,
  persistPatch,
}: {
  effective: ChillSettings;
  indexerOptions: IndexerOption[];
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search using the following trackers">
      <CheckboxGroup
        options={indexerOptions}
        uncheckedItems={effective.disabledIndexerIds}
        onChange={(disabledIndexerIds) => persistPatch({ disabledIndexerIds })}
      />
    </SettingsSection>
  );
}

export { IndexersSection };
