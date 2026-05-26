import { queryOptions } from "@tanstack/react-query";

import type { ChillApi } from "@/api/api";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";
import type { UserSettings } from "@/lib/types";

export const FIVE_MINUTES = 5 * 60 * 1000;

type UserSettingsCache = {
  read: () => UserSettings | undefined;
  write: (settings: UserSettings) => void;
};

export function userSettingsQueryOptions(api: ChillApi, cache: UserSettingsCache) {
  return queryOptions({
    queryKey: USER_SETTINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const settings = await api.getUserSettings(signal);
      cache.write(settings);
      return settings;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: cache.read(),
  });
}
