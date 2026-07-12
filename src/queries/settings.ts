import { readCachedSearchSettings } from "@/queries/settings-cache";
import { useSaveUserSettings, useUserSettingsQuery } from "@/queries/settings-hooks";

export function useSettingsQuery() {
  return useUserSettingsQuery(readCachedSearchSettings);
}

export function useSaveSettings() {
  return useSaveUserSettings();
}
