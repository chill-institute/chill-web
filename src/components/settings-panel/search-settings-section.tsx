import { CheckboxField } from "@/ui/components/checkbox-field";
import { NativeSelect } from "@/ui/components/ui/native-select";
import { SettingsSection } from "@/ui/components/settings-section";
import {
  codecFilterLabels,
  codecFilters,
  resolutionFilterLabels,
  resolutionFilters,
  type ChillSettings,
} from "@/lib/types";

import type { PersistPatch } from "./types";

const ALL_OPTION = "all";

function singleValue<T extends number>(values: readonly T[]): string {
  return values.length === 1 ? String(values[0]) : ALL_OPTION;
}

function PreferredSelect<T extends number>({
  label,
  value,
  options,
  optionLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly T[];
  optionLabels: Record<T, string>;
  onChange: (next: T[]) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-fg-2">
      {label}
      <NativeSelect
        value={value}
        className="h-8 py-1.5 text-sm"
        onChange={(event) => {
          const selected = options.find((option) => String(option) === event.currentTarget.value);
          onChange(selected === undefined ? [] : [selected]);
        }}
      >
        <option value={ALL_OPTION}>any</option>
        {options.map((option) => (
          <option key={option} value={String(option)}>
            {optionLabels[option]}
          </option>
        ))}
      </NativeSelect>
    </label>
  );
}

function SearchSettingsSection({
  effective,
  persistPatch,
}: {
  effective: ChillSettings;
  persistPatch: PersistPatch;
}) {
  return (
    <SettingsSection title="Search settings">
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        <PreferredSelect
          label="Preferred resolution"
          value={singleValue(effective.resolutionFilters)}
          options={resolutionFilters}
          optionLabels={resolutionFilterLabels}
          onChange={(next) => persistPatch({ resolutionFilters: next, rememberQuickFilters: true })}
        />
        <PreferredSelect
          label="Preferred codec"
          value={singleValue(effective.codecFilters)}
          options={codecFilters}
          optionLabels={codecFilterLabels}
          onChange={(next) => persistPatch({ codecFilters: next, rememberQuickFilters: true })}
        />
      </div>
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
