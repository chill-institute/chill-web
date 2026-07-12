import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  DownloadSettingsSchema,
  SortBy,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import {
  cacheSavedSettings,
  downloadFolderChanged,
  invalidateFailedSettingsSave,
  prepareSettingsSave,
  settingsSaveIsCurrent,
  stagedSettingsForSave,
  USER_SETTINGS_QUERY_KEY,
} from "./settings-mutation";
import type { UserSettings } from "@/lib/types";

function settings(folderId: bigint): UserSettings {
  return create(UserSettingsSchema, {
    download: create(DownloadSettingsSchema, { folderId }),
  });
}

function createQueryClientHarness(initial: UserSettings) {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false } },
  });
  client.setQueryData(USER_SETTINGS_QUERY_KEY, initial);
  const cancelQueries = vi.spyOn(client, "cancelQueries");
  const invalidateQueries = vi.spyOn(client, "invalidateQueries");
  return {
    cancelQueries,
    invalidateQueries,
    get data() {
      return client.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY) ?? initial;
    },
    client,
  };
}

describe("settings mutation cache helpers", () => {
  it("snapshots and stages settings before saving", async () => {
    const previous = settings(1n);
    const next = settings(2n);
    const queryClient = createQueryClientHarness(previous);

    const context = await prepareSettingsSave({ queryClient: queryClient.client, update: next });

    expect(context.previousSettings).toBe(previous);
    expect(context.stagedSettings).toBe(next);
    expect(queryClient.data).toStrictEqual(next);
    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: USER_SETTINGS_QUERY_KEY,
    });

    cacheSavedSettings({
      context,
      queryClient: queryClient.client,
      settings: next,
      writeCachedSettings: vi.fn(),
    });

    expect(queryClient.data).toStrictEqual(next);
  });

  it("stages function updates on top of the latest cached settings", async () => {
    const previous = settings(1n);
    const queryClient = createQueryClientHarness(previous);

    await prepareSettingsSave({
      queryClient: queryClient.client,
      update: (cached) => settings((cached.download?.folderId ?? 0n) + 1n),
    });

    expect(queryClient.data.download?.folderId).toBe(2n);
  });

  it("uses already staged settings for function updates when saving", () => {
    const staged = settings(2n);

    const out = stagedSettingsForSave(staged, (cached) =>
      settings((cached.download?.folderId ?? 0n) + 1n),
    );

    expect(out).toBe(staged);
  });

  it("does not let an older save clobber a newer staged update", async () => {
    const first = settings(1n);
    const second = settings(2n);
    const queryClient = createQueryClientHarness(settings(0n));
    const writeCachedSettings = vi.fn();

    const firstContext = await prepareSettingsSave({
      queryClient: queryClient.client,
      update: first,
    });
    await prepareSettingsSave({
      queryClient: queryClient.client,
      update: second,
    });

    expect(settingsSaveIsCurrent({ queryClient: queryClient.client, context: firstContext })).toBe(
      false,
    );

    cacheSavedSettings({
      context: firstContext,
      queryClient: queryClient.client,
      settings: first,
      writeCachedSettings,
    });

    expect(queryClient.data).toStrictEqual(second);
    expect(writeCachedSettings).not.toHaveBeenCalled();
  });

  it("invalidates a failed current save without disturbing a newer staged update", async () => {
    const queryClient = createQueryClientHarness(settings(0n));
    const firstContext = await prepareSettingsSave({
      queryClient: queryClient.client,
      update: settings(1n),
    });

    invalidateFailedSettingsSave({ context: firstContext, queryClient: queryClient.client });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: USER_SETTINGS_QUERY_KEY,
    });

    queryClient.invalidateQueries.mockClear();
    await prepareSettingsSave({
      queryClient: queryClient.client,
      update: settings(2n),
    });

    invalidateFailedSettingsSave({ context: firstContext, queryClient: queryClient.client });

    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it("detects changed download folders only when the saved value is explicit", () => {
    const previous = settings(1n);
    const changed = settings(2n);
    const missingDownload = create(UserSettingsSchema, {
      search: { sortBy: SortBy.SIZE },
    });

    expect(downloadFolderChanged(previous, changed)).toBe(true);
    expect(downloadFolderChanged(changed, changed)).toBe(false);
    expect(downloadFolderChanged(previous, missingDownload)).toBe(false);
  });
});
