import { useQuery, type QueryClient } from "@tanstack/react-query";

import { useApi } from "../api-context";

export const DOWNLOAD_FOLDER_QUERY_KEY = ["download-folder"] as const;

export function useDownloadFolderQuery() {
  const api = useApi();
  return useQuery({
    queryKey: DOWNLOAD_FOLDER_QUERY_KEY,
    queryFn: ({ signal }) => api.getDownloadFolder(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function invalidateDownloadFolder(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: DOWNLOAD_FOLDER_QUERY_KEY });
}
