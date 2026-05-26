import { queryOptions } from "@tanstack/react-query";

import { createApi } from "@/lib/api";
import { INDEXERS_QUERY_KEY } from "@/queries/keys";
import {
  readCachedIndexers,
  readCachedSearchSettings,
  writeCachedIndexers,
  writeCachedSettings,
} from "@/queries/settings-cache";
import { FIVE_MINUTES, userSettingsQueryOptions } from "@/queries/user-settings-options";

export function settingsQueryOptions(token: string) {
  return userSettingsQueryOptions(createApi(token), {
    read: readCachedSearchSettings,
    write: writeCachedSettings,
  });
}

export function indexersQueryOptions(token: string) {
  return indexersQueryOptionsForApi(createApi(token));
}

export function indexersQueryOptionsForApi(api: ReturnType<typeof createApi>) {
  return queryOptions({
    queryKey: INDEXERS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const indexers = await api.getIndexers(signal);
      writeCachedIndexers(indexers);
      return indexers;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: readCachedIndexers(),
  });
}
