import { NativeSelect } from "@/ui/components/ui/native-select";
import { SettingsSection } from "@/ui/components/settings-section";
import {
  searchResultDisplayBehaviorLabels,
  searchResultDisplayBehaviors,
  type ChillSettings,
} from "@/lib/types";

import type { PersistPatch } from "./types";

function SearchResultDisplayBehaviorSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search result display behavior">
      <NativeSelect
        aria-label="Search result display behavior"
        name="search-result-display-behavior"
        value={String(effective.searchResultDisplayBehavior)}
        onChange={(event) => {
          const { value } = event.currentTarget;
          const next = searchResultDisplayBehaviors.find((b) => String(b) === value);
          if (next !== undefined) persistPatch({ searchResultDisplayBehavior: next });
        }}
      >
        {searchResultDisplayBehaviors.map((behavior) => (
          <option key={behavior} value={String(behavior)}>
            {searchResultDisplayBehaviorLabels[behavior]}
          </option>
        ))}
      </NativeSelect>
    </SettingsSection>
  );
}

export { SearchResultDisplayBehaviorSection };
