import { NativeSelect } from "@/ui/components/ui/native-select";
import { SettingsSection } from "@/ui/components/settings-section";
import {
  searchResultTitleBehaviorLabels,
  searchResultTitleBehaviors,
  type ChillSettings,
} from "@/lib/types";

import type { PersistPatch } from "./types";

function SearchResultTitleBehaviorSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search result name behavior">
      <NativeSelect
        aria-label="Search result name behavior"
        name="search-result-name-behavior"
        value={String(effective.searchResultTitleBehavior)}
        onChange={(event) => {
          const { value } = event.currentTarget;
          const next = searchResultTitleBehaviors.find((b) => String(b) === value);
          if (next !== undefined) persistPatch({ searchResultTitleBehavior: next });
        }}
      >
        {searchResultTitleBehaviors.map((behavior) => (
          <option key={behavior} value={String(behavior)}>
            {searchResultTitleBehaviorLabels[behavior]}
          </option>
        ))}
      </NativeSelect>
    </SettingsSection>
  );
}

export { SearchResultTitleBehaviorSection };
