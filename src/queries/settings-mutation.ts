import type { QueryClient } from "@tanstack/react-query";

import type { UserSettings } from "@/lib/types";

export const USER_SETTINGS_QUERY_KEY = ["user-settings"] as const;
export const USER_SETTINGS_MUTATION_SCOPE = { id: "user-settings" } as const;

export type SettingsSaveContext = {
  previousSettings?: UserSettings;
  stagedSettings?: UserSettings;
};

export type SettingsUpdate = UserSettings | ((settings: UserSettings) => UserSettings);

type SettingsCacheOptions = {
  queryClient: QueryClient;
  writeCachedSettings: (settings: UserSettings) => void;
};

export function applySettingsUpdate(settings: UserSettings, update: SettingsUpdate) {
  return typeof update === "function" ? update(settings) : update;
}

export function stagedSettingsForSave(settings: UserSettings, update: SettingsUpdate) {
  return typeof update === "function" ? settings : applySettingsUpdate(settings, update);
}

export async function prepareSettingsSave({
  queryClient,
  update,
}: Pick<SettingsCacheOptions, "queryClient"> & {
  update: SettingsUpdate;
}) {
  const previousSettings = queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY);
  const stagedSettings = previousSettings
    ? applySettingsUpdate(previousSettings, update)
    : undefined;
  if (previousSettings) {
    queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, stagedSettings);
  }
  await queryClient.cancelQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
  return { previousSettings, stagedSettings };
}

export function settingsSaveIsCurrent({
  context,
  queryClient,
}: Pick<SettingsCacheOptions, "queryClient"> & {
  context: SettingsSaveContext | undefined;
}) {
  return (
    context?.stagedSettings === undefined ||
    queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY) === context.stagedSettings
  );
}

export function cacheSavedSettings({
  context,
  queryClient,
  settings,
  writeCachedSettings,
}: SettingsCacheOptions & {
  context?: SettingsSaveContext;
  settings: UserSettings;
}) {
  if (!settingsSaveIsCurrent({ context, queryClient })) {
    return;
  }

  queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, settings);
  writeCachedSettings(settings);
}

export function downloadFolderChanged(previous: UserSettings | undefined, saved: UserSettings) {
  const savedFolderID = saved.download?.folderId;
  return savedFolderID !== undefined && previous?.download?.folderId !== savedFolderID;
}
