import { useQuery, type QueryClient } from "@tanstack/react-query";

import { useApi } from "../api-context";
import { useAuth } from "../auth";
import { DOWNLOAD_FOLDER_QUERY_KEY, downloadFolderQueryOptions } from "./options";

export function useDownloadFolderQuery() {
  const api = useApi();
  const auth = useAuth();

  return useQuery({
    ...downloadFolderQueryOptions(api),
    enabled: auth.isAuthenticated,
  });
}

export function invalidateDownloadFolder(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: DOWNLOAD_FOLDER_QUERY_KEY });
}
