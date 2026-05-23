import { SettingsSection } from "@/ui/components/settings-section";
import { Skeleton } from "@/ui/components/ui/skeleton";

import { SettingsTwoColumnGrid } from "./settings-two-column-grid";

function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <SettingsTwoColumnGrid>
        <SettingsSection title="Signed in as">
          <Skeleton className="h-[50px] w-full rounded" />
        </SettingsSection>
        <SettingsSection title="Download folder">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
      </SettingsTwoColumnGrid>
      <SettingsSection title="Search settings">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
      </SettingsSection>
      <SettingsSection title="Search using the following trackers">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/2" />
      </SettingsSection>
      <SettingsTwoColumnGrid>
        <SettingsSection title="Search result display behavior">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
        <SettingsSection title="Search result name behavior">
          <Skeleton className="h-9 w-full rounded" />
        </SettingsSection>
      </SettingsTwoColumnGrid>
      <SettingsSection title="User-interface theme">
        <Skeleton className="h-9 w-full rounded" />
      </SettingsSection>
    </div>
  );
}

export { SettingsSkeleton };
