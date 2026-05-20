import { create } from "@bufbuild/protobuf";
import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  DownloadSettingsSchema,
  SortBy,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import {
  cacheSavedSettings,
  downloadFolderChanged,
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

function createQueryClientStub(initial: UserSettings) {
  let data = initial;
  const cancelQueries = vi.fn(() => Promise.resolve());
  return {
    cancelQueries,
    get data() {
      return data;
    },
    client: {
      cancelQueries,
      getQueryData: vi.fn((key) => (key === USER_SETTINGS_QUERY_KEY ? data : undefined)),
      setQueryData: vi.fn((key, next: UserSettings) => {
        if (key === USER_SETTINGS_QUERY_KEY) data = next;
      }),
    } as unknown as QueryClient,
  };
}

describe("settings mutation cache helpers", () => {
  it("snapshots and stages settings before saving", async () => {
    const previous = settings(1n);
    const next = settings(2n);
    const queryClient = createQueryClientStub(previous);

    const context = await prepareSettingsSave({ queryClient: queryClient.client, update: next });

    expect(context.previousSettings).toBe(previous);
    expect(context.stagedSettings).toBe(next);
    expect(queryClient.data).toBe(next);
    expect(queryClient.cancelQueries).toHaveBeenCalledWith({
      queryKey: USER_SETTINGS_QUERY_KEY,
    });

    cacheSavedSettings({
      context,
      queryClient: queryClient.client,
      settings: next,
      writeCachedSettings: vi.fn(),
    });

    expect(queryClient.data).toBe(next);
  });

  it("stages function updates on top of the latest cached settings", async () => {
    const previous = settings(1n);
    const queryClient = createQueryClientStub(previous);

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
    const queryClient = createQueryClientStub(settings(0n));
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

    expect(queryClient.data).toBe(second);
    expect(writeCachedSettings).not.toHaveBeenCalled();
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
