import { useMemo } from "react";
import { match } from "ts-pattern";

import { useAuth } from "@/auth/auth";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { combineQueries } from "@/queries/combine";
import { useSettingsQuery, useSaveSettings } from "@/queries/settings";
import { useDownloadFolderQuery } from "@/auth/queries/download-folder";
import { useIndexersQuery } from "@/queries/indexers";
import { useProfileQuery } from "@/auth/queries/profile";
import { useTheme } from "@/ui/hooks/use-theme";
import { applyChillSettingsPatch, resetChillSettings, toChillSettings } from "@/lib/types";

import { AccountSection } from "./settings-panel/account-section";
import { DownloadFolderSection } from "./settings-panel/download-folder-section";
import { IndexersSection } from "./settings-panel/indexers-section";
import { SearchResultDisplayBehaviorSection } from "./settings-panel/search-result-display-behavior-section";
import { SearchResultTitleBehaviorSection } from "./settings-panel/search-result-title-behavior-section";
import { SearchSettingsSection } from "./settings-panel/search-settings-section";
import { SettingsFooter } from "./settings-panel/settings-footer";
import { SettingsSkeleton } from "./settings-panel/settings-skeleton";
import { SettingsTwoColumnGrid } from "./settings-panel/settings-two-column-grid";
import { ThemeSection } from "./settings-panel/theme-section";
import type { ChillSettings } from "@/lib/types";

export function SettingsPanel() {
  const auth = useAuth();
  const { theme, setTheme, systemDark } = useTheme();

  const configQuery = useSettingsQuery();
  const indexersQuery = useIndexersQuery();
  const profileQuery = useProfileQuery();
  const downloadFolderQuery = useDownloadFolderQuery();

  const saveMutation = useSaveSettings();

  const indexerOptions = useMemo(
    () => (indexersQuery.data ?? []).map((indexer) => ({ id: indexer.id, label: indexer.name })),
    [indexersQuery.data],
  );

  const persistPatch = (patch: Partial<ChillSettings>) => {
    if (!configQuery.data) return;
    saveMutation.mutate((settings) => applyChillSettingsPatch(settings, patch));
  };

  const resetSettings = () => {
    if (!configQuery.data) return;
    saveMutation.mutate(resetChillSettings);
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  const combined = combineQueries(configQuery, indexersQuery);

  return match(combined)
    .with({ status: "pending" }, () => <SettingsSkeleton />)
    .with({ status: "error" }, (q) => <UserErrorAlert error={q.error} />)
    .with({ status: "success" }, ({ data: [config] }) => {
      const effective = toChillSettings(config);

      return (
        <div className="flex flex-col gap-6">
          <SettingsTwoColumnGrid>
            <AccountSection profileQuery={profileQuery} onReset={resetSettings} />
            <DownloadFolderSection
              effective={effective}
              downloadFolderQuery={downloadFolderQuery}
              persistPatch={persistPatch}
            />
          </SettingsTwoColumnGrid>
          <SearchSettingsSection effective={effective} persistPatch={persistPatch} />
          <IndexersSection
            effective={effective}
            indexerOptions={indexerOptions}
            persistPatch={persistPatch}
          />
          <SettingsTwoColumnGrid>
            <SearchResultDisplayBehaviorSection effective={effective} persistPatch={persistPatch} />
            <SearchResultTitleBehaviorSection effective={effective} persistPatch={persistPatch} />
          </SettingsTwoColumnGrid>
          {saveMutation.error ? <UserErrorAlert error={saveMutation.error} /> : null}
          <ThemeSection theme={theme} setTheme={setTheme} systemDark={systemDark} />
          <SettingsFooter />
        </div>
      );
    })
    .exhaustive();
}
