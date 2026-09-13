import { useMemo } from "react";
import { create } from "@bufbuild/protobuf";
import { UserSettingsSchema } from "@chill-institute/contracts/chill/v4/api_pb";

import { useAuth } from "@/auth/auth";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
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

  const disabled = !configQuery.data;
  const effective = toChillSettings(configQuery.data ?? create(UserSettingsSchema));
  const error =
    configQuery.error ?? indexersQuery.error ?? downloadFolderQuery.error ?? saveMutation.error;

  return (
    <div className="flex flex-col gap-6" aria-busy={configQuery.isPending}>
      <fieldset disabled={disabled} className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
        <SettingsTwoColumnGrid>
          <AccountSection profileQuery={profileQuery} onReset={resetSettings} />
          <DownloadFolderSection
            effective={effective}
            downloadFolderQuery={downloadFolderQuery}
            persistPatch={persistPatch}
          />
        </SettingsTwoColumnGrid>
        <SearchSettingsSection
          effective={effective}
          persistPatch={persistPatch}
          disabled={disabled}
        />
        <IndexersSection
          effective={effective}
          indexerOptions={indexerOptions}
          persistPatch={persistPatch}
          pending={indexersQuery.isPending}
        />
        <SettingsTwoColumnGrid>
          <SearchResultDisplayBehaviorSection effective={effective} persistPatch={persistPatch} />
          <SearchResultTitleBehaviorSection effective={effective} persistPatch={persistPatch} />
        </SettingsTwoColumnGrid>
      </fieldset>
      <ThemeSection theme={theme} setTheme={setTheme} systemDark={systemDark} />
      <SettingsFooter />
      {error ? <UserErrorAlert error={error} /> : null}
    </div>
  );
}
