import { createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";
import { SearchPage } from "@/routes/-search-page";
import { searchRouteSearchSchema } from "@/routes/-search-params";
import { indexersQueryOptions, settingsQueryOptions } from "@/queries/options";

export const Route = createFileRoute("/search")({
  validateSearch: searchRouteSearchSchema,
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
    void queryClient.prefetchQuery(settingsQueryOptions(token));
    void queryClient.prefetchQuery(indexersQueryOptions(token));
  },
  component: SearchPage,
});
