import { queryOptions } from "@tanstack/react-query";

import type { ChillApi } from "@/api/api";

const FIVE_MINUTES = 5 * 60 * 1000;

const DOWNLOAD_FOLDER_QUERY_KEY = ["download-folder"] as const;
const FOLDER_QUERY_KEY = ["folder"] as const;
const USER_PROFILE_QUERY_KEY = ["user-profile"] as const;

function userProfileQueryOptions(api: ChillApi, authToken: string | null) {
  return queryOptions({
    queryKey: [...USER_PROFILE_QUERY_KEY, authToken !== null] as const,
    queryFn: ({ signal }) => api.getUserProfile(signal),
    enabled: authToken !== null,
    staleTime: Infinity,
  });
}

function downloadFolderQueryOptions(api: ChillApi) {
  return queryOptions({
    queryKey: DOWNLOAD_FOLDER_QUERY_KEY,
    queryFn: ({ signal }) => api.getDownloadFolder(signal),
    staleTime: FIVE_MINUTES,
  });
}

function folderQueryOptions(api: ChillApi, folderId: bigint) {
  return queryOptions({
    queryKey: [...FOLDER_QUERY_KEY, String(folderId)] as const,
    queryFn: ({ signal }) => api.getFolder(folderId, signal),
  });
}

export {
  DOWNLOAD_FOLDER_QUERY_KEY,
  downloadFolderQueryOptions,
  folderQueryOptions,
  userProfileQueryOptions,
};
