import { create, equals } from "@bufbuild/protobuf";
import type { QueryClient } from "@tanstack/react-query";
import { UserSettingsSchema } from "@chill-institute/contracts/chill/v4/api_pb";

import type { ChillApi } from "@/api/api";
import type { UserSettings } from "@/lib/types";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";

export const USER_SETTINGS_MUTATION_SCOPE = { id: "user-settings" } as const;
export { USER_SETTINGS_QUERY_KEY };

export type SettingsSaveContext = {
  previousSettings?: UserSettings;
  stagedSettings?: UserSettings;
};

export type SettingsUpdate = UserSettings | ((settings: UserSettings) => UserSettings);

type SettingsCacheOptions = {
  queryClient: QueryClient;
  writeCachedSettings: (settings: UserSettings) => void;
};

type SaveSettingsWithCacheOptions = SettingsCacheOptions & {
  api: ChillApi;
  update: SettingsUpdate;
  onSuccess?: (saved: UserSettings, context: SettingsSaveContext) => void;
};

function applySettingsUpdate(settings: UserSettings, update: SettingsUpdate) {
  return typeof update === "function" ? update(settings) : update;
}

export function stagedSettingsForSave(settings: UserSettings, update: SettingsUpdate) {
  return typeof update === "function" ? settings : applySettingsUpdate(settings, update);
}

export function hasCompleteSettingsDomains(settings: UserSettings) {
  return (
    settings.search !== undefined &&
    settings.catalog !== undefined &&
    settings.download !== undefined
  );
}

export function mergeSettingsDomains(base: UserSettings, next: UserSettings): UserSettings {
  return create(UserSettingsSchema, {
    ...base,
    search: next.search ?? base.search,
    catalog: next.catalog ?? base.catalog,
    download: next.download ?? base.download,
  });
}

async function settingsForSave({
  api,
  queryClient,
  update,
}: Pick<SaveSettingsWithCacheOptions, "api" | "queryClient" | "update">) {
  const current = queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY);
  if (current && hasCompleteSettingsDomains(current)) {
    const next = stagedSettingsForSave(current, update);
    return hasCompleteSettingsDomains(next) ? next : mergeSettingsDomains(current, next);
  }

  const serverSettings = await api.getUserSettings();
  const next = applySettingsUpdate(serverSettings, update);
  return hasCompleteSettingsDomains(next) ? next : mergeSettingsDomains(serverSettings, next);
}

export async function saveSettings({
  api,
  queryClient,
  update,
}: Pick<SaveSettingsWithCacheOptions, "api" | "queryClient" | "update">) {
  const settings = await settingsForSave({ api, queryClient, update });
  return api.saveUserSettings(settings);
}

export async function prepareSettingsSave({
  queryClient,
  update,
}: Pick<SettingsCacheOptions, "queryClient"> & {
  update: SettingsUpdate;
}) {
  await queryClient.cancelQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
  const previousSettings = queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY);
  const stagedSettings = previousSettings
    ? applySettingsUpdate(previousSettings, update)
    : undefined;
  if (previousSettings) {
    queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, stagedSettings);
  }
  return { previousSettings, stagedSettings };
}

export function settingsSaveIsCurrent({
  context,
  queryClient,
}: Pick<SettingsCacheOptions, "queryClient"> & {
  context: SettingsSaveContext | undefined;
}) {
  const currentSettings = queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY);
  return (
    context?.stagedSettings === undefined ||
    (currentSettings !== undefined &&
      equals(UserSettingsSchema, currentSettings, context.stagedSettings))
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

export function invalidateFailedSettingsSave({
  context,
  queryClient,
}: Pick<SettingsCacheOptions, "queryClient"> & {
  context: SettingsSaveContext | undefined;
}) {
  if (settingsSaveIsCurrent({ context, queryClient })) {
    void queryClient.invalidateQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
  }
}

export async function saveSettingsWithCache({
  api,
  onSuccess,
  queryClient,
  update,
  writeCachedSettings,
}: SaveSettingsWithCacheOptions) {
  const context = await prepareSettingsSave({ queryClient, update });

  try {
    const saved = await saveSettings({ api, queryClient, update });
    cacheSavedSettings({ context, queryClient, settings: saved, writeCachedSettings });
    onSuccess?.(saved, context);
    return saved;
  } catch (error) {
    invalidateFailedSettingsSave({ context, queryClient });
    throw error;
  }
}

export function downloadFolderChanged(previous: UserSettings | undefined, saved: UserSettings) {
  const savedFolderID = saved.download?.folderId;
  return savedFolderID !== undefined && previous?.download?.folderId !== savedFolderID;
}
